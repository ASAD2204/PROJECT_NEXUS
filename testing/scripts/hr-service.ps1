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

$serviceName = 'hr-service'
$logDirectory = Join-Path (Join-Path $PSScriptRoot '..\logs') $serviceName
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logPath = Join-Path $logDirectory "hr-smoke-$stamp.log"
$jsonPath = Join-Path $logDirectory "hr-smoke-$stamp.json"

$BaseUrl = $BaseUrl.TrimEnd('/')
$AuthBaseUrl = $AuthBaseUrl.TrimEnd('/')
$apiBase = "$BaseUrl/api/v1/hr"
$overallPassed = $true
$results = New-Object System.Collections.Generic.List[object]

$script:adminToken = $null
$script:facultyToken = $null
$script:adminProfile = $null
$script:facultyProfile = $null
$script:firstLeaveId = $null
$script:secondLeaveId = $null
$script:employeeFacultyId = $null

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
    $null = Add-Result -Step ("Acquire {0} token" -f $Label) -Outcome $loginResponse -Expectation '200'

    $loginData = Parse-ResponseBody -BodyText $loginResponse.BodyText
    if (-not $loginData -or -not $loginData.access_token) {
        throw ("Auth-service login for {0} did not return an access token." -f $Label)
    }

    return [string]$loginData.access_token
}

function Resolve-CurrentUser {
    param(
        [Parameter(Mandatory = $true)][string]$Token,
        [Parameter(Mandatory = $true)][string]$Label
    )

    $meResponse = Invoke-TestRequest -Method GET -Uri "$AuthBaseUrl/api/v1/auth/me" -Headers @{ Authorization = "Bearer $Token" } -ExpectedStatus @(200)
    $null = Add-Result -Step ("Resolve {0} profile" -f $Label) -Outcome $meResponse -Expectation '200'

    $meData = Parse-ResponseBody -BodyText $meResponse.BodyText
    if (-not $meData -or -not $meData.user_id) {
        throw ("Auth-service profile lookup for {0} did not return a user_id." -f $Label)
    }

    return [pscustomobject]@{
        UserId = [string]$meData.user_id
        Email = [string]$meData.email
        Role = [string]$meData.role
    }
}

function Find-LeaveById {
    param(
        [Parameter(Mandatory = $true)]$Leaves,
        [Parameter(Mandatory = $true)][int]$LeaveId
    )

    foreach ($leave in (To-Array $Leaves)) {
        if ($leave -and ([int]$leave.leave_id -eq $LeaveId)) {
            return $leave
        }
    }

    return $null
}

function Find-NotificationById {
    param(
        [Parameter(Mandatory = $true)]$Notifications,
        [Parameter(Mandatory = $true)][int]$NotificationId
    )

    foreach ($notification in (To-Array $Notifications)) {
        if ($notification -and ([int]$notification.notification_id -eq $NotificationId)) {
            return $notification
        }
    }

    return $null
}

function Resolve-TargetEmployee {
    param(
        [Parameter(Mandatory = $true)]$Employees,
        [Parameter(Mandatory = $true)][string]$PreferredUserId,
        [string]$PreferredEmail = ''
    )

    $employeesArray = To-Array $Employees

    foreach ($employee in $employeesArray) {
        if ($employee -and ([string]$employee.user_id -eq $PreferredUserId)) {
            return $employee
        }
    }

    if ($PreferredEmail) {
        foreach ($employee in $employeesArray) {
            if ($employee -and ([string]$employee.email -eq $PreferredEmail)) {
                return $employee
            }
        }
    }

    foreach ($employee in $employeesArray) {
        if ($employee -and -not [string]::IsNullOrWhiteSpace([string]$employee.designation)) {
            return $employee
        }
    }

    foreach ($employee in $employeesArray) {
        if ($employee) {
            return $employee
        }
    }

    return $null
}

function New-SmokeLabel {
    param([string]$Prefix)

    return ('{0}-{1}-{2}' -f $Prefix, $stamp, ([guid]::NewGuid().ToString('N').Substring(0, 8)))
}

Write-Log "Service: $serviceName"
Write-Log "Base URL: $BaseUrl"
Write-Log "Auth Base URL: $AuthBaseUrl"

$gatewayHealth = Invoke-TestRequest -Method GET -Uri "$BaseUrl/health" -ExpectedStatus @(200)
$null = Add-Result -Step 'Gateway health' -Outcome $gatewayHealth -Expectation '200'

