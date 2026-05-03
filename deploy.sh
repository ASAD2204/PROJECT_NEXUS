#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

WITH_MONITORING=false
for arg in "$@"; do
  case "$arg" in
    --with-monitoring)
      WITH_MONITORING=true
      ;;
  esac
done

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is not installed or not in PATH" >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose is not available" >&2
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Warning: .env was missing, copied from .env.example"
fi

echo "Validating compose configuration..."
docker compose config --quiet

echo "Building images in parallel..."
docker compose build --parallel

echo "Starting infrastructure..."
docker compose up -d postgres redis mongodb kafka

wait_healthy() {
  local service="$1"
  local timeout_seconds="${2:-60}"
  local start_time
  start_time=$(date +%s)

  while true; do
    local container_id
    container_id=$(docker compose ps -q "$service" 2>/dev/null || true)
    if [ -n "$container_id" ]; then
      local health_status
      health_status=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null || true)
      if [ "$health_status" = "healthy" ] || [ "$health_status" = "running" ]; then
        echo "$service is healthy"
        return 0
      fi
    fi

    if [ $(( $(date +%s) - start_time )) -ge "$timeout_seconds" ]; then
      echo "Timed out waiting for $service" >&2
      docker compose ps
      exit 1
    fi

    sleep 3
  done
}

wait_healthy postgres 60
wait_healthy redis 60
wait_healthy mongodb 60
wait_healthy kafka 60

echo "Starting auth-service..."
docker compose up -d auth-service
wait_healthy auth-service 60

echo "Starting api-gateway..."
docker compose up -d api-gateway
wait_healthy api-gateway 60

echo "Starting backend services..."
docker compose up -d sis-service lms-service finance-service attendance-service ai-service chat-service analytics-service hr-service library-service operations-service notification-service scheduler-service alumni-service

echo "Starting frontend..."
docker compose up -d frontend

if [ "$WITH_MONITORING" = true ]; then
  echo "Starting backup and monitoring services..."
  docker compose up -d backup-service prometheus blackbox-exporter grafana
fi

echo
printf '%-20s %-12s %-18s %-10s\n' "Service" "Port" "Container Status" "Health"
for service in postgres redis mongodb kafka auth-service api-gateway sis-service lms-service finance-service attendance-service ai-service chat-service analytics-service hr-service library-service operations-service notification-service scheduler-service alumni-service frontend; do
  container_id=$(docker compose ps -q "$service" 2>/dev/null || true)
  if [ -n "$container_id" ]; then
    status=$(docker inspect -f '{{.State.Status}}' "$container_id" 2>/dev/null || echo "unknown")
    health=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}n/a{{end}}' "$container_id" 2>/dev/null || echo "unknown")
  else
    status="not-running"
    health="n/a"
  fi

  port="-"
  case "$service" in
    postgres) port="5432" ;;
    mongodb) port="27017" ;;
    redis) port="6379" ;;
    kafka) port="9092" ;;
    auth-service|sis-service|lms-service|finance-service|attendance-service|ai-service|chat-service|analytics-service|hr-service|library-service|operations-service|notification-service|scheduler-service|alumni-service) port="8000" ;;
    api-gateway) port="80" ;;
    frontend) port="3000" ;;
  esac

  printf '%-20s %-12s %-18s %-10s\n' "$service" "$port" "$status" "$health"
done

echo
cat <<'EOF'
Access URLs:
Frontend:    http://localhost:3000
API Gateway: http://localhost:80
Grafana:     http://localhost:3001
EOF
