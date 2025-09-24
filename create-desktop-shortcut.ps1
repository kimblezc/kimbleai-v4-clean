# Create Desktop Shortcut for KimbleAI v4 Clean Admin Launcher
# Run this once to create a desktop shortcut

$WScriptShell = New-Object -ComObject WScript.Shell
$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktopPath "KimbleAI v4 Clean.lnk"

# Create the shortcut
$shortcut = $WScriptShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "C:\Users\zachk\OneDrive\Documents\kimbleai-v4-clean\LAUNCH_KIMBLEAI_ADMIN.bat"
$shortcut.WorkingDirectory = "C:\Users\zachk\OneDrive\Documents\kimbleai-v4-clean"
$shortcut.IconLocation = "C:\Windows\System32\cmd.exe,0"
$shortcut.Description = "Launch KimbleAI v4 Clean Development Environment with Admin"
$shortcut.WindowStyle = 1

# Set to run as administrator
$bytes = [System.IO.File]::ReadAllBytes($shortcutPath)
$bytes[0x15] = $bytes[0x15] -bor 0x20
[System.IO.File]::WriteAllBytes($shortcutPath, $bytes)

$shortcut.Save()

Write-Host "=================================" -ForegroundColor Green
Write-Host " Desktop Shortcut Created!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""
Write-Host "Shortcut created at: $shortcutPath" -ForegroundColor Cyan
Write-Host "Double-click 'KimbleAI v4 Clean' on your desktop to launch" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
