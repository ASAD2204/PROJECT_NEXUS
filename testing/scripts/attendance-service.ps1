param(
    [string]$BaseUrl = 'http://127.0.0.1',
    [string]$AuthBaseUrl = 'http://127.0.0.1',
    [string]$AdminEmail = 'admin@nexus.edu',
    [string]$AdminPassword = 'Admin@12345',
    [string]$StudentEmail = 'student@nexus.edu',
    [string]$StudentPassword = 'Student@12345'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$serviceName = 'attendance-service'
$logDirectory = Join-Path (Join-Path $PSScriptRoot '..\logs') $serviceName
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logPath = Join-Path $logDirectory "attendance-smoke-$stamp.log"
$jsonPath = Join-Path $logDirectory "attendance-smoke-$stamp.json"

$BaseUrl = $BaseUrl.TrimEnd('/')
$AuthBaseUrl = $AuthBaseUrl.TrimEnd('/')
$apiBase = "$BaseUrl/api/v1/attendance"
$overallPassed = $true
$results = New-Object System.Collections.Generic.List[object]

function Write-Log {
    param([Parameter(Mandatory = $true)][string]$Message)

    $line = '[{0}] {1}' -f (Get-Date -Format o), $Message
    Add-Content -Path $logPath -Value $line
    Write-Host $line
}

function Parse-ResponseBody {
    param([string]$BodyText)

    if ([string]::IsNullOrWhiteSpace($BodyText)) {
        return $null
    }

    try {
        return $BodyText | ConvertFrom-Json
    } catch {
        return $BodyText
    }
}

function Invoke-TestRequest {
    param(
        [Parameter(Mandatory = $true)][ValidateSet('GET', 'POST', 'PUT', 'DELETE')][string]$Method,
        [Parameter(Mandatory = $true)][string]$Uri,
        [object]$Body = $null,
        [hashtable]$Headers = @{},
        [int[]]$ExpectedStatus = @(200)
    )

    $requestHeaders = @{}
    foreach ($headerName in $Headers.Keys) {
        $requestHeaders[$headerName] = $Headers[$headerName]
    }

    $requestBody = $null
    if ($null -ne $Body) {
        $requestHeaders['Content-Type'] = 'application/json'
        $requestBody = $Body | ConvertTo-Json -Depth 10
    }

    $startedAt = Get-Date
    try {
        if ($null -ne $requestBody) {
            $response = Invoke-WebRequest -Method $Method -Uri $Uri -Headers $requestHeaders -Body $requestBody -UseBasicParsing -TimeoutSec 30
        } else {
            $response = Invoke-WebRequest -Method $Method -Uri $Uri -Headers $requestHeaders -UseBasicParsing -TimeoutSec 30
        }

        $statusCode = [int]$response.StatusCode
        return [pscustomobject]@{
            Passed = $ExpectedStatus -contains $statusCode
            StatusCode = $statusCode
            BodyText = $response.Content
            Error = $null
            DurationMs = [math]::Round((New-TimeSpan -Start $startedAt -End (Get-Date)).TotalMilliseconds, 2)
        }
    } catch {
        $statusCode = $null
        $bodyText = $null
        $response = $_.Exception.Response
        if ($response) {
            try {
                $statusCode = [int]$response.StatusCode
                $stream = $response.GetResponseStream()
                if ($stream) {
                    $reader = New-Object System.IO.StreamReader($stream)
                    $bodyText = $reader.ReadToEnd()
                    $reader.Close()
                }
            } catch {
                # Ignore parsing failures and surface the original exception message.
            }
        }

        return [pscustomobject]@{
            Passed = $ExpectedStatus -contains $statusCode
            StatusCode = $statusCode
            BodyText = $bodyText
            Error = $_.Exception.Message
            DurationMs = [math]::Round((New-TimeSpan -Start $startedAt -End (Get-Date)).TotalMilliseconds, 2)
        }
    }
}

function Add-Result {
    param(
        [Parameter(Mandatory = $true)][string]$Step,
        [Parameter(Mandatory = $true)][object]$Outcome,
        [Parameter(Mandatory = $true)][string]$Expectation
    )

    $detail = $null
    if ($Outcome.BodyText) {
        $detail = $Outcome.BodyText
        if ($detail.Length -gt 300) {
            $detail = $detail.Substring(0, 300)
        }
    }
    elseif ($Outcome.Error) {
        $detail = $Outcome.Error
    }

    $entry = [pscustomobject]@{
        Step = $Step
        Passed = [bool]$Outcome.Passed
        Expected = $Expectation
        StatusCode = $Outcome.StatusCode
        DurationMs = $Outcome.DurationMs
        Detail = $detail
    }

    $results.Add($entry) | Out-Null
    if ($entry.Passed) {
        Write-Log ("[PASS] {0} ({1})" -f $Step, $entry.StatusCode)
    } else {
        Write-Log ("[FAIL] {0} ({1}) {2}" -f $Step, $entry.StatusCode, $detail)
        $script:overallPassed = $false
    }

    return $entry
}

function Resolve-AuthToken {
    param(
        [Parameter(Mandatory = $true)][string]$Email,
        [Parameter(Mandatory = $true)][string]$Password,
        [Parameter(Mandatory = $true)][string]$Label
    )

    $loginBody = @{ email = $Email; password = $Password }
    $loginResponse = Invoke-TestRequest -Method POST -Uri "$AuthBaseUrl/api/v1/auth/login" -Body $loginBody -ExpectedStatus @(200)
    Add-Result -Step ("Acquire {0} token" -f $Label) -Outcome $loginResponse -Expectation '200'

    $loginData = Parse-ResponseBody -BodyText $loginResponse.BodyText
    if (-not $loginData -or -not $loginData.access_token) {
        throw ("Auth-service login for {0} did not return an access token." -f $Label)
    }

    return [string]$loginData.access_token
}

function Find-attendanceRecord {
    param(
        [Parameter(Mandatory = $true)][string]$Employer,
        [Parameter(Mandatory = $true)][int]$GradYear
    )

    $query = [System.Web.HttpUtility]::UrlEncode($Employer)
    $lookupResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/directory?grad_year=$GradYear&employer=$query" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
    Add-Result -Step 'Lookup attendance directory entry' -Outcome $lookupResponse -Expectation '200'

    $lookupData = Parse-ResponseBody -BodyText $lookupResponse.BodyText
    if (-not $lookupData) {
        return $null
    }

    foreach ($entry in @($lookupData)) {
        if (($entry.current_employer -eq $Employer) -and ([int]$entry.grad_year -eq $GradYear)) {
            return $entry
        }
    }

    return $null
}
Write-Log "Service: $serviceName"
Write-Log "Base URL: $BaseUrl"

$script:adminToken = Resolve-AuthToken -Email $AdminEmail -Password $AdminPassword -Label 'admin'
$studentToken = Resolve-AuthToken -Email $StudentEmail -Password $StudentPassword -Label 'student'
Write-Log 'Admin token: present'
Write-Log 'Student token: present'

$studentProfileResponse = Invoke-TestRequest -Method GET -Uri "$BaseUrl/api/v1/sis/students/me" -Headers @{ Authorization = "Bearer $studentToken" } -ExpectedStatus @(200)
Add-Result -Step 'Resolve student profile from SIS' -Outcome $studentProfileResponse -Expectation '200'
$studentProfileData = Parse-ResponseBody -BodyText $studentProfileResponse.BodyText
if (-not $studentProfileData -or -not $studentProfileData.student_id) {
    throw 'Could not resolve the seeded SIS student record for the student token.'
}

$studentId = [int]$studentProfileData.student_id
Write-Log ("Resolved SIS student_id: {0}" -f $studentId)

$gatewayHealth = Invoke-TestRequest -Method GET -Uri "$BaseUrl/health" -ExpectedStatus @(200)
Add-Result -Step 'Gateway health' -Outcome $gatewayHealth -Expectation '200'

$geoResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/geofence" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
Add-Result -Step 'Get Geofence Configuration' -Outcome $geoResponse -Expectation '200'

$geoBody = @{
    campus_lat = 40.7128
    campus_lng = -74.0060
    max_radius_meters = 1500
}
$geoUpdateResponse = Invoke-TestRequest -Method PUT -Uri "$apiBase/geofence" -Body $geoBody -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
Add-Result -Step 'Set Geofence Configuration' -Outcome $geoUpdateResponse -Expectation '200'

$voiceChallengeResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/voice-challenge" -Headers @{ Authorization = "Bearer $studentToken" } -ExpectedStatus @(200)
Add-Result -Step 'Get Voice Challenge' -Outcome $voiceChallengeResponse -Expectation '200'

$gpsBody = @{
    section_id = 9999
    latitude = 40.7129
    longitude = -74.0061
}
$gpsCheckResponse = Invoke-TestRequest -Method POST -Uri "$apiBase/verify-gps" -Body $gpsBody -Headers @{ Authorization = "Bearer $studentToken" } -ExpectedStatus @(200, 403, 404)
Add-Result -Step 'Verify GPS Check' -Outcome $gpsCheckResponse -Expectation '200|403|404'

Write-Log "Overall status: $overallPassed"
$results | ConvertTo-Json -Depth 5 | Out-File -FilePath $jsonPath -Encoding utf8
if ($overallPassed) {
    exit 0
} else {
    exit 1
}
