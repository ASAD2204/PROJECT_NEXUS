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

$serviceName = 'lms-service'
$logDirectory = Join-Path (Join-Path $PSScriptRoot '..\logs') $serviceName
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logPath = Join-Path $logDirectory "lms-smoke-$stamp.log"
$jsonPath = Join-Path $logDirectory "lms-smoke-$stamp.json"

$BaseUrl = $BaseUrl.TrimEnd('/')
$AuthBaseUrl = $AuthBaseUrl.TrimEnd('/')
$apiBase = "$BaseUrl/api/v1/lms"
$sisBase = "$BaseUrl/api/v1/sis"
$overallPassed = $true
$results = New-Object System.Collections.Generic.List[object]

$script:adminToken = $null
$script:facultyToken = $null
$script:studentToken = $null
$script:facultyProfile = $null
$script:studentProfile = $null
$script:activeSemester = $null
$script:facultySection = $null
$script:studentEnrollment = $null
$script:createdEnrollment = $null
$script:tempCourse = $null
$script:assignment = $null
$script:submission = $null
$script:quiz = $null
$script:material = $null
$script:feedbackId = $null

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
            }
        }

        if (-not $statusCode -and $_.Exception.Message -match '\((\d{3})\)') {
            $statusCode = [int]$Matches[1]
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

    $loginData = Parse-ResponseBody -BodyText $loginResponse.BodyText
    if (-not $loginData -or -not $loginData.access_token) {
        throw ("Auth-service login for {0} did not return an access token." -f $Label)
    }

    return [string]$loginData.access_token
}

function New-SmokeLabel {
    param([Parameter(Mandatory = $true)][string]$Prefix)

    return ('{0}-{1}-{2}' -f $Prefix, $stamp, ([guid]::NewGuid().ToString('N').Substring(0, 8)))
}

function New-CourseCode {
    return ('L{0}{1}' -f (Get-Date -Format 'MMddHHmm'), (Get-Random -Minimum 0 -Maximum 9))
}

function Resolve-Semester {
    $activeResponse = Invoke-TestRequest -Method GET -Uri "$sisBase/semesters/active" -ExpectedStatus @(200)
    $null = Add-Result -Step 'Resolve active semester from SIS' -Outcome $activeResponse -Expectation '200'

    $activeData = Parse-ResponseBody -BodyText $activeResponse.BodyText
    if ($activeResponse.Passed -and $activeData -and $activeData.semester_id) {
        return [pscustomobject]@{
            SemesterId = [int]$activeData.semester_id
            Title = [string]$activeData.title
        }
    }

    $semestersResponse = Invoke-TestRequest -Method GET -Uri "$sisBase/semesters" -ExpectedStatus @(200)
    $null = Add-Result -Step 'List SIS semesters' -Outcome $semestersResponse -Expectation '200'

    $semesters = To-Array (Parse-ResponseBody -BodyText $semestersResponse.BodyText)
    $semester = $semesters | Where-Object { $_ -and $_.is_active -eq $true } | Select-Object -First 1
    if (-not $semester) {
        $semester = $semesters | Select-Object -First 1
    }
    if (-not $semester -or -not $semester.semester_id) {
        throw 'No semester records were returned by SIS.'
    }

    return [pscustomobject]@{
        SemesterId = [int]$semester.semester_id
        Title = [string]$semester.title
    }
}

function Resolve-FacultyProfile {
    $facultyResponse = Invoke-TestRequest -Method GET -Uri "$sisBase/faculty/me" -Headers @{ Authorization = "Bearer $script:facultyToken" } -ExpectedStatus @(200)
    $null = Add-Result -Step 'Resolve faculty profile from SIS' -Outcome $facultyResponse -Expectation '200'

    $facultyData = Parse-ResponseBody -BodyText $facultyResponse.BodyText
    if (-not $facultyData -or -not $facultyData.faculty_id) {
        throw 'Could not resolve the seeded SIS faculty profile.'
    }

    return [pscustomobject]@{
        FacultyId = [int]$facultyData.faculty_id
        DeptId = [int]$facultyData.dept_id
        Designation = [string]$facultyData.designation
    }
}

