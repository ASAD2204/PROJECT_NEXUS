param(
    [string]$RepositoryRoot,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

if (-not $RepositoryRoot) {
    $RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
} else {
    $RepositoryRoot = (Resolve-Path $RepositoryRoot).Path
}

$prepareEnv = Join-Path $PSScriptRoot "prepare-env.ps1"
& $prepareEnv -RepositoryRoot $RepositoryRoot

$swarmState = (& docker info --format "{{.Swarm.LocalNodeState}}" 2>$null).Trim()
if ($swarmState -ne "active") {
    Write-Host "Initializing Docker Swarm"
    & docker swarm init | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker Swarm init failed"
    }
}

if (-not $SkipBuild) {
    $buildImages = Join-Path $PSScriptRoot "build-images.ps1"
    & $buildImages -RepositoryRoot $RepositoryRoot
}

$stackFile = Join-Path $RepositoryRoot "docker-compose.yml"
$overrideFile = Join-Path $RepositoryRoot "deployment/stack.single-node.yml"

Write-Host "Deploying Project Nexus stack"
& docker stack deploy -c $stackFile -c $overrideFile nexus
if ($LASTEXITCODE -ne 0) {
    throw "Stack deployment failed"
}

Write-Host "Deployment complete"
Write-Host "Frontend: http://localhost"
Write-Host "API Gateway: http://localhost:8081"