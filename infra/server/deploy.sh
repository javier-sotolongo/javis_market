#!/usr/bin/env bash
# Despliegue de Javis Market. Se ejecuta como el usuario de la aplicación (sin sudo), desde el repo:
#
#   bash infra/server/deploy.sh            # último commit de la rama actual (git pull --ff-only)
#   bash infra/server/deploy.sh v1.2.0     # etiqueta o commit concreto
#   bash infra/server/deploy.sh --no-pull  # lo que haya ya en disco
#
# Pasos: código → npm ci → build → copia de la base → migraciones → permisos → PM2 → comprobación de salud.
set -euo pipefail

# shellcheck source=config.sh
source "$(dirname "${BASH_SOURCE[0]}")/config.sh"
step() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }

if [[ $EUID -eq 0 ]]; then
  echo "No ejecutes el despliegue como root: usa el usuario de la aplicación." >&2
  exit 1
fi
for f in "$ENV_FILE" "$MIGRATE_ENV_FILE"; do
  [[ -r "$f" ]] || { echo "Falta $f — ejecuta antes: sudo bash infra/server/setup.sh" >&2; exit 1; }
done

cd "$REPO_DIR"

step "Código"
case "${1:-}" in
  "") git pull --ff-only ;;
  --no-pull) ;;
  *) git fetch --tags origin && git checkout --detach "$1" ;;
esac
echo "Desplegando $(git rev-parse --short HEAD) — $(git log -1 --format=%s)"

# Variables de producción también en la compilación (NEXT_PUBLIC_*, PUBLIC_SITE_URL en metadatos).
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
# shellcheck disable=SC1090
source "$MIGRATE_ENV_FILE"
set +a
export JAVIS_ENV_FILE="$ENV_FILE"

step "Dependencias (npm ci)"
npm ci --no-audit --no-fund

step "Compilación"
npm run build

step "Copia de la base antes de migrar"
bash infra/server/backup-db.sh pre-migrate

step "Migraciones"
DATABASE_URL="$MIGRATE_DATABASE_URL" npm run db:migrate:deploy
# Por si alguna tabla se creó antes de configurar los privilegios por defecto.
psql "$MIGRATE_DATABASE_URL" -v ON_ERROR_STOP=1 -q <<SQL
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $DB_APP_ROLE;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO $DB_APP_ROLE;
SQL

step "Procesos (PM2)"
pm2 startOrReload infra/pm2/ecosystem.config.cjs --update-env
pm2 save

step "Comprobación de salud"
for _ in $(seq 1 30); do
  if body=$(curl -fsS "http://127.0.0.1:$APP_PORT/api/health" 2>/dev/null); then
    echo "OK: $body"
    pm2 ls
    exit 0
  fi
  sleep 2
done
echo "La web no responde en /api/health. Revisa: pm2 logs javis-web --lines 100" >&2
exit 1
