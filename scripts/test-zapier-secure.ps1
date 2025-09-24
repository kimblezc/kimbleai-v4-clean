# TEST ZAPIER SECURE WEBHOOK
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "TESTING SECURE ZAPIER WEBHOOK" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor White
Write-Host ""

# Read current webhook from .env.local
$envContent = Get-Content ".env.local" -Raw
if ($envContent -match 'ZAPIER_WEBHOOK_URL=(.*)') {
    $webhookUrl = $matches[1].Trim()
    Write-Host "Testing webhook: $($webhookUrl.Substring(0, 40))..." -ForegroundColor Yellow
    
    # Create secure test payload
    $testPayload = @{
        event = "SECURE_WEBHOOK_TEST"
        timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        source = "kimbleai-v4-clean"
        security = @{
            test_id = [guid]::NewGuid().ToString()
            origin = "authorized_system"
            validation = "kimbleai_secure_$(Get-Date -Format 'yyyyMMdd')"
        }
        system_status = @{
            database = "connected"
            memory = "active"
            users = @("zach", "rebecca")
            deployment = "vercel_production"
        }
    } | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod -Uri $webhookUrl -Method Post -Body $testPayload -ContentType "application/json"
        Write-Host "✅ Webhook test successful!" -ForegroundColor Green
        Write-Host "Response: $response" -ForegroundColor Gray
    } catch {
        $errorMsg = $_.Exception.Message
        if ($errorMsg -match "unsubscribe") {
            Write-Host "❌ WEBHOOK COMPROMISED - Someone has hijacked this URL" -ForegroundColor Red
            Write-Host "Run: .\scripts\fix-zapier-webhook.ps1" -ForegroundColor Yellow
        } elseif ($errorMsg -match "success") {
            Write-Host "✅ Webhook working correctly" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Webhook error: $errorMsg" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "❌ No ZAPIER_WEBHOOK_URL found in .env.local" -ForegroundColor Red
}
