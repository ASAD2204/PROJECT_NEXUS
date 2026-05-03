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

$serviceName = 'sis-service'
$logDirectory = Join-Path (Join-Path $PSScriptRoot '..\logs') $serviceName
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logPath = Join-Path $logDirectory "sis-smoke-$stamp.log"
$jsonPath = Join-Path $logDirectory "sis-smoke-$stamp.json"

$BaseUrl = $BaseUrl.TrimEnd('/')
$AuthBaseUrl = $AuthBaseUrl.TrimEnd('/')
$apiBase = "$BaseUrl/api/v1/sis"
$overallPassed = $true
$results = New-Object System.Collections.Generic.List[object]

$script:adminToken = $null
$script:facultyToken = $null
$script:studentToken = $null

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

function Resolve-StudentProfile {
    param([Parameter(Mandatory = $true)][string]$Token)

    $response = Invoke-TestRequest -Method GET -Uri "$apiBase/students/me" -Headers @{ Authorization = "Bearer $Token" } -ExpectedStatus @(200)
    $null = Add-Result -Step 'Read student profile' -Outcome $response -Expectation '200'
    Require-OutcomePass -Outcome $response -Step 'Read student profile'

    $data = Parse-ResponseBody -BodyText $response.BodyText
    if (-not $data -or -not $data.student_id) {
        throw 'Student profile did not return a student_id.'
    }

    return $data
}

function Resolve-FacultyProfile {
    param([Parameter(Mandatory = $true)][string]$Token)

    $response = Invoke-TestRequest -Method GET -Uri "$apiBase/faculty/me" -Headers @{ Authorization = "Bearer $Token" } -ExpectedStatus @(200)
    $null = Add-Result -Step 'Read faculty profile' -Outcome $response -Expectation '200'
    Require-OutcomePass -Outcome $response -Step 'Read faculty profile'

    $data = Parse-ResponseBody -BodyText $response.BodyText
    if (-not $data -or -not $data.faculty_id) {
        throw 'Faculty profile did not return a faculty_id.'
    }

    return $data
}

function New-SmokeLabel {
    param([Parameter(Mandatory = $true)][string]$Prefix)

    return ('{0}-{1}-{2}' -f $Prefix, $stamp, ([guid]::NewGuid().ToString('N').Substring(0, 8)))
}

Write-Log "Service: $serviceName"
Write-Log "Base URL: $BaseUrl"
Write-Log "Auth Base URL: $AuthBaseUrl"

$health = Invoke-TestRequest -Method GET -Uri "$BaseUrl/health" -ExpectedStatus @(200)
$null = Add-Result -Step 'Gateway health' -Outcome $health -Expectation '200'
Require-OutcomePass -Outcome $health -Step 'Gateway health'

$script:adminToken = Resolve-AuthToken -Email $AdminEmail -Password $AdminPassword -Label 'admin'
$script:facultyToken = Resolve-AuthToken -Email $FacultyEmail -Password $FacultyPassword -Label 'faculty'
$script:studentToken = Resolve-AuthToken -Email $StudentEmail -Password $StudentPassword -Label 'student'
Write-Log 'Admin token: present'
Write-Log 'Faculty token: present'
Write-Log 'Student token: present'

$studentProfile = Resolve-StudentProfile -Token $script:studentToken
$facultyProfile = Resolve-FacultyProfile -Token $script:facultyToken
Write-Log ("Resolved student_id: {0}" -f $studentProfile.student_id)
Write-Log ("Resolved student roll_no: {0}" -f $studentProfile.roll_no)
Write-Log ("Resolved faculty_id: {0}" -f $facultyProfile.faculty_id)

$studentByIdResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/students/$([int]$studentProfile.student_id)" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read student by id' -Outcome $studentByIdResponse -Expectation '200'
Require-OutcomePass -Outcome $studentByIdResponse -Step 'Read student by id'

$studentByIdData = Parse-ResponseBody -BodyText $studentByIdResponse.BodyText
if ([int]$studentByIdData.student_id -ne [int]$studentProfile.student_id) {
    throw 'Student lookup by id did not return the expected student.'
}

$studentListResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/students" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read student list' -Outcome $studentListResponse -Expectation '200'
Require-OutcomePass -Outcome $studentListResponse -Step 'Read student list'
$studentListData = To-Array (Parse-ResponseBody -BodyText $studentListResponse.BodyText)
if (-not (Find-RecordByProperty -Items $studentListData -PropertyName 'student_id' -ExpectedValue ([string]$studentProfile.student_id))) {
    throw 'Admin student list did not include the authenticated student profile.'
}

$facultyListResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/faculty" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read faculty list' -Outcome $facultyListResponse -Expectation '200'
Require-OutcomePass -Outcome $facultyListResponse -Step 'Read faculty list'
$facultyListData = To-Array (Parse-ResponseBody -BodyText $facultyListResponse.BodyText)
if (-not (Find-RecordByProperty -Items $facultyListData -PropertyName 'faculty_id' -ExpectedValue ([string]$facultyProfile.faculty_id))) {
    throw 'Admin faculty list did not include the authenticated faculty profile.'
}

$semestersResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/semesters" -ExpectedStatus @(200)
$null = Add-Result -Step 'Read semesters' -Outcome $semestersResponse -Expectation '200'
Require-OutcomePass -Outcome $semestersResponse -Step 'Read semesters'
$semestersData = To-Array (Parse-ResponseBody -BodyText $semestersResponse.BodyText)
if (-not $semestersData) {
    throw 'Semester list was empty.'
}

$activeSemesterResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/semesters/active" -ExpectedStatus @(200)
$null = Add-Result -Step 'Read active semester' -Outcome $activeSemesterResponse -Expectation '200'
Require-OutcomePass -Outcome $activeSemesterResponse -Step 'Read active semester'
$activeSemesterData = Parse-ResponseBody -BodyText $activeSemesterResponse.BodyText
if (-not $activeSemesterData -or -not $activeSemesterData.semester_id) {
    throw 'Active semester lookup did not return a semester_id.'
}

$departmentsResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/departments" -ExpectedStatus @(200)
$null = Add-Result -Step 'Read departments' -Outcome $departmentsResponse -Expectation '200'
Require-OutcomePass -Outcome $departmentsResponse -Step 'Read departments'
$departmentsData = To-Array (Parse-ResponseBody -BodyText $departmentsResponse.BodyText)
if (-not $departmentsData) {
    throw 'Department list was empty.'
}

$programsResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/programs" -ExpectedStatus @(200)
$null = Add-Result -Step 'Read programs' -Outcome $programsResponse -Expectation '200'
Require-OutcomePass -Outcome $programsResponse -Step 'Read programs'
$programsData = To-Array (Parse-ResponseBody -BodyText $programsResponse.BodyText)
if (-not $programsData) {
    throw 'Program list was empty.'
}

$enrollmentsResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/enrollments/me" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read my enrollments' -Outcome $enrollmentsResponse -Expectation '200'
Require-OutcomePass -Outcome $enrollmentsResponse -Step 'Read my enrollments'

$transcriptsResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/transcripts/me" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read my transcripts' -Outcome $transcriptsResponse -Expectation '200'
Require-OutcomePass -Outcome $transcriptsResponse -Step 'Read my transcripts'

$tempDepartmentCode = ('S{0}' -f ([guid]::NewGuid().ToString('N').Substring(0, 9)))
$departmentBody = @{ name = 'Smoke Department'; code = $tempDepartmentCode; location = 'Temporary Wing' }
$departmentResponse = Invoke-TestRequestWithRetry429 -Method POST -Uri "$apiBase/departments" -Body $departmentBody -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(201)
$null = Add-Result -Step 'Create temporary department' -Outcome $departmentResponse -Expectation '201'
Require-OutcomePass -Outcome $departmentResponse -Step 'Create temporary department'
$departmentData = Parse-ResponseBody -BodyText $departmentResponse.BodyText
if (-not $departmentData -or -not $departmentData.dept_id) {
    throw 'Department creation did not return a dept_id.'
}
$tempDepartmentId = [int]$departmentData.dept_id
Write-Log ("Resolved temporary dept_id: {0}" -f $tempDepartmentId)

$departmentUpdateBody = @{ location = 'Temporary Wing Updated' }
$departmentUpdateResponse = Invoke-TestRequestWithRetry429 -Method PUT -Uri "$apiBase/departments/$tempDepartmentId" -Body $departmentUpdateBody -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Update temporary department' -Outcome $departmentUpdateResponse -Expectation '200'
Require-OutcomePass -Outcome $departmentUpdateResponse -Step 'Update temporary department'
$departmentUpdateData = Parse-ResponseBody -BodyText $departmentUpdateResponse.BodyText
if ([string]$departmentUpdateData.location -ne 'Temporary Wing Updated') {
    throw 'Temporary department update did not persist.'
}

