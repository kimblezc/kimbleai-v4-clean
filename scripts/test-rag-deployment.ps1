# COMPLETE TEST OF RAG SYSTEM
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "TESTING IF RAG IS ACTUALLY DEPLOYED" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor White
Write-Host ""

$baseUrl = "https://kimbleai-v4-clean.vercel.app"

# Test 1: Basic health check
Write-Host "[1/6] Testing API health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Get
    Write-Host "✅ API Status: $($health.status)" -ForegroundColor Green
    if ($health.capabilities) {
        Write-Host "   Capabilities: $($health.capabilities -join ', ')" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ API not responding: $_" -ForegroundColor Red
}

# Test 2: Check if knowledge base is being used
Write-Host "[2/6] Testing knowledge base integration..." -ForegroundColor Yellow
$kbTest = @{
    messages = @(@{
        role = "user"
        content = "What information do you have in your knowledge base about me?"
    })
    userId = "zach"
} | ConvertTo-Json -Depth 10

$kbResponse = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $kbTest -ContentType "application/json"
if ($kbResponse.knowledgeBase) {
    Write-Host "✅ Knowledge base ACTIVE!" -ForegroundColor Green
    Write-Host "   Items found: $($kbResponse.knowledgeBase.itemsFound)" -ForegroundColor Gray
    Write-Host "   Sources: $($kbResponse.knowledgeBase.sources -join ', ')" -ForegroundColor Gray
} else {
    Write-Host "⚠️ Knowledge base not detected in response" -ForegroundColor Yellow
}

# Test 3: Add new knowledge
Write-Host "[3/6] Adding test knowledge..." -ForegroundColor Yellow
$addTest = @{
    messages = @(@{
        role = "user"
        content = "Important: My car is a 2019 Tesla Model 3 in midnight silver. License plate XYZ-123. I need an oil change next month."
    })
    userId = "zach"
} | ConvertTo-Json -Depth 10

$addResponse = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $addTest -ContentType "application/json"
Write-Host "✅ Knowledge added" -ForegroundColor Green
Start-Sleep -Seconds 3

# Test 4: Retrieve the knowledge
Write-Host "[4/6] Testing knowledge retrieval..." -ForegroundColor Yellow
$retrieveTest = @{
    messages = @(@{
        role = "user"
        content = "What car do I drive and what's the license plate?"
    })
    userId = "zach"
} | ConvertTo-Json -Depth 10

$retrieveResponse = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $retrieveTest -ContentType "application/json"
if ($retrieveResponse.response -match "Tesla" -or $retrieveResponse.response -match "XYZ") {
    Write-Host "✅ RAG WORKING! Knowledge retrieved successfully" -ForegroundColor Green
    Write-Host "   Response contains Tesla/license info" -ForegroundColor Gray
} else {
    Write-Host "❌ Knowledge NOT retrieved - RAG may not be working" -ForegroundColor Red
    Write-Host "   Response: $($retrieveResponse.response.Substring(0, [Math]::Min(100, $retrieveResponse.response.Length)))..." -ForegroundColor Gray
}

# Test 5: User isolation
Write-Host "[5/6] Testing user isolation..." -ForegroundColor Yellow
$rebeccaTest = @{
    messages = @(@{
        role = "user"
        content = "What car does Zach drive?"
    })
    userId = "rebecca"
} | ConvertTo-Json -Depth 10

$rebeccaResponse = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $rebeccaTest -ContentType "application/json"
if ($rebeccaResponse.response -notmatch "Tesla") {
    Write-Host "✅ User isolation working" -ForegroundColor Green
} else {
    Write-Host "❌ User isolation BROKEN - Rebecca can see Zach's data!" -ForegroundColor Red
}

# Test 6: File upload capability
Write-Host "[6/6] Testing file upload endpoint..." -ForegroundColor Yellow
try {
    $uploadTest = Invoke-RestMethod -Uri "$baseUrl/api/upload" -Method Get
    if ($uploadTest.error -or $uploadTest.files -ne $null) {
        Write-Host "✅ Upload endpoint exists" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ Upload endpoint not accessible" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "TEST COMPLETE" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan