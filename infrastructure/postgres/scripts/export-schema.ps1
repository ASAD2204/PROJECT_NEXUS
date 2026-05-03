param(
    [string]$ContainerName = 'project_nexus-asad_node-postgres-1',
    [string]$DatabaseName = 'nexus_db',
    [string]$DatabaseUser = 'nexus_user',
    [string]$OutputPath = (Join-Path $PSScriptRoot '..\schema-inventory.sql')
)

$resolvedOutputPath = [System.IO.Path]::GetFullPath($OutputPath)

Write-Host "Exporting live PostgreSQL schema from $ContainerName to $resolvedOutputPath"

& docker exec $ContainerName pg_dump -U $DatabaseUser -d $DatabaseName --schema-only --no-owner --no-privileges |
    Out-File -FilePath $resolvedOutputPath -Encoding utf8

Write-Host "Schema inventory written to $resolvedOutputPath"