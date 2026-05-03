Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-ServiceTestLogPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ServiceName,

        [string]$LogRoot = (Join-Path $PSScriptRoot '..\logs')
    )

    $serviceLogDirectory = Join-Path $LogRoot $ServiceName
    New-Item -ItemType Directory -Force -Path $serviceLogDirectory | Out-Null
    return (Join-Path $serviceLogDirectory 'latest.log')
}

function Write-ServiceTestLine {
    param(
        [Parameter(Mandatory = $true)]
        [string]$LogPath,

        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    $line = '[{0}] {1}' -f (Get-Date -Format o), $Message
    Add-Content -Path $LogPath -Value $line
    Write-Output $line
}

function Invoke-ServiceTestSkeleton {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ServiceName,

        [string]$BaseUrl = '',

        [string]$Token = $env:NEXUS_TEST_TOKEN,

        [string[]]$Checks = @('session', 'functions', 'operations', 'api', 'database', 'networking')
    )

    $logPath = Get-ServiceTestLogPath -ServiceName $ServiceName
    Set-Content -Path $logPath -Value ('[{0}] Service: {1}' -f (Get-Date -Format o), $ServiceName)

    if ($BaseUrl) {
        Write-ServiceTestLine -LogPath $logPath -Message ('Base URL: {0}' -f $BaseUrl)
    }

    if ($Token) {
        Write-ServiceTestLine -LogPath $logPath -Message 'Session token: present'
    }
    else {
        Write-ServiceTestLine -LogPath $logPath -Message 'Session token: missing'
    }

    Write-ServiceTestLine -LogPath $logPath -Message ('Planned checks: {0}' -f ($Checks -join ', '))
    Write-ServiceTestLine -LogPath $logPath -Message 'TODO: add endpoint calls and assertions for this service.'

    return $logPath
}
