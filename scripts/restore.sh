#!/usr/bin/env bash
# Restores a backup made by scripts/backup.sh. Destructive: replaces the
# current database contents and uploads.
#
#   scripts/restore.sh backups/db-20260101T031500Z.dump backups/uploads-20260101T031500Z.tar.gz
set -euo pipefail

DB_DUMP="${1:?Usage: scripts/restore.sh <db.dump> [uploads.tar.gz]}"
UPLOADS="${2:-}"
COMPOSE=(docker compose -f docker-compose.prod.yml --env-file .env.production)

read -r -p "This replaces the current database${UPLOADS:+ and uploads}. Type 'restore' to continue: " answer
[ "$answer" = "restore" ] || { echo "Cancelled."; exit 1; }

echo "Stopping the apps"
"${COMPOSE[@]}" stop web api

echo "Restoring the database"
"${COMPOSE[@]}" exec -T postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' < "$DB_DUMP"

if [ -n "$UPLOADS" ]; then
  echo "Restoring uploads"
  "${COMPOSE[@]}" run --rm --no-deps -v "$(realpath "$(dirname "$UPLOADS")")":/backup --entrypoint sh api \
    -c "find /data/uploads -mindepth 1 -delete && tar -C /data/uploads -xzf /backup/$(basename "$UPLOADS")"
fi

echo "Starting the apps (pending migrations run first)"
"${COMPOSE[@]}" up -d
echo "Restore complete. Check https://\$SITE_DOMAIN/api/health/db"
