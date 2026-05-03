param(
    [string]$RepositoryRoot,
    [string]$ImagePrefix = "nexus",
    [string]$OutputPath
)

$ErrorActionPreference = "Stop"

if (-not $RepositoryRoot) {
    $RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
} else {
    $RepositoryRoot = (Resolve-Path $RepositoryRoot).Path
}

if (-not $OutputPath) {
    $artifactsDir = Join-Path $RepositoryRoot "deployment/artifacts"
    if (-not (Test-Path $artifactsDir)) {
        New-Item -ItemType Directory -Path $artifactsDir | Out-Null
    }
    $OutputPath = Join-Path $artifactsDir "nexus-images.tar"
}

$images = @(
    "$ImagePrefix/api-gateway:latest",
    "$ImagePrefix/auth-service:latest",
    "$ImagePrefix/sis-service:latest",
    "$ImagePrefix/lms-service:latest",
    "$ImagePrefix/finance-service:latest",
    "$ImagePrefix/attendance-service:latest",
    "$ImagePrefix/ai-service:latest",
    "$ImagePrefix/chat-service:latest",
    "$ImagePrefix/analytics-service:latest",
    "$ImagePrefix/hr-service:latest",
    "$ImagePrefix/library-service:latest",
    "$ImagePrefix/operations-service:latest",
    "$ImagePrefix/alumni-service:latest",
    "$ImagePrefix/scheduler-service:latest",
    "$ImagePrefix/notification-service:latest",
    "$ImagePrefix/frontend:latest",
    "$ImagePrefix/backup-service:latest"
)

Write-Host "Exporting images to $OutputPath"
& docker save -o $OutputPath @images
if ($LASTEXITCODE -ne 0) {
    throw "Image export failed"
}

Write-Host "Image archive created successfully"