param(
    [string]$RepositoryRoot
)

$ErrorActionPreference = "Stop"

if (-not $RepositoryRoot) {
    $RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
} else {
    $RepositoryRoot = (Resolve-Path $RepositoryRoot).Path
}

$source = Join-Path $RepositoryRoot ".env.example"
$target = Join-Path $RepositoryRoot ".env"

if (-not (Test-Path $source)) {
    throw "Missing .env.example at $source"
}

if (-not (Test-Path $target)) {
    Copy-Item $source $target
    Write-Host "Created .env from .env.example"
} else {
    Write-Host ".env already exists"
}