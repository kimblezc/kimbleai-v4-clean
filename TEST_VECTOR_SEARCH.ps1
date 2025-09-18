# KIMBLEAI VECTOR SEARCH TEST SUITE
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "KIMBLEAI VECTOR SEARCH TEST SUITE" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "https://kimbleai-v4-clean-4oizii6tg-kimblezcs-projects.vercel.app"
$timestamp = Get-Date -Format "yyyyMMddHHmmss"

# Test 1: API Status Check
Write-Host "[TEST 1] Checking API and Vector Search Status..." -ForegroundColor Yellow
$status = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Get
Write-Host "  API Status: $($status.status)" -ForegroundColor Green
Write-Host "  OpenAI: $($status.apiKeyConfigured)" -ForegroundColor $(if($status.apiKeyConfigured){"Green"}else{"Red"})
Write-Host "  Supabase: $($status.supabaseConfigured)" -ForegroundColor $(if($status.supabaseConfigured){"Green"}else{"Red"})
Write-Host "  Vector Search: $($status.vectorSearchEnabled)" -ForegroundColor $(if($status.vectorSearchEnabled){"Green"}else{"Red"})
Write-Host ""

# Test 2: Save Multiple Facts (Zach)
Write-Host "[TEST 2] Saving multiple facts for Zach..." -ForegroundColor Yellow
$facts1 = @{
    messages = @(
        @{
            role = "user"
            content = "Hi, I'm Zach. My dog's name is Rennie. My favorite color is blue. I work as a software engineer. I live in Seattle."
        }
    )
    userId = "zach"
    conversationId = "test_facts_$timestamp"
    project = "personal"
    tags = @("test", "facts")
} | ConvertTo-Json -Depth 10

$response1 = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $facts1 -ContentType "application/json"
Write-Host "  Response saved: $($response1.saved)" -ForegroundColor $(if($response1.saved){"Green"}else{"Red"})
Write-Host "  Memories extracted: $($response1.memoriesExtracted)" -ForegroundColor Cyan
Write-Host ""

Start-Sleep -Seconds 2

# Test 3: Vector Search Retrieval (New Conversation)
Write-Host "[TEST 3] Testing vector search in new conversation..." -ForegroundColor Yellow
$search1 = @{
    messages = @(
        @{
            role = "user"
            content = "What do you know about my pet and where I work?"
        }
    )
    userId = "zach"
    conversationId = "test_search_$timestamp"
    project = "general"
} | ConvertTo-Json -Depth 10

$response2 = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $search1 -ContentType "application/json"
Write-Host "  Vector search used: $($response2.vectorSearchUsed)" -ForegroundColor $(if($response2.vectorSearchUsed){"Green"}else{"Red"})
Write-Host "  Contexts found: $($response2.contextsFound)" -ForegroundColor Cyan
Write-Host "  Response includes 'Rennie': $(if($response2.response -match 'Rennie'){'YES'}else{'NO'})" -ForegroundColor $(if($response2.response -match 'Rennie'){"Green"}else{"Red"})
Write-Host "  Response includes 'software': $(if($response2.response -match 'software'){'YES'}else{'NO'})" -ForegroundColor $(if($response2.response -match 'software'){"Green"}else{"Red"})
Write-Host ""

# Test 4: Cross-User Isolation (Rebecca)
Write-Host "[TEST 4] Testing user isolation with Rebecca..." -ForegroundColor Yellow
$rebecca1 = @{
    messages = @(
        @{
            role = "user"
            content = "Hi, I'm Rebecca. My favorite food is sushi. I have a cat named Whiskers."
        }
    )
    userId = "rebecca"
    conversationId = "test_rebecca_$timestamp"
    project = "personal"
} | ConvertTo-Json -Depth 10

$response3 = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $rebecca1 -ContentType "application/json"
Write-Host "  Rebecca's data saved: $($response3.saved)" -ForegroundColor $(if($response3.saved){"Green"}else{"Red"})

Start-Sleep -Seconds 2

# Test if Rebecca sees Zach's data
$rebecca2 = @{
    messages = @(
        @{
            role = "user"
            content = "What's my pet's name?"
        }
    )
    userId = "rebecca"
    conversationId = "test_rebecca2_$timestamp"
} | ConvertTo-Json -Depth 10

