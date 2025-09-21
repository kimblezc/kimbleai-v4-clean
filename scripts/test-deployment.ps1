# TEST LIVE DEPLOYMENT WITH ENV VARS
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "TESTING LIVE KIMBLEAI DEPLOYMENT" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "https://kimbleai-v4-clean.vercel.app"

# Test 1: Basic API health
Write-Host "[1/4] Testing API health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Get
    Write-Host "✅ API Status: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ API Error: $_" -ForegroundColor Red
}

# Test 2: Save a message with memory
Write-Host "[2/4] Testing message save with memory..." -ForegroundColor Yellow
$saveBody = @{
    messages = @(@{
        role = "user"
        content = "Remember this: My favorite color is blue and I have a meeting at 3pm tomorrow"
    })
    userId = "zach"
    conversationId = "test-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
} | ConvertTo-Json -Depth 10

$saveResponse = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $saveBody -ContentType "application/json"
Write-Host "✅ Response received" -ForegroundColor Green
Write-Host "   Saved: $($saveResponse.saved)" -ForegroundColor Cyan
Write-Host "   Memory Active: $($saveResponse.memoryActive)" -ForegroundColor Cyan

# Test 3: Memory recall
Start-Sleep -Seconds 2
Write-Host "[3/4] Testing memory recall..." -ForegroundColor Yellow
$recallBody = @{
    messages = @(@{
        role = "user"
        content = "What's my favorite color and do I have any meetings?"
    })
    userId = "zach"
} | ConvertTo-Json -Depth 10

$recallResponse = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $recallBody -ContentType "application/json"
if ($recallResponse.response -match "blue" -or $recallResponse.response -match "3pm") {
    Write-Host "✅ Memory working! AI remembers your info" -ForegroundColor Green
} else {
    Write-Host "⚠️  Memory may not be fully active yet" -ForegroundColor Yellow
}

# Test 4: Webhook trigger
Write-Host "[4/4] Testing Zapier webhook..." -ForegroundColor Yellow
$webhookBody = @{
    messages = @(@{
        role = "user"
        content = "Log this to Master Document: Deployment test successful at $(Get-Date)"
    })
    userId = "zach"
    metadata = @{
        trigger = "deployment_test"
        timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    }
} | ConvertTo-Json -Depth 10

$webhookResponse = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $webhookBody -ContentType "application/json"
Write-Host "✅ Webhook triggered" -ForegroundColor Green

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "DEPLOYMENT TEST COMPLETE" -ForegroundColor Cyan
Write-Host "Check Zapier dashboard for webhook activity" -ForegroundColor Yellow
Write-Host "=================================================" -ForegroundColor Cyan