$script:adminToken = Resolve-AuthToken -Email $AdminEmail -Password $AdminPassword -Label 'admin'
$script:facultyToken = Resolve-AuthToken -Email $FacultyEmail -Password $FacultyPassword -Label 'faculty'
Write-Log 'Admin token: present'
Write-Log 'Faculty token: present'

$script:adminProfile = Resolve-CurrentUser -Token $script:adminToken -Label 'admin'
$script:facultyProfile = Resolve-CurrentUser -Token $script:facultyToken -Label 'faculty'
Write-Log ("Resolved admin user_id: {0}" -f $script:adminProfile.UserId)
Write-Log ("Resolved faculty user_id: {0}" -f $script:facultyProfile.UserId)

$facultyLeavesBeforeResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/leaves/me" -Headers @{ Authorization = "Bearer $script:facultyToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read faculty leave balance before actions' -Outcome $facultyLeavesBeforeResponse -Expectation '200'
$facultyLeavesBeforeData = Parse-ResponseBody -BodyText $facultyLeavesBeforeResponse.BodyText
if (-not $facultyLeavesBeforeData -or -not $facultyLeavesBeforeData.balance) {
    throw 'Faculty leave balance response was missing the balance object.'
}

$balanceBeforeUsed = [int]$facultyLeavesBeforeData.balance.casual_leave_used
$balanceBeforeRemaining = [int]$facultyLeavesBeforeData.balance.casual_leave_remaining

$facultyEmployeeListForbidden = Invoke-TestRequest -Method GET -Uri "$apiBase/employees" -Headers @{ Authorization = "Bearer $script:facultyToken" } -ExpectedStatus @(403)
$null = Add-Result -Step 'Reject faculty employee list access' -Outcome $facultyEmployeeListForbidden -Expectation '403'

$todayIso = (Get-Date).Date.ToString('yyyy-MM-dd')
$approvedLeaveType = if ($balanceBeforeRemaining -ge 1) { 'Casual' } else { 'Sick' }
Write-Log ("Chosen approved leave type: {0}" -f $approvedLeaveType)

$approvedLeaveReason = New-SmokeLabel -Prefix 'HR-approve'
$rejectedLeaveReason = New-SmokeLabel -Prefix 'HR-reject'

$approvedLeaveBody = @{
    leave_type = $approvedLeaveType
    start_date = $todayIso
    end_date = $todayIso
    reason = $approvedLeaveReason
    supporting_documents = @()
}
$approvedLeaveResponse = Invoke-TestRequest -Method POST -Uri "$apiBase/leaves/apply" -Body $approvedLeaveBody -Headers @{ Authorization = "Bearer $script:facultyToken" } -ExpectedStatus @(201)
$null = Add-Result -Step 'Apply first leave request' -Outcome $approvedLeaveResponse -Expectation '201'
$approvedLeaveData = Parse-ResponseBody -BodyText $approvedLeaveResponse.BodyText
if (-not $approvedLeaveData -or -not $approvedLeaveData.leave_id) {
    throw 'Approved leave application did not return a leave_id.'
}
$script:firstLeaveId = [int]$approvedLeaveData.leave_id

$rejectedLeaveBody = @{
    leave_type = 'Sick'
    start_date = $todayIso
    end_date = $todayIso
    reason = $rejectedLeaveReason
    supporting_documents = @()
}
$rejectedLeaveResponse = Invoke-TestRequest -Method POST -Uri "$apiBase/leaves/apply" -Body $rejectedLeaveBody -Headers @{ Authorization = "Bearer $script:facultyToken" } -ExpectedStatus @(201)
$null = Add-Result -Step 'Apply second leave request' -Outcome $rejectedLeaveResponse -Expectation '201'
$rejectedLeaveData = Parse-ResponseBody -BodyText $rejectedLeaveResponse.BodyText
if (-not $rejectedLeaveData -or -not $rejectedLeaveData.leave_id) {
    throw 'Rejected leave application did not return a leave_id.'
}
$script:secondLeaveId = [int]$rejectedLeaveData.leave_id

$pendingBeforeDecisionResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/leaves/pending" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'List pending leaves before decision' -Outcome $pendingBeforeDecisionResponse -Expectation '200'
$pendingBeforeDecisionData = To-Array (Parse-ResponseBody -BodyText $pendingBeforeDecisionResponse.BodyText)
if (-not (Find-LeaveById -Leaves $pendingBeforeDecisionData -LeaveId $script:firstLeaveId)) {
    throw 'First leave was not present in the pending list before approval.'
}
if (-not (Find-LeaveById -Leaves $pendingBeforeDecisionData -LeaveId $script:secondLeaveId)) {
    throw 'Second leave was not present in the pending list before rejection.'
}

$approveResponse = Invoke-TestRequest -Method PUT -Uri "$apiBase/leaves/$($script:firstLeaveId)/approve" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Approve first leave' -Outcome $approveResponse -Expectation '200'
$approveData = Parse-ResponseBody -BodyText $approveResponse.BodyText
if (-not $approveData -or ([string]$approveData.status -ne 'Approved')) {
    throw 'Approved leave did not return status Approved.'
}

$rejectPayload = @{ reason = 'Smoke test rejection' }
$rejectResponse = Invoke-TestRequest -Method PUT -Uri "$apiBase/leaves/$($script:secondLeaveId)/reject" -Body $rejectPayload -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Reject second leave' -Outcome $rejectResponse -Expectation '200'
$rejectData = Parse-ResponseBody -BodyText $rejectResponse.BodyText
if (-not $rejectData -or ([string]$rejectData.status -ne 'Rejected')) {
    throw 'Rejected leave did not return status Rejected.'
}

$rejectionMarker = "[Rejection reason: Smoke test rejection]"
if (([string]$rejectData.reason).IndexOf($rejectionMarker, [System.StringComparison]::Ordinal) -lt 0) {
    throw 'Rejected leave reason did not include the appended rejection marker.'
}

$facultyLeavesAfterResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/leaves/me" -Headers @{ Authorization = "Bearer $script:facultyToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read faculty leaves after decisions' -Outcome $facultyLeavesAfterResponse -Expectation '200'
$facultyLeavesAfterData = Parse-ResponseBody -BodyText $facultyLeavesAfterResponse.BodyText
$approvedLeaveRecord = Find-LeaveById -Leaves $facultyLeavesAfterData.leaves -LeaveId $script:firstLeaveId
$rejectedLeaveRecord = Find-LeaveById -Leaves $facultyLeavesAfterData.leaves -LeaveId $script:secondLeaveId
if (-not $approvedLeaveRecord -or ([string]$approvedLeaveRecord.status -ne 'Approved')) {
    throw 'Approved leave was not returned with status Approved from /leaves/me.'
}
if (-not $rejectedLeaveRecord -or ([string]$rejectedLeaveRecord.status -ne 'Rejected')) {
    throw 'Rejected leave was not returned with status Rejected from /leaves/me.'
}
if (([string]$rejectedLeaveRecord.reason).IndexOf($rejectionMarker, [System.StringComparison]::Ordinal) -lt 0) {
    throw 'Rejected leave reason in /leaves/me did not include the appended rejection marker.'
}

$balanceAfterUsed = [int]$facultyLeavesAfterData.balance.casual_leave_used
$balanceAfterRemaining = [int]$facultyLeavesAfterData.balance.casual_leave_remaining
$expectedUsedAfter = if ($approvedLeaveType -eq 'Casual') { $balanceBeforeUsed + 1 } else { $balanceBeforeUsed }
$expectedRemainingAfter = if ($approvedLeaveType -eq 'Casual') { $balanceBeforeRemaining - 1 } else { $balanceBeforeRemaining }
if ($balanceAfterUsed -ne $expectedUsedAfter) {
    throw ('Unexpected casual leave used count. Expected {0}, got {1}.' -f $expectedUsedAfter, $balanceAfterUsed)
}
if ($balanceAfterRemaining -ne $expectedRemainingAfter) {
    throw ('Unexpected casual leave remaining count. Expected {0}, got {1}.' -f $expectedRemainingAfter, $balanceAfterRemaining)
}

$facultyNotificationsAfterResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/notifications/me" -Headers @{ Authorization = "Bearer $script:facultyToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read faculty notifications after decisions' -Outcome $facultyNotificationsAfterResponse -Expectation '200'
$facultyNotificationsAfterData = To-Array (Parse-ResponseBody -BodyText $facultyNotificationsAfterResponse.BodyText)
if (-not ($facultyNotificationsAfterData | Where-Object { $_.title -eq 'Leave Approved' -and ([string]$_.message).Contains("#$($script:firstLeaveId)") })) {
    throw 'Approved leave notification was not found for the faculty user.'
}

