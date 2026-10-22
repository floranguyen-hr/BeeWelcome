param(
  [Parameter(Mandatory)]
  [ValidateSet("local", "linked")]
  [string]$Target
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath "supabase/seed.sql")) {
  throw "Run this script from the repository root."
}

Write-Output "Running synthetic demo seed against the $Target Supabase database."
& npm.cmd run supabase -- db query "--$Target" --file supabase/seed.sql
if ($LASTEXITCODE -ne 0) {
  throw "The demo seed failed. Review the Supabase CLI output above."
}
