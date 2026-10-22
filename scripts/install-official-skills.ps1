$ErrorActionPreference = "Continue"

Write-Host "=========================================================="
Write-Host ">> BẮT ĐẦU CÀI ĐẶT 4 SKILLS CHÍNH HÃNG TỪ GITHUB REPOSITORIES"
Write-Host "=========================================================="

$globalSkills = Join-Path $HOME ".gemini\config\skills"
$localSkills = Join-Path $PSScriptRoot "..\.agents\skills"
$localSkills = (Resolve-Path $localSkills).Path

if (-not (Test-Path $globalSkills)) {
    New-Item -ItemType Directory -Force -Path $globalSkills | Out-Null
}
if (-not (Test-Path $localSkills)) {
    New-Item -ItemType Directory -Force -Path $localSkills | Out-Null
}

# ------------------------------------------------------------
# 1. ANTHROPIC frontend-design
# ------------------------------------------------------------
Write-Host "`n[1/4] Đang cài Anthropic frontend-design..."
$src1 = "https://raw.githubusercontent.com/anthropics/skills/main/skills/frontend-design/"
$targetG1 = Join-Path $globalSkills "frontend-design"
$targetL1 = Join-Path $localSkills "frontend-design"

New-Item -ItemType Directory -Force -Path $targetG1 | Out-Null
New-Item -ItemType Directory -Force -Path $targetL1 | Out-Null

try {
    Invoke-WebRequest -Uri "$($src1)SKILL.md" -OutFile (Join-Path $targetG1 "SKILL.md")
    Invoke-WebRequest -Uri "$($src1)LICENSE.txt" -OutFile (Join-Path $targetG1 "LICENSE.txt")
    Copy-Item -Path "$targetG1\*" -Destination $targetL1 -Recurse -Force
    Write-Host ">> [OK] Anthropic frontend-design installed successfully!"
} catch {
    Write-Warning "Lỗi tải frontend-design: $_"
}

