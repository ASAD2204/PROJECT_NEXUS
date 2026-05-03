param(
    [string]$RepositoryRoot,
    [string]$ImagePrefix = "nexus"
)

$ErrorActionPreference = "Stop"

if (-not $RepositoryRoot) {
    $RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
} else {
    $RepositoryRoot = (Resolve-Path $RepositoryRoot).Path
}

$images = @(
    @{ Name = "api-gateway"; Context = "backend/api-gateway"; Dockerfile = "Dockerfile" },
    @{ Name = "auth-service"; Context = "backend/services/auth-service"; Dockerfile = "Dockerfile" },
    @{ Name = "sis-service"; Context = "backend/services/sis-service"; Dockerfile = "Dockerfile" },
    @{ Name = "lms-service"; Context = "backend/services/lms-service"; Dockerfile = "Dockerfile" },
    @{ Name = "finance-service"; Context = "backend/services/finance-service"; Dockerfile = "Dockerfile" },
    @{ Name = "attendance-service"; Context = "backend/services/attendance-service"; Dockerfile = "Dockerfile" },
    @{ Name = "ai-service"; Context = "backend/services/ai-service"; Dockerfile = "Dockerfile" },
    @{ Name = "chat-service"; Context = "backend/services/chat-service"; Dockerfile = "Dockerfile" },
    @{ Name = "analytics-service"; Context = "backend/services/analytics-service"; Dockerfile = "Dockerfile" },
    @{ Name = "hr-service"; Context = "backend/services/hr-service"; Dockerfile = "Dockerfile" },
    @{ Name = "library-service"; Context = "backend/services/library-service"; Dockerfile = "Dockerfile" },
    @{ Name = "operations-service"; Context = "backend/services/operations-service"; Dockerfile = "Dockerfile" },
    @{ Name = "alumni-service"; Context = "backend/services/alumni-service"; Dockerfile = "Dockerfile" },
    @{ Name = "scheduler-service"; Context = "backend/services/scheduler-service"; Dockerfile = "Dockerfile" },
    @{ Name = "notification-service"; Context = "backend/services/notification-service"; Dockerfile = "Dockerfile" },
    @{ Name = "frontend"; Context = "frontend"; Dockerfile = "docker/Dockerfile" },
    @{ Name = "backup-service"; Context = "infrastructure/backup"; Dockerfile = "Dockerfile" }
)

foreach ($item in $images) {
    $contextPath = Join-Path $RepositoryRoot $item.Context
    $dockerfilePath = Join-Path $contextPath $item.Dockerfile
    $imageName = "$ImagePrefix/$($item.Name):latest"

    Write-Host "Building $imageName"
    & docker build -t $imageName -f $dockerfilePath $contextPath
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed for $imageName"
    }
}

Write-Host "All images built successfully"