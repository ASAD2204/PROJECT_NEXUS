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

$serviceName = 'notification-service'
$logDirectory = Join-Path (Join-Path $PSScriptRoot '..\logs') $serviceName
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logPath = Join-Path $logDirectory "notification-smoke-$stamp.log"
$jsonPath = Join-Path $logDirectory "notification-smoke-$stamp.json"

$BaseUrl = $BaseUrl.TrimEnd('/')
$AuthBaseUrl = $AuthBaseUrl.TrimEnd('/')
$apiBase = "$BaseUrl/api/v1/notify"
$overallPassed = $true
$results = New-Object System.Collections.Generic.List[object]

$script:adminToken = $null
$script:studentToken = $null
$script:adminUserId = $null
$script:studentUserId = $null
$script:websocket = $null
$script:notificationAId = $null
$script:notificationBId = $null
$script:announcementId = $null

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

function Get-NotificationWebSocketUri {
    param([Parameter(Mandatory = $true)][string]$Token)

    if ($BaseUrl.StartsWith('https://')) {
        $wsBase = 'wss://' + $BaseUrl.Substring(8)
    }
    elseif ($BaseUrl.StartsWith('http://')) {
        $wsBase = 'ws://' + $BaseUrl.Substring(7)
    }
    else {
        $wsBase = 'ws://' + $BaseUrl.TrimStart('/')
    }

    return [Uri]("{0}/api/v1/notify/ws?token={1}" -f $wsBase.TrimEnd('/'), [System.Uri]::EscapeDataString($Token))
}

function Open-NotificationWebSocket {
    param([Parameter(Mandatory = $true)][string]$Token)

    $client = [System.Net.WebSockets.ClientWebSocket]::new()
    $client.Options.KeepAliveInterval = [TimeSpan]::FromSeconds(10)
    $cts = New-Object System.Threading.CancellationTokenSource
    $uri = Get-NotificationWebSocketUri -Token $Token

    try {
        $null = $client.ConnectAsync($uri, $cts.Token).GetAwaiter().GetResult()
        return [pscustomobject]@{
            Client = $client
            CancellationTokenSource = $cts
            Uri = $uri.AbsoluteUri
        }
    } catch {
        $client.Dispose()
        $cts.Dispose()
        throw
    }
}

function Send-NotificationWebSocketText {
    param(
        [Parameter(Mandatory = $true)]$Client,
        [Parameter(Mandatory = $true)][string]$Text
    )

    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
    $segment = New-Object System.ArraySegment[byte] -ArgumentList (,$bytes)
    $sendTimeout = New-Object System.Threading.CancellationTokenSource(5000)

    try {
        $null = $Client.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $sendTimeout.Token).GetAwaiter().GetResult()
    } finally {
        $sendTimeout.Dispose()
    }
}

function Receive-NotificationWebSocketText {
    param(
        [Parameter(Mandatory = $true)]$Client,
        [int]$TimeoutMs = 8000
    )

    $buffer = New-Object byte[] 4096
    $segment = New-Object System.ArraySegment[byte] -ArgumentList (,$buffer)
    $receiveTimeout = New-Object System.Threading.CancellationTokenSource($TimeoutMs)
    $builder = New-Object System.Text.StringBuilder

    try {
        do {
            $result = $Client.ReceiveAsync($segment, $receiveTimeout.Token).GetAwaiter().GetResult()
            if ($result.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Close) {
                break
            }

            $chunk = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $result.Count)
            [void]$builder.Append($chunk)
        } while (-not $result.EndOfMessage)

        return $builder.ToString()
    } finally {
        $receiveTimeout.Dispose()
    }
}

function Close-NotificationWebSocket {
    param(
        [Parameter(Mandatory = $true)]$Client,
        [Parameter(Mandatory = $true)]$CancellationTokenSource
    )

    try {
        if ($Client.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
            $closeTimeout = New-Object System.Threading.CancellationTokenSource(3000)
            try {
                $null = $Client.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, 'smoke test complete', $closeTimeout.Token).GetAwaiter().GetResult()
            } finally {
                $closeTimeout.Dispose()
            }
        }
    } catch {
    } finally {
        $Client.Dispose()
        $CancellationTokenSource.Dispose()
    }
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
$script:studentToken = Resolve-AuthToken -Email $StudentEmail -Password $StudentPassword -Label 'student'
Write-Log 'Admin token: present'
Write-Log 'Student token: present'

$script:adminUserId = Resolve-CurrentUserId -Token $script:adminToken -Label 'admin'
$script:studentUserId = Resolve-CurrentUserId -Token $script:studentToken -Label 'student'
Write-Log ("Resolved admin user_id: {0}" -f $script:adminUserId)
Write-Log ("Resolved student user_id: {0}" -f $script:studentUserId)

$script:websocket = Open-NotificationWebSocket -Token $script:studentToken
Write-Log ("Opened notification websocket: {0}" -f $script:websocket.Uri)

$pingOutcome = New-Outcome -Passed $false -StatusCode 200
try {
    Send-NotificationWebSocketText -Client $script:websocket.Client -Text 'ping'
    $pongText = Receive-NotificationWebSocketText -Client $script:websocket.Client -TimeoutMs 5000
    $pingOutcome = New-Outcome -Passed ([string]$pongText -eq 'pong') -BodyText $pongText -StatusCode 200
} catch {
    $pingOutcome = New-Outcome -Passed $false -StatusCode 500 -Error $_.Exception.Message
}
$null = Add-Result -Step 'Notification websocket ping/pong' -Outcome $pingOutcome -Expectation '200'
Require-OutcomePass -Outcome $pingOutcome -Step 'Notification websocket ping/pong'

$notificationBodyA = @{
    user_id = $script:studentUserId
    title = New-SmokeLabel -Prefix 'Notification A'
    message = 'First smoke notification'
    type = 'info'
    priority = 'medium'
    action_url = '/notify/inbox'
    metadata = @{ source = 'smoke'; index = 1 }
}
$notificationResponseA = Invoke-TestRequestWithRetry429 -Method POST -Uri "$apiBase/notifications" -Body $notificationBodyA -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(201)
$null = Add-Result -Step 'Create first notification' -Outcome $notificationResponseA -Expectation '201'
Require-OutcomePass -Outcome $notificationResponseA -Step 'Create first notification'
$notificationDataA = Parse-ResponseBody -BodyText $notificationResponseA.BodyText
if (-not $notificationDataA -or -not $notificationDataA.id) {
    throw 'First notification creation did not return an id.'
}
$script:notificationAId = [string]$notificationDataA.id
Write-Log ("Resolved notification A id: {0}" -f $script:notificationAId)

$pushOutcomeA = New-Outcome -Passed $false -StatusCode 200
try {
    $pushTextA = Receive-NotificationWebSocketText -Client $script:websocket.Client -TimeoutMs 8000
    $pushOutcomeA = New-Outcome -Passed $true -BodyText $pushTextA -StatusCode 200
} catch {
    $pushOutcomeA = New-Outcome -Passed $false -StatusCode 500 -Error $_.Exception.Message
}
$null = Add-Result -Step 'Receive notification push' -Outcome $pushOutcomeA -Expectation '200'
Require-OutcomePass -Outcome $pushOutcomeA -Step 'Receive notification push'
$pushDataA = Parse-ResponseBody -BodyText $pushOutcomeA.BodyText
if (-not $pushDataA -or ([string]$pushDataA.id -ne $script:notificationAId) -or ([string]$pushDataA.title -ne [string]$notificationBodyA.title)) {
    throw 'Notification websocket push did not match the created notification.'
}

$unreadListResponseA = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/notifications/me?is_read=false&limit=20" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read unread notifications' -Outcome $unreadListResponseA -Expectation '200'
Require-OutcomePass -Outcome $unreadListResponseA -Step 'Read unread notifications'
$unreadListDataA = To-Array (Parse-ResponseBody -BodyText $unreadListResponseA.BodyText)
if (-not (Find-RecordByProperty -Items $unreadListDataA -PropertyName 'id' -ExpectedValue $script:notificationAId)) {
    throw 'Unread notifications did not include the first smoke notification.'
}

$markReadResponseA = Invoke-TestRequestWithRetry429 -Method PUT -Uri "$apiBase/notifications/$script:notificationAId/read" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Mark first notification read' -Outcome $markReadResponseA -Expectation '200'
Require-OutcomePass -Outcome $markReadResponseA -Step 'Mark first notification read'

$unreadAfterReadResponseA = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/notifications/me?is_read=false&limit=20" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Verify unread list after read' -Outcome $unreadAfterReadResponseA -Expectation '200'
Require-OutcomePass -Outcome $unreadAfterReadResponseA -Step 'Verify unread list after read'
$unreadAfterReadDataA = To-Array (Parse-ResponseBody -BodyText $unreadAfterReadResponseA.BodyText)
if ($unreadAfterReadDataA -and (Find-RecordByProperty -Items $unreadAfterReadDataA -PropertyName 'id' -ExpectedValue $script:notificationAId)) {
    throw 'First smoke notification still appeared in the unread list after marking read.'
}

