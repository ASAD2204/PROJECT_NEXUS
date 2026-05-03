param(
    [string]$BaseUrl = 'http://127.0.0.1',
    [string]$AuthBaseUrl = 'http://127.0.0.1',
    [string]$AdminEmail = 'admin@nexus.edu',
    [string]$AdminPassword = 'Admin@12345',
    [string]$FacultyEmail = 'faculty@nexus.edu',
    [string]$FacultyPassword = 'Faculty@12345'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$serviceName = 'scheduler-service'
$logDirectory = Join-Path (Join-Path $PSScriptRoot '..\logs') $serviceName
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logPath = Join-Path $logDirectory "scheduler-smoke-$stamp.log"
$jsonPath = Join-Path $logDirectory "scheduler-smoke-$stamp.json"

$BaseUrl = $BaseUrl.TrimEnd('/')
$AuthBaseUrl = $AuthBaseUrl.TrimEnd('/')
$apiBase = "$BaseUrl/api/v1/scheduler"
$lmsBase = "$BaseUrl/api/v1/lms"
$overallPassed = $true
$results = New-Object System.Collections.Generic.List[object]

$script:adminToken = $null
$script:facultyToken = $null

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

function To-Array {
    param([object]$Value)

    if ($null -eq $Value) {
        return @()
    }

    if ($Value -is [string]) {
        return @($Value)
    }

    if ($Value -is [System.Array]) {
        return @($Value)
    }

    if ($Value -is [System.Collections.IEnumerable]) {
        return @($Value)
    }

    return @($Value)
}

function Find-RecordByProperty {
    param(
        [Parameter(Mandatory = $true)]$Items,
        [Parameter(Mandatory = $true)][string]$PropertyName,
        [Parameter(Mandatory = $true)][string]$ExpectedValue
    )

    foreach ($item in (To-Array $Items)) {
        if ($null -eq $item) {
            continue
        }

        $value = $item.$PropertyName
        if ($null -ne $value -and ([string]$value -eq [string]$ExpectedValue)) {
            return $item
        }
    }

    return $null
}

function New-Outcome {
    param(
        [Parameter(Mandatory = $true)][bool]$Passed,
        [object]$BodyText = $null,
        [string]$Error = $null,
        [int]$StatusCode = 200,
        [double]$DurationMs = 0
    )

    return [pscustomobject]@{
        Passed = $Passed
        BodyText = $BodyText
        Error = $Error
        StatusCode = $StatusCode
        DurationMs = $DurationMs
    }
}

function Require-OutcomePass {
    param(
        [Parameter(Mandatory = $true)]$Outcome,
        [Parameter(Mandatory = $true)][string]$Step
    )

    if (-not $Outcome.Passed) {
        $detail = $Outcome.Error
        if (-not $detail) {
            $detail = $Outcome.BodyText
        }
        throw ("{0} failed with status {1}: {2}" -f $Step, $Outcome.StatusCode, $detail)
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
        $requestBody = $Body | ConvertTo-Json -Depth 12
    }

    $startedAt = Get-Date
    try {
        if ($null -ne $requestBody) {
            $response = Invoke-WebRequest -Method $Method -Uri $Uri -Headers $requestHeaders -Body $requestBody -UseBasicParsing -TimeoutSec 30
        } else {
            $response = Invoke-WebRequest -Method $Method -Uri $Uri -Headers $requestHeaders -UseBasicParsing -TimeoutSec 30
        }

        $statusCode = [int]$response.StatusCode
        return New-Outcome -Passed ($ExpectedStatus -contains $statusCode) -StatusCode $statusCode -BodyText $response.Content -DurationMs ([math]::Round((New-TimeSpan -Start $startedAt -End (Get-Date)).TotalMilliseconds, 2))
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
            }
        }

        if (-not $statusCode -and $_.Exception.Message -match '\((\d{3})\)') {
            $statusCode = [int]$Matches[1]
        }

        return New-Outcome -Passed ($ExpectedStatus -contains $statusCode) -StatusCode ([int]($statusCode -as [int])) -BodyText $bodyText -Error $_.Exception.Message -DurationMs ([math]::Round((New-TimeSpan -Start $startedAt -End (Get-Date)).TotalMilliseconds, 2))
    }
}

function Invoke-TestRequestWithRetry429 {
    param(
        [Parameter(Mandatory = $true)][ValidateSet('GET', 'POST', 'PUT', 'DELETE')][string]$Method,
        [Parameter(Mandatory = $true)][string]$Uri,
        [object]$Body = $null,
        [hashtable]$Headers = @{},
        [int[]]$ExpectedStatus = @(200),
        [int]$MaxRetries = 2,
        [int]$RetryDelaySeconds = 2
    )

    for ($attempt = 1; $attempt -le ($MaxRetries + 1); $attempt++) {
        $outcome = Invoke-TestRequest -Method $Method -Uri $Uri -Body $Body -Headers $Headers -ExpectedStatus $ExpectedStatus
        if ($outcome.StatusCode -ne 429 -or $attempt -ge ($MaxRetries + 1)) {
            return $outcome
        }

        Write-Log ("{0} {1} returned 429; retrying in {2}s (attempt {3}/{4})" -f $Method, $Uri, $RetryDelaySeconds, $attempt, ($MaxRetries + 1))
        Start-Sleep -Seconds $RetryDelaySeconds
    }
}

