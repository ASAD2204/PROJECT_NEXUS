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

$serviceName = 'finance-service'
$logDirectory = Join-Path (Join-Path $PSScriptRoot '..\logs') $serviceName
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logPath = Join-Path $logDirectory "finance-smoke-$stamp.log"
$jsonPath = Join-Path $logDirectory "finance-smoke-$stamp.json"

$BaseUrl = $BaseUrl.TrimEnd('/')
$AuthBaseUrl = $AuthBaseUrl.TrimEnd('/')
$financeBase = "$BaseUrl/api/v1/finance"
$overallPassed = $true
$results = New-Object System.Collections.Generic.List[object]

$script:adminToken = $null
$script:studentToken = $null
$script:studentId = $null
$script:studentRollNo = $null
$script:invoiceId = $null
$script:semesterId = $null
$script:smokeFeeHeadId = $null
$script:smokeFeeHeadCreated = $false

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

function Resolve-SemesterRecord {
    $activeSemesterResponse = Invoke-TestRequest -Method GET -Uri "$BaseUrl/api/v1/sis/semesters/active" -ExpectedStatus @(200, 404)
    if ($activeSemesterResponse.Passed) {
        $null = Add-Result -Step 'Resolve active semester' -Outcome $activeSemesterResponse -Expectation '200'
        $activeSemesterData = Parse-ResponseBody -BodyText $activeSemesterResponse.BodyText
        if ($activeSemesterData -and $activeSemesterData.semester_id) {
            return [int]$activeSemesterData.semester_id
        }
    } else {
        $null = Add-Result -Step 'Resolve active semester' -Outcome $activeSemesterResponse -Expectation '200|404'
    }

    $semesterListResponse = Invoke-TestRequest -Method GET -Uri "$BaseUrl/api/v1/sis/semesters" -ExpectedStatus @(200)
    $null = Add-Result -Step 'List SIS semesters' -Outcome $semesterListResponse -Expectation '200'
    $semesterListData = @((Parse-ResponseBody -BodyText $semesterListResponse.BodyText))

    foreach ($semester in $semesterListData) {
        if ($semester -and $semester.semester_id) {
            return [int]$semester.semester_id
        }
    }

    throw 'Could not resolve any valid semester_id from SIS.'
}

function Find-InvoiceBySemester {
    param(
        [Parameter(Mandatory = $true)]$Invoices,
        [Parameter(Mandatory = $true)][int]$SemesterId
    )

    foreach ($invoice in @($Invoices)) {
        if ($null -ne $invoice -and [int]$invoice.semester_id -eq $SemesterId) {
            return $invoice
        }
    }

    return $null
}

function Find-FineByInvoiceId {
    param(
        [Parameter(Mandatory = $true)]$Fines,
        [Parameter(Mandatory = $true)][int]$InvoiceId
    )

    foreach ($fine in @($Fines)) {
        if ($null -ne $fine -and [int]$fine.invoice_id -eq $InvoiceId) {
            return $fine
        }
    }

    return $null
}

