# CLAUDE_CODE_QUICK_START.ps1
# Quick start script for Claude Code without needing API key setup

Write-Host "=== Claude Code Quick Start for KimbleAI v4 ===" -ForegroundColor Cyan

# Navigate to project
Set-Location "C:\Users\zachk\OneDrive\Documents\kimbleai-v4-clean"

# Try different methods to start Claude Code
Write-Host "`nAttempting to start Claude Code..." -ForegroundColor Green

# Method 1: Try npx
Write-Host "[Method 1] Trying npx..." -ForegroundColor Yellow
$npxPath = where.exe npx 2>$null
if ($npxPath) {
    Write-Host "Found npx at: $npxPath" -ForegroundColor Green
    Write-Host "Starting Claude Code with npx..." -ForegroundColor Cyan
    
    $prompt = "Continue KimbleAI v4 development. Fix production HTTP 307 redirect on root route. Update domain to www.kimbleai.com. NO EMOJIS in code. Read LAPTOP_TRANSITION_FINAL.md for context."
    
    npx @anthropic-ai/claude-code "$prompt"
    exit
}

# Method 2: Try global npm location
Write-Host "[Method 2] Checking global npm location..." -ForegroundColor Yellow
$npmPrefix = npm config get prefix
$claudeCodePath = Join-Path $npmPrefix "claude-code.cmd"
if (Test-Path $claudeCodePath) {
    Write-Host "Found at: $claudeCodePath" -ForegroundColor Green
    & $claudeCodePath
    exit
}

# Method 3: Try common locations
Write-Host "[Method 3] Checking common locations..." -ForegroundColor Yellow
$possiblePaths = @(
    "C:\Users\$env:USERNAME\AppData\Roaming\npm\claude-code.cmd",
    "C:\Users\$env:USERNAME\AppData\Roaming\npm\claude-code",
    "C:\Program Files\nodejs\claude-code.cmd",
    "C:\Program Files (x86)\nodejs\claude-code.cmd"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        Write-Host "Found at: $path" -ForegroundColor Green
        & $path
        exit
    }
}

# Method 4: Install locally and run
Write-Host "[Method 4] Installing locally in project..." -ForegroundColor Yellow
npm install --save-dev @anthropic-ai/claude-code
if ($LASTEXITCODE -eq 0) {
    Write-Host "Installed locally. Running with npx..." -ForegroundColor Green
    npx claude-code
    exit
}

# If all methods fail
Write-Host "`n=== Claude Code not found ===" -ForegroundColor Red
Write-Host "Please try one of these commands manually:" -ForegroundColor Yellow
Write-Host "1. npx @anthropic-ai/claude-code" -ForegroundColor White
Write-Host "2. npm install -g @anthropic-ai/claude-code && claude-code" -ForegroundColor White
Write-Host "3. Add npm global bin to PATH:" -ForegroundColor White
Write-Host "   [Environment]::SetEnvironmentVariable('Path', `$env:Path + ';C:\Users\$env:USERNAME\AppData\Roaming\npm', [EnvironmentVariableTarget]::User)" -ForegroundColor Gray