function Add-Result {
    param(
        [Parameter(Mandatory = $true)][string]$Step,
        [Parameter(Mandatory = $true)][object]$Outcome,
        [Parameter(Mandatory = $true)][string]$Expectation
    )

    $detail = $null
    if ($null -ne $Outcome.BodyText) {
        if ($Outcome.BodyText -is [string]) {
            $detail = $Outcome.BodyText
            if ($detail.Length -gt 300) {
                $detail = $detail.Substring(0, 300)
            }
        } else {
            $detail = [string]$Outcome.BodyText
            if ($detail.Length -gt 300) {
                $detail = $detail.Substring(0, 300)
            }
        }
    } elseif ($Outcome.Error) {
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
    $null = Add-Result -Step ("Acquire {0} token" -f $Label) -Outcome $loginResponse -Expectation '200'
    Require-OutcomePass -Outcome $loginResponse -Step ("Acquire {0} token" -f $Label)

    $loginData = Parse-ResponseBody -BodyText $loginResponse.BodyText
    if (-not $loginData -or -not $loginData.access_token) {
        throw ("Auth-service login for {0} did not return an access token." -f $Label)
    }

    return [string]$loginData.access_token
}

function Resolve-LmsFacultySection {
    param(
        [Parameter(Mandatory = $true)][string]$FacultyToken,
        [Parameter(Mandatory = $true)][string]$AdminToken
    )

    $sectionsResponse = Invoke-TestRequest -Method GET -Uri "$lmsBase/courses/my-courses" -Headers @{ Authorization = "Bearer $FacultyToken" } -ExpectedStatus @(200)
    $null = Add-Result -Step 'Read LMS faculty sections' -Outcome $sectionsResponse -Expectation '200'
    Require-OutcomePass -Outcome $sectionsResponse -Step 'Read LMS faculty sections'

    $sections = To-Array (Parse-ResponseBody -BodyText $sectionsResponse.BodyText)
    $section = $sections | Where-Object { $_ -and $_.section_id } | Select-Object -First 1
    if (-not $section) {
        throw 'No LMS faculty section was returned to seed scheduler smoke.'
    }

    $sectionId = [int]$section.section_id
    $sectionDetailResponse = Invoke-TestRequest -Method GET -Uri "$lmsBase/sections/$sectionId" -Headers @{ Authorization = "Bearer $FacultyToken" } -ExpectedStatus @(200)
    $null = Add-Result -Step 'Read LMS section detail' -Outcome $sectionDetailResponse -Expectation '200'
    Require-OutcomePass -Outcome $sectionDetailResponse -Step 'Read LMS section detail'

    $sectionDetail = Parse-ResponseBody -BodyText $sectionDetailResponse.BodyText
    if (-not $sectionDetail -or -not $sectionDetail.section_id) {
        throw 'LMS section detail did not return a section_id.'
    }

    return [pscustomobject]@{
        SectionId = [int]$sectionDetail.section_id
        FacultyId = [int]$sectionDetail.faculty_id
        RoomNo = [string]$sectionDetail.room_no
        CourseId = [int]$sectionDetail.course_id
    }
}

Write-Log "Service: $serviceName"
Write-Log "Base URL: $BaseUrl"
Write-Log "Auth Base URL: $AuthBaseUrl"

$health = Invoke-TestRequest -Method GET -Uri "$BaseUrl/health" -ExpectedStatus @(200)
$null = Add-Result -Step 'Gateway health' -Outcome $health -Expectation '200'
Require-OutcomePass -Outcome $health -Step 'Gateway health'

$script:adminToken = Resolve-AuthToken -Email $AdminEmail -Password $AdminPassword -Label 'admin'
$script:facultyToken = Resolve-AuthToken -Email $FacultyEmail -Password $FacultyPassword -Label 'faculty'
Write-Log 'Admin token: present'
Write-Log 'Faculty token: present'

$facultySection = Resolve-LmsFacultySection -FacultyToken $script:facultyToken -AdminToken $script:adminToken
Write-Log ("Resolved LMS section_id: {0}" -f $facultySection.SectionId)
Write-Log ("Resolved LMS section course_id: {0}" -f $facultySection.CourseId)
$sectionRoomLabel = $facultySection.RoomNo
if ([string]::IsNullOrWhiteSpace($sectionRoomLabel)) {
    $sectionRoomLabel = 'n/a'
}
Write-Log ("Resolved LMS section room_no: {0}" -f $sectionRoomLabel)

$constraintBody = @{
    resource_type = if ([string]::IsNullOrWhiteSpace($facultySection.RoomNo)) { 'faculty' } else { 'room' }
    resource_id = if ([string]::IsNullOrWhiteSpace($facultySection.RoomNo)) { [string]$facultySection.FacultyId } else { [string]$facultySection.RoomNo }
    day_of_week = 'Monday'
    start_time = '23:00:00'
    end_time = '23:30:00'
    note = 'Scheduler smoke constraint'
}
$constraintResponse = Invoke-TestRequestWithRetry429 -Method POST -Uri "$apiBase/constraints" -Body $constraintBody -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(201)
$null = Add-Result -Step 'Create schedule constraint' -Outcome $constraintResponse -Expectation '201'
Require-OutcomePass -Outcome $constraintResponse -Step 'Create schedule constraint'
$constraintData = Parse-ResponseBody -BodyText $constraintResponse.BodyText
if (-not $constraintData -or -not $constraintData.constraint_id) {
    throw 'Constraint creation did not return a constraint_id.'
}
$constraintId = [int]$constraintData.constraint_id
Write-Log ("Resolved constraint_id: {0}" -f $constraintId)

$constraintsResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/constraints" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read schedule constraints' -Outcome $constraintsResponse -Expectation '200'
Require-OutcomePass -Outcome $constraintsResponse -Step 'Read schedule constraints'
$constraintsData = To-Array (Parse-ResponseBody -BodyText $constraintsResponse.BodyText)
if (-not (Find-RecordByProperty -Items $constraintsData -PropertyName 'constraint_id' -ExpectedValue ([string]$constraintId))) {
    throw 'Constraint list did not include the smoke constraint.'
}

$generateBody = @{
    section_ids = @($facultySection.SectionId)
    slot_minutes = 60
    start_hour = 8
    end_hour = 17
}
$generateResponse = Invoke-TestRequestWithRetry429 -Method POST -Uri "$apiBase/generate" -Body $generateBody -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Generate timetable' -Outcome $generateResponse -Expectation '200'
Require-OutcomePass -Outcome $generateResponse -Step 'Generate timetable'
$generateData = Parse-ResponseBody -BodyText $generateResponse.BodyText
if (-not $generateData -or -not $generateData.created -or (-not (To-Array $generateData.created))) {
    throw 'Timetable generation did not return any created slots.'
}

$createdSlots = To-Array $generateData.created
$createdSlot = $createdSlots | Select-Object -First 1
if (-not $createdSlot -or -not $createdSlot.section_id) {
    throw 'Timetable generation response did not include a created slot.'
}
if ([int]$createdSlot.section_id -ne $facultySection.SectionId) {
    throw 'Generated timetable slot did not target the expected LMS section.'
}
Write-Log ("Resolved generated slot: {0} {1} {2}-{3}" -f $createdSlot.day_of_week, $createdSlot.room_no, $createdSlot.start_time, $createdSlot.end_time)

$sectionTimetableResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$lmsBase/timetable/section/$($facultySection.SectionId)" -Headers @{ Authorization = "Bearer $script:facultyToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read LMS section timetable' -Outcome $sectionTimetableResponse -Expectation '200'
Require-OutcomePass -Outcome $sectionTimetableResponse -Step 'Read LMS section timetable'
$sectionTimetableData = To-Array (Parse-ResponseBody -BodyText $sectionTimetableResponse.BodyText)
if (-not $sectionTimetableData) {
    throw 'Section timetable response was empty after generation.'
}

$generatedInTimetable = $sectionTimetableData | Where-Object {
    [string]$_.day_of_week -eq [string]$createdSlot.day_of_week -and
    [string]$_.start_time -eq [string]$createdSlot.start_time -and
    [string]$_.end_time -eq [string]$createdSlot.end_time
} | Select-Object -First 1
if (-not $generatedInTimetable) {
    throw 'Section timetable did not include the generated slot.'
}

$constraintCheckBody = @{
    section_id = $facultySection.SectionId
    day_of_week = [string]$createdSlot.day_of_week
    start_time = [string]$createdSlot.start_time
    end_time = [string]$createdSlot.end_time
    room_no = [string]$createdSlot.room_no
}
$constraintCheckResponse = Invoke-TestRequestWithRetry429 -Method POST -Uri "$lmsBase/timetable/constraints/check" -Body $constraintCheckBody -Headers @{ Authorization = "Bearer $script:facultyToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Check generated slot constraints' -Outcome $constraintCheckResponse -Expectation '200'
Require-OutcomePass -Outcome $constraintCheckResponse -Step 'Check generated slot constraints'
$constraintCheckData = Parse-ResponseBody -BodyText $constraintCheckResponse.BodyText
if (-not $constraintCheckData -or -not $constraintCheckData.is_valid) {
    throw 'Generated slot failed the timetable constraint check.'
}

Write-Log ("Overall status: {0}" -f $overallPassed)
$results | ConvertTo-Json -Depth 8 | Out-File -FilePath $jsonPath -Encoding utf8

if ($overallPassed) {
    exit 0
} else {
    exit 1
}
