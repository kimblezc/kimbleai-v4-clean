# KimbleAI v4 Clean - VS Code Admin Launcher with Claude Code Integration
# This launches the CORRECT active project: kimbleai-v4-clean

param(
    [switch]$SkipClaudeCode
)

$projectPath = "C:\Users\zachk\OneDrive\Documents\kimbleai-v4-clean"
$gitRepo = "https://github.com/yourusername/kimbleai-v4-clean.git"  # Update with your repo

# Check if running as admin
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "Requesting Administrator privileges..." -ForegroundColor Yellow
    $arguments = "-File `"$PSCommandPath`""
    if ($SkipClaudeCode) { $arguments += " -SkipClaudeCode" }
    Start-Process powershell -Verb RunAs -ArgumentList $arguments
    exit
}

Clear-Host
Write-Host "╔═══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     KimbleAI v4 Clean - Development Environment       ║" -ForegroundColor Cyan
Write-Host "║              (The Active Production Version)          ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Navigate to project directory
Set-Location $projectPath
Write-Host "✓ Project Directory: $projectPath" -ForegroundColor Green
Write-Host ""

# Git Status and Auto-commit
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "  GIT STATUS & VERSION CONTROL" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

if (Test-Path ".git") {
    $status = git status --porcelain
    if ($status) {
        Write-Host "⚠ Uncommitted changes detected:" -ForegroundColor Yellow
        git status --short
        
        $autoCommit = Read-Host "`nAuto-commit and push? (y/n)"
        if ($autoCommit -eq 'y') {
            git add -A
            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            git commit -m "Auto-commit: Development session $timestamp"
            
            Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
            git push origin main 2>&1 | Out-String
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ Changes pushed to GitHub" -ForegroundColor Green
            } else {
                Write-Host "⚠ Push failed - check your remote settings" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "✓ Repository is clean" -ForegroundColor Green
    }
} else {
    Write-Host "⚠ No Git repository found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "  DEPENDENCY CHECK" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

# Check for node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host "✓ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✓ Dependencies already installed" -ForegroundColor Green
}

# Check environment files
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "  ENVIRONMENT CONFIGURATION" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

if (Test-Path ".env.local") {
    Write-Host "✓ .env.local found" -ForegroundColor Green
} else {
    Write-Host "⚠ .env.local missing - create from .env.example" -ForegroundColor Yellow
}

# Launch VS Code
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "  LAUNCHING VS CODE" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

$vscodePath = ""
$possiblePaths = @(
    "${env:LOCALAPPDATA}\Programs\Microsoft VS Code\Code.exe",
    "${env:ProgramFiles}\Microsoft VS Code\Code.exe",
    "${env:ProgramFiles(x86)}\Microsoft VS Code\Code.exe"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $vscodePath = $path
        break
    }
}

if ($vscodePath -ne "") {
    Start-Process $vscodePath -ArgumentList "`"$projectPath`"" -NoNewWindow
    Write-Host "✓ VS Code launched with Admin privileges" -ForegroundColor Green
} else {
    Write-Host "⚠ VS Code not found - opening folder" -ForegroundColor Yellow
    Start-Process explorer.exe $projectPath
}

# Claude Code Integration
if (-not $SkipClaudeCode) {
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host "  CLAUDE CODE SETUP" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    
    # Check if Claude Code is available
    $claudeCodeAvailable = $false
    try {
        $npmList = npm list -g @anthropic-ai/claude-code 2>$null
        if ($LASTEXITCODE -eq 0) {
            $claudeCodeAvailable = $true
            Write-Host "✓ Claude Code is installed" -ForegroundColor Green
        }
    } catch {}
    
    if (-not $claudeCodeAvailable) {
        Write-Host "Installing Claude Code..." -ForegroundColor Yellow
        npm install -g @anthropic-ai/claude-code
        Write-Host "✓ Claude Code installed" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "CLAUDE CODE COMMANDS:" -ForegroundColor Cyan
    Write-Host "────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host "  npx @anthropic-ai/claude-code" -ForegroundColor White
    Write-Host '  npx @anthropic-ai/claude-code "fix TypeScript errors"' -ForegroundColor White
    Write-Host '  npx @anthropic-ai/claude-code "add Google Drive integration"' -ForegroundColor White
    Write-Host ""
    
    $startClaude = Read-Host "Start Claude Code now? (y/n)"
    if ($startClaude -eq 'y') {
        Write-Host ""
        Write-Host "Starting Claude Code..." -ForegroundColor Cyan
        Write-Host "Provide your task description:" -ForegroundColor Yellow
        $task = Read-Host "Task"
        
        if ($task) {
            npx @anthropic-ai/claude-code $task
        } else {
            npx @anthropic-ai/claude-code
        }
    }
}

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║         DEVELOPMENT ENVIRONMENT READY!                ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "QUICK START COMMANDS:" -ForegroundColor Yellow
Write-Host "────────────────────────────────────" -ForegroundColor DarkGray
Write-Host "  Development Server:  npm run dev" -ForegroundColor White
Write-Host "  Build Production:   npm run build" -ForegroundColor White
Write-Host "  Deploy to Vercel:   vercel --prod" -ForegroundColor White
Write-Host "  Claude Code:        npx @anthropic-ai/claude-code" -ForegroundColor White
Write-Host ""
Write-Host "PROJECT STATUS:" -ForegroundColor Yellow
Write-Host "────────────────────────────────────" -ForegroundColor DarkGray
Write-Host "  ✓ Cross-platform Chat AI Interface" -ForegroundColor Green
Write-Host "  ✓ 2-User Support with Supabase Auth" -ForegroundColor Green
Write-Host "  ✓ Memory/Context Persistence" -ForegroundColor Green
Write-Host "  ⚠ Google Drive Integration (In Progress)" -ForegroundColor Yellow
Write-Host "  ⚠ Gmail Integration (Pending)" -ForegroundColor Yellow
Write-Host "  ✓ Automatic Git Commits" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to close this window..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
