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

$serviceName = 'alumni-service'
$logDirectory = Join-Path (Join-Path $PSScriptRoot '..\logs') $serviceName
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logPath = Join-Path $logDirectory "alumni-smoke-$stamp.log"
$jsonPath = Join-Path $logDirectory "alumni-smoke-$stamp.json"

$BaseUrl = $BaseUrl.TrimEnd('/')
$AuthBaseUrl = $AuthBaseUrl.TrimEnd('/')
$apiBase = "$BaseUrl/api/v1/alumni"
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

function Find-AlumniRecord {
    param(
        [Parameter(Mandatory = $true)][string]$Employer,
        [Parameter(Mandatory = $true)][int]$GradYear
    )

    $query = [System.Web.HttpUtility]::UrlEncode($Employer)
    $lookupResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/directory?grad_year=$GradYear&employer=$query" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
    Add-Result -Step 'Lookup alumni directory entry' -Outcome $lookupResponse -Expectation '200'

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

$directoryResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/directory" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
Add-Result -Step 'List alumni directory' -Outcome $directoryResponse -Expectation '200'
$directoryData = Parse-ResponseBody -BodyText $directoryResponse.BodyText

$jobsResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/jobs" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
Add-Result -Step 'List alumni jobs' -Outcome $jobsResponse -Expectation '200'

$eventsBeforeResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/events" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
Add-Result -Step 'List alumni events' -Outcome $eventsBeforeResponse -Expectation '200'

$storiesResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/stories" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
Add-Result -Step 'List alumni stories' -Outcome $storiesResponse -Expectation '200'

$studentProfileProbe = Invoke-TestRequest -Method GET -Uri "$apiBase/profile" -Headers @{ Authorization = "Bearer $studentToken" } -ExpectedStatus @(403)
Add-Result -Step 'Reject student alumni profile access' -Outcome $studentProfileProbe -Expectation '403'

$alumniEmployer = 'Nexus Smoke Alumni'
$alumniGradYear = 2026
$alumniRecord = $null
$registerResponse = $null

$registerBody = @{
    student_id = $studentId
    grad_year = $alumniGradYear
    degree = 'BS Information Technology'
    current_employer = $alumniEmployer
    current_position = 'Software Engineer'
    location = 'Remote'
    linkedin_url = 'https://www.linkedin.com/in/nexus-smoke'
    achievements = '["Smoke Test"]'
    expertise = '["Testing", "Automation"]'
}

$registerResponse = Invoke-TestRequest -Method POST -Uri "$apiBase/register" -Body $registerBody -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(201, 409)
Write-Log ("[INFO] Alumni register student_id={0} -> {1}" -f $studentId, $registerResponse.StatusCode)

if ($registerResponse.StatusCode -eq 201) {
    $registerData = Parse-ResponseBody -BodyText $registerResponse.BodyText
    if ($registerData) {
        $alumniRecord = $registerData
    }
}

if ($registerResponse.StatusCode -eq 409) {
    $alumniRecord = Find-AlumniRecord -Employer $alumniEmployer -GradYear $alumniGradYear
}

if (-not $alumniRecord) {
    throw 'Could not create or locate the alumni smoke record.'
}

$registerOutcome = if ($registerResponse) { $registerResponse } else { [pscustomobject]@{ Passed = $true; StatusCode = 201; BodyText = $null; Error = $null; DurationMs = 0 } }
Add-Result -Step 'Register alumni profile' -Outcome $registerOutcome -Expectation '201/409'

$alumniId = [int]$alumniRecord.alumni_id

$alumniByIdResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/$alumniId" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
Add-Result -Step 'Fetch alumni by id' -Outcome $alumniByIdResponse -Expectation '200'

$directoryLookupResponse = Invoke-TestRequest -Method GET -Uri ("$apiBase/directory?grad_year=$alumniGradYear&employer=$([System.Web.HttpUtility]::UrlEncode($alumniEmployer))") -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
Add-Result -Step 'Verify alumni directory lookup' -Outcome $directoryLookupResponse -Expectation '200'

$directoryLookupData = Parse-ResponseBody -BodyText $directoryLookupResponse.BodyText
$directoryMatch = $false
foreach ($entry in @($directoryLookupData)) {
    if (($entry.alumni_id -eq $alumniId) -and ([int]$entry.grad_year -eq $alumniGradYear)) {
        $directoryMatch = $true
        break
    }
}
if (-not $directoryMatch) {
    throw 'Registered alumni profile was not found in the directory lookup.'
}

$eventTitle = 'Nexus Smoke Alumni Event {0}' -f ([guid]::NewGuid().ToString('N').Substring(0, 8))
$eventBody = @{
    title = $eventTitle
    description = 'Smoke-test alumni meetup'
    event_date = '2026-05-30'
    event_time = '18:30:00'
    venue = 'Main Auditorium'
    event_type = 'Meetup'
    capacity = 100
    organizer = 'Project Nexus QA'
}

$eventResponse = Invoke-TestRequest -Method POST -Uri "$apiBase/events" -Body $eventBody -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(201)
Add-Result -Step 'Create alumni event' -Outcome $eventResponse -Expectation '201'
$eventData = Parse-ResponseBody -BodyText $eventResponse.BodyText
if (-not $eventData -or -not $eventData.event_id) {
    throw 'Event creation did not return an event id.'
}

$eventId = [int]$eventData.event_id

$eventsAfterCreate = Invoke-TestRequest -Method GET -Uri "$apiBase/events" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
Add-Result -Step 'Verify created event in list' -Outcome $eventsAfterCreate -Expectation '200'
$eventsAfterCreateData = Parse-ResponseBody -BodyText $eventsAfterCreate.BodyText
$eventFound = $false
foreach ($entry in @($eventsAfterCreateData)) {
    if ($entry.event_id -eq $eventId -or $entry.title -eq $eventTitle) {
        $eventFound = $true
        break
    }
}
if (-not $eventFound) {
    throw 'Created event was not found in the events list.'
}

$eventRegistration = Invoke-TestRequest -Method POST -Uri "$apiBase/events/$eventId/register" -Headers @{ Authorization = "Bearer $studentToken" } -ExpectedStatus @(201)
Add-Result -Step 'Register student for event' -Outcome $eventRegistration -Expectation '201'

$duplicateRegistration = Invoke-TestRequest -Method POST -Uri "$apiBase/events/$eventId/register" -Headers @{ Authorization = "Bearer $studentToken" } -ExpectedStatus @(409)
Add-Result -Step 'Reject duplicate event registration' -Outcome $duplicateRegistration -Expectation '409'

$summary = [pscustomobject]@{
    Service = $serviceName
    BaseUrl = $BaseUrl
    AuthBaseUrl = $AuthBaseUrl
    AdminEmail = $AdminEmail
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
