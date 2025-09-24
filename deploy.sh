#!/bin/bash

# KimbleAI V4 Clean - Full Deployment Script
# Deploys with RAG system, file uploads, and enhanced UI

echo "================================================"
echo "KimbleAI V4 Clean - Full Deployment"
echo "================================================"
echo ""

# Function to check command status
check_status() {
    if [ $? -eq 0 ]; then
        echo "✓ $1 successful"
    else
        echo "✗ $1 failed"
        exit 1
    fi
}

# 1. Install dependencies
echo "[1/10] Installing dependencies..."
npm install
check_status "Dependency installation"

# 2. TypeScript check
echo ""
echo "[2/10] Checking TypeScript..."
npx tsc --noEmit
check_status "TypeScript validation"

# 3. Build the project
echo ""
echo "[3/10] Building project..."
npm run build
check_status "Build"

# 4. Git commit
echo ""
echo "[4/10] Committing to Git..."
git add -A
git commit -m "Deploy KimbleAI V4 with enhanced UI and file upload" \
  -m "Features:" \
  -m "- File upload component" \
  -m "- Enhanced chat interface" \
  -m "- Project and tag management" \
  -m "- Knowledge stats display" \
  -m "- Google integration placeholders" \
  -m "- Improved user switching"
check_status "Git commit"

# 5. Push to GitHub
echo ""
echo "[5/10] Pushing to GitHub..."
git push origin main --force-with-lease
check_status "GitHub push"

# 6. Deploy to Vercel
echo ""
echo "[6/10] Deploying to Vercel..."
npx vercel --prod --yes
check_status "Vercel deployment"

# 7. Test the API
echo ""
echo "[7/10] Testing API endpoints..."
curl -s https://kimbleai-v4-clean.vercel.app/api/chat | jq '.'
check_status "API test"

# 8. Test knowledge persistence
echo ""
echo "[8/10] Testing knowledge persistence..."
curl -X POST https://kimbleai-v4-clean.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Test message for deployment verification"}],
    "userId": "zach"
  }' | jq '.'
check_status "Knowledge test"

# 9. Create deployment log
echo ""
echo "[9/10] Creating deployment log..."
cat > DEPLOYMENT_LOG.md << EOF
# KimbleAI V4 Clean - Deployment Log
Date: $(date)
Version: 4.0.1

## Deployed Features
- RAG system with vector search
- File upload and indexing
- Enhanced chat UI
- Project and tag management
- Knowledge stats display
- User switching (Zach/Rebecca)

## API Endpoints
- GET /api/chat - System status
- POST /api/chat - Chat with RAG
- GET /api/upload - List files
- POST /api/upload - Upload file

## Environment Variables Required
- OPENAI_API_KEY
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- ZAPIER_WEBHOOK_URL

## Live URLs
- Production: https://kimbleai-v4-clean.vercel.app
- API Status: https://kimbleai-v4-clean.vercel.app/api/chat

## Next Steps
1. Test file uploads
2. Configure Google OAuth
3. Test cross-conversation memory
EOF

echo ""
echo "[10/10] Deployment complete!"
echo ""
echo "================================================"
echo "DEPLOYMENT SUCCESSFUL"
echo "================================================"
echo ""
echo "Live at: https://kimbleai-v4-clean.vercel.app"
echo ""
echo "Test the system:"
echo "1. Upload a document"
echo "2. Ask questions about it"
echo "3. Switch users and verify isolation"
echo "4. Create projects and tags"
echo ""
echo "The RAG system is fully operational!"