function Resolve-StudentProfile {
    $studentResponse = Invoke-TestRequest -Method GET -Uri "$sisBase/students/me" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
    $null = Add-Result -Step 'Resolve student profile from SIS' -Outcome $studentResponse -Expectation '200'

    $studentData = Parse-ResponseBody -BodyText $studentResponse.BodyText
    if (-not $studentData -or -not $studentData.student_id) {
        throw 'Could not resolve the seeded SIS student profile.'
    }

    return [pscustomobject]@{
        StudentId = [int]$studentData.student_id
        RollNo = [string]$studentData.roll_no
        ProgramId = [int]$studentData.program_id
    }
}

function Resolve-FacultySection {
    param(
        [Parameter(Mandatory = $true)][int]$FacultyId,
        [Parameter(Mandatory = $true)][int]$DeptId,
        [Parameter(Mandatory = $true)][int]$SemesterId
    )

    $sectionsResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/courses/my-courses" -Headers @{ Authorization = "Bearer $script:facultyToken" } -ExpectedStatus @(200)
    $null = Add-Result -Step 'Read faculty sections' -Outcome $sectionsResponse -Expectation '200'

    $sections = To-Array (Parse-ResponseBody -BodyText $sectionsResponse.BodyText)
    $section = $sections | Where-Object { $_ -and $_.section_id } | Select-Object -First 1
    if ($section) {
        return [pscustomobject]@{
            SectionId = [int]$section.section_id
            CourseId = [int]$section.course_id
            Source = 'faculty'
        }
    }

    $courseCode = New-CourseCode
    $courseTitle = New-SmokeLabel -Prefix 'LMS Faculty Course'
    $courseBody = @{ dept_id = $DeptId; code = $courseCode; title = $courseTitle; credit_hours = 3; description = 'Temporary LMS smoke section course' }
    $courseResponse = Invoke-TestRequest -Method POST -Uri "$apiBase/courses" -Body $courseBody -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(201)
    $null = Add-Result -Step 'Create fallback faculty course' -Outcome $courseResponse -Expectation '201'
    $courseData = Parse-ResponseBody -BodyText $courseResponse.BodyText
    if (-not $courseData -or -not $courseData.course_id) {
        throw 'Fallback course creation did not return a course_id.'
    }

    $sectionBody = @{ course_id = [int]$courseData.course_id; semester_id = $SemesterId; faculty_id = $FacultyId; room_no = 'LMS-SMK-01'; capacity = 40 }
    $sectionResponse = Invoke-TestRequest -Method POST -Uri "$apiBase/sections" -Body $sectionBody -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(201)
    $null = Add-Result -Step 'Create fallback faculty section' -Outcome $sectionResponse -Expectation '201'
    $sectionData = Parse-ResponseBody -BodyText $sectionResponse.BodyText
    if (-not $sectionData -or -not $sectionData.section_id) {
        throw 'Fallback section creation did not return a section_id.'
    }

    return [pscustomobject]@{
        SectionId = [int]$sectionData.section_id
        CourseId = [int]$courseData.course_id
        Source = 'fallback'
        TempCourseId = [int]$courseData.course_id
    }
}

