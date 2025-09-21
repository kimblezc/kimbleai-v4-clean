# TEST KNOWLEDGE BASE SETUP
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "TESTING KNOWLEDGE BASE INSTALLATION" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor White
Write-Host ""

$supabaseUrl = "https://gbmefnaqsxtoseufjixp.supabase.co"
$supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdibWVmbmFxc3h0b3NldWZqaXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTY5MzQsImV4cCI6MjA3MDQ3MjkzNH0.qMCQWvV0MTfwWJPxBrtm01hLvhk2aDKaC1djP6i6I00"

# Test 1: Check if tables exist
Write-Host "Checking if knowledge_base table exists..." -ForegroundColor Yellow
$checkUrl = "$supabaseUrl/rest/v1/knowledge_base?select=count&limit=1"
$headers = @{
    "apikey" = $supabaseKey
    "Authorization" = "Bearer $supabaseKey"
}

try {
    $response = Invoke-RestMethod -Uri $checkUrl -Headers $headers -Method Get
    Write-Host "✅ Knowledge base table exists!" -ForegroundColor Green
} catch {
    Write-Host "❌ Knowledge base table not found. Run the SQL in Supabase!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Yellow
    exit
}

# Test 2: Check for test data
Write-Host "Checking for test entry..." -ForegroundColor Yellow
$testUrl = "$supabaseUrl/rest/v1/knowledge_base?title=eq.System%20Test%20Entry&select=*"
try {
    $testData = Invoke-RestMethod -Uri $testUrl -Headers $headers -Method Get
    if ($testData.Count -gt 0) {
        Write-Host "✅ Test entry found! System is ready." -ForegroundColor Green
    } else {
        Write-Host "⚠️ No test entry found, but table exists" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Could not query test data" -ForegroundColor Yellow
}

# Test 3: Test adding knowledge
Write-Host ""
Write-Host "Testing knowledge insertion..." -ForegroundColor Yellow

# Get user ID for Zach
$userUrl = "$supabaseUrl/rest/v1/users?name=eq.Zach&select=id"
$userData = Invoke-RestMethod -Uri $userUrl -Headers $headers -Method Get

if ($userData.Count -gt 0) {
    $userId = $userData[0].id
    
    # Create test knowledge entry
    $testKnowledge = @{
        user_id = $userId
        source_type = "manual"
        category = "preference"
        title = "Coffee Preference"
        content = "User prefers dark roast coffee, especially Colombian beans"
        importance = 0.8
        tags = @("preference", "coffee", "beverage")
        metadata = @{
            added_by = "system_test"
            timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
    } | ConvertTo-Json -Depth 10
    
    $insertUrl = "$supabaseUrl/rest/v1/knowledge_base"
    $insertHeaders = $headers + @{"Content-Type" = "application/json"; "Prefer" = "return=representation"}
    
    try {
        $inserted = Invoke-RestMethod -Uri $insertUrl -Headers $insertHeaders -Method Post -Body $testKnowledge
        Write-Host "✅ Successfully added test knowledge!" -ForegroundColor Green
        Write-Host "   Category: preference" -ForegroundColor Gray
        Write-Host "   Content: Coffee preference stored" -ForegroundColor Gray
    } catch {
        Write-Host "⚠️ Could not insert test knowledge" -ForegroundColor Yellow
        Write-Host "Error: $_" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️ User 'Zach' not found. Create users first." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "KNOWLEDGE BASE TEST COMPLETE" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Deploy the enhanced chat API" -ForegroundColor White
Write-Host "2. Upload files for indexing" -ForegroundColor White
Write-Host "3. Test comprehensive memory retrieval" -ForegroundColor White