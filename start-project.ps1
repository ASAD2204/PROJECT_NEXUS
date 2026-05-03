param(
    [switch]$SkipSeed,
    [switch]$Recreate,
    [switch]$NoBuild
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path $PSScriptRoot).Path
$composeFile = Join-Path $repoRoot "docker-compose.yml"
$envExample = Join-Path $repoRoot ".env.example"
$envFile = Join-Path $repoRoot ".env"
$seedScript = Join-Path $repoRoot "infrastructure\seeding\scripts\seed-all.ps1"

function Get-FreePort {
    param(
        [int[]]$PreferredPorts = @(3000, 3001, 3002, 3003, 3004)
    )

    foreach ($port in $PreferredPorts) {
        $inUse = $false
        try {
            $inUse = [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
        } catch {
            $inUse = $false
        }

        if (-not $inUse) {
            return $port
        }
    }

    throw "No free frontend port found in the range 3000-3004."
}

if (-not (Test-Path $composeFile)) {
    throw "Missing docker-compose.yml at $composeFile"
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker is not installed or not available in PATH."
}

if (-not (Test-Path $envFile)) {
    if (-not (Test-Path $envExample)) {
        throw "Missing .env and .env.example at repository root"
    }

    Copy-Item $envExample $envFile
    Write-Host "Created .env from .env.example"
}

Write-Host "Starting Project Nexus stack"
$env:FRONTEND_PORT = Get-FreePort
Write-Host "Using frontend host port: $env:FRONTEND_PORT"

$composeDownArgs = @("compose", "down", "--remove-orphans")
& docker @composeDownArgs | Out-Null

$composeArgs = @("compose", "up", "-d")
if ($Recreate) { $composeArgs += "--force-recreate" }
if ($NoBuild) { $composeArgs += "--no-build" }

& docker @composeArgs
if ($LASTEXITCODE -ne 0) {
    throw "docker compose up failed"
}

Write-Host "Waiting for database containers"
Start-Sleep -Seconds 10

& docker compose ps postgres mongodb

if (-not $SkipSeed) {
    if (-not (Test-Path $seedScript)) {
        throw "Missing seed script at $seedScript"
    }

    Write-Host "Applying demo seed data"
    Set-ExecutionPolicy Bypass -Scope Process -Force
    & $seedScript
    if ($LASTEXITCODE -ne 0) {
        throw "Seeding failed"
    }
}

Write-Host "Stack status"
& docker compose ps

Write-Host ""
Write-Host "Open the project here:"
Write-Host "  Frontend:   http://localhost:$env:FRONTEND_PORT"
Write-Host "  API gateway: http://localhost/api/v1"
Write-Host "  Auth docs:   http://localhost/api/v1/auth/docs"
Write-Host ""
Write-Host "Demo credentials:"
Write-Host "  Admin      admin@nexus.edu / Admin@12345"
Write-Host "  Faculty    faculty@nexus.edu / Faculty@12345"
Write-Host "  Student    student@nexus.edu / Student@12345"
Write-Host "  HOD        hod@nexus.edu / Hod@12345"
Write-Host "  Librarian  librarian@nexus.edu / Librarian@12345"
Write-Host "  Alumni     alumni@nexus.edu / Alumni@12345"