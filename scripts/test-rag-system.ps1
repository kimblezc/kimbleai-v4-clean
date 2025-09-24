# TEST RAG SYSTEM AFTER DEPLOYMENT
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "TESTING COMPREHENSIVE RAG SYSTEM" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor White
Write-Host ""

$baseUrl = "https://kimbleai-v4-clean.vercel.app"

# Test 1: Check if RAG is active
Write-Host "[1/5] Testing if RAG system is active..." -ForegroundColor Yellow
$test1 = @{
    messages = @(@{
        role = "user"
        content = "What sources can you search in your knowledge base?"
    })
    userId = "zach"
} | ConvertTo-Json -Depth 10

try {
    $response1 = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $test1 -ContentType "application/json"
    if ($response1.knowledgeBase) {
        Write-Host "✅ RAG Active - Found $($response1.knowledgeBase.itemsFound) items" -ForegroundColor Green
        Write-Host "   Sources: $($response1.knowledgeBase.sources -join ', ')" -ForegroundColor Gray
    } else {
        Write-Host "⚠️ Old system still active - redeploy needed" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# Test 2: Add knowledge
Write-Host "[2/5] Adding test knowledge..." -ForegroundColor Yellow
$test2 = @{
    messages = @(@{
        role = "user"
        content = "Remember this important fact: I have a meeting with Dr. Johnson next Tuesday at 2pm about the quarterly review. Also, my favorite coffee is Colombian dark roast from Blue Bottle."
    })
    userId = "zach"
} | ConvertTo-Json -Depth 10

$response2 = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $test2 -ContentType "application/json"
Write-Host "✅ Knowledge added" -ForegroundColor Green

Start-Sleep -Seconds 2

# Test 3: Retrieve knowledge
Write-Host "[3/5] Testing knowledge retrieval..." -ForegroundColor Yellow
$test3 = @{
    messages = @(@{
        role = "user"
        content = "What meetings do I have coming up and what's my coffee preference?"
    })
    userId = "zach"
} | ConvertTo-Json -Depth 10

$response3 = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $test3 -ContentType "application/json"
if ($response3.response -match "Johnson" -or $response3.response -match "Colombian") {
    Write-Host "✅ RAG WORKING - Successfully retrieved knowledge!" -ForegroundColor Green
    Write-Host "   Response: $($response3.response.Substring(0, [Math]::Min(200, $response3.response.Length)))..." -ForegroundColor Gray
} else {
    Write-Host "⚠️ Knowledge not found in response" -ForegroundColor Yellow
}

# Test 4: Cross-user isolation
Write-Host "[4/5] Testing user isolation..." -ForegroundColor Yellow
$test4 = @{
    messages = @(@{
        role = "user"
        content = "What do you know about Zach's meetings?"
    })
    userId = "rebecca"
} | ConvertTo-Json -Depth 10

$response4 = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $test4 -ContentType "application/json"
if ($response4.response -notmatch "Johnson") {
    Write-Host "✅ User isolation working" -ForegroundColor Green
} else {
    Write-Host "❌ User isolation broken!" -ForegroundColor Red
}

# Test 5: Check knowledge stats
Write-Host "[5/5] Checking knowledge base statistics..." -ForegroundColor Yellow
$test5 = @{
    messages = @(@{
        role = "user"
        content = "How many items are in my knowledge base?"
    })
    userId = "zach"
} | ConvertTo-Json -Depth 10

$response5 = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $test5 -ContentType "application/json"
if ($response5.knowledgeBase) {
    Write-Host "✅ Knowledge base stats:" -ForegroundColor Green
    Write-Host "   Items: $($response5.knowledgeBase.itemsFound)" -ForegroundColor Gray
    Write-Host "   Categories: $($response5.knowledgeBase.categories -join ', ')" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "RAG SYSTEM TEST COMPLETE" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next: Test file upload with:" -ForegroundColor Yellow
Write-Host '  "Test content" | Out-File test.txt' -ForegroundColor Gray
Write-Host '  curl -X POST https://kimbleai-v4-clean.vercel.app/api/upload -F "file=@test.txt" -F "userId=zach"' -ForegroundColor Gray