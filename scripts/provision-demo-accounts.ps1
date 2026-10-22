param(
  [switch]$ResetPasswords
)

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

$projectUrl = $env:SUPABASE_URL
if ([string]::IsNullOrWhiteSpace($projectUrl)) {
  $projectUrl = Read-Host "Supabase Project URL"
}
$projectUrl = $projectUrl.TrimEnd("/")

$isHostedUrl = $projectUrl -match '^https://[a-z0-9-]+\.supabase\.co$'
$isLocalUrl = $projectUrl -match '^http://(localhost|127\.0\.0\.1):54321$'
if (-not $isHostedUrl -and -not $isLocalUrl) {
  throw "Use the hosted Supabase URL or the local API URL http://127.0.0.1:54321."
}

$secretInput = Read-Host "Supabase secret API key (input is hidden)" -AsSecureString
$secretKey = Convert-SecureStringToPlainText -Value $secretInput
Write-Host "Key starts with sb_secret_: $($secretKey.StartsWith('sb_secret_'))"
Write-Host "Key length: $($secretKey.Length)"
Write-Host "Has control characters: $([bool]($secretKey -match '[\x00-\x1F\x7F]'))"
$headers = @{
  apikey        = $secretKey
  Authorization = "Bearer $secretKey"
  Accept        = "application/json"
}

$accounts = @(
  @{
    email = "hr-admin@bee-onboarding.invalid"
    display_name = "Demo Bootstrap HR Admin"
    employee_code = $null
    role = "hr_admin"
  },
  @{
    email = "hrd@bee-onboarding.invalid"
    display_name = "Demo HRD"
    employee_code = $null
    role = "hr_admin"
  },
  @{
    email = "employee-a@bee-onboarding.invalid"
    display_name = "Demo Employee A"
    employee_code = "DEMO-EMP-A"
    role = "employee"
  },
  @{
    email = "employee-b@bee-onboarding.invalid"
    display_name = "Demo Employee B"
    employee_code = "DEMO-EMP-B"
    role = "employee"
  }
)

try {
  $allUsers = @()
  $page = 1
  do {
    $usersUri = "$projectUrl/auth/v1/admin/users?page=$page&per_page=100"
    $pageResult = Invoke-RestMethod -Method Get -Uri $usersUri -Headers $headers
    $batch = @($pageResult.users)
    $allUsers += $batch
    $page += 1
  } while ($batch.Count -eq 100)

  foreach ($account in $accounts) {
    $existing = $allUsers | Where-Object {
      $_.email -and $_.email.Equals(
        $account.email,
        [StringComparison]::OrdinalIgnoreCase
      )
    } | Select-Object -First 1

    if (-not $existing) {
      $securePassword = Read-Host "Set a unique password for $($account.email)" -AsSecureString
      $secureConfirmation = Read-Host "Confirm the password for $($account.email)" -AsSecureString
      $password = Convert-SecureStringToPlainText -Value $securePassword
      $confirmation = Convert-SecureStringToPlainText -Value $secureConfirmation

      if ($password.Length -lt 14) {
        $password = $null
        $confirmation = $null
        throw "Use a password with at least 14 characters."
      }
      if ($password -cne $confirmation) {
        $password = $null
        $confirmation = $null
        throw "The passwords did not match."
      }

      $createBody = @{
        email = $account.email
        password = $password
        email_confirm = $true
        user_metadata = @{ display_name = $account.display_name }
      } | ConvertTo-Json -Depth 5 -Compress

      $createParams = @{
        Method = "Post"
        Uri = "$projectUrl/auth/v1/admin/users"
        Headers = $headers
        ContentType = "application/json"
        Body = $createBody
      }
      $created = Invoke-RestMethod @createParams

      $password = $null
      $confirmation = $null
      $createBody = $null
      $userId = $created.id
      if (-not $userId -and $created.user) {
        $userId = $created.user.id
      }
      Write-Output "Created demo identity: $($account.email)"
    }
    else {
      $userId = $existing.id

      if ($ResetPasswords) {
        $securePassword = Read-Host "Set a new password for $($account.email)" -AsSecureString
        $secureConfirmation = Read-Host "Confirm the new password for $($account.email)" -AsSecureString
        $password = Convert-SecureStringToPlainText -Value $securePassword
        $confirmation = Convert-SecureStringToPlainText -Value $secureConfirmation

        if ($password.Length -lt 14 -or $password -cne $confirmation) {
          $password = $null
          $confirmation = $null
          throw "Use matching passwords with at least 14 characters."
        }

        $updateBody = @{ password = $password } | ConvertTo-Json -Compress
        $updateParams = @{
          Method = "Put"
          Uri = "$projectUrl/auth/v1/admin/users/$userId"
          Headers = $headers
          ContentType = "application/json"
          Body = $updateBody
        }
        Invoke-RestMethod @updateParams | Out-Null
        $password = $null
        $confirmation = $null
        $updateBody = $null
        Write-Output "Reset password for demo identity: $($account.email)"
      }
      else {
        Write-Output "Keeping existing password for: $($account.email)"
      }
    }

    $profile = @{
      id = $userId
      email = $account.email
      display_name = $account.display_name
      employee_code = $account.employee_code
      role = $account.role
      is_active = $true
    } | ConvertTo-Json -Depth 4 -Compress

    $profileHeaders = $headers.Clone()
    $profileHeaders["Prefer"] = "resolution=merge-duplicates,return=minimal"
    $profileParams = @{
      Method = "Post"
      Uri = "$projectUrl/rest/v1/profiles?on_conflict=id"
      Headers = $profileHeaders
      ContentType = "application/json"
      Body = "[$profile]"
    }
    Invoke-RestMethod @profileParams | Out-Null
  }

  Write-Output "Demo accounts and profiles are ready. Passwords were not displayed."
}
finally {
  $secretInput = $null
  $secretKey = $null
  $headers = $null
}