function Resolve-StudentEnrollment {
    param(
        [Parameter(Mandatory = $true)][int]$StudentId,
        [Parameter(Mandatory = $true)][int]$FacultySectionId
    )

    $enrollmentsResponse = Invoke-TestRequest -Method GET -Uri "$sisBase/enrollments/me" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
    $null = Add-Result -Step 'Read student enrollments' -Outcome $enrollmentsResponse -Expectation '200'

    $enrollments = To-Array (Parse-ResponseBody -BodyText $enrollmentsResponse.BodyText)
    $existingEnrollment = $enrollments | Where-Object { $_ -and $_.enrollment_id } | Select-Object -First 1
    if ($existingEnrollment) {
        return [pscustomobject]@{
            EnrollmentId = [int]$existingEnrollment.enrollment_id
            SectionId = [int]$existingEnrollment.section_id
            Created = $false
            Source = 'existing'
        }
    }

    $enrollmentBody = @{ student_id = $StudentId; section_id = $FacultySectionId; hod_approved = $true }
    $enrollmentResponse = Invoke-TestRequest -Method POST -Uri "$sisBase/enrollments" -Body $enrollmentBody -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(201)
    $null = Add-Result -Step 'Create student enrollment' -Outcome $enrollmentResponse -Expectation '201'
    $enrollmentData = Parse-ResponseBody -BodyText $enrollmentResponse.BodyText
    if (-not $enrollmentData -or -not $enrollmentData.enrollment_id) {
        throw 'Student enrollment creation did not return an enrollment_id.'
    }

    $script:createdEnrollment = [int]$enrollmentData.enrollment_id
    return [pscustomobject]@{
        EnrollmentId = [int]$enrollmentData.enrollment_id
        SectionId = $FacultySectionId
        Created = $true
        Source = 'created'
    }
}

Write-Log "Service: $serviceName"
Write-Log "Base URL: $BaseUrl"
Write-Log "Auth Base URL: $AuthBaseUrl"

$gatewayHealth = Invoke-TestRequest -Method GET -Uri "$BaseUrl/health" -ExpectedStatus @(200)
$null = Add-Result -Step 'Gateway health' -Outcome $gatewayHealth -Expectation '200'

$script:adminToken = Resolve-AuthToken -Email $AdminEmail -Password $AdminPassword -Label 'admin'
$script:facultyToken = Resolve-AuthToken -Email $FacultyEmail -Password $FacultyPassword -Label 'faculty'
$script:studentToken = Resolve-AuthToken -Email $StudentEmail -Password $StudentPassword -Label 'student'
Write-Log 'Admin token: present'
Write-Log 'Faculty token: present'
Write-Log 'Student token: present'

$script:facultyProfile = Resolve-FacultyProfile
Write-Log ("Resolved faculty_id: {0}" -f $script:facultyProfile.FacultyId)
if ($script:facultyProfile.DeptId) {
    Write-Log ("Resolved faculty dept_id: {0}" -f $script:facultyProfile.DeptId)
}

$script:studentProfile = Resolve-StudentProfile
Write-Log ("Resolved student_id: {0}" -f $script:studentProfile.StudentId)
if ($script:studentProfile.RollNo) {
    Write-Log ("Resolved student roll_no: {0}" -f $script:studentProfile.RollNo)
}

$script:activeSemester = Resolve-Semester
Write-Log ("Resolved semester_id: {0}" -f $script:activeSemester.SemesterId)
if ($script:activeSemester.Title) {
    Write-Log ("Resolved semester title: {0}" -f $script:activeSemester.Title)
}

$script:facultySection = Resolve-FacultySection -FacultyId $script:facultyProfile.FacultyId -DeptId $script:facultyProfile.DeptId -SemesterId $script:activeSemester.SemesterId
Write-Log ("Resolved faculty section_id: {0}" -f $script:facultySection.SectionId)
Write-Log ("Resolved faculty section course_id: {0}" -f $script:facultySection.CourseId)
Write-Log ("Faculty section source: {0}" -f $script:facultySection.Source)

$sectionDetailResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/sections/$($script:facultySection.SectionId)" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read faculty section by id' -Outcome $sectionDetailResponse -Expectation '200'
$sectionDetailData = Parse-ResponseBody -BodyText $sectionDetailResponse.BodyText
if (-not $sectionDetailData -or ([int]$sectionDetailData.section_id -ne $script:facultySection.SectionId)) {
    throw 'Section lookup did not return the expected section_id.'
}

$script:studentEnrollment = Resolve-StudentEnrollment -StudentId $script:studentProfile.StudentId -FacultySectionId $script:facultySection.SectionId
Write-Log ("Resolved student enrollment section_id: {0}" -f $script:studentEnrollment.SectionId)
Write-Log ("Student enrollment source: {0}" -f $script:studentEnrollment.Source)

$coursesResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/courses?skip=0&limit=50" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'List courses' -Outcome $coursesResponse -Expectation '200'

$script:tempCourse = [pscustomobject]@{
    CourseId = $null
    Code = New-CourseCode
    Title = New-SmokeLabel -Prefix 'LMS Course'
}
$tempCourseBody = @{ dept_id = $script:facultyProfile.DeptId; code = $script:tempCourse.Code; title = $script:tempCourse.Title; credit_hours = 3; description = 'Temporary LMS smoke course' }
$tempCourseResponse = Invoke-TestRequest -Method POST -Uri "$apiBase/courses" -Body $tempCourseBody -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(201)
$null = Add-Result -Step 'Create smoke course' -Outcome $tempCourseResponse -Expectation '201'
$tempCourseData = Parse-ResponseBody -BodyText $tempCourseResponse.BodyText
if (-not $tempCourseData -or -not $tempCourseData.course_id) {
    throw 'Course creation did not return a course_id.'
}
$script:tempCourse.CourseId = [int]$tempCourseData.course_id
Write-Log ("Resolved smoke course_id: {0}" -f $script:tempCourse.CourseId)

$courseByIdResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/courses/$($script:tempCourse.CourseId)" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read smoke course by id' -Outcome $courseByIdResponse -Expectation '200'

$courseListAfterCreateResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/courses?skip=0&limit=50" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Confirm smoke course appears in list' -Outcome $courseListAfterCreateResponse -Expectation '200'
$courseListAfterCreateData = To-Array (Parse-ResponseBody -BodyText $courseListAfterCreateResponse.BodyText)
if (-not (Find-RecordByProperty -Items $courseListAfterCreateData -PropertyName 'course_id' -ExpectedValue ([string]$script:tempCourse.CourseId))) {
    throw 'Course list did not include the smoke course.'
}

$updateCourseBody = @{ title = "$($script:tempCourse.Title) Updated"; description = 'Updated LMS smoke course' }
$updateCourseResponse = Invoke-TestRequest -Method PUT -Uri "$apiBase/courses/$($script:tempCourse.CourseId)" -Body $updateCourseBody -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Update smoke course' -Outcome $updateCourseResponse -Expectation '200'
$updatedCourseData = Parse-ResponseBody -BodyText $updateCourseResponse.BodyText
if (-not $updatedCourseData -or ([string]$updatedCourseData.title -ne "$($script:tempCourse.Title) Updated")) {
    throw 'Course update did not persist the expected title.'
}

$courseAfterUpdateResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/courses/$($script:tempCourse.CourseId)" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Verify updated smoke course' -Outcome $courseAfterUpdateResponse -Expectation '200'

$myAssignmentsBeforeResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/assignments/faculty/me" -Headers @{ Authorization = "Bearer $script:facultyToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read faculty assignments' -Outcome $myAssignmentsBeforeResponse -Expectation '200'

$assignmentTitle = New-SmokeLabel -Prefix 'LMS Assignment'
$assignmentDueAt = [DateTime]::UtcNow.AddDays(1).ToString('o')
$assignmentBody = @{ section_id = $script:facultySection.SectionId; title = $assignmentTitle; description = 'Temporary assignment for LMS smoke'; total_marks = 100; due_date = $assignmentDueAt; attachment_ref_id = "assign-$stamp" }
$assignmentResponse = Invoke-TestRequest -Method POST -Uri "$apiBase/assignments" -Body $assignmentBody -Headers @{ Authorization = "Bearer $script:facultyToken" } -ExpectedStatus @(201)
$null = Add-Result -Step 'Create assignment' -Outcome $assignmentResponse -Expectation '201'
$assignmentData = Parse-ResponseBody -BodyText $assignmentResponse.BodyText
if (-not $assignmentData -or -not $assignmentData.assignment_id) {
    throw 'Assignment creation did not return an assignment_id.'
}
$script:assignment = [pscustomobject]@{ AssignmentId = [int]$assignmentData.assignment_id; Title = [string]$assignmentData.title }
Write-Log ("Resolved assignment_id: {0}" -f $script:assignment.AssignmentId)

$assignmentBySectionResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/assignments/section/$($script:facultySection.SectionId)" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read assignments by section' -Outcome $assignmentBySectionResponse -Expectation '200'
$assignmentBySectionData = To-Array (Parse-ResponseBody -BodyText $assignmentBySectionResponse.BodyText)
if (-not (Find-RecordByProperty -Items $assignmentBySectionData -PropertyName 'assignment_id' -ExpectedValue ([string]$script:assignment.AssignmentId))) {
    throw 'Section assignments did not include the smoke assignment.'
}

$myAssignmentsAfterResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/assignments/faculty/me" -Headers @{ Authorization = "Bearer $script:facultyToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Confirm faculty assignments include smoke assignment' -Outcome $myAssignmentsAfterResponse -Expectation '200'
$myAssignmentsAfterData = To-Array (Parse-ResponseBody -BodyText $myAssignmentsAfterResponse.BodyText)
if (-not (Find-RecordByProperty -Items $myAssignmentsAfterData -PropertyName 'assignment_id' -ExpectedValue ([string]$script:assignment.AssignmentId))) {
    throw 'Faculty assignment list did not include the smoke assignment.'
}

$submissionBody = @{ assignment_id = $script:assignment.AssignmentId; file_ref_id = "submission-$stamp" }
$submissionResponse = Invoke-TestRequest -Method POST -Uri "$apiBase/submissions" -Body $submissionBody -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(201)
$null = Add-Result -Step 'Submit assignment' -Outcome $submissionResponse -Expectation '201'
$submissionData = Parse-ResponseBody -BodyText $submissionResponse.BodyText
if (-not $submissionData -or -not $submissionData.sub_id) {
    throw 'Submission creation did not return a sub_id.'
}
$script:submission = [pscustomobject]@{ SubmissionId = [int]$submissionData.sub_id }
Write-Log ("Resolved submission_id: {0}" -f $script:submission.SubmissionId)

$studentSubmissionsResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/submissions/me" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read student submissions' -Outcome $studentSubmissionsResponse -Expectation '200'
$studentSubmissionsData = To-Array (Parse-ResponseBody -BodyText $studentSubmissionsResponse.BodyText)
if (-not (Find-RecordByProperty -Items $studentSubmissionsData -PropertyName 'sub_id' -ExpectedValue ([string]$script:submission.SubmissionId))) {
    throw 'Student submissions did not include the smoke submission.'
}

$assignmentSubmissionsResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/submissions/assignment/$($script:assignment.AssignmentId)" -Headers @{ Authorization = "Bearer $script:facultyToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read assignment submissions' -Outcome $assignmentSubmissionsResponse -Expectation '200'
$assignmentSubmissionsData = To-Array (Parse-ResponseBody -BodyText $assignmentSubmissionsResponse.BodyText)
if (-not (Find-RecordByProperty -Items $assignmentSubmissionsData -PropertyName 'sub_id' -ExpectedValue ([string]$script:submission.SubmissionId))) {
    throw 'Faculty submission list did not include the smoke submission.'
}

