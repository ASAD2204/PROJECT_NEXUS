param(
    [string]$StackName = "nexus",
    [switch]$LeaveSwarm
)

$ErrorActionPreference = "Stop"

& docker stack rm $StackName
if ($LASTEXITCODE -ne 0) {
    throw "Could not remove stack $StackName"
}

if ($LeaveSwarm) {
    & docker swarm leave --force
    if ($LASTEXITCODE -ne 0) {
        throw "Could not leave swarm"
    }
}

Write-Host "Stack removed"