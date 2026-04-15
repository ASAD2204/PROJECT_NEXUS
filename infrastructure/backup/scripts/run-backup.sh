#!/bin/sh
set -eu

BACKUP_ROOT="/backup/data"
TS="$(date -u +%Y%m%d-%H%M%S)"
DEST="${BACKUP_ROOT}/${TS}"
mkdir -p "${DEST}"

echo "[backup] starting at ${TS}"

# PostgreSQL dump
if command -v pg_dump >/dev/null 2>&1; then
  PGPASSWORD="${POSTGRES_PASSWORD:-nexus_pass}" \
    pg_dump \
      -h "${POSTGRES_HOST:-postgres}" \
      -U "${POSTGRES_USER:-nexus_user}" \
      -d "${POSTGRES_DB:-nexus_db}" \
      -F c \
      -f "${DEST}/postgres.dump"
  echo "[backup] postgres dump complete"
else
  echo "[backup] pg_dump not available"
fi

# MongoDB dump
if command -v mongodump >/dev/null 2>&1; then
  mongodump \
    --host "${MONGO_HOST:-mongodb}" \
    --port "${MONGO_PORT:-27017}" \
    --out "${DEST}/mongo"
  echo "[backup] mongo dump complete"
else
  echo "[backup] mongodump not available"
fi

# Compress output
if command -v tar >/dev/null 2>&1; then
  tar -czf "${BACKUP_ROOT}/${TS}.tar.gz" -C "${BACKUP_ROOT}" "${TS}"
  rm -rf "${DEST}"
  echo "[backup] archive created ${BACKUP_ROOT}/${TS}.tar.gz"
fi

# Retention (days)
RETENTION_DAYS="${RETENTION_DAYS:-30}"
find "${BACKUP_ROOT}" -type f -name "*.tar.gz" -mtime +"${RETENTION_DAYS}" -delete || true

echo "[backup] done"
