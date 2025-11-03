@echo off
REM ===================================================
REM   SETUP AUTO-START ON WINDOWS BOOT
REM ===================================================
echo.
echo ===== SETUP AUTO-START =====
echo.
echo This will make Kimbleai auto-start when Windows boots.
echo.
echo WARNING: This means the dev server will start automatically
echo when you turn on your computer.
echo.
set /p confirm="Do you want this? (yes/no): "

if /i not "%confirm%"=="yes" (
    echo.
    echo Cancelled.
    pause
    exit /b
)

echo.
echo Creating startup shortcut...

set STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup

powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%STARTUP%\Kimbleai Auto-Start.lnk'); $Shortcut.TargetPath = 'C:\Dev\Projects\kimbleai-v4-clean\auto-start.bat'; $Shortcut.WorkingDirectory = 'C:\Dev\Projects\kimbleai-v4-clean'; $Shortcut.Description = 'Auto-start Kimbleai development server'; $Shortcut.Save()"

echo.
echo ===== DONE! =====
echo.
echo Kimbleai will now auto-start when Windows boots.
echo.
echo To disable: Delete "Kimbleai Auto-Start" from your Startup folder
echo Location: %STARTUP%
echo.
pause
