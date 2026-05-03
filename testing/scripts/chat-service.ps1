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

$serviceName = 'chat-service'
$logDirectory = Join-Path (Join-Path $PSScriptRoot '..\logs') $serviceName
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logPath = Join-Path $logDirectory "chat-smoke-$stamp.log"
$jsonPath = Join-Path $logDirectory "chat-smoke-$stamp.json"

$BaseUrl = $BaseUrl.TrimEnd('/')
$AuthBaseUrl = $AuthBaseUrl.TrimEnd('/')
$apiBase = "$BaseUrl/api/v1/chat"
$overallPassed = $true
$results = New-Object System.Collections.Generic.List[object]
$script:adminToken = $null
$script:studentToken = $null
$script:adminUserId = $null
$script:studentUserId = $null
$script:sessionId = $null
$script:restMessageContent = $null
$script:websocketMessageContent = $null

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

function Resolve-CurrentUserId {
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

    return [string]$meData.user_id
}

function Find-DirectSessionId {
    param(
        [Parameter(Mandatory = $true)]$Sessions,
        [Parameter(Mandatory = $true)][string]$UserA,
        [Parameter(Mandatory = $true)][string]$UserB
    )

    foreach ($session in @($Sessions)) {
        $participants = @($session.participants)
        if ($participants.Count -eq 2 -and $participants -contains $UserA -and $participants -contains $UserB) {
            return [string]$session.session_id
        }
    }

    return $null
}

function Get-ChatWebSocketUri {
    param(
        [Parameter(Mandatory = $true)][string]$SessionId,
        [Parameter(Mandatory = $true)][string]$Token
    )

    if ($BaseUrl.StartsWith('https://')) {
        $wsBase = 'wss://' + $BaseUrl.Substring(8)
    }
    elseif ($BaseUrl.StartsWith('http://')) {
        $wsBase = 'ws://' + $BaseUrl.Substring(7)
    }
    else {
        $wsBase = 'ws://' + $BaseUrl.TrimStart('/')
    }

    return [Uri]("{0}/api/v1/chat/ws/{1}?token={2}" -f $wsBase.TrimEnd('/'), $SessionId, [System.Uri]::EscapeDataString($Token))
}

