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

$serviceName = 'operations-service'
$logDirectory = Join-Path (Join-Path $PSScriptRoot '..\logs') $serviceName
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logPath = Join-Path $logDirectory "operations-smoke-$stamp.log"
$jsonPath = Join-Path $logDirectory "operations-smoke-$stamp.json"

$BaseUrl = $BaseUrl.TrimEnd('/')
$AuthBaseUrl = $AuthBaseUrl.TrimEnd('/')
$apiBase = "$BaseUrl/api/v1/ops"
$overallPassed = $true
$results = New-Object System.Collections.Generic.List[object]

$script:adminToken = $null
$script:facultyToken = $null
$script:studentToken = $null
$script:adminUserId = $null
$script:facultyUserId = $null
$script:studentUserId = $null

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

function Resolve-CurrentUserId {
    param(
        [Parameter(Mandatory = $true)][string]$Token,
        [Parameter(Mandatory = $true)][string]$Label
    )

    $meResponse = Invoke-TestRequest -Method GET -Uri "$AuthBaseUrl/api/v1/auth/me" -Headers @{ Authorization = "Bearer $Token" } -ExpectedStatus @(200)
    $null = Add-Result -Step ("Resolve {0} profile" -f $Label) -Outcome $meResponse -Expectation '200'
    Require-OutcomePass -Outcome $meResponse -Step ("Resolve {0} profile" -f $Label)

    $meData = Parse-ResponseBody -BodyText $meResponse.BodyText
    if (-not $meData -or -not $meData.user_id) {
        throw ("Auth-service profile lookup for {0} did not return a user_id." -f $Label)
    }

    return [string]$meData.user_id
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

$script:adminUserId = Resolve-CurrentUserId -Token $script:adminToken -Label 'admin'
$script:facultyUserId = Resolve-CurrentUserId -Token $script:facultyToken -Label 'faculty'
$script:studentUserId = Resolve-CurrentUserId -Token $script:studentToken -Label 'student'
Write-Log ("Resolved admin user_id: {0}" -f $script:adminUserId)
Write-Log ("Resolved faculty user_id: {0}" -f $script:facultyUserId)
Write-Log ("Resolved student user_id: {0}" -f $script:studentUserId)

$grievanceBody = @{
    category = 'Facilities'
    subject = 'Smoke grievance - wifi outage'
    description = 'The wifi network in the library is not working and the internet is down.'
}
$grievanceResponse = Invoke-TestRequestWithRetry429 -Method POST -Uri "$apiBase/grievances" -Body $grievanceBody -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(201)
$null = Add-Result -Step 'Create grievance' -Outcome $grievanceResponse -Expectation '201'
Require-OutcomePass -Outcome $grievanceResponse -Step 'Create grievance'
$grievanceData = Parse-ResponseBody -BodyText $grievanceResponse.BodyText
if (-not $grievanceData -or -not $grievanceData.ticket_id) {
    throw 'Grievance creation did not return a ticket_id.'
}
$grievanceTicketId = [int]$grievanceData.ticket_id
Write-Log ("Resolved grievance ticket_id: {0}" -f $grievanceTicketId)
if ([string]$grievanceData.assigned_department -ne 'IT Department') {
    throw ("Grievance routing mismatch. Expected IT Department but got '{0}'." -f $grievanceData.assigned_department)
}

$myGrievancesResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/grievances/me" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read my grievances' -Outcome $myGrievancesResponse -Expectation '200'
Require-OutcomePass -Outcome $myGrievancesResponse -Step 'Read my grievances'
$myGrievancesData = To-Array (Parse-ResponseBody -BodyText $myGrievancesResponse.BodyText)
$myGrievanceRecord = Find-RecordByProperty -Items $myGrievancesData -PropertyName 'ticket_id' -ExpectedValue ([string]$grievanceTicketId)
if (-not $myGrievanceRecord) {
    throw 'Student grievance list did not include the newly created grievance.'
}

$adminGrievancesResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/grievances" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read all grievances' -Outcome $adminGrievancesResponse -Expectation '200'
Require-OutcomePass -Outcome $adminGrievancesResponse -Step 'Read all grievances'
$adminGrievancesData = To-Array (Parse-ResponseBody -BodyText $adminGrievancesResponse.BodyText)
if (-not (Find-RecordByProperty -Items $adminGrievancesData -PropertyName 'ticket_id' -ExpectedValue ([string]$grievanceTicketId))) {
    throw 'Admin grievance list did not include the newly created grievance.'
}

$grievanceCommentBody = @{ comment = 'Faculty smoke comment for grievance tracking.' }
$grievanceCommentResponse = Invoke-TestRequestWithRetry429 -Method POST -Uri "$apiBase/grievances/$grievanceTicketId/comments" -Body $grievanceCommentBody -Headers @{ Authorization = "Bearer $script:facultyToken" } -ExpectedStatus @(201)
$null = Add-Result -Step 'Add grievance comment' -Outcome $grievanceCommentResponse -Expectation '201'
Require-OutcomePass -Outcome $grievanceCommentResponse -Step 'Add grievance comment'
$grievanceCommentData = Parse-ResponseBody -BodyText $grievanceCommentResponse.BodyText
if (-not $grievanceCommentData -or -not $grievanceCommentData.comment_id) {
    throw 'Grievance comment creation did not return a comment_id.'
}

$grievanceCommentsResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/grievances/$grievanceTicketId/comments" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read grievance comments' -Outcome $grievanceCommentsResponse -Expectation '200'
Require-OutcomePass -Outcome $grievanceCommentsResponse -Step 'Read grievance comments'
$grievanceCommentsData = To-Array (Parse-ResponseBody -BodyText $grievanceCommentsResponse.BodyText)
if (-not (Find-RecordByProperty -Items $grievanceCommentsData -PropertyName 'comment_id' -ExpectedValue ([string]$grievanceCommentData.comment_id))) {
    throw 'Grievance comment list did not include the smoke comment.'
}

$grievanceStatusBody = @{ status = 'Resolved'; resolution = 'Smoke test completed and verified.' }
$grievanceStatusResponse = Invoke-TestRequestWithRetry429 -Method PUT -Uri "$apiBase/grievances/$grievanceTicketId/status" -Body $grievanceStatusBody -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Resolve grievance' -Outcome $grievanceStatusResponse -Expectation '200'
Require-OutcomePass -Outcome $grievanceStatusResponse -Step 'Resolve grievance'
$grievanceStatusData = Parse-ResponseBody -BodyText $grievanceStatusResponse.BodyText
if ([string]$grievanceStatusData.status -ne 'Resolved') {
    throw 'Grievance status did not update to Resolved.'
}

$announcementBody = @{
    title = New-SmokeLabel -Prefix 'Announcement'
    content = 'Smoke announcement for operations-service'
    target_audience = @('student', 'all')
    target_programs = @()
    target_semesters = @()
    priority = 'high'
    is_pinned = $false
    attachments = @()
}
$announcementResponse = Invoke-TestRequestWithRetry429 -Method POST -Uri "$apiBase/announcements" -Body $announcementBody -Headers @{ Authorization = "Bearer $script:facultyToken" } -ExpectedStatus @(201)
$null = Add-Result -Step 'Create announcement' -Outcome $announcementResponse -Expectation '201'
Require-OutcomePass -Outcome $announcementResponse -Step 'Create announcement'
$announcementData = Parse-ResponseBody -BodyText $announcementResponse.BodyText
if (-not $announcementData -or -not $announcementData.id) {
    throw 'Announcement creation did not return an id.'
}
$announcementId = [string]$announcementData.id
Write-Log ("Resolved announcement id: {0}" -f $announcementId)

$studentAnnouncementsResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/announcements" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read announcements as student' -Outcome $studentAnnouncementsResponse -Expectation '200'
Require-OutcomePass -Outcome $studentAnnouncementsResponse -Step 'Read announcements as student'
$studentAnnouncementsData = To-Array (Parse-ResponseBody -BodyText $studentAnnouncementsResponse.BodyText)
if (-not (Find-RecordByProperty -Items $studentAnnouncementsData -PropertyName 'id' -ExpectedValue $announcementId)) {
    throw 'Student announcement list did not include the smoke announcement.'
}

$announcementDetailResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/announcements/$announcementId" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read announcement detail' -Outcome $announcementDetailResponse -Expectation '200'
Require-OutcomePass -Outcome $announcementDetailResponse -Step 'Read announcement detail'

$deleteAnnouncementResponse = Invoke-TestRequestWithRetry429 -Method DELETE -Uri "$apiBase/announcements/$announcementId" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Delete announcement' -Outcome $deleteAnnouncementResponse -Expectation '200'
Require-OutcomePass -Outcome $deleteAnnouncementResponse -Step 'Delete announcement'

$deletedAnnouncementCheck = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/announcements/$announcementId" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(404)
$null = Add-Result -Step 'Confirm announcement deleted' -Outcome $deletedAnnouncementCheck -Expectation '404'
Require-OutcomePass -Outcome $deletedAnnouncementCheck -Step 'Confirm announcement deleted'

$notificationBody = @{
    user_id = $script:studentUserId
    title = New-SmokeLabel -Prefix 'Notification'
    message = 'Smoke notification for operations-service'
    type = 'info'
    priority = 'medium'
    action_url = '/ops/notifications'
    metadata = @{ source = 'smoke'; category = 'operations' }
}
$notificationResponse = Invoke-TestRequestWithRetry429 -Method POST -Uri "$apiBase/notifications" -Body $notificationBody -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(201)
$null = Add-Result -Step 'Create notification' -Outcome $notificationResponse -Expectation '201'
Require-OutcomePass -Outcome $notificationResponse -Step 'Create notification'
$notificationData = Parse-ResponseBody -BodyText $notificationResponse.BodyText
if (-not $notificationData -or -not $notificationData.id) {
    throw 'Notification creation did not return an id.'
}
$notificationId = [string]$notificationData.id
Write-Log ("Resolved notification id: {0}" -f $notificationId)

$studentNotificationsResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/notifications/me?is_read=false&limit=20" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read unread notifications' -Outcome $studentNotificationsResponse -Expectation '200'
Require-OutcomePass -Outcome $studentNotificationsResponse -Step 'Read unread notifications'
$studentNotificationsData = To-Array (Parse-ResponseBody -BodyText $studentNotificationsResponse.BodyText)
if (-not (Find-RecordByProperty -Items $studentNotificationsData -PropertyName 'id' -ExpectedValue $notificationId)) {
    throw 'Unread notifications did not include the smoke notification.'
}

$markNotificationReadResponse = Invoke-TestRequestWithRetry429 -Method PUT -Uri "$apiBase/notifications/$notificationId/read" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Mark notification read' -Outcome $markNotificationReadResponse -Expectation '200'
Require-OutcomePass -Outcome $markNotificationReadResponse -Step 'Mark notification read'

$markAllNotificationsReadResponse = Invoke-TestRequestWithRetry429 -Method PUT -Uri "$apiBase/notifications/read-all" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Mark all notifications read' -Outcome $markAllNotificationsReadResponse -Expectation '200'
Require-OutcomePass -Outcome $markAllNotificationsReadResponse -Step 'Mark all notifications read'

$mediaBody = @{
    s3_url = 'https://example.com/ops-smoke.png'
    s3_key = ("ops/smoke/{0}.png" -f $stamp)
    file_type = 'image/png'
    file_name = 'ops-smoke.png'
    size_bytes = 1024
    entity_type = 'grievance'
    entity_id = [string]$grievanceTicketId
    is_public = $false
}
$mediaResponse = Invoke-TestRequestWithRetry429 -Method POST -Uri "$apiBase/media-assets" -Body $mediaBody -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(201)
$null = Add-Result -Step 'Create media asset' -Outcome $mediaResponse -Expectation '201'
Require-OutcomePass -Outcome $mediaResponse -Step 'Create media asset'
$mediaData = Parse-ResponseBody -BodyText $mediaResponse.BodyText
if (-not $mediaData -or -not $mediaData.id) {
    throw 'Media asset creation did not return an id.'
}
$mediaAssetId = [string]$mediaData.id
Write-Log ("Resolved media asset id: {0}" -f $mediaAssetId)

$mediaListResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/media-assets?entity_type=grievance&entity_id=$grievanceTicketId&limit=20" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read media assets' -Outcome $mediaListResponse -Expectation '200'
Require-OutcomePass -Outcome $mediaListResponse -Step 'Read media assets'
$mediaListData = To-Array (Parse-ResponseBody -BodyText $mediaListResponse.BodyText)
if (-not (Find-RecordByProperty -Items $mediaListData -PropertyName 'id' -ExpectedValue $mediaAssetId)) {
    throw 'Media asset list did not include the smoke asset.'
}

$deleteMediaResponse = Invoke-TestRequestWithRetry429 -Method DELETE -Uri "$apiBase/media-assets/$mediaAssetId" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Delete media asset' -Outcome $deleteMediaResponse -Expectation '200'
Require-OutcomePass -Outcome $deleteMediaResponse -Step 'Delete media asset'

$auditBody = @{
    action = 'OPS_SMOKE'
    target_entity = 'operations-service'
    entity_id = [string]$grievanceTicketId
    old_value = 'pending'
    new_value = 'resolved'
    severity = 'INFO'
}
$auditResponse = Invoke-TestRequestWithRetry429 -Method POST -Uri "$apiBase/audit-trails" -Body $auditBody -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(201)
$null = Add-Result -Step 'Create audit trail' -Outcome $auditResponse -Expectation '201'
Require-OutcomePass -Outcome $auditResponse -Step 'Create audit trail'
$auditData = Parse-ResponseBody -BodyText $auditResponse.BodyText
if (-not $auditData -or -not $auditData.id) {
    throw 'Audit trail creation did not return an id.'
}
$auditId = [string]$auditData.id
Write-Log ("Resolved audit trail id: {0}" -f $auditId)

$auditListResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/audit-trails?action=OPS_SMOKE&limit=20" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read audit trails' -Outcome $auditListResponse -Expectation '200'
Require-OutcomePass -Outcome $auditListResponse -Step 'Read audit trails'
$auditListData = To-Array (Parse-ResponseBody -BodyText $auditListResponse.BodyText)
if (-not (Find-RecordByProperty -Items $auditListData -PropertyName 'id' -ExpectedValue $auditId)) {
    throw 'Audit trail list did not include the smoke entry.'
}

$systemLogBody = @{
    service_name = 'operations-service-smoke'
    level = 'info'
    message = 'Operations smoke log entry'
    stack_trace = $null
    context = @{ ticket_id = $grievanceTicketId; announcement_id = $announcementId }
    environment = 'test'
}
$systemLogResponse = Invoke-TestRequestWithRetry429 -Method POST -Uri "$apiBase/system-logs" -Body $systemLogBody -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(201)
$null = Add-Result -Step 'Create system log' -Outcome $systemLogResponse -Expectation '201'
Require-OutcomePass -Outcome $systemLogResponse -Step 'Create system log'
$systemLogData = Parse-ResponseBody -BodyText $systemLogResponse.BodyText
if (-not $systemLogData -or -not $systemLogData.id) {
    throw 'System log creation did not return an id.'
}
$systemLogId = [string]$systemLogData.id
Write-Log ("Resolved system log id: {0}" -f $systemLogId)

$systemLogListResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/system-logs?service_name=operations-service-smoke&limit=20" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read system logs' -Outcome $systemLogListResponse -Expectation '200'
Require-OutcomePass -Outcome $systemLogListResponse -Step 'Read system logs'
$systemLogListData = To-Array (Parse-ResponseBody -BodyText $systemLogListResponse.BodyText)
if (-not (Find-RecordByProperty -Items $systemLogListData -PropertyName 'id' -ExpectedValue $systemLogId)) {
    throw 'System log list did not include the smoke entry.'
}

$featureName = New-SmokeLabel -Prefix 'ops-flag'
$featureSetUrl = '{0}/feature-flags/{1}?enabled=true&rollout_percentage=75&target_roles=student' -f $apiBase, $featureName
$featureSetResponse = Invoke-TestRequestWithRetry429 -Method PUT -Uri $featureSetUrl -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Set feature flag' -Outcome $featureSetResponse -Expectation '200'
Require-OutcomePass -Outcome $featureSetResponse -Step 'Set feature flag'

$featureStudentResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/feature-flags/$featureName" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read feature flag as student' -Outcome $featureStudentResponse -Expectation '200'
Require-OutcomePass -Outcome $featureStudentResponse -Step 'Read feature flag as student'
$featureStudentData = Parse-ResponseBody -BodyText $featureStudentResponse.BodyText
if (-not $featureStudentData -or -not $featureStudentData.enabled) {
    throw 'Student feature flag read did not return enabled=true.'
}

$featureFacultyResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/feature-flags/$featureName" -Headers @{ Authorization = "Bearer $script:facultyToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read feature flag as faculty' -Outcome $featureFacultyResponse -Expectation '200'
Require-OutcomePass -Outcome $featureFacultyResponse -Step 'Read feature flag as faculty'
$featureFacultyData = Parse-ResponseBody -BodyText $featureFacultyResponse.BodyText
if ($featureFacultyData.enabled) {
    throw 'Faculty feature flag read should have been disabled by target_roles filtering.'
}

$featureListResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/feature-flags" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'List feature flags' -Outcome $featureListResponse -Expectation '200'
Require-OutcomePass -Outcome $featureListResponse -Step 'List feature flags'
$featureListData = To-Array (Parse-ResponseBody -BodyText $featureListResponse.BodyText)
if (-not (Find-RecordByProperty -Items $featureListData -PropertyName 'feature' -ExpectedValue $featureName)) {
    throw 'Feature flag list did not include the smoke flag.'
}

$featureDeleteResponse = Invoke-TestRequestWithRetry429 -Method DELETE -Uri "$apiBase/feature-flags/$featureName" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Delete feature flag' -Outcome $featureDeleteResponse -Expectation '200'
Require-OutcomePass -Outcome $featureDeleteResponse -Step 'Delete feature flag'

$featureGoneResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/feature-flags/$featureName" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(404)
$null = Add-Result -Step 'Confirm feature flag deleted' -Outcome $featureGoneResponse -Expectation '404'
Require-OutcomePass -Outcome $featureGoneResponse -Step 'Confirm feature flag deleted'

Write-Log ("Overall status: {0}" -f $overallPassed)
$results | ConvertTo-Json -Depth 8 | Out-File -FilePath $jsonPath -Encoding utf8

if ($overallPassed) {
    exit 0
} else {
    exit 1
}
