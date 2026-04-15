#!/bin/sh
set -eu

INTERVAL_HOURS="${BACKUP_INTERVAL_HOURS:-24}"
SLEEP_SECONDS=$((INTERVAL_HOURS * 3600))

while true; do
  /bin/sh /backup/scripts/run-backup.sh || true
  sleep "${SLEEP_SECONDS}"
done