function Open-ChatWebSocket {
    param(
        [Parameter(Mandatory = $true)][string]$SessionId,
        [Parameter(Mandatory = $true)][string]$Token
    )

    $client = [System.Net.WebSockets.ClientWebSocket]::new()
    $client.Options.KeepAliveInterval = [TimeSpan]::FromSeconds(10)
    $cts = New-Object System.Threading.CancellationTokenSource
    $uri = Get-ChatWebSocketUri -SessionId $SessionId -Token $Token

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

function Send-ChatWebSocketText {
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

function Receive-ChatWebSocketText {
    param(
        [Parameter(Mandatory = $true)]$Client,
        [int]$TimeoutMs = 5000
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

function Close-ChatWebSocket {
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

Write-Log "Service: $serviceName"
Write-Log "Base URL: $BaseUrl"
Write-Log "Auth Base URL: $AuthBaseUrl"

$gatewayHealth = Invoke-TestRequest -Method GET -Uri "$BaseUrl/health" -ExpectedStatus @(200)
Add-Result -Step 'Gateway health' -Outcome $gatewayHealth -Expectation '200'

$script:adminToken = Resolve-AuthToken -Email $AdminEmail -Password $AdminPassword -Label 'admin'
$script:studentToken = Resolve-AuthToken -Email $StudentEmail -Password $StudentPassword -Label 'student'
Write-Log 'Admin token: present'
Write-Log 'Student token: present'

$script:adminUserId = Resolve-CurrentUserId -Token $script:adminToken -Label 'admin'
$script:studentUserId = Resolve-CurrentUserId -Token $script:studentToken -Label 'student'
Write-Log ("Resolved admin user_id: {0}" -f $script:adminUserId)
Write-Log ("Resolved student user_id: {0}" -f $script:studentUserId)

$createSessionBody = @{ participant_ids = @($script:adminUserId, $script:studentUserId) }
$createSessionResponse = Invoke-TestRequest -Method POST -Uri "$apiBase/sessions" -Body $createSessionBody -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(201)
Add-Result -Step 'Create direct chat session' -Outcome $createSessionResponse -Expectation '201'

$createSessionData = Parse-ResponseBody -BodyText $createSessionResponse.BodyText
if ($createSessionData -and $createSessionData.session_id) {
    $script:sessionId = [string]$createSessionData.session_id
} else {
    $listSessionsResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/sessions" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
    Add-Result -Step 'List chat sessions for admin' -Outcome $listSessionsResponse -Expectation '200'
    $listSessionsData = Parse-ResponseBody -BodyText $listSessionsResponse.BodyText
    $script:sessionId = Find-DirectSessionId -Sessions $listSessionsData -UserA $script:adminUserId -UserB $script:studentUserId
}

if (-not $script:sessionId) {
    throw 'Unable to resolve a direct chat session between the seeded admin and student accounts.'
}

Write-Log ("Resolved chat session_id: {0}" -f $script:sessionId)

$listSessionsResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/sessions" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
Add-Result -Step 'List chat sessions for admin' -Outcome $listSessionsResponse -Expectation '200'
$listSessionsData = Parse-ResponseBody -BodyText $listSessionsResponse.BodyText
if (-not (Find-DirectSessionId -Sessions $listSessionsData -UserA $script:adminUserId -UserB $script:studentUserId)) {
    throw 'The direct chat session was not present in the admin session list.'
}

$script:restMessageContent = 'chat-rest-smoke-{0}-{1}' -f $stamp, ([guid]::NewGuid().ToString('N').Substring(0, 8))
$restMessageBody = @{
    content = $script:restMessageContent
    attachments = @()
    message_type = 'text'
}
$restMessageResponse = Invoke-TestRequest -Method POST -Uri "$apiBase/messages/$script:sessionId" -Body $restMessageBody -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(201)
Add-Result -Step 'Send REST chat message as admin' -Outcome $restMessageResponse -Expectation '201'

$restMessageData = Parse-ResponseBody -BodyText $restMessageResponse.BodyText
if (-not $restMessageData -or $restMessageData.content -ne $script:restMessageContent) {
    throw 'REST chat message did not persist the expected content.'
}

$adminConversationsResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/conversations" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
Add-Result -Step 'List admin conversations' -Outcome $adminConversationsResponse -Expectation '200'
$adminConversationsData = Parse-ResponseBody -BodyText $adminConversationsResponse.BodyText
$adminConversationMatch = $false
foreach ($conversation in @($adminConversationsData)) {
    if ($conversation.session_id -eq $script:sessionId -and $conversation.last_message -eq $script:restMessageContent) {
        $adminConversationMatch = $true
        break
    }
}

if (-not $adminConversationMatch) {
    throw 'Admin conversations did not reflect the latest REST message.'
}

$messagesAfterRestResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/messages/$($script:sessionId)?skip=0&limit=20" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
Add-Result -Step 'Read message history as student' -Outcome $messagesAfterRestResponse -Expectation '200'
$messagesAfterRestData = Parse-ResponseBody -BodyText $messagesAfterRestResponse.BodyText
$restMessageSeen = $false
foreach ($message in @($messagesAfterRestData)) {
    if ($message.content -eq $script:restMessageContent -and $message.session_id -eq $script:sessionId) {
        $restMessageSeen = $true
        break
    }
}

if (-not $restMessageSeen) {
    throw 'REST message was not returned from message history.'
}

$webSocket = $null
try {
    $webSocket = Open-ChatWebSocket -SessionId $script:sessionId -Token $script:studentToken
    Write-Log ("Opened chat websocket: {0}" -f $webSocket.Uri)

    $script:websocketMessageContent = 'chat-ws-smoke-{0}-{1}' -f $stamp, ([guid]::NewGuid().ToString('N').Substring(0, 8))
    $webSocketBody = @{
        content = $script:websocketMessageContent
        message_type = 'text'
        attachments = @()
    } | ConvertTo-Json -Depth 5 -Compress

    Send-ChatWebSocketText -Client $webSocket.Client -Text $webSocketBody
    $webSocketResponseText = Receive-ChatWebSocketText -Client $webSocket.Client -TimeoutMs 7000
    $webSocketResponseData = Parse-ResponseBody -BodyText $webSocketResponseText

    $webSocketOutcome = [pscustomobject]@{
        Passed = $false
        StatusCode = 200
        BodyText = $webSocketResponseText
        Error = $null
        DurationMs = 0
    }
    if ($webSocketResponseData -and $webSocketResponseData.content -eq $script:websocketMessageContent -and $webSocketResponseData.session_id -eq $script:sessionId -and $webSocketResponseData.sender_id -eq $script:studentUserId) {
        $webSocketOutcome.Passed = $true
    }
    Add-Result -Step 'Send and receive chat websocket message as student' -Outcome $webSocketOutcome -Expectation 'matching broadcast payload'

    if (-not $webSocketOutcome.Passed) {
        throw 'WebSocket broadcast payload did not match the sent message.'
    }

    $onlineResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/online" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
    Add-Result -Step 'Read online users while websocket is open' -Outcome $onlineResponse -Expectation '200'
    $onlineData = Parse-ResponseBody -BodyText $onlineResponse.BodyText
    if (-not $onlineData -or (@($onlineData.online_users) -notcontains $script:studentUserId)) {
        throw 'Student user was not reported as online while the websocket connection was open.'
    }
} finally {
    if ($webSocket) {
        Close-ChatWebSocket -Client $webSocket.Client -CancellationTokenSource $webSocket.CancellationTokenSource
    }
}

$onlineAfterCloseResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/online" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
Add-Result -Step 'Read online users after websocket close' -Outcome $onlineAfterCloseResponse -Expectation '200'
$onlineAfterCloseData = Parse-ResponseBody -BodyText $onlineAfterCloseResponse.BodyText
if ($onlineAfterCloseData -and (@($onlineAfterCloseData.online_users) -contains $script:studentUserId)) {
    throw 'Student user remained online after the websocket was closed.'
}

$messagesAfterWsResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/messages/$($script:sessionId)?skip=0&limit=20" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
Add-Result -Step 'Read message history after websocket send' -Outcome $messagesAfterWsResponse -Expectation '200'
$messagesAfterWsData = Parse-ResponseBody -BodyText $messagesAfterWsResponse.BodyText
$restMessageSeen = $false
$webSocketMessageSeen = $false
foreach ($message in @($messagesAfterWsData)) {
    if ($message.content -eq $script:restMessageContent -and $message.session_id -eq $script:sessionId) {
        $restMessageSeen = $true
    }
    if ($message.content -eq $script:websocketMessageContent -and $message.session_id -eq $script:sessionId) {
        $webSocketMessageSeen = $true
    }
}

if (-not $restMessageSeen -or -not $webSocketMessageSeen) {
    throw 'Message history did not contain both persisted smoke-test messages.'
}

$studentConversationsResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/conversations" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
Add-Result -Step 'List student conversations' -Outcome $studentConversationsResponse -Expectation '200'
$studentConversationsData = Parse-ResponseBody -BodyText $studentConversationsResponse.BodyText
$studentConversationMatch = $false
foreach ($conversation in @($studentConversationsData)) {
    if ($conversation.session_id -eq $script:sessionId -and $conversation.last_message -eq $script:websocketMessageContent) {
        $studentConversationMatch = $true
        break
    }
}

if (-not $studentConversationMatch) {
    throw 'Student conversations did not reflect the websocket message as the latest message.'
}

Write-Log ("Overall status: {0}" -f $overallPassed)
$results | ConvertTo-Json -Depth 6 | Out-File -FilePath $jsonPath -Encoding utf8

if ($overallPassed) {
    exit 0
} else {
    exit 1
}
