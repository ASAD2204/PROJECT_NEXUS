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

$serviceName = 'library-service'
$logDirectory = Join-Path (Join-Path $PSScriptRoot '..\logs') $serviceName
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logPath = Join-Path $logDirectory "library-smoke-$stamp.log"
$jsonPath = Join-Path $logDirectory "library-smoke-$stamp.json"

$BaseUrl = $BaseUrl.TrimEnd('/')
$AuthBaseUrl = $AuthBaseUrl.TrimEnd('/')
$apiBase = "$BaseUrl/api/v1/library"
$overallPassed = $true
$results = New-Object System.Collections.Generic.List[object]

$script:adminToken = $null
$script:studentToken = $null
$script:studentProfile = $null
$script:bookId = $null
$script:bookIsbn = $null
$script:bookTitle = $null
$script:updatedBookTitle = $null
$script:reservationId = $null
$script:issueId = $null

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
        $response = $null
        if ($_.Exception.PSObject.Properties.Match('Response').Count -gt 0) {
            $response = $_.Exception.Response
        }
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

function Invoke-BinaryTestRequest {
    param(
        [Parameter(Mandatory = $true)][ValidateSet('GET', 'POST', 'PUT', 'DELETE')][string]$Method,
        [Parameter(Mandatory = $true)][string]$Uri,
        [hashtable]$Headers = @{},
        [int[]]$ExpectedStatus = @(200)
    )

    $requestHeaders = @{}
    foreach ($headerName in $Headers.Keys) {
        $requestHeaders[$headerName] = $Headers[$headerName]
    }

    $tempFile = Join-Path $env:TEMP ('library-smoke-{0}.bin' -f ([guid]::NewGuid().ToString('N')))
    $startedAt = Get-Date
    try {
        $response = Invoke-WebRequest -Method $Method -Uri $Uri -Headers $requestHeaders -UseBasicParsing -TimeoutSec 30 -OutFile $tempFile
        $statusCode = [int]$response.StatusCode
        $fileLength = 0
        if (Test-Path $tempFile) {
            $fileLength = (Get-Item $tempFile).Length
        }

        return [pscustomobject]@{
            Passed = $ExpectedStatus -contains $statusCode
            StatusCode = $statusCode
            BodyText = ('binary response: {0} bytes' -f $fileLength)
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
    } finally {
        if (Test-Path $tempFile) {
            Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
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
        if ($outcome.StatusCode -ne 429 -or $attempt -gt $MaxRetries) {
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
        }
        elseif ($Outcome.BodyText -is [byte[]]) {
            $detail = 'binary response: {0} bytes' -f $Outcome.BodyText.Length
        }
        else {
            $detail = [string]$Outcome.BodyText
            if ($detail.Length -gt 300) {
                $detail = $detail.Substring(0, 300)
            }
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

function Resolve-StudentRecord {
    param(
        [Parameter(Mandatory = $true)][string]$Token
    )

    $studentResponse = Invoke-TestRequest -Method GET -Uri "$BaseUrl/api/v1/sis/students/me" -Headers @{ Authorization = "Bearer $Token" } -ExpectedStatus @(200)
    $null = Add-Result -Step 'Resolve student record from SIS' -Outcome $studentResponse -Expectation '200'

    $studentData = Parse-ResponseBody -BodyText $studentResponse.BodyText
    if (-not $studentData -or -not $studentData.student_id) {
        throw 'Could not resolve the seeded SIS student record for the student token.'
    }

    return [pscustomobject]@{
        StudentId = [int]$studentData.student_id
        RollNo = [string]$studentData.roll_no
    }
}

function New-SmokeLabel {
    param([string]$Prefix)

    return ('{0}-{1}-{2}' -f $Prefix, $stamp, ([guid]::NewGuid().ToString('N').Substring(0, 8)))
}

function Find-BookById {
    param(
        [Parameter(Mandatory = $true)]$Books,
        [Parameter(Mandatory = $true)][int]$BookId
    )

    foreach ($book in (To-Array $Books)) {
        if ($book -and ([int]$book.book_id -eq $BookId)) {
            return $book
        }
    }

    return $null
}

function Find-ReservationById {
    param(
        [Parameter(Mandatory = $true)]$Reservations,
        [Parameter(Mandatory = $true)][int]$ReservationId
    )

    foreach ($reservation in (To-Array $Reservations)) {
        if ($reservation -and ([int]$reservation.reservation_id -eq $ReservationId)) {
            return $reservation
        }
    }

    return $null
}

function Find-IssueById {
    param(
        [Parameter(Mandatory = $true)]$Issues,
        [Parameter(Mandatory = $true)][int]$IssueId
    )

    foreach ($issue in (To-Array $Issues)) {
        if ($issue -and ([int]$issue.issue_id -eq $IssueId)) {
            return $issue
        }
    }

    return $null
}

Write-Log "Service: $serviceName"
Write-Log "Base URL: $BaseUrl"
Write-Log "Auth Base URL: $AuthBaseUrl"

$gatewayHealth = Invoke-TestRequest -Method GET -Uri "$BaseUrl/health" -ExpectedStatus @(200)
$null = Add-Result -Step 'Gateway health' -Outcome $gatewayHealth -Expectation '200'

$script:adminToken = Resolve-AuthToken -Email $AdminEmail -Password $AdminPassword -Label 'admin'
$script:studentToken = Resolve-AuthToken -Email $StudentEmail -Password $StudentPassword -Label 'student'
Write-Log 'Admin token: present'
Write-Log 'Student token: present'

$script:studentProfile = Resolve-StudentRecord -Token $script:studentToken
Write-Log ("Resolved student_id: {0}" -f $script:studentProfile.StudentId)
if ($script:studentProfile.RollNo) {
    Write-Log ("Resolved student roll_no: {0}" -f $script:studentProfile.RollNo)
}

$initialCatalogResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/books?skip=0&limit=5" -ExpectedStatus @(200)
$null = Add-Result -Step 'List public catalog' -Outcome $initialCatalogResponse -Expectation '200'

$script:bookTitle = New-SmokeLabel -Prefix 'Library Book'
$script:updatedBookTitle = "$script:bookTitle Updated"
$script:bookIsbn = 'LIB{0}{1}' -f (Get-Date -Format 'yyMMddHHmmss'), ([Random]::new().Next(100, 999))
$addBookBody = @{
    isbn = $script:bookIsbn
    title = $script:bookTitle
    author = 'Project Nexus Smoke'
    category = 'Smoke Test'
    publisher = 'Nexus Press'
    publication_year = 2026
    pages = 220
    description = 'Smoke-test book for library-service'
    language = 'English'
    total_copies = 2
    available_copies = 2
    shelf_location = 'SMK-1'
}

$addBookResponse = Invoke-TestRequest -Method POST -Uri "$apiBase/books" -Body $addBookBody -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(201)
$null = Add-Result -Step 'Add smoke book' -Outcome $addBookResponse -Expectation '201'
$addBookData = Parse-ResponseBody -BodyText $addBookResponse.BodyText
if (-not $addBookData -or -not $addBookData.book_id) {
    throw 'Book creation did not return a book_id.'
}

$script:bookId = [int]$addBookData.book_id
Write-Log ("Resolved book_id: {0}" -f $script:bookId)

$bookByIdResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/books/$($script:bookId)" -ExpectedStatus @(200)
$null = Add-Result -Step 'Read book by id' -Outcome $bookByIdResponse -Expectation '200'
$bookByIdData = Parse-ResponseBody -BodyText $bookByIdResponse.BodyText
if (-not $bookByIdData -or ([string]$bookByIdData.title -ne $script:bookTitle)) {
    throw 'Created book did not return the expected title.'
}

$bookSearchResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/books?isbn=$script:bookIsbn" -ExpectedStatus @(200)
$null = Add-Result -Step 'Search book by ISBN' -Outcome $bookSearchResponse -Expectation '200'
$bookSearchData = To-Array (Parse-ResponseBody -BodyText $bookSearchResponse.BodyText)
if (-not (Find-BookById -Books $bookSearchData -BookId $script:bookId)) {
    throw 'Book search by ISBN did not include the smoke book.'
}

$updateBookResponse = Invoke-TestRequest -Method PUT -Uri "$apiBase/books/$($script:bookId)" -Body @{ title = $script:updatedBookTitle; category = 'Updated Smoke' } -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Update book metadata' -Outcome $updateBookResponse -Expectation '200'
$updatedBookData = Parse-ResponseBody -BodyText $updateBookResponse.BodyText
if (-not $updatedBookData -or ([string]$updatedBookData.title -ne $script:updatedBookTitle)) {
    throw 'Book update did not persist the expected title.'
}

$bookAfterUpdateResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/books/$($script:bookId)" -ExpectedStatus @(200)
$null = Add-Result -Step 'Verify updated book' -Outcome $bookAfterUpdateResponse -Expectation '200'
$bookAfterUpdateData = Parse-ResponseBody -BodyText $bookAfterUpdateResponse.BodyText
if (-not $bookAfterUpdateData -or ([string]$bookAfterUpdateData.title -ne $script:updatedBookTitle)) {
    throw 'Updated book did not return the expected title.'
}

$qrResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/qr/$($script:studentProfile.StudentId)" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Generate student QR code' -Outcome $qrResponse -Expectation '200'

$reservationBody = @{ student_id = $script:studentProfile.StudentId; book_id = $script:bookId }
$reservationResponse = Invoke-TestRequest -Method POST -Uri "$apiBase/reservations" -Body $reservationBody -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(201)
$null = Add-Result -Step 'Create reservation' -Outcome $reservationResponse -Expectation '201'
$reservationData = Parse-ResponseBody -BodyText $reservationResponse.BodyText
if (-not $reservationData -or -not $reservationData.reservation_id) {
    throw 'Reservation creation did not return a reservation_id.'
}

$script:reservationId = [int]$reservationData.reservation_id

$duplicateReservationResponse = Invoke-TestRequest -Method POST -Uri "$apiBase/reservations" -Body $reservationBody -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(409)
$null = Add-Result -Step 'Reject duplicate reservation' -Outcome $duplicateReservationResponse -Expectation '409'

$studentReservationsResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/reservations/me" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read student reservations' -Outcome $studentReservationsResponse -Expectation '200'
$studentReservationsData = To-Array (Parse-ResponseBody -BodyText $studentReservationsResponse.BodyText)
$studentReservationRecord = Find-ReservationById -Reservations $studentReservationsData -ReservationId $script:reservationId
if (-not $studentReservationRecord -or ([string]$studentReservationRecord.status -ne 'Active')) {
    throw 'Student reservations did not include the active smoke reservation.'
}

$adminReservationsResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/reservations" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read active reservations as admin' -Outcome $adminReservationsResponse -Expectation '200'
$adminReservationsData = To-Array (Parse-ResponseBody -BodyText $adminReservationsResponse.BodyText)
if (-not (Find-ReservationById -Reservations $adminReservationsData -ReservationId $script:reservationId)) {
    throw 'Admin active-reservations list did not include the smoke reservation.'
}

$cancelReservationResponse = Invoke-TestRequest -Method DELETE -Uri "$apiBase/reservations/$($script:reservationId)" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Cancel reservation' -Outcome $cancelReservationResponse -Expectation '200'

$studentReservationsAfterCancelResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/reservations/me" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Verify cancelled reservation' -Outcome $studentReservationsAfterCancelResponse -Expectation '200'
$studentReservationsAfterCancelData = To-Array (Parse-ResponseBody -BodyText $studentReservationsAfterCancelResponse.BodyText)
$cancelledReservationRecord = Find-ReservationById -Reservations $studentReservationsAfterCancelData -ReservationId $script:reservationId
if (-not $cancelledReservationRecord -or ([string]$cancelledReservationRecord.status -ne 'Cancelled')) {
    throw 'Cancelled reservation did not return with status Cancelled.'
}

$adminReservationsAfterCancelResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/reservations" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Verify active reservations after cancel' -Outcome $adminReservationsAfterCancelResponse -Expectation '200'
$adminReservationsAfterCancelData = To-Array (Parse-ResponseBody -BodyText $adminReservationsAfterCancelResponse.BodyText)
if ($adminReservationsAfterCancelData -and (Find-ReservationById -Reservations $adminReservationsAfterCancelData -ReservationId $script:reservationId)) {
    throw 'Cancelled reservation still appeared in the active admin reservation list.'
}

$issueBody = @{ student_id = $script:studentProfile.StudentId; book_id = $script:bookId }
$issueResponse = Invoke-TestRequest -Method POST -Uri "$apiBase/issues" -Body $issueBody -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(201)
$null = Add-Result -Step 'Issue book to student' -Outcome $issueResponse -Expectation '201'
$issueData = Parse-ResponseBody -BodyText $issueResponse.BodyText
if (-not $issueData -or -not $issueData.issue_id) {
    throw 'Issue creation did not return an issue_id.'
}

$script:issueId = [int]$issueData.issue_id

$studentIssuesResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/issues/me" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read student issues' -Outcome $studentIssuesResponse -Expectation '200'
$studentIssuesData = To-Array (Parse-ResponseBody -BodyText $studentIssuesResponse.BodyText)
$studentIssueRecord = Find-IssueById -Issues $studentIssuesData -IssueId $script:issueId
if (-not $studentIssueRecord -or ([string]$studentIssueRecord.status -ne 'Issued')) {
    throw 'Student issues did not include the active smoke issue.'
}

$adminIssuesResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/issues" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read all issues as admin' -Outcome $adminIssuesResponse -Expectation '200'
$adminIssuesData = To-Array (Parse-ResponseBody -BodyText $adminIssuesResponse.BodyText)
if (-not (Find-IssueById -Issues $adminIssuesData -IssueId $script:issueId)) {
    throw 'Admin issue list did not include the smoke issue.'
}

$reportsResponse = Invoke-TestRequest -Method GET -Uri "$apiBase/reports" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read library reports' -Outcome $reportsResponse -Expectation '200'
$reportsData = Parse-ResponseBody -BodyText $reportsResponse.BodyText
if (-not $reportsData -or ([int]$reportsData.total_books -lt 1)) {
    throw 'Library reports did not return a valid total_books count.'
}
if ([int]$reportsData.total_issued -lt 1) {
    throw 'Library reports did not reflect the active issued book.'
}
if (-not (To-Array $reportsData.recent_transactions | Where-Object { [int]$_.issue_id -eq $script:issueId })) {
    throw 'Library reports recent transactions did not include the smoke issue.'
}

$deleteBlockedResponse = Invoke-TestRequestWithRetry429 -Method DELETE -Uri "$apiBase/books/$($script:bookId)" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(400)
$null = Add-Result -Step 'Reject book delete while issued' -Outcome $deleteBlockedResponse -Expectation '400'

$returnResponse = Invoke-TestRequestWithRetry429 -Method POST -Uri "$apiBase/returns/$($script:issueId)" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Return issued book' -Outcome $returnResponse -Expectation '200'
$returnData = Parse-ResponseBody -BodyText $returnResponse.BodyText
if (-not $returnData -or ([double]$returnData.fine_amount -ne 0)) {
    throw 'Same-day return should not have incurred a fine.'
}

$studentIssuesAfterReturnResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/issues/me" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read student issues after return' -Outcome $studentIssuesAfterReturnResponse -Expectation '200'
$studentIssuesAfterReturnData = To-Array (Parse-ResponseBody -BodyText $studentIssuesAfterReturnResponse.BodyText)
$returnedIssueRecord = Find-IssueById -Issues $studentIssuesAfterReturnData -IssueId $script:issueId
if (-not $returnedIssueRecord -or ([string]$returnedIssueRecord.status -ne 'Returned')) {
    throw 'Returned issue was not reported with status Returned.'
}

$deleteBookResponse = Invoke-TestRequestWithRetry429 -Method DELETE -Uri "$apiBase/books/$($script:bookId)" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Delete returned book' -Outcome $deleteBookResponse -Expectation '200'

$deletedBookResponse = Invoke-TestRequestWithRetry429 -Method GET -Uri "$apiBase/books/$($script:bookId)" -ExpectedStatus @(404)
$null = Add-Result -Step 'Confirm deleted book' -Outcome $deletedBookResponse -Expectation '404'

Write-Log ("Overall status: {0}" -f $overallPassed)
$results | ConvertTo-Json -Depth 6 | Out-File -FilePath $jsonPath -Encoding utf8

if ($overallPassed) {
    exit 0
} else {
    exit 1
}