$notificationBodyB = @{
    user_id = $script:studentUserId
    title = New-SmokeLabel -Prefix 'Notification B'
    message = 'Second smoke notification'
    type = 'warning'
    priority = 'high'
    action_url = '/notify/inbox'
    metadata = @{ source = 'smoke'; index = 2 }
}
$notificationResponseB = Invoke-TestRequestWithRetry429 -Method POST -Uri "$apiBase/notifications" -Body $notificationBodyB -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(201)
$null = Add-Result -Step 'Create second notification' -Outcome $notificationResponseB -Expectation '201'
Require-OutcomePass -Outcome $notificationResponseB -Step 'Create second notification'
$notificationDataB = Parse-ResponseBody -BodyText $notificationResponseB.BodyText
if (-not $notificationDataB -or -not $notificationDataB.id) {
    throw 'Second notification creation did not return an id.'
}
$script:notificationBId = [string]$notificationDataB.id
Write-Log ("Resolved notification B id: {0}" -f $script:notificationBId)

$pushOutcomeB = New-Outcome -Passed $false -StatusCode 200
try {
    $pushTextB = Receive-NotificationWebSocketText -Client $script:websocket.Client -TimeoutMs 8000
    $pushOutcomeB = New-Outcome -Passed $true -BodyText $pushTextB -StatusCode 200
} catch {
    $pushOutcomeB = New-Outcome -Passed $false -StatusCode 500 -Error $_.Exception.Message
}
$null = Add-Result -Step 'Receive second notification push' -Outcome $pushOutcomeB -Expectation '200'
Require-OutcomePass -Outcome $pushOutcomeB -Step 'Receive second notification push'
$pushDataB = Parse-ResponseBody -BodyText $pushOutcomeB.BodyText
if (-not $pushDataB -or ([string]$pushDataB.id -ne $script:notificationBId) -or ([string]$pushDataB.title -ne [string]$notificationBodyB.title)) {
    throw 'Second notification websocket push did not match the created notification.'
}

$readAllResponse = Invoke-TestRequestWithRetry429 -Method PUT -Uri "$apiBase/notifications/read-all" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Mark all notifications read' -Outcome $readAllResponse -Expectation '200'
Require-OutcomePass -Outcome $readAllResponse -Step 'Mark all notifications read'

$readListResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/notifications/me?is_read=true&limit=20" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read notifications by read state' -Outcome $readListResponse -Expectation '200'
Require-OutcomePass -Outcome $readListResponse -Step 'Read notifications by read state'
$readListData = To-Array (Parse-ResponseBody -BodyText $readListResponse.BodyText)
$recordA = Find-RecordByProperty -Items $readListData -PropertyName 'id' -ExpectedValue $script:notificationAId
$recordB = Find-RecordByProperty -Items $readListData -PropertyName 'id' -ExpectedValue $script:notificationBId
if (-not $recordA -or -not $recordB) {
    throw 'Read notifications list did not include both smoke notifications.'
}

$announcementBody = @{
    title = New-SmokeLabel -Prefix 'Announcement'
    content = 'Smoke announcement for notification-service'
    target_audience = @('all')
    priority = 'high'
}
$announcementResponse = Invoke-TestRequestWithRetry429 -Method POST -Uri "$apiBase/announcements/global" -Body $announcementBody -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(201)
$null = Add-Result -Step 'Create global announcement' -Outcome $announcementResponse -Expectation '201'
Require-OutcomePass -Outcome $announcementResponse -Step 'Create global announcement'
$announcementData = Parse-ResponseBody -BodyText $announcementResponse.BodyText
if (-not $announcementData -or -not $announcementData.id) {
    throw 'Announcement creation did not return an id.'
}
$script:announcementId = [string]$announcementData.id

$broadcastOutcome = New-Outcome -Passed $false -StatusCode 200
try {
    $broadcastText = Receive-NotificationWebSocketText -Client $script:websocket.Client -TimeoutMs 8000
    $broadcastOutcome = New-Outcome -Passed $true -BodyText $broadcastText -StatusCode 200
} catch {
    $broadcastOutcome = New-Outcome -Passed $false -StatusCode 500 -Error $_.Exception.Message
}
$null = Add-Result -Step 'Receive announcement broadcast' -Outcome $broadcastOutcome -Expectation '200'
Require-OutcomePass -Outcome $broadcastOutcome -Step 'Receive announcement broadcast'
$broadcastData = Parse-ResponseBody -BodyText $broadcastOutcome.BodyText
if (-not $broadcastData -or ([string]$broadcastData.event -ne 'global_announcement') -or ([string]$broadcastData.title -ne [string]$announcementBody.title)) {
    throw 'Announcement websocket broadcast did not match the created announcement.'
}

Close-NotificationWebSocket -Client $script:websocket.Client -CancellationTokenSource $script:websocket.CancellationTokenSource

Write-Log ("Overall status: {0}" -f $overallPassed)
$results | ConvertTo-Json -Depth 8 | Out-File -FilePath $jsonPath -Encoding utf8

if ($overallPassed) {
    exit 0
} else {
    exit 1
}
