#!/bin/bash

# Railway Environment Variables Setup Script
# This script sets all required environment variables for Railway deployment

echo "🚂 Setting up Railway environment variables..."
echo ""

# Read from .env.production and set each variable
# Note: Railway CLI must be authenticated first (run: railway login)

# Core Supabase Configuration
railway variables set NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}"
railway variables set SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

# NextAuth Configuration
railway variables set NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"
railway variables set NEXTAUTH_URL="${NEXTAUTH_URL}"

# Google OAuth
railway variables set GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID}"
railway variables set GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET}"

# API Keys
railway variables set OPENAI_API_KEY="${OPENAI_API_KEY}"
railway variables set ASSEMBLYAI_API_KEY="${ASSEMBLYAI_API_KEY}"

# Zapier Webhooks
railway variables set ZAPIER_WEBHOOK_URL="${ZAPIER_WEBHOOK_URL}"
railway variables set ZAPIER_MEMORY_WEBHOOK_URL="${ZAPIER_MEMORY_WEBHOOK_URL}"
railway variables set ZAPIER_WEBHOOK_SECRET="${ZAPIER_WEBHOOK_SECRET}"

# Node Environment
railway variables set NODE_ENV="production"

echo ""
echo "✅ Environment variables set successfully!"
echo ""
echo "Verify with: railway variables"