$response4 = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $rebecca2 -ContentType "application/json"
Write-Host "  Rebecca sees 'Whiskers': $(if($response4.response -match 'Whiskers'){'YES'}else{'NO'})" -ForegroundColor $(if($response4.response -match 'Whiskers'){"Green"}else{"Red"})
Write-Host "  Rebecca sees 'Rennie': $(if($response4.response -match 'Rennie'){'NO (Good!)'}else{'YES (Bad!)'})" -ForegroundColor $(if($response4.response -notmatch 'Rennie'){"Green"}else{"Red"})
Write-Host ""

# Test 5: Project Context
Write-Host "[TEST 5] Testing project-based context..." -ForegroundColor Yellow
$project1 = @{
    messages = @(
        @{
            role = "user"
            content = "For the birthday party project: We need a chocolate cake, 20 balloons, and the party is on Saturday at 3pm."
        }
    )
    userId = "zach"
    conversationId = "test_project_$timestamp"
    project = "birthday_party"
    tags = @("event", "planning")
} | ConvertTo-Json -Depth 10

$response5 = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $project1 -ContentType "application/json"
Write-Host "  Project data saved: $($response5.saved)" -ForegroundColor $(if($response5.saved){"Green"}else{"Red"})

Start-Sleep -Seconds 2

$project2 = @{
    messages = @(
        @{
            role = "user"
            content = "What time is the party and what kind of cake?"
        }
    )
    userId = "zach"
    conversationId = "test_project2_$timestamp"
    project = "birthday_party"
} | ConvertTo-Json -Depth 10

$response6 = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $project2 -ContentType "application/json"
Write-Host "  Found party details: $(if($response6.response -match '3pm' -and $response6.response -match 'chocolate'){'YES'}else{'NO'})" -ForegroundColor $(if($response6.response -match '3pm' -and $response6.response -match 'chocolate'){"Green"}else{"Red"})
Write-Host ""

# Summary
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

$vectorWorking = $status.vectorSearchEnabled -and $response2.vectorSearchUsed
$memoryWorking = $response2.contextsFound -gt 0
$isolationWorking = $response4.response -notmatch 'Rennie'
$projectWorking = $response6.response -match '3pm' -and $response6.response -match 'chocolate'

Write-Host ""
Write-Host "Feature Status:" -ForegroundColor White
Write-Host "  [$(if($status.apiKeyConfigured){'âœ“'}else{'âœ—'})] OpenAI Integration" -ForegroundColor $(if($status.apiKeyConfigured){"Green"}else{"Red"})
Write-Host "  [$(if($status.supabaseConfigured){'âœ“'}else{'âœ—'})] Database Connection" -ForegroundColor $(if($status.supabaseConfigured){"Green"}else{"Red"})
Write-Host "  [$(if($vectorWorking){'âœ“'}else{'âœ—'})] Vector Search" -ForegroundColor $(if($vectorWorking){"Green"}else{"Red"})
Write-Host "  [$(if($memoryWorking){'âœ“'}else{'âœ—'})] Memory Retrieval" -ForegroundColor $(if($memoryWorking){"Green"}else{"Red"})
Write-Host "  [$(if($isolationWorking){'âœ“'}else{'âœ—'})] User Isolation" -ForegroundColor $(if($isolationWorking){"Green"}else{"Red"})
Write-Host "  [$(if($projectWorking){'âœ“'}else{'âœ—'})] Project Context" -ForegroundColor $(if($projectWorking){"Green"}else{"Red"})

Write-Host ""
if ($vectorWorking -and $memoryWorking -and $isolationWorking) {
    Write-Host "SUCCESS: Full vector search memory system is operational!" -ForegroundColor Green
    Write-Host "The system remembers everything across all conversations with semantic search." -ForegroundColor Green
} elseif ($memoryWorking) {
    Write-Host "PARTIAL SUCCESS: Memory is working but vector search needs configuration" -ForegroundColor Yellow
    Write-Host "Run the database schema in Supabase SQL Editor" -ForegroundColor Yellow
} else {
    Write-Host "NEEDS SETUP: Please run vector_search_schema.sql in Supabase" -ForegroundColor Yellow
}
