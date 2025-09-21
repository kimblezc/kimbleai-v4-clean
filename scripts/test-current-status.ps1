# TEST CURRENT KIMBLEAI STATUS
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "KIMBLEAI V4 STATUS TEST" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check database connection
Write-Host "Test 1: Checking database connection..." -ForegroundColor Yellow
$dbUrl = "https://kimbleai-v4-clean.vercel.app/api/debug"
try {
    $dbResponse = Invoke-WebRequest -Uri $dbUrl -Method Get -UseBasicParsing
    Write-Host "Database Status: Connected" -ForegroundColor Green
    $dbData = $dbResponse.Content | ConvertFrom-Json
    Write-Host "Users Found: $($dbData.users.Count)" -ForegroundColor Cyan
} catch {
    Write-Host "Database Status: NOT CONNECTED" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Yellow
}

Write-Host ""

# Test 2: Check chat API
Write-Host "Test 2: Testing chat API..." -ForegroundColor Yellow
$chatUrl = "https://kimbleai-v4-clean.vercel.app/api/chat"
$testBody = @{
    messages = @(
        @{
            role = "user"
            content = "Test message: My dog is named Rennie and I live in Seattle"
        }
    )
    userId = "zach"
    conversationId = "test-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
} | ConvertTo-Json -Depth 10

try {
    $chatResponse = Invoke-RestMethod -Uri $chatUrl -Method Post -Body $testBody -ContentType "application/json"
    Write-Host "Chat API Status: Working" -ForegroundColor Green
    Write-Host "Response: $($chatResponse.response.Substring(0, [Math]::Min(100, $chatResponse.response.Length)))..." -ForegroundColor Gray
    Write-Host "Message Saved: $($chatResponse.saved)" -ForegroundColor $(if($chatResponse.saved){"Green"}else{"Red"})
    Write-Host "Memory Active: $($chatResponse.memoryActive)" -ForegroundColor $(if($chatResponse.memoryActive){"Green"}else{"Red"})
} catch {
    Write-Host "Chat API Status: ERROR" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Yellow
}

Write-Host ""

# Test 3: Check memory recall
Write-Host "Test 3: Testing memory recall..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
$recallBody = @{
    messages = @(
        @{
            role = "user"
            content = "What's my dog's name and where do I live?"
        }
    )
    userId = "zach"
} | ConvertTo-Json -Depth 10

try {
    $recallResponse = Invoke-RestMethod -Uri $chatUrl -Method Post -Body $recallBody -ContentType "application/json"
    Write-Host "Response: $($recallResponse.response.Substring(0, [Math]::Min(200, $recallResponse.response.Length)))..." -ForegroundColor Gray
    Write-Host "Memory Active: $($recallResponse.memoryActive)" -ForegroundColor $(if($recallResponse.memoryActive){"Green"}else{"Red"})
    
    if ($recallResponse.contextsFound) {
        Write-Host "Contexts Found: $($recallResponse.contextsFound)" -ForegroundColor Green
    }
} catch {
    Write-Host "Memory Recall: ERROR" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Yellow
}

Write-Host ""

# Test 4: Check for Rebecca (second user)
Write-Host "Test 4: Testing as Rebecca (should not know Zach's info)..." -ForegroundColor Yellow
$rebeccaBody = @{
    messages = @(
        @{
            role = "user"
            content = "What do you know about me?"
        }
    )
    userId = "rebecca"
} | ConvertTo-Json -Depth 10

try {
    $rebeccaResponse = Invoke-RestMethod -Uri $chatUrl -Method Post -Body $rebeccaBody -ContentType "application/json"
    Write-Host "Response: $($rebeccaResponse.response.Substring(0, [Math]::Min(200, $rebeccaResponse.response.Length)))..." -ForegroundColor Gray
    Write-Host "Memory Active: $($rebeccaResponse.memoryActive)" -ForegroundColor $(if($rebeccaResponse.memoryActive){"Green"}else{"Red"})
} catch {
    Write-Host "Rebecca Test: ERROR" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "MEMORY TEST COMPLETE" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
