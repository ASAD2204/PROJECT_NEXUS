param(
    [string]$BaseUrl = 'http://127.0.0.1',
    [string]$Token = $env:NEXUS_TEST_TOKEN,
    [string]$AuthBaseUrl = 'http://127.0.0.1',
    [string]$AuthEmail = '',
    [string]$AuthPassword = 'Nexus!Smoke12345'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$serviceName = 'ai-service'
$logDirectory = Join-Path (Join-Path $PSScriptRoot '..\logs') $serviceName
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logPath = Join-Path $logDirectory "ai-smoke-$stamp.log"
$jsonPath = Join-Path $logDirectory "ai-smoke-$stamp.json"

$BaseUrl = $BaseUrl.TrimEnd('/')
$AuthBaseUrl = $AuthBaseUrl.TrimEnd('/')
$apiBase = "$BaseUrl/api/v1/ai"
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
    if (-not [string]::IsNullOrWhiteSpace($Token)) {
        return $Token
    }

    $authLogDirectory = Join-Path (Join-Path $PSScriptRoot '..\logs') 'auth-service'
    if (-not (Test-Path $authLogDirectory)) {
        throw 'No auth token provided and no auth-service log directory was found.'
    }

    $latestAuthSummary = Get-ChildItem -Path $authLogDirectory -Filter '*.json' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $latestAuthSummary) {
        throw 'No auth token provided and no auth-service JSON summary was found.'
    }

    $authSummary = Get-Content -Path $latestAuthSummary.FullName -Raw | ConvertFrom-Json
    $candidateEmail = $AuthEmail
    if ([string]::IsNullOrWhiteSpace($candidateEmail)) {
        $candidateEmail = $authSummary.TestUser
    }

    if ([string]::IsNullOrWhiteSpace($candidateEmail)) {
        throw 'Could not resolve an auth-service test user email.'
    }

    $loginBody = @{ email = $candidateEmail; password = $AuthPassword }
    $loginResponse = Invoke-TestRequest -Method POST -Uri "$AuthBaseUrl/api/v1/auth/login" -Body $loginBody -ExpectedStatus @(200)
    Add-Result -Step 'Acquire auth token from auth-service' -Outcome $loginResponse -Expectation '200'

    $loginData = Parse-ResponseBody -BodyText $loginResponse.BodyText
    if (-not $loginData -or -not $loginData.access_token) {
        throw 'Auth-service login did not return an access token.'
    }

    return [string]$loginData.access_token
}

Write-Log "Service: $serviceName"
Write-Log "Base URL: $BaseUrl"

$resolvedToken = Resolve-AuthToken
Write-Log 'Auth token: present'

$gatewayHealth = Invoke-TestRequest -Method GET -Uri "$BaseUrl/health" -ExpectedStatus @(200)
Add-Result -Step 'Gateway health' -Outcome $gatewayHealth -Expectation '200'

$statusResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/status" -Headers @{ Authorization = "Bearer $resolvedToken" } -ExpectedStatus @(200)
Add-Result -Step 'Read AI status' -Outcome $statusResponse -Expectation '200'
$statusData = Parse-ResponseBody -BodyText $statusResponse.BodyText
if (-not $statusData -or $statusData.status -ne 'operational') {
    throw 'AI status endpoint did not return an operational response.'
}

$sessionId = 'ai-smoke-{0}' -f ([guid]::NewGuid().ToString('N').Substring(0, 12))
$chatQuery = 'What is the admission process? smoke test {0}' -f $sessionId
$chatBody = @{
    query = $chatQuery
    session_id = $sessionId
}

$chatResponse = Invoke-TestRequest -Method POST -Uri "$apiBase/chat" -Body $chatBody -Headers @{ Authorization = "Bearer $resolvedToken" } -ExpectedStatus @(200)
Add-Result -Step 'Run FAQ-backed chat' -Outcome $chatResponse -Expectation '200'
$chatData = Parse-ResponseBody -BodyText $chatResponse.BodyText
if (-not $chatData -or $chatData.source -ne 'faq_builtin' -or $chatData.intent -ne 'faq') {
    throw 'AI chat did not use the built-in FAQ path as expected.'
}

$historyResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/chat/history?session_id=$sessionId" -Headers @{ Authorization = "Bearer $resolvedToken" } -ExpectedStatus @(200)
Add-Result -Step 'Read chat history' -Outcome $historyResponse -Expectation '200'
$historyData = Parse-ResponseBody -BodyText $historyResponse.BodyText
if (-not $historyData -or -not $historyData.messages -or $historyData.messages.Count -lt 2) {
    throw 'Chat history did not return the expected persisted messages.'
}

$studyHelpBody = @{
    topic = 'python'
}

$studyHelpResponse = Invoke-TestRequest -Method POST -Uri "$apiBase/study-help" -Body $studyHelpBody -Headers @{ Authorization = "Bearer $resolvedToken" } -ExpectedStatus @(200)
Add-Result -Step 'Get study help' -Outcome $studyHelpResponse -Expectation '200'
$studyHelpData = Parse-ResponseBody -BodyText $studyHelpResponse.BodyText
if (-not $studyHelpData -or -not $studyHelpData.resources -or -not $studyHelpData.advice) {
    throw 'Study-help response is missing resources or advice.'
}

$deleteHistoryResponse = Invoke-TestRequest -Method DELETE -Uri "$apiBase/chat/history?session_id=$sessionId" -Headers @{ Authorization = "Bearer $resolvedToken" } -ExpectedStatus @(200)
Add-Result -Step 'Delete chat history' -Outcome $deleteHistoryResponse -Expectation '200'

$historyAfterDelete = Invoke-TestRequest -Method GET -Uri "$apiBase/chat/history?session_id=$sessionId" -Headers @{ Authorization = "Bearer $resolvedToken" } -ExpectedStatus @(200)
Add-Result -Step 'Verify cleared history' -Outcome $historyAfterDelete -Expectation '200'
$historyAfterDeleteData = Parse-ResponseBody -BodyText $historyAfterDelete.BodyText
if (-not $historyAfterDeleteData) {
    throw 'Chat history verification did not return a response body.'
}

$historyAfterDeleteMessages = @($historyAfterDeleteData.messages)
if ($historyAfterDeleteMessages.Count -ne 0) {
    throw 'Chat history was not cleared as expected.'
}

$summary = [pscustomobject]@{
    Service = $serviceName
    BaseUrl = $BaseUrl
    AuthBaseUrl = $AuthBaseUrl
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
