# CHECK WHICH SUPABASE PROJECT IS CONFIGURED
Write-Host "=================================================" -ForegroundColor Red
Write-Host "CHECKING SUPABASE PROJECT ID MISMATCH" -ForegroundColor Red
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Check local environment file
Write-Host "Checking .env.local file..." -ForegroundColor Yellow
$envContent = Get-Content ".env.local" | Where-Object { $_ -match "SUPABASE" }
foreach ($line in $envContent) {
    if ($line -match "NEXT_PUBLIC_SUPABASE_URL") {
        Write-Host $line -ForegroundColor White
        if ($line -match "gbmefnaqsxtloseufjqp") {
            Write-Host "  -> Using OLD project ID: gbmefnaqsxtloseufjqp" -ForegroundColor Red
        } elseif ($line -match "gbmefnaqsxtoseufjixp") {
            Write-Host "  -> Using CORRECT project ID: gbmefnaqsxtoseufjixp" -ForegroundColor Green
        }
    }
}

Write-Host ""
Write-Host "PROBLEM IDENTIFIED:" -ForegroundColor Red
Write-Host "Your SQL editor shows project: gbmefnaqsxtoseufjixp" -ForegroundColor Yellow
Write-Host "Your .env.local has project: gbmefnaqsxtloseufjqp" -ForegroundColor Yellow
Write-Host ""
Write-Host "These are DIFFERENT Supabase projects!" -ForegroundColor Red
Write-Host ""
Write-Host "SOLUTION:" -ForegroundColor Green
Write-Host "Update .env.local to use the correct project ID" -ForegroundColor White
Write-Host "Then update Vercel environment variables with the correct values" -ForegroundColor White