$gradeBody = @{ marks_obtained = 88.5 }
$gradeResponse = Invoke-TestRequestWithRetry429 -Method PUT -Uri "$apiBase/submissions/$($script:submission.SubmissionId)/grade" -Body $gradeBody -Headers @{ Authorization = "Bearer $script:facultyToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Grade submission' -Outcome $gradeResponse -Expectation '200'
$gradeData = Parse-ResponseBody -BodyText $gradeResponse.BodyText
if (-not $gradeData -or ([double]$gradeData.marks_obtained -ne 88.5)) {
    throw 'Submission grading did not persist the expected mark.'
}

$gradesSubmitBody = @{ section_id = $script:studentEnrollment.SectionId; grades = @(@{ student_id = $script:studentProfile.StudentId; grade_points = 3.75 }); final_submit = $false }
$gradesSubmitResponse = Invoke-TestRequestWithRetry429 -Method POST -Uri "$apiBase/grades/submit" -Body $gradesSubmitBody -Headers @{ Authorization = "Bearer $script:facultyToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Submit final grades' -Outcome $gradesSubmitResponse -Expectation '200'

$enrollmentAfterGradesResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$sisBase/enrollments/me" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Verify enrollment grade update' -Outcome $enrollmentAfterGradesResponse -Expectation '200'
$enrollmentAfterGradesData = To-Array (Parse-ResponseBody -BodyText $enrollmentAfterGradesResponse.BodyText)
$gradeEnrollmentRecord = Find-RecordByProperty -Items $enrollmentAfterGradesData -PropertyName 'section_id' -ExpectedValue ([string]$script:studentEnrollment.SectionId)
if (-not $gradeEnrollmentRecord) {
    throw 'Student enrollments did not include the graded section.'
}

$quizTitle = New-SmokeLabel -Prefix 'LMS Quiz'
$quizBody = @{
    section_id = $script:facultySection.SectionId
    title = $quizTitle
    duration_minutes = 15
    start_time = [DateTime]::UtcNow.AddMinutes(-5).ToString('o')
    end_time = [DateTime]::UtcNow.AddMinutes(25).ToString('o')
    questions = @(
        @{ text = '2 + 2 = ?'; question_type = 'MCQ'; marks = 5; correct_answer = '4' }
    )
}
$quizResponse = Invoke-TestRequest -Method POST -Uri "$apiBase/quizzes" -Body $quizBody -Headers @{ Authorization = "Bearer $script:facultyToken" } -ExpectedStatus @(201)
$null = Add-Result -Step 'Create quiz' -Outcome $quizResponse -Expectation '201'
$quizData = Parse-ResponseBody -BodyText $quizResponse.BodyText
if (-not $quizData -or -not $quizData.quiz_id) {
    throw 'Quiz creation did not return a quiz_id.'
}
$script:quiz = [pscustomobject]@{ QuizId = [int]$quizData.quiz_id; QuestionId = $null }
if ($quizData.questions) {
    $quizQuestions = To-Array $quizData.questions
    $firstQuestion = $quizQuestions | Select-Object -First 1
    if ($firstQuestion -and $firstQuestion.question_id) {
        $script:quiz.QuestionId = [int]$firstQuestion.question_id
    }
}
if (-not $script:quiz.QuestionId) {
    $quizBySectionResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/quizzes/section/$($script:facultySection.SectionId)" -Headers @{ Authorization = "Bearer $script:facultyToken" } -ExpectedStatus @(200)
    $null = Add-Result -Step 'Read quizzes by section' -Outcome $quizBySectionResponse -Expectation '200'
    $quizBySectionData = To-Array (Parse-ResponseBody -BodyText $quizBySectionResponse.BodyText)
    $quizRecord = Find-RecordByProperty -Items $quizBySectionData -PropertyName 'quiz_id' -ExpectedValue ([string]$script:quiz.QuizId)
    if ($quizRecord -and $quizRecord.questions) {
        $quizQuestions = To-Array $quizRecord.questions
        $firstQuestion = $quizQuestions | Select-Object -First 1
        if ($firstQuestion -and $firstQuestion.question_id) {
            $script:quiz.QuestionId = [int]$firstQuestion.question_id
        }
    }
}
if (-not $script:quiz.QuestionId) {
    throw 'Could not resolve a quiz question_id for the smoke attempt.'
}
Write-Log ("Resolved quiz_id: {0}" -f $script:quiz.QuizId)
Write-Log ("Resolved quiz question_id: {0}" -f $script:quiz.QuestionId)

$myQuizzesResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/quizzes/faculty/me" -Headers @{ Authorization = "Bearer $script:facultyToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read faculty quizzes' -Outcome $myQuizzesResponse -Expectation '200'
$myQuizzesData = To-Array (Parse-ResponseBody -BodyText $myQuizzesResponse.BodyText)
if (-not (Find-RecordByProperty -Items $myQuizzesData -PropertyName 'quiz_id' -ExpectedValue ([string]$script:quiz.QuizId))) {
    throw 'Faculty quiz list did not include the smoke quiz.'
}

$quizAttemptBody = @{ answers = @(@{ question_id = $script:quiz.QuestionId; selected_option = '4' }) }
$quizAttemptResponse = Invoke-TestRequestWithRetry429 -Method POST -Uri "$apiBase/quizzes/$($script:quiz.QuizId)/attempt" -Body $quizAttemptBody -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Attempt quiz' -Outcome $quizAttemptResponse -Expectation '200'

$quizDeleteResponse = Invoke-TestRequestWithRetry429 -Method DELETE -Uri "$apiBase/quizzes/$($script:quiz.QuizId)" -Headers @{ Authorization = "Bearer $script:facultyToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Delete smoke quiz' -Outcome $quizDeleteResponse -Expectation '200'

$quizListAfterDeleteResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/quizzes/section/$($script:facultySection.SectionId)" -Headers @{ Authorization = "Bearer $script:facultyToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Confirm quiz deleted from section' -Outcome $quizListAfterDeleteResponse -Expectation '200'
$quizListAfterDeleteData = To-Array (Parse-ResponseBody -BodyText $quizListAfterDeleteResponse.BodyText)
if ($quizListAfterDeleteData -and (Find-RecordByProperty -Items $quizListAfterDeleteData -PropertyName 'quiz_id' -ExpectedValue ([string]$script:quiz.QuizId))) {
    throw 'Deleted quiz still appeared in the section quiz list.'
}

$materialTitle = New-SmokeLabel -Prefix 'LMS Material'
$materialBody = @{ section_id = $script:facultySection.SectionId; title = $materialTitle; description = 'Temporary LMS smoke material'; file_ref_id = "material-$stamp"; material_type = 'document' }
$materialResponse = Invoke-TestRequest -Method POST -Uri "$apiBase/materials" -Body $materialBody -Headers @{ Authorization = "Bearer $script:facultyToken" } -ExpectedStatus @(201)
$null = Add-Result -Step 'Upload course material' -Outcome $materialResponse -Expectation '201'
$materialData = Parse-ResponseBody -BodyText $materialResponse.BodyText
if (-not $materialData -or -not $materialData.material_id) {
    throw 'Material upload did not return a material_id.'
}
$script:material = [pscustomobject]@{ MaterialId = [int]$materialData.material_id }
Write-Log ("Resolved material_id: {0}" -f $script:material.MaterialId)

$materialsByCourseResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/materials/$($script:facultySection.CourseId)" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read materials by course' -Outcome $materialsByCourseResponse -Expectation '200'
$materialsByCourseData = Parse-ResponseBody -BodyText $materialsByCourseResponse.BodyText
$materialsItems = To-Array $materialsByCourseData.materials
if (-not (Find-RecordByProperty -Items $materialsItems -PropertyName 'material_id' -ExpectedValue ([string]$script:material.MaterialId))) {
    throw 'Course materials list did not include the smoke material.'
}

$materialsDirectResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/materials/course/$($script:facultySection.CourseId)" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read course materials collection' -Outcome $materialsDirectResponse -Expectation '200'

$deleteMaterialResponse = Invoke-TestRequestWithRetry429 -Method DELETE -Uri "$apiBase/materials/$($script:material.MaterialId)" -Headers @{ Authorization = "Bearer $script:facultyToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Delete smoke material' -Outcome $deleteMaterialResponse -Expectation '200'

$timetableCheckBody = @{ section_id = $script:facultySection.SectionId; day_of_week = 'Sunday'; start_time = '09:00:00'; end_time = '10:00:00'; room_no = $null }
$timetableCheckResponse = Invoke-TestRequest -Method POST -Uri "$apiBase/timetable/constraints/check" -Body $timetableCheckBody -Headers @{ Authorization = "Bearer $script:facultyToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Check timetable constraints' -Outcome $timetableCheckResponse -Expectation '200'

if ($script:facultySection.Source -eq 'fallback') {
    $timetableCreateBody = @{ section_id = $script:facultySection.SectionId; day_of_week = 'Sunday'; start_time = '09:00:00'; end_time = '10:00:00'; room_no = 'LMS-SMK-ROOM' }
    $timetableCreateResponse = Invoke-TestRequest -Method POST -Uri "$apiBase/timetable" -Body $timetableCreateBody -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(201)
    $null = Add-Result -Step 'Create timetable slot' -Outcome $timetableCreateResponse -Expectation '201'
}

$timetableListResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/timetable/section/$($script:facultySection.SectionId)" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read section timetable' -Outcome $timetableListResponse -Expectation '200'

$feedbackBody = @{ survey_type = 'course_evaluation'; course_id = $script:tempCourse.CourseId; faculty_id = $script:facultyProfile.FacultyId; responses = @{ clarity = 5; pace = 4 }; overall_rating = 4.5; comments = 'Smoke feedback'; is_anonymous = $false; semester_id = $script:activeSemester.SemesterId }
$feedbackResponse = Invoke-TestRequestWithRetry429 -Method POST -Uri "$apiBase/feedback" -Body $feedbackBody -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(201)
$null = Add-Result -Step 'Submit feedback survey' -Outcome $feedbackResponse -Expectation '201'
$feedbackData = Parse-ResponseBody -BodyText $feedbackResponse.BodyText
if (-not $feedbackData -or -not $feedbackData.id) {
    throw 'Feedback submission did not return an id.'
}
$script:feedbackId = [string]$feedbackData.id

$courseFeedbackResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/feedback/course/$($script:tempCourse.CourseId)" -Headers @{ Authorization = "Bearer $script:facultyToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read course feedback' -Outcome $courseFeedbackResponse -Expectation '200'
$courseFeedbackData = To-Array (Parse-ResponseBody -BodyText $courseFeedbackResponse.BodyText)
if (-not (Find-RecordByProperty -Items $courseFeedbackData -PropertyName 'id' -ExpectedValue $script:feedbackId)) {
    throw 'Course feedback list did not include the smoke feedback entry.'
}

$courseFeedbackCompatResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/feedback/$($script:tempCourse.CourseId)" -Headers @{ Authorization = "Bearer $script:facultyToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read course feedback compatibility route' -Outcome $courseFeedbackCompatResponse -Expectation '200'

$facultyFeedbackResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/feedback/faculty/$($script:facultyProfile.FacultyId)" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read faculty feedback' -Outcome $facultyFeedbackResponse -Expectation '200'

$facultySummaryResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/feedback/faculty/$($script:facultyProfile.FacultyId)/summary" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read faculty feedback summary' -Outcome $facultySummaryResponse -Expectation '200'
$facultySummaryData = Parse-ResponseBody -BodyText $facultySummaryResponse.BodyText
if (-not $facultySummaryData -or ([int]$facultySummaryData.total_reviews -lt 1)) {
    throw 'Faculty feedback summary did not report any reviews.'
}

$deleteCourseResponse = Invoke-TestRequestWithRetry429 -Method DELETE -Uri "$apiBase/courses/$($script:tempCourse.CourseId)" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Delete smoke course' -Outcome $deleteCourseResponse -Expectation '200'

$deletedCourseResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/courses/$($script:tempCourse.CourseId)" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(404)
$null = Add-Result -Step 'Confirm smoke course deleted' -Outcome $deletedCourseResponse -Expectation '404'

if ($script:createdEnrollment) {
    $dropEnrollmentResponse = Invoke-TestRequestWithRetry429 -Method DELETE -Uri "$sisBase/enrollments/$script:createdEnrollment" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
    $null = Add-Result -Step 'Drop temporary enrollment' -Outcome $dropEnrollmentResponse -Expectation '200'
}

Write-Log ("Overall status: {0}" -f $overallPassed)
$results | ConvertTo-Json -Depth 8 | Out-File -FilePath $jsonPath -Encoding utf8

if ($overallPassed) {
    exit 0
} else {
    exit 1
}
