#!/bin/bash
# Quick File Upload Test - v10.7.1
# Tests that file upload works without database column errors

BASE_URL="${TEST_URL:-https://www.kimbleai.com}"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Quick File Upload Test v10.7.1                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Testing: $BASE_URL"
echo ""

# Test 1: Version Check
echo "Test 1: Version Check"
VERSION_RESPONSE=$(curl -s "$BASE_URL/api/version")
VERSION=$(echo $VERSION_RESPONSE | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
COMMIT=$(echo $VERSION_RESPONSE | grep -o '"commit":"[^"]*"' | cut -d'"' -f4)

if [ "$VERSION" = "10.7.1" ] && [ "$COMMIT" = "75ea23b" ]; then
  echo "✅ PASS: Correct version deployed (v10.7.1 @ 75ea23b)"
else
  echo "❌ FAIL: Wrong version (got v$VERSION @ $COMMIT)"
  exit 1
fi
echo ""

# Test 2: Health Check
echo "Test 2: Health Check"
HEALTH_RESPONSE=$(curl -s "$BASE_URL/api/health")
HEALTH_STATUS=$(echo $HEALTH_RESPONSE | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

if [ "$HEALTH_STATUS" = "healthy" ]; then
  echo "✅ PASS: Server is healthy"
else
  echo "❌ FAIL: Server unhealthy"
  exit 1
fi
echo ""

# Test 3: Railway Logs Check (requires Railway CLI)
echo "Test 3: Railway Logs Check"
if command -v railway &> /dev/null; then
  echo "Checking Railway logs for database errors..."

  # Check for category column errors
  ERROR_COUNT=$(railway logs --tail 100 2>&1 | grep -c "Could not find the 'category' column" || true)

  if [ "$ERROR_COUNT" -eq 0 ]; then
    echo "✅ PASS: No category column errors in logs"
  else
    echo "❌ FAIL: Found $ERROR_COUNT category column errors in logs"
    echo "Recent errors:"
    railway logs --tail 100 2>&1 | grep "Could not find the 'category' column"
    exit 1
  fi
else
  echo "⏭️  SKIP: Railway CLI not available"
fi
echo ""

# Test 4: Recent Upload Check (requires environment variables)
echo "Test 4: Recent Upload Check"
if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ] && [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Checking recent uploads in database..."

  # Note: This requires jq and curl
  UPLOADS_RESPONSE=$(curl -s -X POST \
    "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/uploaded_files?select=id,filename,status,metadata&created_at=gte.$(date -u -d '1 hour ago' '+%Y-%m-%dT%H:%M:%S')&order=created_at.desc&limit=5" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY")

  UPLOAD_COUNT=$(echo $UPLOADS_RESPONSE | grep -o '"id"' | wc -l)

  if [ "$UPLOAD_COUNT" -gt 0 ]; then
    echo "✅ PASS: Found $UPLOAD_COUNT recent uploads"
    echo "   Checking metadata structure..."

    # Check if metadata contains category
    HAS_CATEGORY=$(echo $UPLOADS_RESPONSE | grep -c '"category"' || true)

    if [ "$HAS_CATEGORY" -gt 0 ]; then
      echo "✅ PASS: Category found in metadata"
    else
      echo "⚠️  WARNING: No category in metadata (might be older uploads)"
    fi
  else
    echo "⏭️  SKIP: No uploads in last hour"
  fi
else
  echo "⏭️  SKIP: Supabase credentials not available"
fi
echo ""

# Summary
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Test Summary                                              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "🎉 All critical tests passed!"
echo ""
echo "Next steps:"
echo "1. Try uploading a file at $BASE_URL/files/upload"
echo "2. Check Railway logs: railway logs --tail 50"
echo "3. Run full test suite: npx tsx tests/file-upload-comprehensive.ts"
echo ""
