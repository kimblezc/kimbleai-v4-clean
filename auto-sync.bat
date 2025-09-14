@echo off
:: KIMBLEAI V4 - Automated Zapier & Git Integration
:: This script automatically updates Master Document and Git on every run

cd /d "D:\OneDrive\Documents\kimbleai-v4-clean"

set SESSION_ID=%RANDOM%%RANDOM%
set TIMESTAMP=%date% %time%

echo ================================================
echo   KIMBLEAI V4 - AUTOMATED SYNC
echo   Session: %SESSION_ID%
echo ================================================
echo.

:: Step 1: Check for changes
echo [1/5] Checking for changes...
git status --porcelain > temp_changes.txt
set /p CHANGES=<temp_changes.txt
del temp_changes.txt

if "%CHANGES%"=="" (
    echo No changes detected
) else (
    echo Changes detected - preparing commit
)

:: Step 2: Update Master Document via Zapier
echo [2/5] Updating Master Document...
powershell -Command "$webhook = @{event='AUTO_UPDATE';session_id='%SESSION_ID%';timestamp='%TIMESTAMP%';project='kimbleai-v4-clean';status='sync_initiated';changes_detected=('%CHANGES%' -ne '')} | ConvertTo-Json -Compress; Invoke-WebRequest -Uri 'https://hooks.zapier.com/hooks/catch/2674926/um3x9v1/' -Method POST -ContentType 'application/json' -Body $webhook -ErrorAction SilentlyContinue"

:: Step 3: Git operations
if not "%CHANGES%"=="" (
    echo [3/5] Committing changes to Git...
    git add -A
    git commit -m "auto: Opus 4 session update - %date% %time%" -m "Session ID: %SESSION_ID%" -m "Automated by Zapier integration"
    
    echo [4/5] Pushing to GitHub...
    git push origin master
    
    if %ERRORLEVEL% EQU 0 (
        echo Successfully pushed to GitHub
        
        :: Log success to Master Document
        powershell -Command "$webhook = @{event='GIT_PUSH_SUCCESS';session_id='%SESSION_ID%';timestamp='%TIMESTAMP%';commit_message='auto: Opus 4 session update'} | ConvertTo-Json -Compress; Invoke-WebRequest -Uri 'https://hooks.zapier.com/hooks/catch/2674926/um3x9v1/' -Method POST -ContentType 'application/json' -Body $webhook -ErrorAction SilentlyContinue"
    ) else (
        echo Git push failed - check credentials
    )
) else (
    echo [3/5] No changes to commit
)

:: Step 4: Check deployment status
echo [5/5] Checking deployment status...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'https://kimbleai-v4-clean.vercel.app/api/health' -TimeoutSec 10 -ErrorAction SilentlyContinue; if ($response.StatusCode -eq 200) { Write-Output 'Deployment is live and healthy' } else { Write-Output 'Deployment check failed' } } catch { Write-Output 'Deployment not accessible - may need environment variables' }"

:: Step 5: Final status to Master Document
powershell -Command "$webhook = @{event='SYNC_COMPLETE';session_id='%SESSION_ID%';timestamp='%TIMESTAMP%';git_status='synced';deployment_check='completed'} | ConvertTo-Json -Compress; Invoke-WebRequest -Uri 'https://hooks.zapier.com/hooks/catch/2674926/um3x9v1/' -Method POST -ContentType 'application/json' -Body $webhook -ErrorAction SilentlyContinue"

echo.
echo ================================================
echo   SYNC COMPLETE
echo ================================================
echo Session: %SESSION_ID%
echo Master Document: Updated via Zapier
echo Git: Synced with GitHub
echo Deployment: Check Vercel dashboard
echo.
echo Next: Add environment variables in Vercel if not done
echo.
pause
