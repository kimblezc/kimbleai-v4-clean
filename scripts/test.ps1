# TEST KIMBLEAI
$url = "https://kimbleai-v4-clean-4oizii6tg-kimblezcs-projects.vercel.app/api/chat"

Write-Host "Testing KimbleAI..." -ForegroundColor Cyan

# Test API
$status = Invoke-RestMethod -Uri "$url" -Method Get
Write-Host "API Status: $($status.status)" -ForegroundColor Green

# Test memory
$body = @{
    messages = @(
        @{
            role = "user"
            content = "My dog is Rennie and I live in Seattle"
        }
    )
    userId = "zach"
} | ConvertTo-Json -Depth 10

$response = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json"
Write-Host "Saved: $($response.saved)" -ForegroundColor $(if($response.saved){"Green"}else{"Red"})
Write-Host "Memory Active: $($response.memoryActive)" -ForegroundColor $(if($response.memoryActive){"Green"}else{"Red"})
