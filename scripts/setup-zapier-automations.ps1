# ZAPIER CONFIGURATION GUIDE FOR KIMBLEAI
# Configure these 5 essential Zaps for full automation

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "SETTING UP ZAPIER AUTOMATIONS" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor White
Write-Host ""

Write-Host "YOUR WEBHOOK IS WORKING!" -ForegroundColor Green
Write-Host "URL: https://hooks.zapier.com/hooks/catch/2674926/um3x9v1/" -ForegroundColor Gray
Write-Host ""

Write-Host "CONFIGURE THESE 5 ZAPS:" -ForegroundColor Yellow
Write-Host ""

Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "ZAP 1: MASTER DOCUMENT LOGGER" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Trigger: Webhooks by Zapier (your current webhook)"
Write-Host "Action 1: Google Docs - Append to Document"
Write-Host "   Document: Your Master Document"
Write-Host "   Text to append:"
Write-Host "   ---"
Write-Host "   Session: {{timestamp}}"
Write-Host "   User: {{metadata__user}}"
Write-Host "   Message: {{message}}"
Write-Host "   Event: {{event}}"
Write-Host "   ---"
Write-Host ""

Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "ZAP 2: SMART MEMORY EXTRACTOR" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Trigger: Webhooks by Zapier (same webhook)"
Write-Host "Filter: Only continue if event contains 'CONVERSATION'"
Write-Host "Action 1: OpenAI - Extract Structured Data"
Write-Host "   Prompt: Extract facts, dates, preferences from: {{message}}"
Write-Host "Action 2: Google Sheets - Add Row"
Write-Host "   Sheet: KimbleAI Memories"
Write-Host "   Columns: Date | User | Type | Content | Importance"
Write-Host ""

Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "ZAP 3: CROSS-USER NOTIFICATIONS" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Trigger: Webhooks by Zapier"
Write-Host "Filter: If message contains '@Rebecca' or '@Zach'"
Write-Host "Action 1: Gmail - Send Email"
Write-Host "   To: (Rebecca or Zach based on mention)"
Write-Host "   Subject: KimbleAI Message from {{metadata__user}}"
Write-Host "   Body: {{message}}"
Write-Host "Action 2: SMS by Zapier (optional)"
Write-Host ""

Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "ZAP 4: GOOGLE DRIVE SAVER" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Trigger: Webhooks by Zapier"
Write-Host "Filter: If message contains 'save to drive'"
Write-Host "Action 1: Google Drive - Create Document from Text"
Write-Host "   Title: KimbleAI Chat - {{timestamp}}"
Write-Host "   Content: {{message}}"
Write-Host "   Folder: KimbleAI Conversations"
Write-Host "Action 2: Webhooks - POST back to KimbleAI"
Write-Host "   URL: https://kimbleai-v4-clean.vercel.app/api/webhook-response"
Write-Host "   Data: {link: '{{google_drive_link}}'}"
Write-Host ""

Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "ZAP 5: DAILY SUMMARY DIGEST" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Trigger: Schedule by Zapier - Daily at 8 PM"
Write-Host "Action 1: Webhooks - GET"
Write-Host "   URL: https://kimbleai-v4-clean.vercel.app/api/daily-summary"
Write-Host "Action 2: Gmail - Send Email"
Write-Host "   To: zach.kimble@gmail.com, becky.aza.kimble@gmail.com"
Write-Host "   Subject: KimbleAI Daily Summary - {{date}}"
Write-Host "   Body: {{summary_from_webhook}}"
Write-Host ""

Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "TEST YOUR ZAPS" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Run these tests after configuration:" -ForegroundColor White
Write-Host "1. .\scripts\test-master-logger.ps1" -ForegroundColor Gray
Write-Host "2. .\scripts\test-memory-extraction.ps1" -ForegroundColor Gray
Write-Host "3. .\scripts\test-cross-user.ps1" -ForegroundColor Gray
Write-Host "4. .\scripts\test-drive-save.ps1" -ForegroundColor Gray
Write-Host ""

# Create test payloads for each Zap
$test1 = @{
    event = "CONVERSATION_EXCHANGE"
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    message = "This is a test of the Master Document logging system"
    metadata = @{
        user = "zach"
        session = "test-logging"
    }
} | ConvertTo-Json -Depth 10

$test2 = @{
    event = "CONVERSATION_WITH_FACTS"
    message = "My birthday is October 15th and I prefer coffee over tea. My dog Rennie loves walks at 3pm."
    metadata = @{
        user = "zach"
        extract = $true
    }
} | ConvertTo-Json -Depth 10

$test3 = @{
    event = "CROSS_USER_MESSAGE"
    message = "@Rebecca Don't forget we have dinner reservations at 7pm tonight"
    metadata = @{
        user = "zach"
        urgent = $true
    }
} | ConvertTo-Json -Depth 10

$test4 = @{
    event = "SAVE_TO_DRIVE"
    message = "save to drive: Project plan for Q1 2025 including all KimbleAI features"
    content = "Full project documentation here..."
    metadata = @{
        user = "zach"
        type = "document"
    }
} | ConvertTo-Json -Depth 10

# Save test scripts
$test1 | Out-File "scripts\test-master-logger.json"
$test2 | Out-File "scripts\test-memory-extraction.json"
$test3 | Out-File "scripts\test-cross-user.json"
$test4 | Out-File "scripts\test-drive-save.json"

Write-Host "✅ Test payloads created in scripts folder" -ForegroundColor Green
Write-Host ""
Write-Host "TO SEND A TEST:" -ForegroundColor Yellow
Write-Host '$payload = Get-Content "scripts\test-master-logger.json" -Raw' -ForegroundColor Gray
Write-Host 'Invoke-RestMethod -Uri "https://hooks.zapier.com/hooks/catch/2674926/um3x9v1/" -Method Post -Body $payload -ContentType "application/json"' -ForegroundColor Gray
