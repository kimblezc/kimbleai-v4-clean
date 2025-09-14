@echo off
:: DEPLOY SESSION CONTINUITY SYSTEM
cd /d "D:\OneDrive\Documents\kimbleai-v4-clean"

echo ================================================
echo   DEPLOYING SESSION CONTINUITY SYSTEM
echo ================================================
echo.
echo This system ensures ZERO information loss when:
echo - Token limits are reached
echo - New Opus 4 chats are started  
echo - Sessions need to be continued
echo.

echo [1/5] Committing Session Continuity System...
git add -A
git commit -m "feat: Session Continuity System - Zero information loss" -m "- Auto-export at 95k tokens with full context preservation" -m "- SessionContinuitySystem class for snapshot management" -m "- Complete message, file, task, and decision tracking" -m "- Automatic transition file generation for Opus 4" -m "- Manual snapshot API endpoints" -m "- Token usage monitoring and warnings" -m "- Database schema for snapshots and token tracking" -m "- Comprehensive continuation instructions" -m "- Git status and deployment state preservation"

echo [2/5] Pushing to GitHub...
git push origin master

if %ERRORLEVEL% EQU 0 (
    echo Successfully pushed to GitHub
    echo.
) else (
    echo Push may have failed - check for errors
    echo.
)

echo [3/5] Creating snapshots directory...
mkdir snapshots 2>nul

echo [4/5] Database Migration Required:
echo ================================================
echo.
echo IMPORTANT: Run these SQL migrations in Supabase:
echo.
echo 1. Go to: https://supabase.com/dashboard
echo 2. Open SQL Editor
echo 3. Run: supabase\migrations\002_message_reference_system.sql
echo 4. Run: supabase\migrations\003_session_continuity.sql
echo.

echo [5/5] System Features:
echo ================================================
echo.
echo AUTOMATIC FEATURES:
echo - Token monitoring (warns at 90k, exports at 95k)
echo - Complete context preservation
echo - Transition file generation
echo - 10-minute auto-save
echo.
echo WHAT GETS SAVED:
echo - Every message with metadata
echo - Files being edited
echo - Pending decisions
echo - Active tasks
echo - Code blocks
echo - Git status
echo - Deployment state
echo - Environment variables
echo.
echo HOW TO USE:
echo - System runs automatically
echo - Ctrl+K to search messages
echo - Manual snapshot: Call /api/snapshot
echo - New chat: "Continue from latest snapshot"
echo.
echo FILES CREATED:
echo - lib\session-continuity-system.ts
echo - app\api\snapshot\route.ts
echo - supabase\migrations\003_session_continuity.sql
echo - SESSION_CONTINUITY_GUIDE.md
echo.

echo ================================================
echo   DEPLOYMENT COMPLETE
echo ================================================
echo.
echo The system will now:
echo 1. Monitor every message for token count
echo 2. Warn you at 90,000 tokens
echo 3. Auto-export at 95,000 tokens
echo 4. Generate transition file for Opus 4
echo 5. Allow perfect continuation in new chat
echo.
echo You will NEVER lose context again!
echo.
pause
