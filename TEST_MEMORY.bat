@echo off
REM Test cross-conversation memory locally
echo ================================================
echo TESTING CROSS-CONVERSATION MEMORY
echo ================================================
echo.

echo [1/3] Storing information in conversation 1...
curl -X POST https://kimbleai-v4-clean.vercel.app/api/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"messages\":[{\"role\":\"user\",\"content\":\"My favorite color is purple and I have a goldfish named Bubbles\"}],\"userId\":\"zach\",\"conversationId\":\"test_conv_1\"}"
echo.
echo.

timeout /t 3 /nobreak >nul

echo [2/3] Asking about it in conversation 2...
curl -X POST https://kimbleai-v4-clean.vercel.app/api/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"messages\":[{\"role\":\"user\",\"content\":\"What is my favorite color and what pet do I have?\"}],\"userId\":\"zach\",\"conversationId\":\"test_conv_2\"}"
echo.
echo.

echo [3/3] Creating test text file for upload...
echo This is a test document. > test_document.txt
echo It contains important information about Project Gamma. >> test_document.txt
echo The budget for Project Gamma is $100,000. >> test_document.txt
echo The deadline is February 28, 2025. >> test_document.txt
echo.

echo ================================================
echo TEST COMPLETE
echo ================================================
echo.
echo Check if the AI remembered:
echo 1. Your favorite color (purple)
echo 2. Your goldfish (Bubbles)
echo.
echo For file upload test:
echo Upload test_document.txt through the UI
echo Then ask "What is the Project Gamma budget?"
echo.
pause