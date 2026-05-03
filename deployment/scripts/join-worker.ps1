param(
    [string]$ManagerAddress,
    [string]$JoinToken
)

$ErrorActionPreference = "Stop"

if (-not $ManagerAddress -or -not $JoinToken) {
    throw "Usage: join-worker.ps1 -ManagerAddress <ip-or-host> -JoinToken <token>"
}

& docker swarm join --token $JoinToken "$ManagerAddress:2377"
if ($LASTEXITCODE -ne 0) {
    throw "Worker join failed"
}

Write-Host "Worker joined the swarm successfully"