if (-not ($facultyNotificationsAfterData | Where-Object { $_.title -eq 'Leave Rejected' -and ([string]$_.message).Contains("#$($script:secondLeaveId)") })) {
    throw 'Rejected leave notification was not found for the faculty user.'
}

$latestNotification = $facultyNotificationsAfterData | Sort-Object @{ Expression = { [int]$_.notification_id }; Descending = $true } | Select-Object -First 1
if (-not $latestNotification -or -not $latestNotification.notification_id) {
    throw 'Could not resolve a latest notification to mark as read.'
}

$markNotificationReadResponse = Invoke-TestRequest -Method PUT -Uri "$apiBase/notifications/$([int]$latestNotification.notification_id)/read" -Headers @{ Authorization = "Bearer $script:facultyToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Mark latest notification as read' -Outcome $markNotificationReadResponse -Expectation '200'

$notificationsAfterReadResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/notifications/me" -Headers @{ Authorization = "Bearer $script:facultyToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read faculty notifications after mark-read' -Outcome $notificationsAfterReadResponse -Expectation '200'
$notificationsAfterReadData = To-Array (Parse-ResponseBody -BodyText $notificationsAfterReadResponse.BodyText)
$readNotification = Find-NotificationById -Notifications $notificationsAfterReadData -NotificationId ([int]$latestNotification.notification_id)
if (-not $readNotification -or (-not $readNotification.is_read)) {
    throw 'Marked notification was not reported as read.'
}

$employeeListForbiddenResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/employees" -Headers @{ Authorization = "Bearer $script:facultyToken" } -ExpectedStatus @(403)
$null = Add-Result -Step 'Reject faculty employee listing' -Outcome $employeeListForbiddenResponse -Expectation '403'

$employeeListResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/employees" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'List employees as admin' -Outcome $employeeListResponse -Expectation '200'
$employeeListData = To-Array (Parse-ResponseBody -BodyText $employeeListResponse.BodyText)
$targetEmployee = Resolve-TargetEmployee -Employees $employeeListData -PreferredUserId $script:facultyProfile.UserId -PreferredEmail $script:facultyProfile.Email
if (-not $targetEmployee) {
    throw 'Could not resolve a faculty employee row for the update test.'
}

$script:employeeFacultyId = [int]$targetEmployee.faculty_id
$originalDesignation = [string]$targetEmployee.designation
if ([string]::IsNullOrWhiteSpace($originalDesignation)) {
    throw 'Target employee designation is empty and cannot be safely restored.'
}

$tempDesignation = New-SmokeLabel -Prefix 'HR-designation'
$updateEmployeeResponse = Invoke-TestRequest -Method PUT -Uri "$apiBase/employees/$($script:employeeFacultyId)" -Body @{ designation = $tempDesignation } -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Update employee designation' -Outcome $updateEmployeeResponse -Expectation '200'

$updatedEmployeeResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/employees/$($script:employeeFacultyId)" -Headers @{ Authorization = "Bearer $script:facultyToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Verify employee update' -Outcome $updatedEmployeeResponse -Expectation '200'
$updatedEmployeeData = Parse-ResponseBody -BodyText $updatedEmployeeResponse.BodyText
if ([string]$updatedEmployeeData.designation -ne $tempDesignation) {
    throw 'Employee designation did not update to the expected smoke value.'
}

$restoreEmployeeResponse = Invoke-TestRequest -Method PUT -Uri "$apiBase/employees/$($script:employeeFacultyId)" -Body @{ designation = $originalDesignation } -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Restore employee designation' -Outcome $restoreEmployeeResponse -Expectation '200'

$restoredEmployeeResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/employees/$($script:employeeFacultyId)" -Headers @{ Authorization = "Bearer $script:facultyToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Verify employee restoration' -Outcome $restoredEmployeeResponse -Expectation '200'
$restoredEmployeeData = Parse-ResponseBody -BodyText $restoredEmployeeResponse.BodyText
if ([string]$restoredEmployeeData.designation -ne $originalDesignation) {
    throw 'Employee designation did not restore to its original value.'
}

Write-Log ("Overall status: {0}" -f $overallPassed)
$results | ConvertTo-Json -Depth 6 | Out-File -FilePath $jsonPath -Encoding utf8

if ($overallPassed) {
    exit 0
} else {
    exit 1
}
