#!/usr/bin/env sh
set -eu

BROKER="${KAFKA_BROKER:-kafka:9092}"
TOPICS_FILE="$(dirname "$0")/topics.txt"

if [ ! -f "$TOPICS_FILE" ]; then
  echo "topics.txt not found: $TOPICS_FILE"
  exit 1
fi

echo "Creating Kafka topics on $BROKER"

while IFS= read -r topic; do
  [ -z "$topic" ] && continue
  echo " - $topic"
  docker compose exec -T kafka kafka-topics.sh \
    --bootstrap-server "$BROKER" \
    --create \
    --if-not-exists \
    --topic "$topic" \
    --partitions 3 \
    --replication-factor 1 >/dev/null

done < "$TOPICS_FILE"

echo "Done. Current topics:"
docker compose exec -T kafka kafka-topics.sh --bootstrap-server "$BROKER" --list
