# REMOVE ALL FILES WITH EXPOSED SECRETS
Write-Host "=================================================" -ForegroundColor Red
Write-Host "REMOVING FILES WITH EXPOSED SECRETS" -ForegroundColor Red
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location "D:\OneDrive\Documents\kimbleai-v4-clean"

# Delete files containing secrets
Write-Host "Removing files with exposed keys..." -ForegroundColor Yellow
Remove-Item -Path "COMPLETE_ENV.txt" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "redact-secret-temp.ps1" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "scripts\set-openai-secret.ps1" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "repo-replacements.txt" -Force -ErrorAction SilentlyContinue

# Add to gitignore
Write-Host "Updating .gitignore..." -ForegroundColor Yellow
@'
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
.nyc_output

# Next.js
.next/
out/
build/
dist/

# Production
*.production

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# Environment variables
.env
.env.local
.env.production.local
.env.development.local
.env.test.local
*.env

# IDE
.vscode/
.idea/
*.swp
*.swo
.DS_Store

# Vercel
.vercel/

# TypeScript
*.tsbuildinfo
next-env.d.ts

# SECURITY - NEVER COMMIT THESE
*SECRET*
*secret*
*KEY*
*key*
*TOKEN*
*token*
COMPLETE_ENV.txt
redact-*.ps1
*-temp.ps1
repo-replacements.txt
test-*.js
test-openai.js

# Backups
backup_*/
*.backup
*.old
'@ | Out-File -FilePath ".gitignore" -Encoding UTF8

Write-Host "Files removed and .gitignore updated" -ForegroundColor Green
Write-Host ""

# Now create clean commit
Write-Host "Creating clean commit..." -ForegroundColor Yellow
git add .gitignore
git rm -r --cached .
git add .
git status --porcelain

Write-Host ""
Write-Host "Ready for clean commit. Run:" -ForegroundColor Cyan
Write-Host "  .\scripts\final-clean-push.ps1" -ForegroundColor White
