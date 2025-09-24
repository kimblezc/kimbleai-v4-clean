@echo off
echo Testing KimbleAI API...
echo.

curl -X GET https://kimbleai-v4-clean.vercel.app/api/chat

echo.
echo.
echo Testing memory with POST...
curl -X POST https://kimbleai-v4-clean.vercel.app/api/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"messages\":[{\"role\":\"user\",\"content\":\"Test\"}],\"userId\":\"zach\"}"

echo.
pause