$programBody = @{ dept_id = $tempDepartmentId; title = 'Smoke Program'; degree_level = 'BS'; total_semesters = 8 }
$programResponse = Invoke-TestRequestWithRetry429 -Method POST -Uri "$apiBase/programs" -Body $programBody -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(201)
$null = Add-Result -Step 'Create temporary program' -Outcome $programResponse -Expectation '201'
Require-OutcomePass -Outcome $programResponse -Step 'Create temporary program'
$programData = Parse-ResponseBody -BodyText $programResponse.BodyText
if (-not $programData -or -not $programData.program_id) {
    throw 'Program creation did not return a program_id.'
}
$tempProgramId = [int]$programData.program_id
Write-Log ("Resolved temporary program_id: {0}" -f $tempProgramId)

$programUpdateBody = @{ title = 'Smoke Program Updated' }
$programUpdateResponse = Invoke-TestRequestWithRetry429 -Method PUT -Uri "$apiBase/programs/$tempProgramId" -Body $programUpdateBody -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Update temporary program' -Outcome $programUpdateResponse -Expectation '200'
Require-OutcomePass -Outcome $programUpdateResponse -Step 'Update temporary program'
$programUpdateData = Parse-ResponseBody -BodyText $programUpdateResponse.BodyText
if ([string]$programUpdateData.title -ne 'Smoke Program Updated') {
    throw 'Temporary program update did not persist.'
}

$programListWithTempResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/programs" -ExpectedStatus @(200)
$null = Add-Result -Step 'Verify temporary program list' -Outcome $programListWithTempResponse -Expectation '200'
Require-OutcomePass -Outcome $programListWithTempResponse -Step 'Verify temporary program list'
$programListWithTempData = To-Array (Parse-ResponseBody -BodyText $programListWithTempResponse.BodyText)
if (-not (Find-RecordByProperty -Items $programListWithTempData -PropertyName 'program_id' -ExpectedValue ([string]$tempProgramId))) {
    throw 'Program list did not include the temporary program.'
}

$departmentListWithTempResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/departments" -ExpectedStatus @(200)
$null = Add-Result -Step 'Verify temporary department list' -Outcome $departmentListWithTempResponse -Expectation '200'
Require-OutcomePass -Outcome $departmentListWithTempResponse -Step 'Verify temporary department list'
$departmentListWithTempData = To-Array (Parse-ResponseBody -BodyText $departmentListWithTempResponse.BodyText)
if (-not (Find-RecordByProperty -Items $departmentListWithTempData -PropertyName 'dept_id' -ExpectedValue ([string]$tempDepartmentId))) {
    throw 'Department list did not include the temporary department.'
}

$programDeleteResponse = Invoke-TestRequestWithRetry429 -Method DELETE -Uri "$apiBase/programs/$tempProgramId" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Delete temporary program' -Outcome $programDeleteResponse -Expectation '200'
Require-OutcomePass -Outcome $programDeleteResponse -Step 'Delete temporary program'

$departmentDeleteResponse = Invoke-TestRequestWithRetry429 -Method DELETE -Uri "$apiBase/departments/$tempDepartmentId" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Delete temporary department' -Outcome $departmentDeleteResponse -Expectation '200'
Require-OutcomePass -Outcome $departmentDeleteResponse -Step 'Delete temporary department'

$programListAfterDeleteResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/programs" -ExpectedStatus @(200)
$null = Add-Result -Step 'Confirm temporary program deleted' -Outcome $programListAfterDeleteResponse -Expectation '200'
Require-OutcomePass -Outcome $programListAfterDeleteResponse -Step 'Confirm temporary program deleted'
$programListAfterDeleteData = To-Array (Parse-ResponseBody -BodyText $programListAfterDeleteResponse.BodyText)
if ($programListAfterDeleteData -and (Find-RecordByProperty -Items $programListAfterDeleteData -PropertyName 'program_id' -ExpectedValue ([string]$tempProgramId))) {
    throw 'Temporary program still appeared after deletion.'
}

$departmentListAfterDeleteResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/departments" -ExpectedStatus @(200)
$null = Add-Result -Step 'Confirm temporary department deleted' -Outcome $departmentListAfterDeleteResponse -Expectation '200'
Require-OutcomePass -Outcome $departmentListAfterDeleteResponse -Step 'Confirm temporary department deleted'
$departmentListAfterDeleteData = To-Array (Parse-ResponseBody -BodyText $departmentListAfterDeleteResponse.BodyText)
if ($departmentListAfterDeleteData -and (Find-RecordByProperty -Items $departmentListAfterDeleteData -PropertyName 'dept_id' -ExpectedValue ([string]$tempDepartmentId))) {
    throw 'Temporary department still appeared after deletion.'
}

Write-Log ("Overall status: {0}" -f $overallPassed)
$results | ConvertTo-Json -Depth 8 | Out-File -FilePath $jsonPath -Encoding utf8

if ($overallPassed) {
    exit 0
} else {
    exit 1
}
