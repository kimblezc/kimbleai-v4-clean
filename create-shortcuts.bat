@echo off
REM ===================================================
REM   CREATE DESKTOP SHORTCUTS
REM ===================================================
echo.
echo Creating desktop shortcuts...
echo.

REM Get desktop path (works with OneDrive redirection)
for /f "delims=" %%i in ('powershell -Command "[Environment]::GetFolderPath('Desktop')"') do set DESKTOP=%%i

REM Create shortcut for work-start.bat
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%DESKTOP%\Start Kimbleai.lnk'); $Shortcut.TargetPath = 'C:\Dev\Projects\kimbleai-v4-clean\work-start.bat'; $Shortcut.WorkingDirectory = 'C:\Dev\Projects\kimbleai-v4-clean'; $Shortcut.Description = 'Start working on Kimbleai'; $Shortcut.Save()"

REM Create shortcut for work-done.bat
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%DESKTOP%\Save Kimbleai.lnk'); $Shortcut.TargetPath = 'C:\Dev\Projects\kimbleai-v4-clean\work-done.bat'; $Shortcut.WorkingDirectory = 'C:\Dev\Projects\kimbleai-v4-clean'; $Shortcut.Description = 'Save work and push to GitHub'; $Shortcut.Save()"

REM Create shortcut for quick-save.bat
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%DESKTOP%\Quick Save Kimbleai.lnk'); $Shortcut.TargetPath = 'C:\Dev\Projects\kimbleai-v4-clean\quick-save.bat'; $Shortcut.WorkingDirectory = 'C:\Dev\Projects\kimbleai-v4-clean'; $Shortcut.Description = 'Quick save to GitHub'; $Shortcut.Save()"

echo.
echo ===== SHORTCUTS CREATED! =====
echo.
echo Check your desktop for:
echo - Start Kimbleai
echo - Save Kimbleai
echo - Quick Save Kimbleai
echo.
echo You can now pin these to your taskbar!
echo.
pause
