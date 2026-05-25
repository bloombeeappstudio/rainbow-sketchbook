# Rainbow Sketchbook - GitHub Pages Auto Setup Script
# Usage: powershell -ExecutionPolicy Bypass -File setup_github_pages.ps1
#
# Prerequisite: GitHub repo "bloombeeappstudio/rainbow-sketchbook" must exist (create on github.com first)

$ErrorActionPreference = "Continue"   # native command(git) stderr를 ErrorRecord로 트리거하지 않도록

# ─── Move to project root ───────────────────────────────
$projectDir = "C:\Users\sinae\rainbow-sketchbook"
Set-Location $projectDir

Write-Host ""
Write-Host "============================================" -ForegroundColor Magenta
Write-Host " Rainbow Sketchbook - GitHub Pages Setup" -ForegroundColor Magenta
Write-Host "============================================" -ForegroundColor Magenta
Write-Host ""

# ─── Check Git ──────────────────────────────────────────
try {
    $gitVersion = git --version 2>&1
    Write-Host "[OK] Git installed: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Git not installed or not in PATH." -ForegroundColor Red
    Write-Host "  Download: https://git-scm.com/download/win" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# ─── Confirm GitHub repo exists ─────────────────────────
Write-Host ""
Write-Host "[STEP 1] Have you created the GitHub repo?" -ForegroundColor Cyan
Write-Host "  Account: bloombeeappstudio" -ForegroundColor White
Write-Host "  Repo name: rainbow-sketchbook" -ForegroundColor White
Write-Host "  Visibility: Public" -ForegroundColor White
Write-Host "  URL: https://github.com/new" -ForegroundColor White
Write-Host ""
Write-Host "  ! Do NOT add README, .gitignore, or LICENSE on GitHub" -ForegroundColor Yellow
Write-Host "  ! (We will push our own files)" -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Repo created? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host ""
    Write-Host "Please create the repo first:" -ForegroundColor Yellow
    Write-Host "  1. Open https://github.com/new" -ForegroundColor White
    Write-Host "  2. Sign in as bloombeeappstudio" -ForegroundColor White
    Write-Host "  3. Name: rainbow-sketchbook (Public)" -ForegroundColor White
    Write-Host "  4. Click 'Create repository' (do NOT init with README)" -ForegroundColor White
    Write-Host "  5. Re-run this script" -ForegroundColor White
    Read-Host "Press Enter to exit"
    exit 0
}

# ─── Git init (if needed) ───────────────────────────────
if (-not (Test-Path ".git")) {
    Write-Host ""
    Write-Host "[STEP 2] Initializing Git repository..." -ForegroundColor Cyan
    git init
    git branch -M main
    Write-Host "[OK] git init + branch main" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[STEP 2] Git already initialized" -ForegroundColor Green
}

# ─── Set Git identity ───────────────────────────────────
Write-Host ""
Write-Host "[STEP 3] Setting Git user identity..." -ForegroundColor Cyan
git config user.email "bloombee.appstudio@gmail.com"
git config user.name "bloombeeappstudio"
Write-Host "[OK] user.email = bloombee.appstudio@gmail.com" -ForegroundColor Green
Write-Host "[OK] user.name  = bloombeeappstudio" -ForegroundColor Green

# ─── Stage files ────────────────────────────────────────
Write-Host ""
Write-Host "[STEP 4] Staging files..." -ForegroundColor Cyan
Write-Host "  Options:" -ForegroundColor White
Write-Host "    1. docs/ only       (legal docs only — RECOMMENDED for first push)" -ForegroundColor White
Write-Host "    2. Entire project        (game code + docs + assets)" -ForegroundColor White
Write-Host ""
$stageChoice = Read-Host "Choose (1 or 2)"

if ($stageChoice -eq "2") {
    Write-Host "  Staging entire project (gitignore protects sensitive files)..." -ForegroundColor White
    git add .
    Write-Host "[OK] All files staged (jks/properties/google-services excluded)" -ForegroundColor Green
} else {
    Write-Host "  Staging docs/ only..." -ForegroundColor White
    git add docs/
    git add .gitignore
    Write-Host "[OK] docs/ + .gitignore staged" -ForegroundColor Green
}

