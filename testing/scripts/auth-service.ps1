param(
    [string]$BaseUrl = 'http://127.0.0.1',
    [string]$Email = '',
    [string]$Password = 'Nexus!Smoke12345'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$serviceName = 'auth-service'
$logDirectory = Join-Path (Join-Path $PSScriptRoot '..\logs') $serviceName
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logPath = Join-Path $logDirectory "auth-smoke-$stamp.log"
$jsonPath = Join-Path $logDirectory "auth-smoke-$stamp.json"

if ([string]::IsNullOrWhiteSpace($Email)) {
    $Email = 'nexus.smoke.auth.{0}.{1}@example.com' -f (Get-Date -Format 'yyyyMMddHHmmss'), ([guid]::NewGuid().ToString('N').Substring(0, 8))
}

$BaseUrl = $BaseUrl.TrimEnd('/')
$apiBase = "$BaseUrl/api/v1/auth"
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
        $bodyText = $response.Content
        return [pscustomobject]@{
            Passed = $ExpectedStatus -contains $statusCode
            StatusCode = $statusCode
            BodyText = $bodyText
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

Write-Log "Service: $serviceName"
Write-Log "Base URL: $BaseUrl"
Write-Log "Test user: $Email"

$gatewayHealth = Invoke-TestRequest -Method GET -Uri "$BaseUrl/health" -ExpectedStatus @(200)
Add-Result -Step 'Gateway health' -Outcome $gatewayHealth -Expectation '200'

$registerBody = @{
    email = $Email
    password = $Password
    role = 'student'
    first_name = 'Smoke'
    last_name = 'Tester'
}

$registerResponse = Invoke-TestRequest -Method POST -Uri "$apiBase/register" -Body $registerBody -ExpectedStatus @(201)
$registerEntry = Add-Result -Step 'Register temporary user' -Outcome $registerResponse -Expectation '201'
$registerData = Parse-ResponseBody -BodyText $registerResponse.BodyText
if ($registerResponse.Passed -and $registerData -and $registerData.access_token) {
    $registerToken = [string]$registerData.access_token
} else {
    $registerToken = $null
}

if (-not $registerToken) {
    throw 'Registration did not return an access token.'
}

$meFromRegister = Invoke-TestRequest -Method GET -Uri "$apiBase/me" -Headers @{ Authorization = "Bearer $registerToken" } -ExpectedStatus @(200)
Add-Result -Step 'Read profile with registration token' -Outcome $meFromRegister -Expectation '200'

$loginBody = @{
    email = $Email
    password = $Password
}

$loginResponse = Invoke-TestRequest -Method POST -Uri "$apiBase/login" -Body $loginBody -ExpectedStatus @(200)
Add-Result -Step 'Login with temporary user' -Outcome $loginResponse -Expectation '200'
$loginData = Parse-ResponseBody -BodyText $loginResponse.BodyText
if ($loginResponse.Passed -and $loginData -and $loginData.access_token) {
    $loginToken = [string]$loginData.access_token
} else {
    $loginToken = $null
}

if (-not $loginToken) {
    throw 'Login did not return an access token.'
}

$meFromLogin = Invoke-TestRequest -Method GET -Uri "$apiBase/me" -Headers @{ Authorization = "Bearer $loginToken" } -ExpectedStatus @(200)
Add-Result -Step 'Read profile with login token' -Outcome $meFromLogin -Expectation '200'

$profileUpdateBody = @{
    first_name = 'SmokeUpdated'
    last_name = 'Auth'
    phone = '5550100'
}

$profileUpdate = Invoke-TestRequest -Method PUT -Uri "$apiBase/profile" -Body $profileUpdateBody -Headers @{ Authorization = "Bearer $loginToken" } -ExpectedStatus @(200)
Add-Result -Step 'Update profile' -Outcome $profileUpdate -Expectation '200'
$profileData = Parse-ResponseBody -BodyText $profileUpdate.BodyText
if (-not $profileData) {
    throw 'Profile update did not return a response body.'
}

if (($profileData.first_name -ne 'SmokeUpdated') -or ($profileData.phone -ne '5550100')) {
    throw 'Profile update did not persist the expected values.'
}

$meAfterUpdate = Invoke-TestRequest -Method GET -Uri "$apiBase/me" -Headers @{ Authorization = "Bearer $loginToken" } -ExpectedStatus @(200)
Add-Result -Step 'Read profile after update' -Outcome $meAfterUpdate -Expectation '200'
$meAfterUpdateData = Parse-ResponseBody -BodyText $meAfterUpdate.BodyText
if (-not $meAfterUpdateData) {
    throw 'Profile read after update did not return a response body.'
}

if (($meAfterUpdateData.first_name -ne 'SmokeUpdated') -or ($meAfterUpdateData.phone -ne '5550100')) {
    throw 'Profile read after update does not match the stored values.'
}

$studentUsersCheck = Invoke-TestRequest -Method GET -Uri "$apiBase/users" -Headers @{ Authorization = "Bearer $loginToken" } -ExpectedStatus @(403)
Add-Result -Step 'Reject student from admin list' -Outcome $studentUsersCheck -Expectation '403'

$refreshBody = @{
    access_token = $loginToken
}

$refreshResponse = Invoke-TestRequest -Method POST -Uri "$apiBase/refresh" -Body $refreshBody -ExpectedStatus @(200)
Add-Result -Step 'Refresh login token' -Outcome $refreshResponse -Expectation '200'
$refreshData = Parse-ResponseBody -BodyText $refreshResponse.BodyText
if ($refreshResponse.Passed -and $refreshData -and $refreshData.access_token) {
    $refreshedToken = [string]$refreshData.access_token
} else {
    $refreshedToken = $null
}

if (-not $refreshedToken) {
    throw 'Refresh did not return a new access token.'
}

$oldTokenCheck = Invoke-TestRequest -Method GET -Uri "$apiBase/me" -Headers @{ Authorization = "Bearer $loginToken" } -ExpectedStatus @(401)
Add-Result -Step 'Reject old token after refresh' -Outcome $oldTokenCheck -Expectation '401'

$meWithRefreshedToken = Invoke-TestRequest -Method GET -Uri "$apiBase/me" -Headers @{ Authorization = "Bearer $refreshedToken" } -ExpectedStatus @(200)
Add-Result -Step 'Read profile with refreshed token' -Outcome $meWithRefreshedToken -Expectation '200'

$logoutResponse = Invoke-TestRequest -Method POST -Uri "$apiBase/logout" -Headers @{ Authorization = "Bearer $refreshedToken" } -ExpectedStatus @(200)
Add-Result -Step 'Logout refreshed session' -Outcome $logoutResponse -Expectation '200'

$meAfterLogout = Invoke-TestRequest -Method GET -Uri "$apiBase/me" -Headers @{ Authorization = "Bearer $refreshedToken" } -ExpectedStatus @(401)
Add-Result -Step 'Reject token after logout' -Outcome $meAfterLogout -Expectation '401'

$summary = [pscustomobject]@{
    Service = $serviceName
    BaseUrl = $BaseUrl
    TestUser = $Email
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
