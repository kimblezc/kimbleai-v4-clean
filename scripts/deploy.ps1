# KIMBLEAI DEPLOYMENT
Write-Host "Deploying KimbleAI..." -ForegroundColor Cyan

# Build
Write-Host "Building..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Build successful!" -ForegroundColor Green

# Deploy to Vercel
Write-Host "Deploying to Vercel..." -ForegroundColor Yellow
npx vercel --prod --yes

# Git operations
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
git add -A
git commit -m "Cleanup and fix: Vector/RAG system with Supabase"
git push origin main

Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host "URL: https://kimbleai-v4-clean-4oizii6tg-kimblezcs-projects.vercel.app" -ForegroundColor Cyan
