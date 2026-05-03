#!/usr/bin/env bash
set -euo pipefail

POSTGRES_CONTAINER="${1:-}"
MONGO_CONTAINER="${2:-}"
POSTGRES_USER="${POSTGRES_USER:-nexus_user}"
POSTGRES_DB="${POSTGRES_DB:-nexus_db}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
SQL_PATH="${REPO_ROOT}/infrastructure/seeding/postgres/seed-dev.sql"
MONGO_PATH="${REPO_ROOT}/infrastructure/seeding/mongo/seed-dev.js"

if [[ ! -f "${SQL_PATH}" ]]; then
  echo "Missing seed SQL: ${SQL_PATH}" >&2
  exit 1
fi
if [[ ! -f "${MONGO_PATH}" ]]; then
  echo "Missing seed JS: ${MONGO_PATH}" >&2
  exit 1
fi

if [[ -z "${POSTGRES_CONTAINER}" ]]; then
  POSTGRES_CONTAINER="$(docker ps --format '{{.Names}}' | grep -E 'postgres' | head -n 1 || true)"
fi
if [[ -z "${MONGO_CONTAINER}" ]]; then
  MONGO_CONTAINER="$(docker ps --format '{{.Names}}' | grep -E 'mongodb|mongo' | head -n 1 || true)"
fi

if [[ -z "${POSTGRES_CONTAINER}" ]]; then
  echo "Could not find a running Postgres container. Pass it as arg1." >&2
  exit 1
fi
if [[ -z "${MONGO_CONTAINER}" ]]; then
  echo "Could not find a running Mongo container. Pass it as arg2." >&2
  exit 1
fi

echo "Seeding PostgreSQL via container: ${POSTGRES_CONTAINER}"
cat "${SQL_PATH}" | docker exec -i "${POSTGRES_CONTAINER}" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -v ON_ERROR_STOP=1

echo "Seeding MongoDB via container: ${MONGO_CONTAINER}"
cat "${MONGO_PATH}" | docker exec -i "${MONGO_CONTAINER}" mongosh --quiet

echo "All seeds applied successfully."