# ─── Commit ────────────────────────────────────────────
Write-Host ""
Write-Host "[STEP 5] Creating initial commit..." -ForegroundColor Cyan
git commit -m "Initial: legal docs for Rainbow Sketchbook"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] Commit may have failed (already committed?)" -ForegroundColor Yellow
}

# ─── Add remote ────────────────────────────────────────
Write-Host ""
Write-Host "[STEP 6] Setting GitHub remote..." -ForegroundColor Cyan
$remoteUrl = "https://github.com/bloombeeappstudio/rainbow-sketchbook.git"

# Check if remote already exists (PowerShell native cmd stderr 안전 처리)
$existingRemote = $null
try {
    $existingRemote = (git remote get-url origin 2>&1 | Out-String).Trim()
    if ($existingRemote -match "error:|No such remote") { $existingRemote = $null }
} catch { $existingRemote = $null }

if ($existingRemote) {
    Write-Host "  Remote 'origin' already exists: $existingRemote" -ForegroundColor White
    git remote set-url origin $remoteUrl
    Write-Host "[OK] Remote URL updated" -ForegroundColor Green
} else {
    git remote add origin $remoteUrl
    Write-Host "[OK] Remote 'origin' added: $remoteUrl" -ForegroundColor Green
}

# ─── Push ──────────────────────────────────────────────
Write-Host ""
Write-Host "[STEP 7] Pushing to GitHub..." -ForegroundColor Cyan
Write-Host "  ! First push opens browser for GitHub login" -ForegroundColor Yellow
Write-Host "  ! Sign in as bloombeeappstudio if prompted" -ForegroundColor Yellow
Write-Host ""
git push -u origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERROR] Push failed." -ForegroundColor Red
    Write-Host "  Possible causes:" -ForegroundColor Yellow
    Write-Host "    1. GitHub auth not completed (login window not finished)" -ForegroundColor White
    Write-Host "    2. Wrong account signed in (must be bloombeeappstudio)" -ForegroundColor White
    Write-Host "    3. Repo URL incorrect or repo doesn't exist" -ForegroundColor White
    Write-Host ""
    Write-Host "  Try again: git push -u origin main" -ForegroundColor Cyan
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "[OK] Push successful!" -ForegroundColor Green
Write-Host ""

# ─── Next steps ────────────────────────────────────────
Write-Host "============================================" -ForegroundColor Magenta
Write-Host " Push complete! Now enable GitHub Pages:" -ForegroundColor Magenta
Write-Host "============================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "  1. Open: https://github.com/bloombeeappstudio/rainbow-sketchbook/settings/pages" -ForegroundColor White
Write-Host "  2. Source: 'Deploy from a branch'" -ForegroundColor White
Write-Host "  3. Branch: main" -ForegroundColor White
Write-Host "  4. Folder: /docs" -ForegroundColor White
Write-Host "  5. Click Save" -ForegroundColor White
Write-Host "  6. Wait 1-2 minutes" -ForegroundColor White
Write-Host ""
Write-Host "Then visit these URLs to verify:" -ForegroundColor Cyan
Write-Host "  https://bloombeeappstudio.github.io/rainbow-sketchbook/" -ForegroundColor White
Write-Host "  https://bloombeeappstudio.github.io/rainbow-sketchbook/privacy-policy-ko/" -ForegroundColor White
Write-Host "  https://bloombeeappstudio.github.io/rainbow-sketchbook/privacy-policy-en/" -ForegroundColor White
Write-Host "  https://bloombeeappstudio.github.io/rainbow-sketchbook/terms-of-service-ko/" -ForegroundColor White
Write-Host "  https://bloombeeappstudio.github.io/rainbow-sketchbook/terms-of-service-en/" -ForegroundColor White
Write-Host ""
Write-Host "============================================" -ForegroundColor Magenta
Write-Host ""

Read-Host "Press Enter to exit"
