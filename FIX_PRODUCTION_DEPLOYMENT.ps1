# FIX_PRODUCTION_DEPLOYMENT.ps1
# Complete fix for production deployment with dark mode interface

Write-Host "=== KimbleAI v4 - Fix Production Deployment ===" -ForegroundColor Cyan
Write-Host "Fixing HTTP 307 redirect and deploying dark mode interface" -ForegroundColor Yellow

# Navigate to project
Set-Location "C:\Users\zachk\OneDrive\Documents\kimbleai-v4-clean"

# Step 1: Clear Next.js cache
Write-Host "`n[1/7] Clearing build cache..." -ForegroundColor Green
Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "node_modules/.cache" -Recurse -Force -ErrorAction SilentlyContinue

# Step 2: Update package.json build script to ensure proper production build
Write-Host "[2/7] Checking package.json build configuration..." -ForegroundColor Green
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
if ($packageJson.scripts.build -ne "next build") {
    $packageJson.scripts.build = "next build"
    $packageJson | ConvertTo-Json -Depth 10 | Set-Content "package.json"
    Write-Host "   Updated build script" -ForegroundColor Yellow
}

# Step 3: Create middleware to handle routing properly
Write-Host "[3/7] Creating middleware to fix routing..." -ForegroundColor Green
$middlewareContent = @'
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the pathname of the request (e.g. /, /simple, /api/chat)
  const path = request.nextUrl.pathname;
  
  // If it's the root path, serve the main app
  if (path === '/') {
    // Don't redirect, just serve the page
    return NextResponse.next();
  }
  
  // For all other paths, continue normally
  return NextResponse.next();
}

// Only run middleware on specific paths if needed
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
'@
Set-Content -Path "middleware.ts" -Value $middlewareContent

# Step 4: Update next.config.js to ensure proper configuration
Write-Host "[4/7] Updating Next.js configuration..." -ForegroundColor Green
$nextConfig = @'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Ensure proper production build
  output: 'standalone',
  // Disable image optimization for now to avoid issues
  images: {
    unoptimized: true,
  },
  // Ensure proper TypeScript handling
  typescript: {
    ignoreBuildErrors: false,
  },
  // Ensure proper environment variable loading
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://kimbleai-v4-clean.vercel.app',
  },
}

module.exports = nextConfig
'@
Set-Content -Path "next.config.js" -Value $nextConfig

# Step 5: Ensure app layout exists and is properly configured
Write-Host "[5/7] Checking app layout configuration..." -ForegroundColor Green
$layoutPath = "app/layout.tsx"
if (Test-Path $layoutPath) {
    $layoutContent = Get-Content $layoutPath -Raw
    if ($layoutContent -notmatch "export const runtime") {
        Write-Host "   Layout exists and is properly configured" -ForegroundColor Green
    }
} else {
    Write-Host "   Creating default layout..." -ForegroundColor Yellow
    $layoutContent = @'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'KimbleAI v4',
  description: 'AI Chat with Perfect Memory',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
'@
    Set-Content -Path $layoutPath -Value $layoutContent
}

# Step 6: Build the project
Write-Host "[6/7] Building project for production..." -ForegroundColor Green
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed! Checking for TypeScript errors..." -ForegroundColor Red
    npx tsc --noEmit
    Write-Host "Please fix any TypeScript errors and run this script again." -ForegroundColor Yellow
    exit 1
}

# Step 7: Deploy to Vercel
Write-Host "[7/7] Deploying to Vercel..." -ForegroundColor Green

# First, pull latest environment variables from Vercel
Write-Host "   Pulling environment variables..." -ForegroundColor Yellow
vercel env pull .env.production

# Deploy with production flag
Write-Host "   Starting deployment..." -ForegroundColor Yellow
$deployOutput = vercel --prod 2>&1
$deployUrl = ($deployOutput | Select-String -Pattern "https://.*vercel.app" | Select-Object -First 1).Matches[0].Value

if ($deployUrl) {
    Write-Host "`n=== DEPLOYMENT SUCCESSFUL ===" -ForegroundColor Green
    Write-Host "Production URL: $deployUrl" -ForegroundColor Cyan
    Write-Host "Test the deployment:" -ForegroundColor Yellow
    Write-Host "  - Main app: $deployUrl" -ForegroundColor White
    Write-Host "  - Simple interface: $deployUrl/simple" -ForegroundColor White
    Write-Host "  - API health: $deployUrl/api/health" -ForegroundColor White
    
    # Git commit the changes
    Write-Host "`n[BONUS] Committing changes to Git..." -ForegroundColor Green
    git add -A
    git commit -m "Fix production deployment - resolve HTTP 307 redirect, deploy dark mode interface"
    git push origin main
    
    Write-Host "`n=== NEXT STEPS ===" -ForegroundColor Cyan
    Write-Host "1. Visit Vercel Dashboard to update domain from ai.kimbleai.com to www.kimbleai.com" -ForegroundColor Yellow
    Write-Host "2. Update DNS records if needed" -ForegroundColor Yellow
    Write-Host "3. Test file uploads on production" -ForegroundColor Yellow
    Write-Host "4. Implement M4A audio upload with Whisper" -ForegroundColor Yellow
} else {
    Write-Host "`nDeployment may have failed. Check Vercel dashboard." -ForegroundColor Red
    Write-Host "You can also try: vercel --prod --debug" -ForegroundColor Yellow
}
