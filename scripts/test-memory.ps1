# TEST MEMORY SYSTEM DIRECTLY
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "TESTING KIMBLEAI MEMORY SYSTEM" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "https://kimbleai-v4-clean.vercel.app/api/chat"

# Test 1: First message to save
Write-Host "Test 1: Saving information..." -ForegroundColor Yellow
$test1 = @{
    messages = @(
        @{
            role = "user"
            content = "My name is Zach. I have a dog named Rennie. I live in Seattle. My favorite color is blue."
        }
    )
    userId = "zach"
} | ConvertTo-Json -Depth 10

$response1 = Invoke-RestMethod -Uri $baseUrl -Method Post -Body $test1 -ContentType "application/json"
Write-Host "Response: $($response1.response)" -ForegroundColor Green
Write-Host "Saved: $($response1.saved)" -ForegroundColor Cyan
Write-Host "ConversationId: $($response1.conversationId)" -ForegroundColor Cyan
Write-Host ""

# Wait for database to save
Start-Sleep -Seconds 3

# Test 2: Another message
Write-Host "Test 2: Adding more information..." -ForegroundColor Yellow
$test2 = @{
    messages = @(
        @{
            role = "user"
            content = "I also work in software development and have a meeting tomorrow at 3pm"
        }
    )
    userId = "zach"
} | ConvertTo-Json -Depth 10

$response2 = Invoke-RestMethod -Uri $baseUrl -Method Post -Body $test2 -ContentType "application/json"
Write-Host "Response: $($response2.response)" -ForegroundColor Green
Write-Host "Memory Active: $($response2.memoryActive)" -ForegroundColor $(if($response2.memoryActive){"Green"}else{"Red"})
Write-Host ""

# Wait for database
Start-Sleep -Seconds 3

# Test 3: Check memory recall
Write-Host "Test 3: Testing memory recall..." -ForegroundColor Yellow
$test3 = @{
    messages = @(
        @{
            role = "user"
            content = "Can you tell me what you know about me? What's my pet's name and where do I live?"
        }
    )
    userId = "zach"
} | ConvertTo-Json -Depth 10

$response3 = Invoke-RestMethod -Uri $baseUrl -Method Post -Body $test3 -ContentType "application/json"
Write-Host "Response: $($response3.response)" -ForegroundColor Green
Write-Host "Memory Active: $($response3.memoryActive)" -ForegroundColor $(if($response3.memoryActive){"Green"}else{"Red"})
Write-Host "Contexts Found: $($response3.contextsFound)" -ForegroundColor Cyan
Write-Host ""

# Test 4: Test as different user
Write-Host "Test 4: Testing as Rebecca (should not know Zach's info)..." -ForegroundColor Yellow
$test4 = @{
    messages = @(
        @{
            role = "user"
            content = "What do you know about me?"
        }
    )
    userId = "rebecca"
} | ConvertTo-Json -Depth 10

$response4 = Invoke-RestMethod -Uri $baseUrl -Method Post -Body $test4 -ContentType "application/json"
Write-Host "Response: $($response4.response)" -ForegroundColor Green
Write-Host "Memory Active: $($response4.memoryActive)" -ForegroundColor $(if($response4.memoryActive){"Green"}else{"Red"})
Write-Host ""

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "MEMORY TEST COMPLETE" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
