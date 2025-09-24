# START_CLAUDE_CODE.ps1
# Script to start Claude Code for KimbleAI v4 development

Write-Host "Starting Claude Code for KimbleAI v4..." -ForegroundColor Cyan

# Navigate to project directory
Set-Location "C:\Users\zachk\OneDrive\Documents\kimbleai-v4-clean"

# Set environment variable for API key if not already set
if (-not $env:ANTHROPIC_API_KEY) {
    Write-Host "Please set your ANTHROPIC_API_KEY first:" -ForegroundColor Yellow
    Write-Host '$env:ANTHROPIC_API_KEY = "your-api-key-here"' -ForegroundColor Green
    Write-Host "Then run this script again." -ForegroundColor Yellow
    exit
}

# Start Claude Code with context
$prompt = @"
Continue development of KimbleAI v4 chat AI interface. 

CURRENT STATUS:
- System 95% complete with dark mode ChatGPT/Claude-style interface
- Local working perfectly on localhost:3001
- Production simple interface working but main route has HTTP 307 redirect issue
- All emojis removed as requested
- Memory, AI chat, user switching working locally

IMMEDIATE TASKS:
1. Fix production root route to show dark mode interface (currently HTTP 307 redirect)
2. Change custom domain from ai.kimbleai.com to www.kimbleai.com in Vercel
3. Test file uploads on production
4. Implement M4A audio upload with Whisper transcription

RULES:
- NEVER use emojis in code (breaks functionality)
- Always commit to git after changes
- Fix features instead of removing them
- Check for TypeScript errors
- Prioritize continuity and automation

Read LAPTOP_TRANSITION_FINAL.md for full context.
"@

Write-Host "Starting Claude Code with project context..." -ForegroundColor Green
npx @anthropic-ai/claude-code $prompt
