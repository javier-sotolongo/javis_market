#!/usr/bin/env bash
# Copia local de la base (pg_dump -Fc) en $BACKUP_DIR. La usan deploy.sh (antes de migrar) y el cron diario.
#
#   bash infra/server/backup-db.sh [etiqueta]     # etiqueta: daily, pre-migrate, manual…
#
# Conserva las 14 más recientes de cada etiqueta. Son copias LOCALES: falta enviarlas fuera del VPS
# (docs/deployment.md#copias-de-seguridad-externas). Restaurar: pg_restore --clean --if-exists -d <URL> <archivo>
set -euo pipefail

# shellcheck source=config.sh
source "$(dirname "${BASH_SOURCE[0]}")/config.sh"
label="${1:-manual}"
keep=14

set -a
# shellcheck disable=SC1090
source "$MIGRATE_ENV_FILE"
set +a

umask 077
file="$BACKUP_DIR/$DB_NAME-$label-$(date +%Y%m%d-%H%M%S).dump"
pg_dump --format=custom --no-owner --file="$file" "$MIGRATE_DATABASE_URL"
echo "$(date -Is) copia creada: $file ($(du -h "$file" | cut -f1))"

# Rotación
mapfile -t old < <(ls -1t "$BACKUP_DIR/$DB_NAME-$label-"*.dump 2>/dev/null | tail -n +$((keep + 1)))
((${#old[@]})) && rm -f -- "${old[@]}"
exit 0