function Find-LedgerRowByInvoiceId {
    param(
        [Parameter(Mandatory = $true)]$LedgerPayload,
        [Parameter(Mandatory = $true)][int]$InvoiceId
    )

    foreach ($row in @($LedgerPayload.transactions)) {
        if ($null -ne $row -and $row.id -eq ("INV-{0}" -f $InvoiceId)) {
            return $row
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

$studentRecord = Resolve-StudentRecord -Token $script:studentToken
$script:studentId = $studentRecord.StudentId
$script:studentRollNo = $studentRecord.RollNo
Write-Log ("Resolved student_id: {0}" -f $script:studentId)
if ($script:studentRollNo) {
    Write-Log ("Resolved student roll_no: {0}" -f $script:studentRollNo)
}

$script:semesterId = Resolve-SemesterRecord
Write-Log ("Resolved semester_id: {0}" -f $script:semesterId)

$adminFeeHeadsResponse = Invoke-TestRequest -Method GET -Uri "$financeBase/fee-heads" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'List fee heads as admin' -Outcome $adminFeeHeadsResponse -Expectation '200'
$adminFeeHeads = @((Parse-ResponseBody -BodyText $adminFeeHeadsResponse.BodyText))

$studentFeeHeadsResponse = Invoke-TestRequest -Method GET -Uri "$financeBase/fee-heads" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'List fee heads as student' -Outcome $studentFeeHeadsResponse -Expectation '200'
$studentFeeHeads = @((Parse-ResponseBody -BodyText $studentFeeHeadsResponse.BodyText))

$feeHeadTotal = 0.0
foreach ($feeHead in $adminFeeHeads) {
    if ($feeHead) {
        $feeHeadTotal += [double]$feeHead.default_amount
    }
}

if ($adminFeeHeads.Count -eq 0 -or $feeHeadTotal -le 0) {
    $smokeFeeHeadBody = @{
        title = 'Nexus Smoke Fee Head'
        default_amount = 1234.56
    }
    $createFeeHeadResponse = Invoke-TestRequest -Method POST -Uri "$financeBase/fee-heads" -Body $smokeFeeHeadBody -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(201)
    $null = Add-Result -Step 'Create smoke fee head' -Outcome $createFeeHeadResponse -Expectation '201'

    $createdFeeHead = Parse-ResponseBody -BodyText $createFeeHeadResponse.BodyText
    if (-not $createdFeeHead -or -not $createdFeeHead.head_id) {
        throw 'Fee head creation did not return a head_id.'
    }

    $script:smokeFeeHeadId = [int]$createdFeeHead.head_id
    $script:smokeFeeHeadCreated = $true

    $adminFeeHeadsResponse = Invoke-TestRequest -Method GET -Uri "$financeBase/fee-heads" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
    $null = Add-Result -Step 'Refresh fee heads after smoke creation' -Outcome $adminFeeHeadsResponse -Expectation '200'
    $adminFeeHeads = @((Parse-ResponseBody -BodyText $adminFeeHeadsResponse.BodyText))
    $studentFeeHeadsResponse = Invoke-TestRequest -Method GET -Uri "$financeBase/fee-heads" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
    $null = Add-Result -Step 'Refresh student fee heads after smoke creation' -Outcome $studentFeeHeadsResponse -Expectation '200'
    $studentFeeHeads = @((Parse-ResponseBody -BodyText $studentFeeHeadsResponse.BodyText))
}

$feeHeadCount = @($adminFeeHeads).Count
if ($feeHeadCount -lt 1) {
    throw 'No fee heads available for invoice generation.'
}

$invoiceDueDate = (Get-Date).Date.AddDays(-1).ToString('yyyy-MM-dd')
$generateInvoiceBody = @{
    semester_id = $script:semesterId
    student_ids = @($script:studentId)
    due_date = $invoiceDueDate
}

$generateResponse = Invoke-TestRequest -Method POST -Uri "$financeBase/invoices/generate" -Body $generateInvoiceBody -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Generate student invoices' -Outcome $generateResponse -Expectation '200'

$generateData = Parse-ResponseBody -BodyText $generateResponse.BodyText
if (-not $generateData -or ($generateData.message -notlike 'Generated *')) {
    throw 'Invoice generation did not return the expected success message.'
}

$studentInvoicesResponse = Invoke-TestRequest -Method GET -Uri "$financeBase/invoices/me" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'List student invoices' -Outcome $studentInvoicesResponse -Expectation '200'
$studentInvoicesData = Parse-ResponseBody -BodyText $studentInvoicesResponse.BodyText
$script:invoiceId = $null
$generatedInvoice = Find-InvoiceBySemester -Invoices $studentInvoicesData -SemesterId $script:semesterId
if (-not $generatedInvoice) {
    throw 'Generated invoice was not returned from /invoices/me.'
}

$script:invoiceId = [int]$generatedInvoice.invoice_id
$generatedInvoiceItems = @($generatedInvoice.items)
if ($generatedInvoiceItems.Count -ne $feeHeadCount) {
    throw ('Generated invoice item count {0} did not match fee head count {1}.' -f $generatedInvoiceItems.Count, $feeHeadCount)
}

$invoiceTotal = [double]$generatedInvoice.total_amount
$expectedFineAmount = [math]::Round($invoiceTotal * 0.05, 2)

$adminInvoicesResponse = Invoke-TestRequest -Method GET -Uri "$financeBase/invoices?student_id=$($script:studentId)&status=Unpaid" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'List unpaid invoices as admin' -Outcome $adminInvoicesResponse -Expectation '200'
$adminInvoicesData = Parse-ResponseBody -BodyText $adminInvoicesResponse.BodyText
if (-not (Find-InvoiceBySemester -Invoices $adminInvoicesData -SemesterId $script:semesterId)) {
    throw 'Admin invoice list did not include the generated unpaid invoice.'
}

$paymentsHistoryResponse = Invoke-TestRequest -Method GET -Uri "$financeBase/payments/history" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read payment history' -Outcome $paymentsHistoryResponse -Expectation '200'
$paymentsHistoryData = Parse-ResponseBody -BodyText $paymentsHistoryResponse.BodyText
foreach ($payment in @($paymentsHistoryData)) {
    if ($payment -and [int]$payment.invoice_id -eq $script:invoiceId) {
        throw 'Unexpected payment history entry found for the generated invoice.'
    }
}

$ledgerAdminResponse = Invoke-TestRequest -Method GET -Uri "$financeBase/ledger" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read admin ledger' -Outcome $ledgerAdminResponse -Expectation '200'
$ledgerAdminData = Parse-ResponseBody -BodyText $ledgerAdminResponse.BodyText
$ledgerAdminRow = Find-LedgerRowByInvoiceId -LedgerPayload $ledgerAdminData -InvoiceId $script:invoiceId
if (-not $ledgerAdminRow) {
    throw 'Admin ledger did not include the generated invoice.'
}

$ledgerStudentResponse = Invoke-TestRequest -Method GET -Uri "$financeBase/ledger" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read student ledger' -Outcome $ledgerStudentResponse -Expectation '200'
$ledgerStudentData = Parse-ResponseBody -BodyText $ledgerStudentResponse.BodyText
$ledgerStudentRow = Find-LedgerRowByInvoiceId -LedgerPayload $ledgerStudentData -InvoiceId $script:invoiceId
if (-not $ledgerStudentRow) {
    throw 'Student ledger did not include the generated invoice.'
}

$preFineStudentResponse = Invoke-TestRequest -Method GET -Uri "$financeBase/fines/me" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read student fines before apply' -Outcome $preFineStudentResponse -Expectation '200'
$preFineStudentData = Parse-ResponseBody -BodyText $preFineStudentResponse.BodyText
if (Find-FineByInvoiceId -Fines $preFineStudentData -InvoiceId $script:invoiceId) {
    throw 'Fine existed before applying late fines for the generated invoice.'
}

$applyFinesResponse = Invoke-TestRequest -Method POST -Uri "$financeBase/fines/apply" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Apply late fines' -Outcome $applyFinesResponse -Expectation '200'
$applyFinesData = Parse-ResponseBody -BodyText $applyFinesResponse.BodyText
if (-not $applyFinesData -or ($applyFinesData.message -notlike 'Applied fines to *')) {
    throw 'Late-fine application did not return the expected success message.'
}

$postFineStudentResponse = Invoke-TestRequest -Method GET -Uri "$financeBase/fines/me" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read student fines after apply' -Outcome $postFineStudentResponse -Expectation '200'
$postFineStudentData = Parse-ResponseBody -BodyText $postFineStudentResponse.BodyText
$studentFineRecord = Find-FineByInvoiceId -Fines $postFineStudentData -InvoiceId $script:invoiceId
if (-not $studentFineRecord) {
    throw 'Student fines did not include the generated invoice after applying late fines.'
}

if ([math]::Round([double]$studentFineRecord.fine_amount, 2) -ne $expectedFineAmount) {
    throw ('Expected fine amount {0} but received {1}.' -f $expectedFineAmount, [math]::Round([double]$studentFineRecord.fine_amount, 2))
}

if ([int]$studentFineRecord.days_overdue -lt 1) {
    throw 'Late fine days_overdue should be at least 1.'
}

$adminFineFilterResponse = Invoke-TestRequest -Method GET -Uri "$financeBase/fines?invoice_id=$($script:invoiceId)" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Filter fines as admin' -Outcome $adminFineFilterResponse -Expectation '200'
$adminFineFilterData = Parse-ResponseBody -BodyText $adminFineFilterResponse.BodyText
$adminFineRecord = Find-FineByInvoiceId -Fines $adminFineFilterData -InvoiceId $script:invoiceId
if (-not $adminFineRecord) {
    throw 'Admin fine filter did not return the generated invoice fine.'
}

if ([math]::Round([double]$adminFineRecord.fine_amount, 2) -ne $expectedFineAmount) {
    throw 'Admin fine filter returned an unexpected fine amount.'
}

$overdueInvoicesResponse = Invoke-TestRequest -Method GET -Uri "$financeBase/invoices?student_id=$($script:studentId)&status=Overdue" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'List overdue invoices as admin' -Outcome $overdueInvoicesResponse -Expectation '200'
$overdueInvoicesData = Parse-ResponseBody -BodyText $overdueInvoicesResponse.BodyText
if (-not (Find-InvoiceBySemester -Invoices $overdueInvoicesData -SemesterId $script:semesterId)) {
    throw 'Overdue invoice filter did not include the generated invoice after fine application.'
}

$updateInvoiceBody = @{
    status = 'Paid'
}
$updateInvoiceResponse = Invoke-TestRequest -Method PUT -Uri "$financeBase/invoices/$($script:invoiceId)" -Body $updateInvoiceBody -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Update invoice status' -Outcome $updateInvoiceResponse -Expectation '200'
$updatedInvoiceData = Parse-ResponseBody -BodyText $updateInvoiceResponse.BodyText
if (-not $updatedInvoiceData -or ($updatedInvoiceData.status -ne 'Paid')) {
    throw 'Invoice update did not persist the Paid status.'
}

$invoiceDetailResponse = Invoke-TestRequest -Method GET -Uri "$financeBase/invoices/$($script:invoiceId)" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Read updated invoice' -Outcome $invoiceDetailResponse -Expectation '200'
$invoiceDetailData = Parse-ResponseBody -BodyText $invoiceDetailResponse.BodyText
if (-not $invoiceDetailData -or ($invoiceDetailData.status -ne 'Paid')) {
    throw 'Invoice detail did not reflect the updated Paid status.'
}

$deleteInvoiceResponse = Invoke-TestRequest -Method DELETE -Uri "$financeBase/invoices/$($script:invoiceId)" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'Delete invoice' -Outcome $deleteInvoiceResponse -Expectation '200'

$deletedInvoiceResponse = Invoke-TestRequest -Method GET -Uri "$financeBase/invoices/$($script:invoiceId)" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(404)
$null = Add-Result -Step 'Confirm deleted invoice' -Outcome $deletedInvoiceResponse -Expectation '404'

$studentInvoicesAfterDeleteResponse = Invoke-TestRequest -Method GET -Uri "$financeBase/invoices/me" -Headers @{ Authorization = "Bearer $script:studentToken" } -ExpectedStatus @(200)
$null = Add-Result -Step 'List student invoices after delete' -Outcome $studentInvoicesAfterDeleteResponse -Expectation '200'
$studentInvoicesAfterDeleteData = Parse-ResponseBody -BodyText $studentInvoicesAfterDeleteResponse.BodyText
if (Find-InvoiceBySemester -Invoices $studentInvoicesAfterDeleteData -SemesterId $script:semesterId) {
    throw 'Deleted invoice still appeared in the student invoice list.'
}

if ($script:smokeFeeHeadCreated -and $script:smokeFeeHeadId) {
    $deleteFeeHeadResponse = Invoke-TestRequest -Method DELETE -Uri "$financeBase/fee-heads/$($script:smokeFeeHeadId)" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
    $null = Add-Result -Step 'Delete smoke fee head' -Outcome $deleteFeeHeadResponse -Expectation '200'

    $feeHeadsAfterDeleteResponse = Invoke-TestRequest -Method GET -Uri "$financeBase/fee-heads" -Headers @{ Authorization = "Bearer $script:adminToken" } -ExpectedStatus @(200)
    $null = Add-Result -Step 'Verify fee heads after delete' -Outcome $feeHeadsAfterDeleteResponse -Expectation '200'
    $feeHeadsAfterDeleteData = Parse-ResponseBody -BodyText $feeHeadsAfterDeleteResponse.BodyText
    foreach ($feeHead in @($feeHeadsAfterDeleteData)) {
        if ($feeHead -and [int]$feeHead.head_id -eq $script:smokeFeeHeadId) {
            throw 'Deleted smoke fee head still appeared in the fee head list.'
        }
    }
}

Write-Log ("Overall status: {0}" -f $overallPassed)
$results | ConvertTo-Json -Depth 6 | Out-File -FilePath $jsonPath -Encoding utf8

if ($overallPassed) {
    exit 0
} else {
    exit 1
}
