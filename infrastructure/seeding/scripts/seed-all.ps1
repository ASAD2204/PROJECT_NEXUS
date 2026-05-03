param(
    [string]$PostgresContainer,
    [string]$MongoContainer,
    [string]$PostgresUser = "nexus_user",
    [string]$PostgresDb = "nexus_db"
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$sqlPath = Join-Path $repoRoot "infrastructure\seeding\postgres\seed-dev.sql"
$mongoPath = Join-Path $repoRoot "infrastructure\seeding\mongo\seed-dev.js"

if (-not (Test-Path $sqlPath)) {
    throw "Missing seed SQL: $sqlPath"
}
if (-not (Test-Path $mongoPath)) {
    throw "Missing seed JS: $mongoPath"
}

if (-not $PostgresContainer) {
    $PostgresContainer = docker ps --format "{{.Names}}" | Where-Object { $_ -match "postgres" } | Select-Object -First 1
}
if (-not $MongoContainer) {
    $MongoContainer = docker ps --format "{{.Names}}" | Where-Object { $_ -match "mongodb|mongo" } | Select-Object -First 1
}

if (-not $PostgresContainer) {
    throw "Could not find a running Postgres container. Pass -PostgresContainer explicitly."
}
if (-not $MongoContainer) {
    throw "Could not find a running Mongo container. Pass -MongoContainer explicitly."
}

Write-Host "Seeding PostgreSQL via container: $PostgresContainer"
Get-Content $sqlPath -Raw | docker exec -i $PostgresContainer psql -U $PostgresUser -d $PostgresDb -v ON_ERROR_STOP=1
if ($LASTEXITCODE -ne 0) {
    throw "PostgreSQL seed failed"
}

Write-Host "Seeding MongoDB via container: $MongoContainer"
Get-Content $mongoPath -Raw | docker exec -i $MongoContainer mongosh --quiet
if ($LASTEXITCODE -ne 0) {
    throw "MongoDB seed failed"
}

Write-Host "All seeds applied successfully."
