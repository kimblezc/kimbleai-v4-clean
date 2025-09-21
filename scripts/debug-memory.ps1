# DEBUG DATABASE CONNECTIONS
Write-Host "=================================================" -ForegroundColor Red
Write-Host "DEBUGGING MEMORY SYSTEM FAILURE" -ForegroundColor Red
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "https://kimbleai-v4-clean.vercel.app"

# First check if API is responding
Write-Host "Checking API health..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Get
Write-Host "API Status: $($health.status)" -ForegroundColor Green
Write-Host "Supabase Connected: $($health.supabase)" -ForegroundColor Green
Write-Host ""

# Test with debug mode
Write-Host "Testing with detailed response..." -ForegroundColor Yellow
$testMessage = @{
    messages = @(
        @{
            role = "user"
            content = "Test message for debugging. Tell me what context you have access to."
        }
    )
    userId = "zach"
} | ConvertTo-Json -Depth 10

$response = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $testMessage -ContentType "application/json"

Write-Host "Response:" -ForegroundColor Cyan
Write-Host $response.response -ForegroundColor White
Write-Host ""
Write-Host "Debug Info:" -ForegroundColor Yellow
Write-Host "Saved: $($response.saved)" -ForegroundColor $(if($response.saved){"Green"}else{"Red"})
Write-Host "Memory Active: $($response.memoryActive)" -ForegroundColor $(if($response.memoryActive){"Green"}else{"Red"})
Write-Host "User ID: $($response.userId)" -ForegroundColor Cyan
Write-Host "Conversation ID: $($response.conversationId)" -ForegroundColor Cyan

if ($response.ragContext) {
    Write-Host ""
    Write-Host "RAG Context Details:" -ForegroundColor Yellow
    Write-Host "Recent Messages: $($response.ragContext.recentMessages)" -ForegroundColor Cyan
    Write-Host "Vector Matches: $($response.ragContext.vectorMatches)" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Red
Write-Host "DIAGNOSIS:" -ForegroundColor Yellow
Write-Host "If Memory Active is False with multiple saved messages," -ForegroundColor White
Write-Host "the database queries are failing to retrieve data." -ForegroundColor White
Write-Host ""
Write-Host "NEXT STEP: Run DEBUG_CHECK.sql in Supabase" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Red