# shellcheck shell=bash
# Valores del servidor de producción, compartidos por setup.sh, ssl.sh, deploy.sh y backup-db.sh.
# Se cargan con `source`; no ejecutar directamente.

# Dominio canónico (la tienda vive aquí) y dominios adicionales que redirigen (301) a él.
CANONICAL_DOMAIN="javismarkets.com"
EXTRA_DOMAINS=("javismarket.us" "javismarket.es")
SERVER_IP="208.109.241.127"

# Puerto interno de Next.js (solo 127.0.0.1; el público entra por Nginx).
APP_PORT=3000

# Datos persistentes, fuera del repositorio: un despliegue o un `git clean` no los toca.
BASE_DIR="/srv/javis-market"
ENV_FILE="$BASE_DIR/env/production.env"   # variables de la aplicación (rol javis_app)
MIGRATE_ENV_FILE="$BASE_DIR/env/migrate.env" # URL del rol propietario, solo para migraciones y copias
STORAGE_PUBLIC_DIR="$BASE_DIR/storage/public"
STORAGE_PRIVATE_DIR="$BASE_DIR/storage/private"
LOG_DIR="$BASE_DIR/logs"
BACKUP_DIR="$BASE_DIR/backups"

# PostgreSQL: base dedicada y dos roles (ver docs/security.md#aislamiento-de-postgresql).
DB_NAME="javis_market"
DB_OWNER_ROLE="javis_owner" # propietario del esquema: migraciones
DB_APP_ROLE="javis_app"     # aplicación: solo DML

# Raíz del repositorio (donde esté clonado).
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Todos los nombres servidos: canónico + www + adicionales + sus www.
all_domains() {
  local d
  printf '%s\n' "$CANONICAL_DOMAIN" "www.$CANONICAL_DOMAIN"
  for d in "${EXTRA_DOMAINS[@]}"; do printf '%s\n' "$d" "www.$d"; done
}
