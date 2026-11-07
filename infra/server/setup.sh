#!/usr/bin/env bash
# Preparación inicial del VPS (Ubuntu) para Javis Market. Se ejecuta UNA vez, con sudo, desde el repo clonado:
#
#   sudo bash infra/server/setup.sh
#
# Es idempotente: se puede repetir sin romper nada (no regenera contraseñas ni secretos si ya existen).
# Instala: Node.js 24, PM2, PostgreSQL, Nginx, Certbot, firewall (ufw), fail2ban y actualizaciones automáticas.
# Crea: base de datos y roles, archivos de entorno (permisos 600), directorios persistentes y configuración
# Nginx solo-HTTP (el HTTPS lo instala ssl.sh cuando los DNS apunten al servidor).
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Ejecuta con sudo: sudo bash $0" >&2
  exit 1
fi

# shellcheck source=config.sh
source "$(dirname "${BASH_SOURCE[0]}")/config.sh"

APP_USER="${APP_USER:-${SUDO_USER:-}}"
if [[ -z "$APP_USER" || "$APP_USER" == root ]]; then
  echo "No se pudo determinar el usuario de la aplicación. Usa: sudo APP_USER=javis bash $0" >&2
  exit 1
fi
APP_HOME="$(getent passwd "$APP_USER" | cut -d: -f6)"
as_app() { sudo -u "$APP_USER" -H "$@"; }
step() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }

export DEBIAN_FRONTEND=noninteractive

# --- Paquetes del sistema ------------------------------------------------------
step "Paquetes del sistema"
apt-get update -q
apt-get upgrade -yq
apt-get install -yq ca-certificates curl gnupg git build-essential openssl \
  nginx postgresql postgresql-contrib certbot ufw fail2ban unattended-upgrades bind9-dnsutils

# --- Swap (la compilación de Next.js necesita memoria) ------------------------
mem_kb=$(awk '/MemTotal/ {print $2}' /proc/meminfo)
if [[ -z "$(swapon --show --noheadings)" && $mem_kb -lt 4000000 ]]; then
  step "Creando swap de 2 GB (RAM < 4 GB)"
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >>/etc/fstab
fi

# --- Node.js 24 + PM2 -----------------------------------------------------------
if ! command -v node >/dev/null || [[ "$(node -p 'process.versions.node.split(".")[0]')" -lt 24 ]]; then
  step "Node.js 24 (NodeSource)"
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -yq nodejs
fi
echo "Node $(node -v), npm $(npm -v)"

if ! command -v pm2 >/dev/null; then
  step "PM2"
  npm install -g pm2
fi

# --- Firewall -------------------------------------------------------------------
step "Firewall (ufw): SSH, 80 y 443"
# Puerto SSH real (en Ubuntu reciente sshd va por socket y `sshd -T` puede fallar: no debe cortar el script).
ssh_port=$( (sshd -T 2>/dev/null || true) | awk '/^port / {print $2; exit}')
ufw allow "${ssh_port:-22}/tcp"
ufw allow 22/tcp
ufw allow 'Nginx Full'
ufw --force enable
systemctl enable --now unattended-upgrades || echo "Aviso: no se pudo activar unattended-upgrades"
systemctl enable --now fail2ban || echo "Aviso: no se pudo activar fail2ban (no impide continuar)"

# --- Directorios persistentes ---------------------------------------------------
step "Directorios en $BASE_DIR"
install -d -m 755 -o root -g root "$BASE_DIR" "$BASE_DIR/storage"
install -d -m 700 -o "$APP_USER" -g "$APP_USER" "$BASE_DIR/env" "$STORAGE_PRIVATE_DIR" "$BACKUP_DIR"
install -d -m 755 -o "$APP_USER" -g "$APP_USER" "$STORAGE_PUBLIC_DIR" "$LOG_DIR"
install -d -m 755 /var/www/certbot

# --- PostgreSQL -------------------------------------------------------------------
step "PostgreSQL: base $DB_NAME y roles $DB_OWNER_ROLE / $DB_APP_ROLE"
systemctl enable --now postgresql
psql_admin() { sudo -u postgres psql -v ON_ERROR_STOP=1 -qtA "$@"; }

if [[ -f "$ENV_FILE" && -f "$MIGRATE_ENV_FILE" ]]; then
  echo "Archivos de entorno ya existen: se conservan contraseñas y secretos."
