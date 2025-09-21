# CHECK VERCEL ENVIRONMENT VARIABLES
Write-Host "=================================================" -ForegroundColor Red
Write-Host "CHECKING ENVIRONMENT VARIABLES IN DEPLOYMENT" -ForegroundColor Red
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Testing basic API connection..." -ForegroundColor Yellow
$response = Invoke-WebRequest -Uri "https://kimbleai-v4-clean.vercel.app/api/chat" -Method Get -UseBasicParsing
$content = $response.Content | ConvertFrom-Json

Write-Host "API Status: $($content.status)" -ForegroundColor Green
Write-Host "Supabase Connected: $($content.supabase)" -ForegroundColor $(if($content.supabase){"Green"}else{"Red"})
Write-Host ""

Write-Host "CRITICAL CHECK:" -ForegroundColor Red
Write-Host "If Supabase = False, the environment variables are not set in Vercel!" -ForegroundColor Yellow
Write-Host ""

if (-not $content.supabase) {
    Write-Host "SOLUTION:" -ForegroundColor Cyan
    Write-Host "1. Go to: https://vercel.com/kimblezcs-projects/kimbleai-v4-clean/settings/environment-variables" -ForegroundColor White
    Write-Host "2. Add these variables:" -ForegroundColor White
    Write-Host "   - NEXT_PUBLIC_SUPABASE_URL" -ForegroundColor Yellow
    Write-Host "   - NEXT_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor Yellow
    Write-Host "   - SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Yellow
    Write-Host "   - OPENAI_API_KEY" -ForegroundColor Yellow
    Write-Host "   - ZAPIER_WEBHOOK_URL" -ForegroundColor Yellow
    Write-Host "3. Select all environments (Production, Preview, Development)" -ForegroundColor White
    Write-Host "4. Redeploy from Vercel dashboard" -ForegroundColor White
}

Write-Host ""
Write-Host "Testing with minimal request..." -ForegroundColor Yellow
try {
    $body = '{"messages":[],"userId":"zach"}'
    $testResponse = Invoke-RestMethod -Uri "https://kimbleai-v4-clean.vercel.app/api/chat" -Method Post -Body $body -ContentType "application/json"
    Write-Host "Response: $($testResponse.response)" -ForegroundColor Green
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}