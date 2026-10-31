#!/usr/bin/env bash
# PostgreSQL local para desarrollo, sin tocar el PostgreSQL del sistema ni necesitar sudo.
#
#   scripts/dev-db.sh start    Crea el clúster la primera vez (rol "javis", bases dev/test/e2e) y lo arranca
#   scripts/dev-db.sh stop     Lo detiene
#   scripts/dev-db.sh status   Indica si está en marcha
#
# Datos en $JAVIS_PGDATA (por defecto ~/.local/share/javis-market/postgres), fuera del repositorio:
# PostgreSQL necesita un sistema de archivos con permisos POSIX (no NTFS/FAT).
# Escucha solo en localhost:$JAVIS_PGPORT (5433 por defecto). Credenciales solo de desarrollo.
set -euo pipefail

PGDATA="${JAVIS_PGDATA:-$HOME/.local/share/javis-market/postgres}"
PORT="${JAVIS_PGPORT:-5433}"
BIN="${JAVIS_PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | head -1)}"
LOG="$PGDATA/../postgres.log"

if [[ -z "$BIN" || ! -x "$BIN/pg_ctl" ]]; then
  echo "PostgreSQL server binaries not found. Install them (e.g. 'sudo apt install postgresql') or set JAVIS_PGBIN." >&2
  exit 1
fi

running() { "$BIN/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1; }

case "${1:-}" in
  start)
    if [[ ! -f "$PGDATA/PG_VERSION" ]]; then
      mkdir -p "$PGDATA"
      "$BIN/initdb" -D "$PGDATA" -U postgres --auth=trust -E UTF8 >/dev/null
      fresh=1
    fi
    if running; then
      echo "Already running on localhost:$PORT"
    else
      "$BIN/pg_ctl" -D "$PGDATA" -l "$LOG" -w -o "-p $PORT -k '' -c listen_addresses=localhost" start >/dev/null
      echo "Started on localhost:$PORT (data: $PGDATA)"
    fi
    if [[ "${fresh:-0}" == 1 ]]; then
      psql -h localhost -p "$PORT" -U postgres -q -c "CREATE ROLE javis LOGIN PASSWORD 'javis_dev' CREATEDB;"
      for db in javis_market javis_market_test javis_market_e2e_test; do
        psql -h localhost -p "$PORT" -U postgres -q -c "CREATE DATABASE $db OWNER javis;"
      done
      echo "Created role 'javis' and databases javis_market, javis_market_test, javis_market_e2e_test"
    fi
    ;;
  stop)
    if running; then "$BIN/pg_ctl" -D "$PGDATA" -m fast stop >/dev/null && echo "Stopped"; else echo "Not running"; fi
    ;;
  status)
    if running; then echo "Running on localhost:$PORT (data: $PGDATA)"; else echo "Not running"; fi
    ;;
  *)
    echo "Usage: $0 {start|stop|status}" >&2
    exit 1
    ;;
esac
