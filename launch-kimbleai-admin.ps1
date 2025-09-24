# KimbleAI v4 Clean - Development Environment Launcher
# Launches VS Code with Admin privileges and sets up the development environment

$projectPath = "C:\Users\zachk\OneDrive\Documents\kimbleai-v4-clean"

# Check if running as admin
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator"))
{
    # Relaunch as admin
    Start-Process powershell -Verb RunAs -ArgumentList "-File '$PSCommandPath'"
    exit
}

Write-Host "=================================" -ForegroundColor Cyan
Write-Host " KimbleAI v4 Clean - Dev Setup" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to project directory
if (-not (Test-Path $projectPath)) {
    Write-Host "Creating project directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $projectPath -Force | Out-Null
}

Set-Location $projectPath
Write-Host "Working directory: $projectPath" -ForegroundColor Green

# Check Git status
Write-Host ""
Write-Host "Checking Git status..." -ForegroundColor Yellow
if (Test-Path ".git") {
    git status --short
    $uncommitted = git status --porcelain
    if ($uncommitted) {
        Write-Host "Uncommitted changes detected" -ForegroundColor Yellow
        $commit = Read-Host "Would you like to commit changes? (y/n)"
        if ($commit -eq 'y') {
            git add -A
            $message = Read-Host "Enter commit message"
            git commit -m "$message"
            git push origin main 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Changes committed and pushed" -ForegroundColor Green
            } else {
                Write-Host "Changes committed locally (push later if needed)" -ForegroundColor Yellow
            }
        }
    }
    else {
        Write-Host "Repository is clean" -ForegroundColor Green
    }
}
else {
    Write-Host "Initializing Git repository..." -ForegroundColor Yellow
    git init
    if (Test-Path ".gitignore") {
        git add .gitignore
        git commit -m "Add gitignore"
    }
    Write-Host "Git repository initialized" -ForegroundColor Green
}

# Check if backend/frontend directories exist
$backendPath = Join-Path $projectPath "backend"
$frontendPath = Join-Path $projectPath "frontend"

if (-not (Test-Path $backendPath)) {
    Write-Host ""
    Write-Host "Creating backend directory structure..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $backendPath -Force | Out-Null
    New-Item -ItemType Directory -Path "$backendPath\src" -Force | Out-Null
    New-Item -ItemType Directory -Path "$backendPath\src\routes" -Force | Out-Null
    New-Item -ItemType Directory -Path "$backendPath\src\services" -Force | Out-Null
    New-Item -ItemType Directory -Path "$backendPath\src\models" -Force | Out-Null
    Write-Host "Backend structure created" -ForegroundColor Green
}

if (-not (Test-Path $frontendPath)) {
    Write-Host "Creating frontend directory structure..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $frontendPath -Force | Out-Null
    Write-Host "Frontend structure created" -ForegroundColor Green
}

# Install dependencies if package.json exists
if (Test-Path "$backendPath\package.json") {
    Write-Host ""
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    Set-Location $backendPath
    npm install
    Write-Host "Backend dependencies installed" -ForegroundColor Green
}

if (Test-Path "$frontendPath\package.json") {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    Set-Location $frontendPath
    npm install
    Write-Host "Frontend dependencies installed" -ForegroundColor Green
}

# Return to project root
Set-Location $projectPath

# Find VS Code executable
Write-Host ""
Write-Host "Locating VS Code..." -ForegroundColor Yellow

$codePath = $null

# Check common VS Code locations
$vsPaths = @(
    "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe",
    "$env:ProgramFiles\Microsoft VS Code\Code.exe",
    "$env:ProgramFiles(x86)\Microsoft VS Code\Code.exe"
)

foreach ($testPath in $vsPaths) {
    if (Test-Path $testPath) {
        $codePath = $testPath
        Write-Host "Found VS Code at: $testPath" -ForegroundColor Green
        break
    }
}

# If not found in standard locations, try to find it via registry or PATH
if (-not $codePath) {
    # Try to find via Windows Registry
    try {
        $regPath = Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*" | 
                   Where-Object { $_.DisplayName -like "*Visual Studio Code*" } | 
                   Select-Object -First 1
        if ($regPath -and $regPath.InstallLocation) {
            $testPath = Join-Path $regPath.InstallLocation "Code.exe"
            if (Test-Path $testPath) {
                $codePath = $testPath
            }
        }
    } catch {}
}

# Try to find code in PATH
if (-not $codePath) {
    $codeCmd = Get-Command code -ErrorAction SilentlyContinue
    if ($codeCmd) {
        $codePath = $codeCmd.Source
    }
}

if ($codePath) {
    Write-Host ""
    Write-Host "Launching VS Code..." -ForegroundColor Yellow
    
    # Create .vscode settings directory
    $vscodeDir = Join-Path $projectPath ".vscode"
    if (-not (Test-Path $vscodeDir)) {
        New-Item -ItemType Directory -Path $vscodeDir -Force | Out-Null
    }
    
    # Launch VS Code with the project folder
    Start-Process -FilePath $codePath -ArgumentList "`"$projectPath`"" -NoNewWindow
    
    Write-Host "VS Code launched successfully!" -ForegroundColor Green
    
    # Give VS Code time to open
    Start-Sleep -Seconds 3
}
else {
    Write-Host "VS Code not found. Opening project folder in Explorer..." -ForegroundColor Yellow
    Start-Process explorer.exe $projectPath
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host " Development Environment Ready!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps in VS Code:" -ForegroundColor Yellow
Write-Host "1. Open Terminal in VS Code (Ctrl+``)" -ForegroundColor White
Write-Host "2. Split terminal for multiple commands" -ForegroundColor White
Write-Host "3. Backend: cd backend; npm run dev" -ForegroundColor White
Write-Host "4. Frontend: cd frontend; npm run dev" -ForegroundColor White
Write-Host "5. Open browser: http://localhost:3000" -ForegroundColor White
Write-Host ""

# Auto-close after 10 seconds
Write-Host "This window will close in 10 seconds..." -ForegroundColor Gray
Start-Sleep -Seconds 10
