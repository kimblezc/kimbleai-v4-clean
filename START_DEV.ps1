# Quick Development Starter with Claude Code
# This script starts your development environment and Claude Code

$projectPath = "C:\Users\zachk\OneDrive\Documents\kimbleai-v4-clean"
Set-Location $projectPath

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host " Starting KimbleAI Development" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if API key is set
if (-not $env:ANTHROPIC_API_KEY) {
    Write-Host "ANTHROPIC_API_KEY not set!" -ForegroundColor Red
    $apiKey = Read-Host "Enter your Anthropic API key" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($apiKey)
    $plainKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    [Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", $plainKey, "User")
    $env:ANTHROPIC_API_KEY = $plainKey
    Write-Host "API key set!" -ForegroundColor Green
}

Write-Host "Starting Claude Code with your project context..." -ForegroundColor Yellow
Write-Host ""

# Define the comprehensive project context
$projectContext = @"
I'm working on KimbleAI v4 Clean - a cross-platform chat AI interface with these requirements:

CORE REQUIREMENTS:
- Works on PC, Mac, Android, and iPhone (PWA/responsive web app)
- Supports 2 users with shared conversation memory
- Can reference anything from previous conversations
- Integrates with Google Drive, Gmail, and local files
- Maximum automation in development
- Always fix errors without removing features

CURRENT STRUCTURE:
- Backend: Node.js/Express API with intelligent memory system
- Frontend: React/Next.js with TypeScript
- Database: Supabase for user data and conversation history
- Integrations: Google OAuth for Drive/Gmail access

CURRENT TASK:
Please analyze the current state of the project and:
1. Check for any errors or issues
2. Verify all dependencies are installed
3. Ensure the project structure is complete
4. Start the development servers
5. Provide a status report

IMPORTANT RULES:
- Never remove features when fixing errors
- Always maintain TypeScript type safety
- Ensure cross-platform compatibility
- Keep memory system intact
- Maintain Google integrations
"@

# Start Claude Code with context
Write-Host "Launching Claude Code..." -ForegroundColor Green
npx @anthropic-ai/claude-code $projectContext

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host " Development Environment Ready!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Claude Code is now running with your project context." -ForegroundColor Yellow
Write-Host "You can give it commands to:" -ForegroundColor Yellow
Write-Host "- Fix errors" -ForegroundColor White
Write-Host "- Add features" -ForegroundColor White
Write-Host "- Run tests" -ForegroundColor White
Write-Host "- Debug issues" -ForegroundColor White
Write-Host "- Deploy changes" -ForegroundColor White
