$ErrorActionPreference = "Stop"

$broker = if ($env:KAFKA_BROKER) { $env:KAFKA_BROKER } else { "kafka:9092" }
$topicsFile = Join-Path $PSScriptRoot "topics.txt"

if (-not (Test-Path $topicsFile)) {
    throw "topics.txt not found: $topicsFile"
}

Write-Host "Creating Kafka topics on $broker"

Get-Content $topicsFile | ForEach-Object {
    $topic = $_.Trim()
    if ([string]::IsNullOrWhiteSpace($topic)) { return }

    Write-Host " - $topic"
    docker compose exec -T kafka kafka-topics.sh `
        --bootstrap-server $broker `
        --create `
        --if-not-exists `
        --topic $topic `
        --partitions 3 `
        --replication-factor 1 | Out-Null
}

Write-Host "Done. Current topics:"
docker compose exec -T kafka kafka-topics.sh --bootstrap-server $broker --list
