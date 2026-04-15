param(
    [string]$ArchivePath
)

$ErrorActionPreference = "Stop"

if (-not $ArchivePath) {
    throw "Pass -ArchivePath to the image archive tar file"
}

$ArchivePath = (Resolve-Path $ArchivePath).Path

Write-Host "Loading images from $ArchivePath"
& docker load -i $ArchivePath
if ($LASTEXITCODE -ne 0) {
    throw "Image import failed"
}

Write-Host "Images loaded successfully"