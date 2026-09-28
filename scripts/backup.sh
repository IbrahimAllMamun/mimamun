#!/usr/bin/env bash
# Backs up the database (custom-format pg_dump) and the uploads volume.
#
#   scripts/backup.sh [backup-dir]
#
# Run from the repository root on the Docker host, e.g. nightly from cron:
#   15 3 * * * cd /srv/portfolio && scripts/backup.sh /srv/backups >> /var/log/portfolio-backup.log 2>&1
# Keeps the 14 most recent backups. Copy the directory off the host as well.
set -euo pipefail

COMPOSE=(docker compose -f docker-compose.prod.yml --env-file .env.production)
DEST="${1:-backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
KEEP="${KEEP_BACKUPS:-14}"
mkdir -p "$DEST"

echo "[$STAMP] dumping database"
"${COMPOSE[@]}" exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner' \
  > "$DEST/db-$STAMP.dump"

echo "[$STAMP] archiving uploads"
"${COMPOSE[@]}" run --rm --no-deps -v "$(realpath "$DEST")":/backup --entrypoint sh api \
  -c "tar -C /data/uploads -czf /backup/uploads-$STAMP.tar.gz ."

# Retention: newest $KEEP of each kind.
ls -1t "$DEST"/db-*.dump 2>/dev/null | tail -n +"$((KEEP + 1))" | xargs -r rm --
ls -1t "$DEST"/uploads-*.tar.gz 2>/dev/null | tail -n +"$((KEEP + 1))" | xargs -r rm --

echo "[$STAMP] done: $DEST/db-$STAMP.dump, $DEST/uploads-$STAMP.tar.gz"
