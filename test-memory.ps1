# TEST KIMBLEAI MEMORY SYSTEM
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "TESTING CROSS-CONVERSATION MEMORY" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

$apiUrl = "https://kimbleai-v4-clean.vercel.app/api/chat"
$timestamp = Get-Date -Format "yyyyMMddHHmmss"

# TEST 1: Store information
Write-Host "TEST 1: Storing information..." -ForegroundColor Yellow
$storeBody = @{
    messages = @(
        @{
            role = "user"
            content = "My dog is named Rover and I live in Portland. I work at Intel."
        }
    )
    userId = "zach"
    conversationId = "test-A-$timestamp"
} | ConvertTo-Json -Depth 10

$storeResult = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $storeBody -ContentType "application/json"
Write-Host "Stored: $($storeResult.saved)" -ForegroundColor Green
Write-Host ""

# Wait for indexing
Write-Host "Waiting 5 seconds for indexing..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# TEST 2: Retrieve in different conversation
Write-Host "TEST 2: Retrieving in NEW conversation..." -ForegroundColor Yellow
$retrieveBody = @{
    messages = @(
        @{
            role = "user"
            content = "What is my dog's name and where do I work?"
        }
    )
    userId = "zach"
    conversationId = "test-B-$timestamp"
} | ConvertTo-Json -Depth 10

$retrieveResult = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $retrieveBody -ContentType "application/json"
Write-Host "AI Response:" -ForegroundColor Cyan
Write-Host $retrieveResult.response -ForegroundColor White
Write-Host ""

# Check success
if ($retrieveResult.response -match "Rover" -and $retrieveResult.response -match "Intel") {
    Write-Host "SUCCESS! Memory works across conversations!" -ForegroundColor Green
} else {
    Write-Host "Memory test needs verification" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Messages retrieved: $($retrieveResult.allMessagesRetrieved)" -ForegroundColor Cyan
Write-Host "Knowledge items: $($retrieveResult.knowledgeItemsFound)" -ForegroundColor Cyan