else
  owner_pw=$(openssl rand -hex 24)
  app_pw=$(openssl rand -hex 24)
  for pair in "$DB_OWNER_ROLE:$owner_pw" "$DB_APP_ROLE:$app_pw"; do
    role=${pair%%:*} pw=${pair#*:}
    if [[ "$(psql_admin -c "SELECT 1 FROM pg_roles WHERE rolname='$role'")" == 1 ]]; then
      psql_admin -c "ALTER ROLE $role WITH LOGIN PASSWORD '$pw'"
    else
      psql_admin -c "CREATE ROLE $role WITH LOGIN PASSWORD '$pw'"
    fi
  done

  umask 077
  cat >"$MIGRATE_ENV_FILE" <<EOF
# Rol propietario del esquema: solo para migraciones (deploy.sh) y copias (backup-db.sh). La app NO lo usa.
MIGRATE_DATABASE_URL=postgresql://$DB_OWNER_ROLE:$owner_pw@localhost:5432/$DB_NAME
EOF
  cat >"$ENV_FILE" <<EOF
# Javis Market — producción. Permisos 600. Tras editar: bash infra/server/deploy.sh (o pm2 reload ... --update-env)
APP_ENV=production
PUBLIC_SITE_URL=https://$CANONICAL_DOMAIN
PORT=$APP_PORT
LOG_DIR=$LOG_DIR

DATABASE_URL=postgresql://$DB_APP_ROLE:$app_pw@localhost:5432/$DB_NAME?schema=public
# DATABASE_POOL_MAX=10

STORAGE_PUBLIC_DIR=$STORAGE_PUBLIC_DIR
STORAGE_PRIVATE_DIR=$STORAGE_PRIVATE_DIR
PUBLIC_MEDIA_BASE_URL=/media
IMAGE_IMPORT_ALLOWED_HOSTS=

# Invello (catálogo del proveedor). Vacío = integración desactivada.
INVELLO_API_KEY=

# Firma de sesiones del panel. Cambiarlo invalida todas las sesiones.
AUTH_SECRET=$(openssl rand -hex 48)

# Pagos (vacío = deshabilitados)
PAYMENT_PROVIDER=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Correo (vacío = solo log)
EMAIL_PROVIDER=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM="Javis Market <no-reply@$CANONICAL_DOMAIN>"
EOF
  umask 022
  chown "$APP_USER:$APP_USER" "$ENV_FILE" "$MIGRATE_ENV_FILE"
  chmod 600 "$ENV_FILE" "$MIGRATE_ENV_FILE"
  echo "Creados $ENV_FILE y $MIGRATE_ENV_FILE"
fi

if [[ "$(psql_admin -c "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")" != 1 ]]; then
  sudo -u postgres createdb --owner "$DB_OWNER_ROLE" --encoding UTF8 --template template0 "$DB_NAME"
fi
# La app solo hace DML; las tablas futuras que cree el propietario en migraciones heredan los permisos.
psql_admin -d "$DB_NAME" <<SQL
REVOKE ALL ON DATABASE $DB_NAME FROM PUBLIC;
GRANT CONNECT, TEMPORARY ON DATABASE $DB_NAME TO $DB_OWNER_ROLE, $DB_APP_ROLE;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
ALTER SCHEMA public OWNER TO $DB_OWNER_ROLE;
GRANT USAGE ON SCHEMA public TO $DB_APP_ROLE;
ALTER DEFAULT PRIVILEGES FOR ROLE $DB_OWNER_ROLE IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO $DB_APP_ROLE;
ALTER DEFAULT PRIVILEGES FOR ROLE $DB_OWNER_ROLE IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO $DB_APP_ROLE;
SQL

# --- Nginx (solo HTTP hasta tener certificados) -----------------------------------
step "Nginx"
install -m 644 "$REPO_DIR/infra/nginx/javis-proxy-headers.conf" /etc/nginx/snippets/javis-proxy-headers.conf
rm -f /etc/nginx/sites-enabled/default
if [[ ! -d "/etc/letsencrypt/live/javis-market" ]]; then
  sed -e "s|<ALL_DOMAINS>|$(all_domains | tr '\n' ' ')|g" \
    -e "s|<APP_PORT>|$APP_PORT|g" \
    -e "s|<STORAGE_PUBLIC_DIR>|$STORAGE_PUBLIC_DIR|g" \
    "$REPO_DIR/infra/nginx/javis-market-http.conf.template" >/etc/nginx/sites-available/javis-market
  ln -sf /etc/nginx/sites-available/javis-market /etc/nginx/sites-enabled/javis-market
else
  echo "Ya hay certificado: se conserva la configuración HTTPS (re-ejecuta ssl.sh para regenerarla)."
fi
nginx -t
systemctl enable nginx
systemctl reload nginx || systemctl restart nginx

# --- PM2: arranque con el sistema y rotación de logs -------------------------------
step "PM2 para $APP_USER"
env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$APP_USER" --hp "$APP_HOME" >/dev/null
as_app pm2 ping >/dev/null
as_app pm2 describe pm2-logrotate >/dev/null 2>&1 || as_app pm2 install pm2-logrotate >/dev/null
as_app pm2 set pm2-logrotate:max_size 20M >/dev/null
as_app pm2 set pm2-logrotate:retain 14 >/dev/null
as_app pm2 set pm2-logrotate:compress true >/dev/null

# --- Copia diaria local de la base ---------------------------------------------------
step "Copia diaria de la base (03:30, $BACKUP_DIR)"
cat >/etc/cron.d/javis-market-backup <<EOF
30 3 * * * $APP_USER /usr/bin/bash $REPO_DIR/infra/server/backup-db.sh daily >>$LOG_DIR/backup.log 2>&1
EOF
chmod 644 /etc/cron.d/javis-market-backup

step "Listo"
cat <<EOF
Siguiente:
  1. (Opcional) Completa claves en $ENV_FILE  (INVELLO_API_KEY, SMTP, Stripe…)
  2. Primer despliegue, como $APP_USER (sin sudo):  bash infra/server/deploy.sh
  3. Cuando los DNS apunten a $SERVER_IP:  sudo bash infra/server/ssl.sh
EOF
