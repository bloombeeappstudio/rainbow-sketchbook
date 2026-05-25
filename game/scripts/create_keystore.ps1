# Rainbow Sketchbook - Android Keystore Auto-Generation Script
# Usage: powershell -ExecutionPolicy Bypass -File create_keystore.ps1

$ErrorActionPreference = "Stop"

# ─── Move to android directory ──────────────────────────
$androidDir = "C:\Users\sinae\rainbow-sketchbook\game\android"
if (-not (Test-Path $androidDir)) {
    Write-Host "[ERROR] android folder not found: $androidDir" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Set-Location $androidDir

# ─── Warn if keystore already exists ────────────────────
if (Test-Path "upload-keystore.jks") {
    Write-Host ""
    Write-Host "[WARNING] upload-keystore.jks already exists!" -ForegroundColor Yellow
    Write-Host "  Overwriting will permanently lose the existing keystore." -ForegroundColor Yellow
    $confirm = Read-Host "Overwrite anyway? (yes/no)"
    if ($confirm -ne "yes") {
        Write-Host "Cancelled." -ForegroundColor Cyan
        Read-Host "Press Enter to exit"
        exit 0
    }
    Remove-Item "upload-keystore.jks" -Force
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Magenta
Write-Host " Rainbow Sketchbook - Keystore Generation" -ForegroundColor Magenta
Write-Host "============================================" -ForegroundColor Magenta
Write-Host ""

# ─── Password input (SecureString) ──────────────────────
Write-Host "[STEP 1] Enter keystore password (16+ chars recommended)" -ForegroundColor Cyan
Write-Host "  ! Lost password = app can never be updated again." -ForegroundColor Yellow
Write-Host "  ! Save it in a password manager immediately." -ForegroundColor Yellow
Write-Host ""

while ($true) {
    $pw1 = Read-Host "Password (hidden)" -AsSecureString
    $pw2 = Read-Host "Confirm password" -AsSecureString

    $BSTR1 = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($pw1)
    $BSTR2 = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($pw2)
    $plain1 = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR1)
    $plain2 = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR2)

    if ($plain1 -ne $plain2) {
        Write-Host "[ERROR] Passwords do not match. Try again." -ForegroundColor Red
        $plain1 = $null; $plain2 = $null
        continue
    }
    if ($plain1.Length -lt 8) {
        Write-Host "[ERROR] Password too short (min 8 chars). Try again." -ForegroundColor Red
        $plain1 = $null; $plain2 = $null
        continue
    }
    if ($plain1.Length -lt 16) {
        Write-Host "[WARNING] Password < 16 chars. Recommended is 16+." -ForegroundColor Yellow
        $accept = Read-Host "Continue anyway? (yes/no)"
        if ($accept -ne "yes") {
            $plain1 = $null; $plain2 = $null
            continue
        }
    }
    break
}

$keystorePassword = $plain1

$plain2 = $null
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR1)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR2)
$pw1 = $null; $pw2 = $null

Write-Host ""
Write-Host "[OK] Password accepted." -ForegroundColor Green
Write-Host ""

# ─── Run keytool ───────────────────────────────────────
Write-Host "[STEP 2] Generating keystore..." -ForegroundColor Cyan

$dname = "CN=Bloombee Apps, OU=Mobile Apps, O=Bloombee Apps, L=Seoul, ST=Seoul, C=KR"

keytool -genkeypair -v `
    -storetype PKCS12 `
    -keystore "upload-keystore.jks" `
    -keyalg RSA -keysize 2048 -validity 25000 `
    -alias upload `
    -storepass $keystorePassword `
    -keypass $keystorePassword `
    -dname $dname

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] keystore generation failed." -ForegroundColor Red
    Write-Host "  Check: JDK installed? keytool in PATH? Try: java -version" -ForegroundColor Yellow
    $keystorePassword = $null
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-Path "upload-keystore.jks")) {
    Write-Host "[ERROR] File was not created." -ForegroundColor Red
    $keystorePassword = $null
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "[OK] upload-keystore.jks created!" -ForegroundColor Green
Write-Host ""

# ─── Write keystore.properties ─────────────────────────
$propsContent = @"
storeFile=upload-keystore.jks
storePassword=$keystorePassword
keyAlias=upload
keyPassword=$keystorePassword
"@

Set-Content -Path "keystore.properties" -Value $propsContent -Encoding UTF8
Write-Host "[OK] keystore.properties written (gitignore-protected)" -ForegroundColor Green
Write-Host ""

# ─── Extract SHA-1 fingerprint ─────────────────────────
Write-Host "[STEP 3] Extracting SHA-1 / SHA-256 fingerprints..." -ForegroundColor Cyan
$fpOutput = keytool -list -v -keystore "upload-keystore.jks" -alias upload -storepass $keystorePassword 2>&1
$sha1Line = $fpOutput | Select-String "SHA1:" | Select-Object -First 1
$sha256Line = $fpOutput | Select-String "SHA256:" | Select-Object -First 1

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Fingerprints (use in Play Console)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host $sha1Line -ForegroundColor White
Write-Host $sha256Line -ForegroundColor White
Write-Host ""

# Save to file (no password — safe to commit)
$fpFile = "fingerprints.txt"
@"
# Rainbow Sketchbook - Upload Keystore Fingerprints
# Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
# Package: com.rainbow.sketchbook

$sha1Line
$sha256Line
"@ | Set-Content -Path $fpFile -Encoding UTF8
Write-Host "[OK] fingerprints.txt saved (safe to commit, no password)" -ForegroundColor Green
Write-Host ""

# ─── Clear password from memory ────────────────────────
$keystorePassword = $null
[System.GC]::Collect()

# ─── Backup reminder ───────────────────────────────────
Write-Host "============================================" -ForegroundColor Yellow
Write-Host " !!! BACKUP NOW - CRITICAL !!!" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Back up these 2 files to 3+ locations:" -ForegroundColor White
Write-Host "  - upload-keystore.jks    (in this folder)" -ForegroundColor White
Write-Host "  - keystore.properties    (contains password)" -ForegroundColor White
Write-Host ""
Write-Host "Recommended backup locations:" -ForegroundColor Cyan
Write-Host "  1. External SSD / USB drive" -ForegroundColor White
Write-Host "  2. Cloud (1Password / Bitwarden / encrypted Google Drive)" -ForegroundColor White
Write-Host "  3. Password manager (1Password / Bitwarden / Apple Keychain)" -ForegroundColor White
Write-Host ""
Write-Host "If lost: app can never be updated again (Google Play policy)" -ForegroundColor Red
Write-Host ""
Write-Host "============================================" -ForegroundColor Magenta
Write-Host " Keystore setup complete!" -ForegroundColor Magenta
Write-Host " Next: Firebase setup or GitHub Pages deploy" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Magenta
Write-Host ""

Read-Host "Press Enter to exit"
