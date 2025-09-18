# KIMBLEAI MEMORY VERIFICATION SCRIPT
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "KIMBLEAI MEMORY SYSTEM VERIFICATION" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "https://kimbleai-v4-clean-4oizii6tg-kimblezcs-projects.vercel.app"

# Check API Status
Write-Host "[1] Checking API Status..." -ForegroundColor Yellow
try {
    $status = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Get
    Write-Host "  API Status: $($status.status)" -ForegroundColor Green
    Write-Host "  OpenAI Configured: $($status.apiKeyConfigured)" -ForegroundColor $(if($status.apiKeyConfigured){"Green"}else{"Red"})
    Write-Host "  Supabase Configured: $($status.supabaseConfigured)" -ForegroundColor $(if($status.supabaseConfigured){"Green"}else{"Red"})
} catch {
    Write-Host "  API Check Failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[2] Testing Memory Save (Zach)..." -ForegroundColor Yellow

$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$testData = @{
    messages = @(
        @{
            role = "user"
            content = "Remember this test fact: My lucky number is 42 and I live in Seattle"
        }
    )
    userId = "zach"
    conversationId = "test_save_$timestamp"
} | ConvertTo-Json -Depth 10

$saveResponse = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $testData -ContentType "application/json"
Write-Host "  Response: $($saveResponse.response.Substring(0, [Math]::Min(100, $saveResponse.response.Length)))..." -ForegroundColor Gray
Write-Host "  Saved to DB: $($saveResponse.saved)" -ForegroundColor $(if($saveResponse.saved){"Green"}else{"Red"})

Write-Host ""
Write-Host "[3] Testing Memory Retrieval (New Conversation)..." -ForegroundColor Yellow

Start-Sleep -Seconds 3

$retrieveData = @{
    messages = @(
        @{
            role = "user"
            content = "What is my lucky number and where do I live?"
        }
    )
    userId = "zach"
    conversationId = "test_retrieve_$timestamp"
} | ConvertTo-Json -Depth 10

$retrieveResponse = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $retrieveData -ContentType "application/json"
Write-Host "  Response: $($retrieveResponse.response)" -ForegroundColor Gray
Write-Host "  Memory Active: $($retrieveResponse.memoryActive)" -ForegroundColor $(if($retrieveResponse.memoryActive){"Green"}else{"Yellow"})
Write-Host "  Memories Loaded: $($retrieveResponse.memoriesLoaded)" -ForegroundColor Cyan

# Check if memory worked
$memoryWorks = $false
if ($retrieveResponse.response -match "42" -and $retrieveResponse.response -match "Seattle") {
    $memoryWorks = $true
    Write-Host "  MEMORY TEST: PASSED" -ForegroundColor Green
} else {
    Write-Host "  MEMORY TEST: FAILED (not finding saved facts)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[4] Testing User Switching (Rebecca)..." -ForegroundColor Yellow

$rebeccaData = @{
    messages = @(
        @{
            role = "user"
            content = "Hi, this is Rebecca. Remember that my favorite food is sushi."
        }
    )
    userId = "rebecca"
    conversationId = "test_rebecca_$timestamp"
} | ConvertTo-Json -Depth 10

$rebeccaResponse = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $rebeccaData -ContentType "application/json"
Write-Host "  Response: $($rebeccaResponse.response.Substring(0, [Math]::Min(100, $rebeccaResponse.response.Length)))..." -ForegroundColor Gray
Write-Host "  Saved: $($rebeccaResponse.saved)" -ForegroundColor $(if($rebeccaResponse.saved){"Green"}else{"Red"})

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "VERIFICATION SUMMARY" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

$apiWorks = $status.status -eq "ready"
$openAIWorks = $status.apiKeyConfigured -eq $true
$supabaseWorks = $status.supabaseConfigured -eq $true
$savingWorks = $saveResponse.saved -eq $true

Write-Host ""
Write-Host "Component Status:" -ForegroundColor White
Write-Host "  [$(if($apiWorks){'✓'}else{'✗'})] API Endpoint" -ForegroundColor $(if($apiWorks){"Green"}else{"Red"})
Write-Host "  [$(if($openAIWorks){'✓'}else{'✗'})] OpenAI Integration" -ForegroundColor $(if($openAIWorks){"Green"}else{"Red"})
Write-Host "  [$(if($supabaseWorks){'✓'}else{'✗'})] Supabase Connection" -ForegroundColor $(if($supabaseWorks){"Green"}else{"Red"})
Write-Host "  [$(if($savingWorks){'✓'}else{'✗'})] Message Persistence" -ForegroundColor $(if($savingWorks){"Green"}else{"Red"})
Write-Host "  [$(if($memoryWorks){'✓'}else{'✗'})] Memory Retrieval" -ForegroundColor $(if($memoryWorks){"Green"}else{"Yellow"})

Write-Host ""
if ($memoryWorks) {
    Write-Host "SUCCESS: Memory system is fully operational!" -ForegroundColor Green
} elseif ($savingWorks) {
    Write-Host "PARTIAL SUCCESS: Messages are saving but retrieval needs work" -ForegroundColor Yellow
    Write-Host "This might mean the database schema needs updating" -ForegroundColor Yellow
} else {
    Write-Host "ATTENTION: Memory system is not fully configured" -ForegroundColor Yellow
    Write-Host "Please ensure the database schema is applied in Supabase" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Test Complete. Check https://kimbleai-v4-clean-4oizii6tg-kimblezcs-projects.vercel.app" -ForegroundColor Cyan
