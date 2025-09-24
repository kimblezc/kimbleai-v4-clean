# Automated Testing and Debugging Script for KimbleAI
# Uses Claude Code for intelligent debugging

$projectPath = "C:\Users\zachk\OneDrive\Documents\kimbleai-v4-clean"
Set-Location $projectPath

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " KimbleAI Automated Testing & Debugging" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to run Claude Code commands
function Run-ClaudeCode {
    param([string]$command)
    
    Write-Host "Running: $command" -ForegroundColor Yellow
    npx @anthropic-ai/claude-code $command
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error detected. Attempting auto-fix..." -ForegroundColor Red
        npx @anthropic-ai/claude-code "Fix the error that just occurred and try again"
    }
}

# Menu for different testing options
Write-Host "Select Testing Option:" -ForegroundColor Green
Write-Host "1. Quick Test - Check for errors" -ForegroundColor White
Write-Host "2. Full Test - Complete system test" -ForegroundColor White
Write-Host "3. Fix TypeScript Errors" -ForegroundColor White
Write-Host "4. Test API Endpoints" -ForegroundColor White
Write-Host "5. Test Google Integration" -ForegroundColor White
Write-Host "6. Test Memory System" -ForegroundColor White
Write-Host "7. Build Production" -ForegroundColor White
Write-Host "8. Custom Command" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter choice (1-8)"

switch ($choice) {
    "1" {
        Run-ClaudeCode "Check for errors in both backend and frontend. List all issues found."
    }
    "2" {
        Run-ClaudeCode "Run complete system test: Start servers, test all features, verify integrations work"
    }
    "3" {
        Run-ClaudeCode "Find and fix all TypeScript errors without removing features. Ensure type safety."
    }
    "4" {
        Run-ClaudeCode "Test all API endpoints. Create test requests and verify responses."
    }
    "5" {
        Run-ClaudeCode "Test Google Drive and Gmail integration. Verify OAuth and API calls."
    }
    "6" {
        Run-ClaudeCode "Test conversation memory system. Store, retrieve, and search past conversations."
    }
    "7" {
        Run-ClaudeCode "Create production build. Optimize and prepare for deployment."
    }
    "8" {
        $customCommand = Read-Host "Enter your Claude Code command"
        Run-ClaudeCode $customCommand
    }
}

Write-Host ""
Write-Host "Testing complete!" -ForegroundColor Green
Write-Host ""

# Ask if user wants to commit changes
$commit = Read-Host "Commit changes to Git? (y/n)"
if ($commit -eq 'y') {
    git add -A
    $message = Read-Host "Enter commit message"
    git commit -m "$message"
    git push origin main
    Write-Host "Changes committed and pushed!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Press any key to exit..."
Read-Host
