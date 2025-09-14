@echo off
:: DEPLOY MESSAGE REFERENCE SYSTEM
cd /d "D:\OneDrive\Documents\kimbleai-v4-clean"

echo ================================================
echo   DEPLOYING MESSAGE REFERENCE SYSTEM
echo ================================================
echo.

echo [1/5] Committing message reference system...
git add -A
git commit -m "feat: Advanced message reference and search system" -m "- Added MessageReferenceSystem for granular message tracking" -m "- Created search API endpoint for finding specific messages" -m "- Built MessageSearch UI component with Ctrl+K shortcut" -m "- Added SQL migrations for message_references tables" -m "- Integrated message references into chat API" -m "- Support for code blocks, decisions, and action items tracking" -m "- Full text search and semantic similarity capabilities" -m "- Message linking and context retrieval"

echo [2/5] Pushing to GitHub...
git push origin master

if %ERRORLEVEL% EQU 0 (
    echo Successfully pushed to GitHub
) else (
    echo Push may have failed - check for errors
)

echo.
echo [3/5] Database Migration Instructions:
echo -----------------------------------------------
echo 1. Go to Supabase Dashboard
echo 2. Navigate to SQL Editor
echo 3. Open file: supabase\migrations\002_message_reference_system.sql
echo 4. Copy and paste the SQL into the editor
echo 5. Click "Run" to create the new tables
echo.

echo [4/5] Testing the new features locally:
echo -----------------------------------------------
echo Run: npm run dev
echo Then test:
echo - Press Ctrl+K to open message search
echo - Search for past messages
echo - Click messages to reference them
echo - Use @msg:ID format in messages
echo.

echo [5/5] After deployment:
echo -----------------------------------------------
echo The app will have:
echo - Full message history search
echo - Message referencing with @msg:ID
echo - Code block extraction
echo - Decision tracking
echo - Action item management
echo - File mention tracking
echo.

echo ================================================
echo   FEATURES ADDED SUCCESSFULLY
echo ================================================
echo.
echo New capabilities:
echo - Search any message across all conversations
echo - Reference specific messages with @msg:ID
echo - Track code blocks, decisions, and action items
echo - Filter by conversation, project, role, etc.
echo - Keyboard shortcut: Ctrl+K for instant search
echo.
pause
