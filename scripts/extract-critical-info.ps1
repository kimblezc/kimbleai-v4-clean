# EXTRACT CRITICAL INFO FROM LARGE MASTER DOC
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "CRITICAL INFORMATION EXTRACTOR" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor White
Write-Host ""

Write-Host "Since your Master Doc is too large, here's what to extract:" -ForegroundColor Yellow
Write-Host ""

Write-Host "MUST PRESERVE IN SUMMARY DOCUMENT:" -ForegroundColor Red
Write-Host "====================================" -ForegroundColor Red

Write-Host ""
Write-Host "1. API KEYS & CREDENTIALS" -ForegroundColor Cyan
Write-Host "   - OpenAI API key reference" -ForegroundColor White
Write-Host "   - Supabase URLs and keys" -ForegroundColor White
Write-Host "   - Zapier webhook URLs" -ForegroundColor White
Write-Host "   - GitHub repository links" -ForegroundColor White
Write-Host ""

Write-Host "2. KEY DECISIONS & FACTS" -ForegroundColor Cyan
Write-Host "   - User information (Zach, Rebecca)" -ForegroundColor White
Write-Host "   - Important dates and appointments" -ForegroundColor White
Write-Host "   - Project decisions made" -ForegroundColor White
Write-Host "   - Cost optimizations ($56 → $25)" -ForegroundColor White
Write-Host ""

Write-Host "3. TECHNICAL MILESTONES" -ForegroundColor Cyan
Write-Host "   - TypeScript fixes applied" -ForegroundColor White
Write-Host "   - Database schema changes" -ForegroundColor White
Write-Host "   - Deployment successes/failures" -ForegroundColor White
Write-Host "   - Integration completions" -ForegroundColor White
Write-Host ""

Write-Host "4. CONTINUITY MARKERS" -ForegroundColor Cyan
Write-Host "   - Last session IDs" -ForegroundColor White
Write-Host "   - Current deployment status" -ForegroundColor White
Write-Host "   - Pending tasks" -ForegroundColor White
Write-Host "   - Known issues" -ForegroundColor White
Write-Host ""

# Create a local summary file
@"
# KIMBLEAI V4 - CRITICAL SUMMARY
Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## PROJECT STATUS
- **Live URL**: https://kimbleai-v4-clean.vercel.app
- **Status**: ✅ OPERATIONAL
- **Memory**: ✅ WORKING
- **Users**: ✅ Zach & Rebecca isolated
- **Cost**: $25/month (reduced from $56)

## KEY FACTS PRESERVED
- Dog: Rennie
- Location: Seattle  
- Primary User: Zach
- Secondary User: Rebecca
- Emails: zach.kimble@gmail.com, becky.aza.kimble@gmail.com

## TECHNICAL STATE
- Framework: Next.js 14 + TypeScript
- Database: Supabase (gbmefnaqsxtoseufjixp)
- AI: OpenAI GPT-4
- Deployment: Vercel
- Automation: Zapier Pro (750 tasks/month)

## CRITICAL URLS
- GitHub: https://github.com/kimblezc/kimbleai-v4-clean
- Supabase: https://supabase.com/dashboard/project/gbmefnaqsxtoseufjixp
- Vercel: https://vercel.com/kimblezcs-projects/kimbleai-v4-clean
- Zapier Webhook: https://hooks.zapier.com/hooks/catch/2674926/um3x9v1/

## ENVIRONMENT VARIABLES (Configured in Vercel)
- OPENAI_API_KEY: ✅ Set
- SUPABASE keys: ✅ Set
- ZAPIER_WEBHOOK_URL: ✅ Set

## RECENT CRITICAL EVENTS
- 2025-09-21: System fully operational
- 2025-09-21: Memory persistence confirmed working
- 2025-09-21: Zapier webhook tested successfully
- 2025-09-21: Master Document size issue identified

## KNOWN ISSUES
1. Master Document too large to read
2. Needs document rotation system
3. Should implement summary extraction

## NEXT ACTIONS
1. Create new Google Docs structure
2. Implement monthly rotation
3. Extract critical info to summary
4. Update Zapier to use new documents

## CONTINUITY CODE
For new sessions: "Continue KimbleAI V4 from rotating document structure"
Session marker: KIMBLEAI-V4-ROTATE-$(Get-Date -Format "yyyyMMdd")
"@ | Out-File -Path "CRITICAL_SUMMARY.md" -Encoding UTF8

Write-Host "✅ Local summary created: CRITICAL_SUMMARY.md" -ForegroundColor Green
Write-Host ""

Write-Host "GOOGLE DOCS STRUCTURE TO CREATE:" -ForegroundColor Yellow
Write-Host "=================================" -ForegroundColor Yellow
Write-Host ""

# Create structure visualization
@"
Google Drive
└── KimbleAI Folder/
    ├── 📄 KimbleAI Master Index (1 page)
    │   └── Links to all documents
    ├── 📝 KimbleAI Active Log 2025-09 (Current)
    │   └── This month's conversations
    ├── 💾 KimbleAI Summary (5-10 pages max)
    │   └── Critical decisions only
    ├── 📊 KimbleAI Quick Reference (1 page)
    │   └── User data, preferences, key facts
    └── 📚 Archives/
        ├── KimbleAI Archive 2025-08
        ├── KimbleAI Archive 2025-07
        └── [Older archives...]
"@ | Out-File -Path "GOOGLE_DOCS_STRUCTURE.txt" -Encoding UTF8

Write-Host "Document structure saved to GOOGLE_DOCS_STRUCTURE.txt" -ForegroundColor Green
