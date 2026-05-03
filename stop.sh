#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

REMOVE_VOLUMES=false
for arg in "$@"; do
  case "$arg" in
    -v|--volumes)
      REMOVE_VOLUMES=true
      ;;
  esac
done

if [ "$REMOVE_VOLUMES" = true ]; then
  docker compose down --volumes
else
  docker compose down
fi
