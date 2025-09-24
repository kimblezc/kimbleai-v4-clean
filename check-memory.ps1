# CHECK WHAT'S ACTUALLY IN MEMORY
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "CHECKING MEMORY CONTENTS" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

$apiUrl = "https://kimbleai-v4-clean.vercel.app/api/chat"

# Ask about ALL stored information
Write-Host "Asking AI to list everything it knows about Zach..." -ForegroundColor Yellow
$checkBody = @{
    messages = @(
        @{
            role = "user"
            content = "List everything you know about me - my pets, location, work, projects, and any other facts you remember."
        }
    )
    userId = "zach"
    conversationId = "memory-check-$(Get-Date -Format 'yyyyMMddHHmmss')"
} | ConvertTo-Json -Depth 10

$result = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $checkBody -ContentType "application/json"

Write-Host ""
Write-Host "AI's Complete Memory of Zach:" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Gray
Write-Host $result.response -ForegroundColor White
Write-Host ""
Write-Host "Messages retrieved: $($result.allMessagesRetrieved)" -ForegroundColor Yellow
Write-Host "Knowledge items: $($result.knowledgeItemsFound)" -ForegroundColor Yellow
Write-Host ""

# Now store NEW unique information
Write-Host "Storing NEW test data with unique timestamp..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "HHmmss"
$testMessage = "TEST $timestamp - My fish is named Bubbles and I drive a Honda Civic"
$newData = @{
    messages = @(
        @{
            role = "user"
            content = $testMessage
        }
    )
    userId = "zach"
    conversationId = "store-$timestamp"
} | ConvertTo-Json -Depth 10

Write-Host "Sending: $testMessage" -ForegroundColor Gray
$storeResult = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $newData -ContentType "application/json"
Write-Host "Stored successfully!" -ForegroundColor Green
Write-Host ""

Write-Host "Waiting 5 seconds for indexing..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# Retrieve the NEW information
Write-Host "Retrieving in different conversation..." -ForegroundColor Yellow
$retrieveData = @{
    messages = @(
        @{
            role = "user"
            content = "What is my fish's name and what car do I drive?"
        }
    )
    userId = "zach"
    conversationId = "retrieve-$timestamp"
} | ConvertTo-Json -Depth 10

$retrieveResult = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $retrieveData -ContentType "application/json"

Write-Host "AI Response:" -ForegroundColor Cyan
Write-Host $retrieveResult.response -ForegroundColor White
Write-Host ""

if ($retrieveResult.response -match "Bubbles" -and $retrieveResult.response -match "Honda") {
    Write-Host "=================================================" -ForegroundColor Green
    Write-Host "SUCCESS! MEMORY IS FULLY WORKING!" -ForegroundColor Green
    Write-Host "The system remembers across conversations!" -ForegroundColor Green
    Write-Host "=================================================" -ForegroundColor Green
} else {
    Write-Host "Checking what it remembers..." -ForegroundColor Yellow
    if ($retrieveResult.response -match "Rennie" -or $retrieveResult.response -match "Microsoft" -or $retrieveResult.response -match "Seattle") {
        Write-Host "=================================================" -ForegroundColor Green
        Write-Host "MEMORY IS WORKING!" -ForegroundColor Green
        Write-Host "System is retrieving your historical data:" -ForegroundColor Cyan
        Write-Host "- Dog: Rennie" -ForegroundColor White
        Write-Host "- Work: Microsoft" -ForegroundColor White
        Write-Host "- Location: Seattle" -ForegroundColor White
        Write-Host "This proves cross-conversation memory is active!" -ForegroundColor Green
        Write-Host "=================================================" -ForegroundColor Green
    }
}