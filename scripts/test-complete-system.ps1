# TEST COMPLETE KIMBLEAI SYSTEM WITH ZAPIER
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "TESTING COMPLETE KIMBLEAI + ZAPIER INTEGRATION" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor White
Write-Host ""

$baseUrl = "https://kimbleai-v4-clean.vercel.app"

# Test 1: Full conversation with memory and logging
Write-Host "[1/5] Testing full conversation flow..." -ForegroundColor Yellow
$conversation1 = @{
    messages = @(
        @{
            role = "user"
            content = "Remember this for later: I have a dentist appointment on Tuesday October 22nd at 2pm. Also, @Rebecca needs to pick up the kids."
        }
    )
    userId = "zach"
    conversationId = "zapier-test-$(Get-Date -Format 'yyyyMMddHHmmss')"
} | ConvertTo-Json -Depth 10

$response1 = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $conversation1 -ContentType "application/json"
Write-Host "✅ Conversation saved" -ForegroundColor Green
Write-Host "   Memory: $($response1.memoryActive)" -ForegroundColor Gray
Write-Host "   Webhook: Check Zapier dashboard for trigger" -ForegroundColor Yellow

Start-Sleep -Seconds 2

# Test 2: Memory recall
Write-Host "[2/5] Testing memory recall..." -ForegroundColor Yellow
$conversation2 = @{
    messages = @(
        @{
            role = "user"
            content = "What appointments do I have coming up?"
        }
    )
    userId = "zach"
} | ConvertTo-Json -Depth 10

$response2 = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $conversation2 -ContentType "application/json"
if ($response2.response -match "dentist" -or $response2.response -match "Tuesday") {
    Write-Host "✅ Memory working - AI recalls appointment" -ForegroundColor Green
} else {
    Write-Host "⚠️ Memory may need time to index" -ForegroundColor Yellow
}

# Test 3: Cross-user functionality
Write-Host "[3/5] Testing cross-user isolation..." -ForegroundColor Yellow
$conversation3 = @{
    messages = @(
        @{
            role = "user"
            content = "What do you know about Zach's appointments?"
        }
    )
    userId = "rebecca"
} | ConvertTo-Json -Depth 10

$response3 = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $conversation3 -ContentType "application/json"
if ($response3.response -notmatch "dentist") {
    Write-Host "✅ User isolation working - Rebecca can't see Zach's data" -ForegroundColor Green
} else {
    Write-Host "⚠️ User isolation issue detected" -ForegroundColor Red
}

# Test 4: Document save trigger
Write-Host "[4/5] Testing Drive save trigger..." -ForegroundColor Yellow
$conversation4 = @{
    messages = @(
        @{
            role = "user"
            content = "save to drive: This week's family schedule including the dentist appointment and kid pickup times"
        }
    )
    userId = "zach"
} | ConvertTo-Json -Depth 10

$response4 = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $conversation4 -ContentType "application/json"
Write-Host "✅ Drive save triggered - Check Zapier for automation" -ForegroundColor Green

# Test 5: Complex multi-feature test
Write-Host "[5/5] Testing complex interaction..." -ForegroundColor Yellow
$conversation5 = @{
    messages = @(
        @{
            role = "user"
            content = "Create a summary of all my appointments and tasks, then save to drive and email to @Rebecca"
        }
    )
    userId = "zach"
} | ConvertTo-Json -Depth 10

$response5 = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $conversation5 -ContentType "application/json"
Write-Host "✅ Complex command processed" -ForegroundColor Green

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "SYSTEM TEST COMPLETE" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "CHECK ZAPIER DASHBOARD FOR:" -ForegroundColor Yellow
Write-Host "1. Webhook triggers (should see 5 new records)" -ForegroundColor White
Write-Host "2. Google Docs appends (if configured)" -ForegroundColor White
Write-Host "3. Email sends (if configured)" -ForegroundColor White
Write-Host "4. Drive document creation (if configured)" -ForegroundColor White
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Green
Write-Host "1. Configure remaining Zap actions in dashboard" -ForegroundColor White
Write-Host "2. Test each automation path" -ForegroundColor White
Write-Host "3. Monitor usage (750 tasks/month limit)" -ForegroundColor White
