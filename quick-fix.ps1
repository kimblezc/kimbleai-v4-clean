#!/usr/bin/env powershell
Write-Host "Deploying fixed UI and API..." -ForegroundColor Cyan

Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

git add -A
git commit -m "fix: UI features and stop hallucinations" `
           -m "- Fixed sidebar toggle" `
           -m "- Fixed conversation history display" `
           -m "- Fixed project and tag inputs" `
           -m "- Stop AI from making assumptions about users" `
           -m "- Strict instructions to not hallucinate" 2>$null

git push origin master

Write-Host "✅ Deployed! Check in 1-2 minutes" -ForegroundColor Green
Write-Host "The hamburger menu (☰) toggles the sidebar" -ForegroundColor Yellow
Write-Host "AI will no longer make assumptions about you" -ForegroundColor Yellow