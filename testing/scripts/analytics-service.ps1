param(
    [string]$BaseUrl = 'http://127.0.0.1',
    [string]$AuthBaseUrl = 'http://127.0.0.1',
    [string]$AdminEmail = 'admin@nexus.edu',
    [string]$AdminPassword = 'Admin@12345',
    [string]$FacultyEmail = 'faculty@nexus.edu',
    [string]$FacultyPassword = 'Faculty@12345',
    [string]$StudentEmail = 'student@nexus.edu',
    [string]$StudentPassword = 'Student@12345'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$serviceName = 'analytics-service'
$logDirectory = Join-Path (Join-Path $PSScriptRoot '..\logs') $serviceName
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logPath = Join-Path $logDirectory "analytics-smoke-$stamp.log"
$jsonPath = Join-Path $logDirectory "analytics-smoke-$stamp.json"

$BaseUrl = $BaseUrl.TrimEnd('/')
$AuthBaseUrl = $AuthBaseUrl.TrimEnd('/')
$apiBase = "$BaseUrl/api/v1/analytics"
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

Write-Log "Service: $serviceName"
Write-Log "Base URL: $BaseUrl"

$adminToken = Resolve-AuthToken -Email $AdminEmail -Password $AdminPassword -Label 'admin'
$facultyToken = Resolve-AuthToken -Email $FacultyEmail -Password $FacultyPassword -Label 'faculty'
$studentToken = Resolve-AuthToken -Email $StudentEmail -Password $StudentPassword -Label 'student'
Write-Log 'Admin token: present'
Write-Log 'Faculty token: present'
Write-Log 'Student token: present'

$studentProfileResponse = Invoke-TestRequest -Method GET -Uri "$BaseUrl/api/v1/sis/students/me" -Headers @{ Authorization = "Bearer $studentToken" } -ExpectedStatus @(200)
Add-Result -Step 'Resolve student profile from SIS' -Outcome $studentProfileResponse -Expectation '200'
$studentProfileData = Parse-ResponseBody -BodyText $studentProfileResponse.BodyText
if (-not $studentProfileData -or -not $studentProfileData.student_id) {
    throw 'Could not resolve the SIS student profile for the analytics smoke test.'
}

$studentId = [int]$studentProfileData.student_id
Write-Log ("Resolved SIS student_id: {0}" -f $studentId)

$gatewayHealth = Invoke-TestRequest -Method GET -Uri "$BaseUrl/health" -ExpectedStatus @(200)
Add-Result -Step 'Gateway health' -Outcome $gatewayHealth -Expectation '200'

$adminDashboardResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/dashboard/admin" -Headers @{ Authorization = "Bearer $adminToken" } -ExpectedStatus @(200)
Add-Result -Step 'Read admin dashboard' -Outcome $adminDashboardResponse -Expectation '200'
$adminDashboardData = Parse-ResponseBody -BodyText $adminDashboardResponse.BodyText
if (-not $adminDashboardData -or -not $adminDashboardData.attendance -or -not $adminDashboardData.revenue) {
    throw 'Admin dashboard response is missing expected KPI sections.'
}

$facultyDashboardResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/dashboard/faculty" -Headers @{ Authorization = "Bearer $facultyToken" } -ExpectedStatus @(200)
Add-Result -Step 'Read faculty dashboard' -Outcome $facultyDashboardResponse -Expectation '200'
$facultyDashboardData = Parse-ResponseBody -BodyText $facultyDashboardResponse.BodyText
if (-not $facultyDashboardData) {
    throw 'Faculty dashboard did not return a response body.'
}

$sectionId = $null
$sectionRiskResponse = $null
for ($candidateSectionId = 1; $candidateSectionId -le 10; $candidateSectionId++) {
    $candidateSectionResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/at-risk/section/$candidateSectionId" -Headers @{ Authorization = "Bearer $adminToken" } -ExpectedStatus @(200, 404)
    Write-Log ("[INFO] Section risk probe section_id={0} -> {1}" -f $candidateSectionId, $candidateSectionResponse.StatusCode)

    if ($candidateSectionResponse.StatusCode -eq 200) {
        $sectionId = $candidateSectionId
        $sectionRiskResponse = $candidateSectionResponse
        break
    }
}

if (-not $sectionRiskResponse) {
    throw 'Could not locate a valid section for the at-risk smoke check.'
}

Add-Result -Step 'Read section at-risk breakdown' -Outcome $sectionRiskResponse -Expectation '200'
$sectionRiskData = Parse-ResponseBody -BodyText $sectionRiskResponse.BodyText
if (-not $sectionRiskData -or $sectionRiskData.section_id -ne $sectionId) {
    throw 'Section at-risk response did not match the requested section.'
}

Write-Log ("Resolved section_id for at-risk check: {0}" -f $sectionId)

$studentDashboardResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/dashboard/student" -Headers @{ Authorization = "Bearer $studentToken" } -ExpectedStatus @(200)
Add-Result -Step 'Read student dashboard' -Outcome $studentDashboardResponse -Expectation '200'
$studentDashboardData = Parse-ResponseBody -BodyText $studentDashboardResponse.BodyText
if (-not $studentDashboardData -or $studentDashboardData.student_id -ne $studentId) {
    throw 'Student dashboard did not return the expected student record.'
}

$studentRiskResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/student/$studentId/risk" -Headers @{ Authorization = "Bearer $studentToken" } -ExpectedStatus @(200)
Add-Result -Step 'Read student risk' -Outcome $studentRiskResponse -Expectation '200'
$studentRiskData = Parse-ResponseBody -BodyText $studentRiskResponse.BodyText
if (-not $studentRiskData -or $studentRiskData.student_id -ne $studentId) {
    throw 'Student risk response did not return the requested student.'
}

$analyticsEventBody = @{
    event_type = 'page_view'
    page_url = '/smoke/analytics'
    referrer_url = '/smoke/start'
    properties = @{ source = 'smoke-test'; student_id = $studentId }
    device_info = @{ browser = 'PowerShell'; platform = 'Windows' }
}

$createEventResponse = Invoke-TestRequest -Method POST -Uri "$apiBase/events" -Body $analyticsEventBody -Headers @{ Authorization = "Bearer $studentToken" } -ExpectedStatus @(201)
Add-Result -Step 'Track analytics event' -Outcome $createEventResponse -Expectation '201'
$createEventData = Parse-ResponseBody -BodyText $createEventResponse.BodyText
if (-not $createEventData -or -not $createEventData.id) {
    throw 'Analytics event creation did not return an inserted id.'
}

$listEventsResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/events?event_type=page_view&limit=20" -Headers @{ Authorization = "Bearer $adminToken" } -ExpectedStatus @(200)
Add-Result -Step 'List analytics events' -Outcome $listEventsResponse -Expectation '200'
$listEventsData = Parse-ResponseBody -BodyText $listEventsResponse.BodyText
$eventFound = $false
foreach ($entry in @($listEventsData)) {
    if ($entry.id -eq $createEventData.id -or $entry.page_url -eq '/smoke/analytics') {
        $eventFound = $true
        break
    }
}
if (-not $eventFound) {
    throw 'Created analytics event was not found in the admin event list.'
}

$eventSummaryResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/events/summary" -Headers @{ Authorization = "Bearer $adminToken" } -ExpectedStatus @(200)
Add-Result -Step 'Read analytics summary' -Outcome $eventSummaryResponse -Expectation '200'
$eventSummaryData = Parse-ResponseBody -BodyText $eventSummaryResponse.BodyText
if (-not $eventSummaryData) {
    throw 'Analytics summary did not return any rows.'
}

$summary = [pscustomobject]@{
    Service = $serviceName
    BaseUrl = $BaseUrl
    AuthBaseUrl = $AuthBaseUrl
    AdminEmail = $AdminEmail
    FacultyEmail = $FacultyEmail
    StudentEmail = $StudentEmail
    RanAt = (Get-Date).ToString('o')
    Passed = $overallPassed
    LogPath = $logPath
    Results = $results
}

$summary | ConvertTo-Json -Depth 8 | Set-Content -Path $jsonPath -Encoding UTF8

if ($overallPassed) {
    Write-Log 'Summary: PASS'
    exit 0
}

Write-Log 'Summary: FAIL'
exit 1