# ------------------------------------------------------------
# 2. UI/UX Pro Max (nextlevelbuilder/ui-ux-pro-max-skill)
# ------------------------------------------------------------
Write-Host "`n[2/4] Đang cài UI/UX Pro Max (nextlevelbuilder/ui-ux-pro-max-skill)..."
$stage = Join-Path $env:TEMP ("antigravity-uipro-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $stage | Out-Null

try {
    Push-Location $stage
    Write-Host ">> Chạy: npx.cmd --yes ui-ux-pro-max-cli init --ai antigravity"
    & npx.cmd --yes ui-ux-pro-max-cli init --ai antigravity
    Pop-Location

    $source = @(
        "$stage\.agents\skills",
        "$stage\.agent\skills",
        "$stage\.gemini\config\skills"
    ) | Where-Object { Test-Path $_ } | Select-Object -First 1

    if ($source) {
        Get-ChildItem $source -Directory | ForEach-Object {
            Copy-Item -Path $_.FullName -Destination $globalSkills -Recurse -Force
            Copy-Item -Path $_.FullName -Destination $localSkills -Recurse -Force
        }
        Write-Host ">> [OK] UI/UX Pro Max installed via CLI to global and local skills!"
    } else {
        Write-Host ">> CLI không sinh thư mục tự động, tiến hành git clone trực tiếp..."
        $gitStage = Join-Path $env:TEMP "ui-ux-pro-max-repo"
        if (Test-Path $gitStage) { Remove-Item $gitStage -Recurse -Force }
        git clone --depth 1 https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git $gitStage
        
        $srcDir = if (Test-Path "$gitStage\skills\ui-ux-pro-max") { "$gitStage\skills\ui-ux-pro-max" } else { $gitStage }
        $targetG2 = Join-Path $globalSkills "ui-ux-pro-max"
        $targetL2 = Join-Path $localSkills "ui-ux-pro-max"
        Copy-Item -Path $srcDir -Destination $targetG2 -Recurse -Force
        Copy-Item -Path $srcDir -Destination $targetL2 -Recurse -Force
        Write-Host ">> [OK] UI/UX Pro Max installed via GitHub clone!"
    }
} catch {
    Write-Warning "Lỗi cài đặt UI/UX Pro Max: $_"
} finally {
    if (Test-Path $stage) { Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue }
}

# ------------------------------------------------------------
# 3. Impeccable (pbakaus/impeccable)
# ------------------------------------------------------------
Write-Host "`n[3/4] Đang cài Impeccable (pbakaus/impeccable)..."
try {
    Write-Host ">> Chạy: npx.cmd --yes impeccable install --providers=antigravity --scope=global"
    & npx.cmd --yes impeccable install --providers=antigravity --scope=global
    
    # Kiểm tra xem có tạo ra folder trong $globalSkills không
    $targetG3 = Join-Path $globalSkills "impeccable"
    $targetL3 = Join-Path $localSkills "impeccable"
    if (-not (Test-Path "$targetG3\SKILL.md")) {
        Write-Host ">> Clone trực tiếp từ pbakaus/impeccable để đảm bảo đầy đủ script và assets..."
        $impStage = Join-Path $env:TEMP "impeccable-repo"
        if (Test-Path $impStage) { Remove-Item $impStage -Recurse -Force }
        git clone --depth 1 https://github.com/pbakaus/impeccable.git $impStage
        
        $srcDir = if (Test-Path "$impStage\skills\impeccable") { "$impStage\skills\impeccable" } else { $impStage }
        Copy-Item -Path $srcDir -Destination $targetG3 -Recurse -Force
        Copy-Item -Path $srcDir -Destination $targetL3 -Recurse -Force
    } else {
        Copy-Item -Path $targetG3 -Destination $targetL3 -Recurse -Force
    }
    Write-Host ">> [OK] Impeccable installed successfully!"
} catch {
    Write-Warning "Lỗi cài đặt Impeccable: $_"
}

# ------------------------------------------------------------
# 4. Vercel web-design-guidelines
# ------------------------------------------------------------
Write-Host "`n[4/4] Đang cài Vercel web-design-guidelines..."
$targetG4 = Join-Path $globalSkills "web-design-guidelines"
$targetL4 = Join-Path $localSkills "web-design-guidelines"
$targetL4_alias = Join-Path $localSkills "vercel-web-design-guidelines"

New-Item -ItemType Directory -Force -Path $targetG4 | Out-Null
New-Item -ItemType Directory -Force -Path $targetL4 | Out-Null
New-Item -ItemType Directory -Force -Path $targetL4_alias | Out-Null

$vercelUrl = "https://raw.githubusercontent.com/vercel-labs/agent-skills/main/skills/web-design-guidelines/SKILL.md"

try {
    Invoke-WebRequest -Uri $vercelUrl -OutFile (Join-Path $targetG4 "SKILL.md")
    Copy-Item -Path "$targetG4\SKILL.md" -Destination (Join-Path $targetL4 "SKILL.md") -Force
    Copy-Item -Path "$targetG4\SKILL.md" -Destination (Join-Path $targetL4_alias "SKILL.md") -Force
    Write-Host ">> [OK] Vercel web-design-guidelines installed successfully!"
} catch {
    Write-Warning "Lỗi tải web-design-guidelines: $_"
}

# ------------------------------------------------------------
# KIỂM TRA TỔNG QUAN
# ------------------------------------------------------------
Write-Host "`n=========================================================="
Write-Host ">> KẾT QUẢ KIỂM TRA SKILLS TẠI GLOBAL ($globalSkills):"
Write-Host "=========================================================="
Get-ChildItem $globalSkills -Directory | Where-Object { 
    $_.Name -in @("frontend-design", "ui-ux-pro-max", "impeccable", "web-design-guidelines") 
} | ForEach-Object {
    [PSCustomObject]@{
        SkillName = $_.Name
        HasSkillMd = Test-Path (Join-Path $_.FullName "SKILL.md")
        FullPath = $_.FullName
    }
} | Format-Table -AutoSize
