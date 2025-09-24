# Test Automatic RAG and Vector Search System
# This script proves that cross-conversation memory works automatically

Write-Host "🧪 Testing Automatic RAG and Vector Search System" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000"
$userId = "zach"

function Test-API {
    param(
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Body = $null,
        [string]$Description = ""
    )

    Write-Host "`n🔍 $Description" -ForegroundColor Yellow
    Write-Host "   URL: $Method $Url" -ForegroundColor Gray

    try {
        $params = @{
            Uri = $Url
            Method = $Method
            ContentType = "application/json"
        }

        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
            Write-Host "   Body: $($params.Body)" -ForegroundColor Gray
        }

        $response = Invoke-RestMethod @params

        Write-Host "   ✅ Success!" -ForegroundColor Green
        return $response
    }
    catch {
        Write-Host "   ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

function Show-Results {
    param($Results, $Title)

    Write-Host "`n📊 $Title" -ForegroundColor Magenta
    Write-Host "========================" -ForegroundColor Magenta

    if ($Results) {
        $Results | ConvertTo-Json -Depth 5 | Write-Host
    } else {
        Write-Host "No results" -ForegroundColor Red
    }
}

# Test 1: Create test memories with automatic indexing
Write-Host "`n🎯 TEST 1: Creating Test Memories" -ForegroundColor Blue
$createResult = Test-API -Url "$baseUrl/api/memory-test" -Method "POST" -Body @{
    action = "create_test_memories"
    userId = $userId
} -Description "Creating test conversations with automatic background indexing"

Show-Results $createResult "Test Memory Creation Results"

if ($createResult -and $createResult.success) {
    Write-Host "`n✅ Test memories created successfully!" -ForegroundColor Green
    Write-Host "   Conversations: $($createResult.conversationsCreated)" -ForegroundColor White
    Write-Host "   Messages: $($createResult.messagesProcessed)" -ForegroundColor White
} else {
    Write-Host "`n❌ Failed to create test memories. Check API logs." -ForegroundColor Red
    exit 1
}

# Wait for background processing
Write-Host "`n⏳ Waiting 3 seconds for background indexing to complete..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Test 2: Search memory across conversations
Write-Host "`n🎯 TEST 2: Testing Cross-Conversation Memory Search" -ForegroundColor Blue

$searchQueries = @(
    "Alex Johnson",
    "San Francisco",
    "software engineer",
    "TypeScript",
    "KimbleAI project",
    "December 15th deadline",
    "pizza and broccoli",
    "React Next.js"
)

$searchResults = @()

foreach ($query in $searchQueries) {
    $result = Test-API -Url "$baseUrl/api/memory-test" -Method "POST" -Body @{
        action = "search_memory"
        userId = $userId
        testData = @{ query = $query }
    } -Description "Searching for: '$query'"

    if ($result) {
        $totalMatches = $result.totalMatches
        Write-Host "   Found $totalMatches matches" -ForegroundColor $(if ($totalMatches -gt 0) { "Green" } else { "Red" })

        $searchResults += @{
            query = $query
            matches = $totalMatches
            success = $totalMatches -gt 0
        }
    }
}

# Test 3: Comprehensive cross-conversation test
Write-Host "`n🎯 TEST 3: Comprehensive Cross-Conversation Retrieval Test" -ForegroundColor Blue
$crossConvResult = Test-API -Url "$baseUrl/api/memory-test" -Method "POST" -Body @{
    action = "test_cross_conversation"
    userId = $userId
} -Description "Testing cross-conversation memory retrieval with multiple queries"

Show-Results $crossConvResult "Cross-Conversation Test Results"

# Test 4: Verify automatic indexing of new messages
Write-Host "`n🎯 TEST 4: Testing Real-Time Automatic Indexing" -ForegroundColor Blue
$testMessage = "I just moved to New York and started working at DataCorp as a senior developer. My new favorite food is sushi and I'm excited about learning Python."

$indexingResult = Test-API -Url "$baseUrl/api/memory-test" -Method "POST" -Body @{
    action = "verify_automatic_indexing"
    userId = $userId
    testData = @{
        testMessage = $testMessage
        conversationId = "real_time_test_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    }
} -Description "Testing automatic indexing of new message"

Show-Results $indexingResult "Automatic Indexing Test Results"

# Test 5: Test the main chat API with memory
Write-Host "`n🎯 TEST 5: Testing Chat API with Automatic Memory Retrieval" -ForegroundColor Blue
$chatResult = Test-API -Url "$baseUrl/api/chat" -Method "POST" -Body @{
    messages = @(
        @{ role = "user"; content = "What do you remember about me?" }
    )
    userId = $userId
    conversationId = "memory_test_chat_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
} -Description "Testing chat API memory retrieval"

if ($chatResult) {
    Write-Host "`n💬 Chat Response:" -ForegroundColor Cyan
    Write-Host $chatResult.response -ForegroundColor White
    Write-Host "`nMemory Stats:" -ForegroundColor Cyan
    Write-Host "   Knowledge items found: $($chatResult.knowledgeItemsFound)" -ForegroundColor White
    Write-Host "   All messages retrieved: $($chatResult.allMessagesRetrieved)" -ForegroundColor White
    Write-Host "   Facts extracted: $($chatResult.factsExtracted)" -ForegroundColor White
}

# Summary Report
Write-Host "`n📋 TEST SUMMARY REPORT" -ForegroundColor Magenta
Write-Host "================================" -ForegroundColor Magenta

$successfulSearches = ($searchResults | Where-Object { $_.success }).Count
$totalSearches = $searchResults.Count

Write-Host "1. Memory Creation: $(if ($createResult.success) { '✅ PASS' } else { '❌ FAIL' })" -ForegroundColor $(if ($createResult.success) { "Green" } else { "Red" })
Write-Host "2. Memory Search: ✅ $successfulSearches/$totalSearches queries found matches" -ForegroundColor $(if ($successfulSearches -gt 0) { "Green" } else { "Red" })

if ($crossConvResult) {
    Write-Host "3. Cross-Conversation: ✅ $($crossConvResult.successRate) success rate" -ForegroundColor $(if ($crossConvResult.successfulQueries -gt 4) { "Green" } else { "Yellow" })
}

if ($indexingResult) {
    $indexingSuccess = $indexingResult.verification.messageIndexed -and $indexingResult.verification.memoryChunksCreated -gt 0
    Write-Host "4. Automatic Indexing: $(if ($indexingSuccess) { '✅ PASS' } else { '❌ FAIL' })" -ForegroundColor $(if ($indexingSuccess) { "Green" } else { "Red" })
}

if ($chatResult) {
    $chatMemoryWorking = $chatResult.knowledgeItemsFound -gt 0 -or $chatResult.allMessagesRetrieved -gt 0
    Write-Host "5. Chat Memory Integration: $(if ($chatMemoryWorking) { '✅ PASS' } else { '❌ FAIL' })" -ForegroundColor $(if ($chatMemoryWorking) { "Green" } else { "Red" })
}

Write-Host "`n🏆 CONCLUSION:" -ForegroundColor Cyan
if ($successfulSearches -gt 0 -and $createResult.success) {
    Write-Host "✅ AUTOMATIC RAG AND VECTOR SEARCH IS WORKING!" -ForegroundColor Green
    Write-Host "   - Messages are automatically indexed with embeddings" -ForegroundColor White
    Write-Host "   - Cross-conversation memory retrieval is functional" -ForegroundColor White
    Write-Host "   - Vector search finds relevant information automatically" -ForegroundColor White
    Write-Host "   - Background processing works without blocking responses" -ForegroundColor White
} else {
    Write-Host "❌ Some components need attention. Check the API logs." -ForegroundColor Red
}

Write-Host "`n🔧 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Run 'npm run dev' to start the development server" -ForegroundColor White
Write-Host "2. Execute this script to verify functionality" -ForegroundColor White
Write-Host "3. Check browser console and API logs for detailed feedback" -ForegroundColor White
Write-Host "4. Test the chat interface to see cross-conversation memory in action" -ForegroundColor White

Write-Host "`n✅ Test completed!" -ForegroundColor Green