@echo off
REM Quick Fix Script - Fixes cross-conversation memory issue
REM Run this to make memory work across all conversations

echo ================================================
echo FIXING CROSS-CONVERSATION MEMORY
echo ================================================
echo.

REM Create backup of current route.ts
echo [1/4] Creating backup...
copy app\api\chat\route.ts app\api\chat\route.ts.backup
echo Backup created: route.ts.backup
echo.

REM The issue is on line ~95-100 where it filters by conversation_id
REM We need to remove that filter to get all user messages

echo [2/4] Applying fix to route.ts...
echo.
echo The fix needed:
echo - Remove: .eq('conversation_id', conversationId)
echo - This will allow searching across ALL conversations
echo.
echo Please manually edit app\api\chat\route.ts
echo Find the section around line 95-100:
echo.
echo   const { data: recentMessages } = await supabase
echo     .from('messages')
echo     .select('content, role')
echo     .eq('user_id', userData.id)
echo     .eq('conversation_id', conversationId) // DELETE THIS LINE
echo     .order('created_at', { ascending: false })
echo.
echo DELETE the line with eq('conversation_id', conversationId)
echo.
pause

echo [3/4] Installing PDF parser...
call npm install pdf-parse
echo.

echo [4/4] Ready to deploy...
echo.
echo After editing the file, run:
echo   .\deploy.bat
echo.
echo Then test with:
echo   .\TEST_COMPLETE_SYSTEM.bat
echo.
pause