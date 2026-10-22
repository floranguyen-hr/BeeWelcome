$ErrorActionPreference = "Stop"

function Convert-SecureStringToPlainText {
  param([Parameter(Mandatory)][Security.SecureString]$Value)

  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

function Get-DemoSession {
  param(
    [Parameter(Mandatory)][string]$Email,
    [Parameter(Mandatory)][Security.SecureString]$SecurePassword,
    [Parameter(Mandatory)][string]$ProjectUrl,
    [Parameter(Mandatory)][string]$PublishableKey
  )

  $password = Convert-SecureStringToPlainText -Value $SecurePassword
  try {
    $body = @{
      email = $Email
      password = $password
    } | ConvertTo-Json -Compress
    $request = @{
      Method = "Post"
      Uri = "$ProjectUrl/auth/v1/token?grant_type=password"
      Headers = @{ apikey = $PublishableKey }
      ContentType = "application/json"
      Body = $body
    }
    $session = Invoke-RestMethod @request
    return $session
  }
  finally {
    $password = $null
    $body = $null
  }
}

function Get-ProfileRows {
  param(
    [Parameter(Mandatory)][string]$ProjectUrl,
    [Parameter(Mandatory)][string]$PublishableKey,
    [Parameter(Mandatory)][string]$AccessToken,
    [string]$Filter = ""
  )

  $headers = @{
    apikey = $PublishableKey
    Authorization = "Bearer $AccessToken"
  }
  $uri = "$ProjectUrl/rest/v1/profiles?select=id,email,role"
  if ($Filter) {
    $uri = "$uri&$Filter"
  }
  return @(Invoke-RestMethod -Method Get -Uri $uri -Headers $headers)
}

function Get-ApiRows {
  param(
    [Parameter(Mandatory)][string]$ProjectUrl,
    [Parameter(Mandatory)][string]$PublishableKey,
    [Parameter(Mandatory)][string]$AccessToken,
    [Parameter(Mandatory)][string]$Table,
    [Parameter(Mandatory)][string]$Query
  )

  $headers = @{
    apikey = $PublishableKey
    Authorization = "Bearer $AccessToken"
  }
  return @(Invoke-RestMethod -Method Get -Uri "$ProjectUrl/rest/v1/$Table`?$Query" -Headers $headers)
}

function Write-Check {
  param(
    [Parameter(Mandatory)][string]$Name,
    [Parameter(Mandatory)][bool]$Passed
  )

  if ($Passed) {
    Write-Output "PASS $Name"
  }
  else {
    Write-Output "FAIL $Name"
  }
}

$projectUrl = $env:SUPABASE_URL
if ([string]::IsNullOrWhiteSpace($projectUrl)) {
  $projectUrl = Read-Host "Supabase Project URL"
}
$projectUrl = $projectUrl.TrimEnd("/")

$publishableKey = $env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
if ([string]::IsNullOrWhiteSpace($publishableKey)) {
  $publishableKey = Read-Host "Supabase publishable key"
}

if ($projectUrl -notmatch '^https://[a-z0-9-]+\.supabase\.co$') {
  throw "Enter the project's HTTPS URL in the form https://project-ref.supabase.co."
}

$employeeAEmail = "employee-a@bee-onboarding.invalid"
$employeeBEmail = "employee-b@bee-onboarding.invalid"
$adminEmail = "hr-admin@bee-onboarding.invalid"
$employeeAPassword = Read-Host "Password for $employeeAEmail" -AsSecureString
$employeeBPassword = Read-Host "Password for $employeeBEmail" -AsSecureString
$adminPassword = Read-Host "Password for $adminEmail" -AsSecureString
$failures = 0

try {
  $employeeASession = Get-DemoSession $employeeAEmail $employeeAPassword $projectUrl $publishableKey
  $employeeAHeaders = @{
    apikey = $publishableKey
    Authorization = "Bearer $($employeeASession.access_token)"
  }
  $employeeAOwnParams = @{
    Method = "Get"
    Uri = "$projectUrl/rest/v1/profiles?select=id,email,role&id=eq.$($employeeASession.user.id)"
    Headers = $employeeAHeaders
  }
  $employeeAOwn = @(Invoke-RestMethod @employeeAOwnParams)
  $employeeACrossAccount = Get-ProfileRows -ProjectUrl $projectUrl -PublishableKey $publishableKey -AccessToken $employeeASession.access_token -Filter "email=eq.$employeeBEmail"
  $employeeAPrivateConfigs = Get-ApiRows -ProjectUrl $projectUrl -PublishableKey $publishableKey -AccessToken $employeeASession.access_token -Table "content_private_configs" -Query "select=content_id,version_number"
  $employeeAPublishedVersions = Get-ApiRows -ProjectUrl $projectUrl -PublishableKey $publishableKey -AccessToken $employeeASession.access_token -Table "content_versions" -Query "select=body&version_status=eq.published"
  $employeeAHasPublicAnswerKey = @($employeeAPublishedVersions | Where-Object { $_.body -and ($_.body.PSObject.Properties.Name -contains "answer_index") }).Count -gt 0
  $employeeAJourneys = Get-ApiRows -ProjectUrl $projectUrl -PublishableKey $publishableKey -AccessToken $employeeASession.access_token -Table "employee_journeys" -Query "select=id,employee_id,title_snapshot&employee_id=eq.$($employeeASession.user.id)"
  $employeeACrossJourneys = @()
  $employeeACrossActivities = @()
  $employeeACrossEvents = @()
  $employeeAActivities = @()
  $employeeAEvents = @()
  if ($employeeAJourneys.Count -gt 0) {
    $employeeAJourneyId = $employeeAJourneys[0].id
    $employeeAActivities = Get-ApiRows -ProjectUrl $projectUrl -PublishableKey $publishableKey -AccessToken $employeeASession.access_token -Table "journey_activities" -Query "select=id,journey_id&journey_id=eq.$employeeAJourneyId"
    $employeeAEvents = Get-ApiRows -ProjectUrl $projectUrl -PublishableKey $publishableKey -AccessToken $employeeASession.access_token -Table "activity_events" -Query "select=id,journey_id&journey_id=eq.$employeeAJourneyId"
  }
  $employeeACanUpdateRole = $false
  try {
    $patchParams = @{
      Method = "Patch"
      Uri = "$projectUrl/rest/v1/profiles?id=eq.$($employeeASession.user.id)"
      Headers = $employeeAHeaders
      ContentType = "application/json"
      Body = '{"role":"hr_admin"}'
    }
    Invoke-RestMethod @patchParams | Out-Null
    $employeeACanUpdateRole = $true
  }
  catch {
    $statusCode = 0
    if ($_.Exception.Response.StatusCode) {
      $statusCode = [int]$_.Exception.Response.StatusCode
    }
    if ($statusCode -notin 401, 403) {
      Write-Output "The role-change request failed with an unexpected status."
      $failures += 1
    }
  }

  $employeeBSession = Get-DemoSession $employeeBEmail $employeeBPassword $projectUrl $publishableKey
  $employeeBOwn = Get-ProfileRows -ProjectUrl $projectUrl -PublishableKey $publishableKey -AccessToken $employeeBSession.access_token -Filter "id=eq.$($employeeBSession.user.id)"
  $employeeBCrossAccount = Get-ProfileRows -ProjectUrl $projectUrl -PublishableKey $publishableKey -AccessToken $employeeBSession.access_token -Filter "email=eq.$employeeAEmail"
  $employeeBPrivateConfigs = Get-ApiRows -ProjectUrl $projectUrl -PublishableKey $publishableKey -AccessToken $employeeBSession.access_token -Table "content_private_configs" -Query "select=content_id,version_number"
  $employeeBPublishedVersions = Get-ApiRows -ProjectUrl $projectUrl -PublishableKey $publishableKey -AccessToken $employeeBSession.access_token -Table "content_versions" -Query "select=body&version_status=eq.published"
  $employeeBHasPublicAnswerKey = @($employeeBPublishedVersions | Where-Object { $_.body -and ($_.body.PSObject.Properties.Name -contains "answer_index") }).Count -gt 0
  $employeeBJourneys = Get-ApiRows -ProjectUrl $projectUrl -PublishableKey $publishableKey -AccessToken $employeeBSession.access_token -Table "employee_journeys" -Query "select=id,employee_id,title_snapshot&employee_id=eq.$($employeeBSession.user.id)"
  $employeeBCrossJourneys = @()
  $employeeBActivities = @()
  $employeeBEvents = @()
  $employeeBCrossActivities = @()
  $employeeBCrossEvents = @()
  if ($employeeBJourneys.Count -gt 0) {
    $employeeBJourneyId = $employeeBJourneys[0].id
    $employeeBCrossJourneys = Get-ApiRows -ProjectUrl $projectUrl -PublishableKey $publishableKey -AccessToken $employeeASession.access_token -Table "employee_journeys" -Query "select=id&employee_id=eq.$($employeeBSession.user.id)"
    $employeeACrossActivities = Get-ApiRows -ProjectUrl $projectUrl -PublishableKey $publishableKey -AccessToken $employeeASession.access_token -Table "journey_activities" -Query "select=id&journey_id=eq.$employeeBJourneyId"
    $employeeACrossEvents = Get-ApiRows -ProjectUrl $projectUrl -PublishableKey $publishableKey -AccessToken $employeeASession.access_token -Table "activity_events" -Query "select=id&journey_id=eq.$employeeBJourneyId"
    $employeeBActivities = Get-ApiRows -ProjectUrl $projectUrl -PublishableKey $publishableKey -AccessToken $employeeBSession.access_token -Table "journey_activities" -Query "select=id,journey_id&journey_id=eq.$employeeBJourneyId"
    $employeeBEvents = Get-ApiRows -ProjectUrl $projectUrl -PublishableKey $publishableKey -AccessToken $employeeBSession.access_token -Table "activity_events" -Query "select=id,journey_id&journey_id=eq.$employeeBJourneyId"
  }
  if ($employeeAJourneys.Count -gt 0) {
    $employeeAQueryJourneyId = $employeeAJourneys[0].id
    $employeeBCrossActivities = Get-ApiRows -ProjectUrl $projectUrl -PublishableKey $publishableKey -AccessToken $employeeBSession.access_token -Table "journey_activities" -Query "select=id&journey_id=eq.$employeeAQueryJourneyId"
    $employeeBCrossEvents = Get-ApiRows -ProjectUrl $projectUrl -PublishableKey $publishableKey -AccessToken $employeeBSession.access_token -Table "activity_events" -Query "select=id&journey_id=eq.$employeeAQueryJourneyId"
  }

  $adminSession = Get-DemoSession $adminEmail $adminPassword $projectUrl $publishableKey
  $adminRows = Get-ProfileRows -ProjectUrl $projectUrl -PublishableKey $publishableKey -AccessToken $adminSession.access_token
  $adminPrivateConfigs = Get-ApiRows -ProjectUrl $projectUrl -PublishableKey $publishableKey -AccessToken $adminSession.access_token -Table "content_private_configs" -Query "select=content_id,version_number"
  $adminJourneys = Get-ApiRows -ProjectUrl $projectUrl -PublishableKey $publishableKey -AccessToken $adminSession.access_token -Table "employee_journeys" -Query "select=id,employee_id"
  $adminActivities = Get-ApiRows -ProjectUrl $projectUrl -PublishableKey $publishableKey -AccessToken $adminSession.access_token -Table "journey_activities" -Query "select=id,journey_id"
  $adminEvents = Get-ApiRows -ProjectUrl $projectUrl -PublishableKey $publishableKey -AccessToken $adminSession.access_token -Table "activity_events" -Query "select=id,journey_id"

  $checks = @(
    @{ name = "Employee A can read their own profile"; passed = ($employeeAOwn.Count -eq 1 -and $employeeAOwn[0].role -eq "employee") },
    @{ name = "Employee A cannot read Employee B by email filter"; passed = ($employeeACrossAccount.Count -eq 0) },
    @{ name = "Employee A cannot read private quiz configuration or answer keys"; passed = ($employeeAPrivateConfigs.Count -eq 0 -and -not $employeeAHasPublicAnswerKey) },
    @{ name = "Employee A cannot promote their role"; passed = (-not $employeeACanUpdateRole) },
    @{ name = "Employee B can read their own profile"; passed = ($employeeBOwn.Count -eq 1 -and $employeeBOwn[0].role -eq "employee") },
    @{ name = "Employee B cannot read Employee A by email filter"; passed = ($employeeBCrossAccount.Count -eq 0) },
    @{ name = "Employee B cannot read private quiz configuration or answer keys"; passed = ($employeeBPrivateConfigs.Count -eq 0 -and -not $employeeBHasPublicAnswerKey) },
    @{ name = "Employee A can read their own journey and activity snapshots"; passed = ($employeeAJourneys.Count -eq 1 -and $employeeAJourneys[0].employee_id -eq $employeeASession.user.id -and $employeeAActivities.Count -ge 1) },
    @{ name = "Employee A cannot read Employee B journey, activities, or events"; passed = ($employeeBCrossJourneys.Count -eq 0 -and $employeeACrossActivities.Count -eq 0 -and $employeeACrossEvents.Count -eq 0) },
    @{ name = "Employee B can read their own journey and activity snapshots"; passed = ($employeeBJourneys.Count -eq 1 -and $employeeBJourneys[0].employee_id -eq $employeeBSession.user.id -and $employeeBActivities.Count -ge 1) },
    @{ name = "Employee B cannot read Employee A activities or events"; passed = ($employeeBCrossActivities.Count -eq 0 -and $employeeBCrossEvents.Count -eq 0) },
    @{ name = "Each employee can read their own journey events"; passed = ($employeeAEvents.Count -ge 1 -and $employeeBEvents.Count -ge 1 -and @($employeeAEvents | Where-Object journey_id -ne $employeeAJourneyId).Count -eq 0 -and @($employeeBEvents | Where-Object journey_id -ne $employeeBJourneyId).Count -eq 0) },
    @{ name = "HR Admin can read all demo profiles, private quiz config, and journeys"; passed = ($adminRows.Count -ge 4 -and ($adminRows | Where-Object role -eq "hr_admin").Count -ge 2 -and $adminPrivateConfigs.Count -ge 1 -and $adminJourneys.Count -ge 2 -and $adminActivities.Count -ge 8 -and $adminEvents.Count -ge 8) }
  )

  foreach ($check in $checks) {
    Write-Check -Name $check.name -Passed $check.passed
    if (-not $check.passed) {
      $failures += 1
    }
  }

  if ($failures -gt 0) {
    throw "$failures hosted RLS check(s) failed."
  }
}
finally {
  $employeeAPassword = $null
  $employeeBPassword = $null
  $adminPassword = $null
  $employeeASession = $null
  $employeeBSession = $null
  $adminSession = $null
}

Write-Output "Hosted RLS checks passed for two employee accounts and an HR Admin account."
