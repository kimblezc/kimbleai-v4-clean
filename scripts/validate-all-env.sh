#!/bin/bash

# Comprehensive Environment Variable Validation
# Checks both local .env files AND Vercel production environment

echo "════════════════════════════════════════════════════════════════════════════"
echo "🔍 COMPREHENSIVE ENVIRONMENT VARIABLE VALIDATION"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

# Step 1: Validate local .env files
echo "Step 1/2: Validating local .env files..."
echo "────────────────────────────────────────────────────────────────────────────"
node scripts/validate-env-whitespace.js
LOCAL_EXIT=$?

echo ""
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

# Step 2: Validate Vercel production environment
echo "Step 2/2: Scanning Vercel production environment..."
echo "────────────────────────────────────────────────────────────────────────────"
node scripts/scan-vercel-env-whitespace.js
VERCEL_EXIT=$?

echo ""
echo "════════════════════════════════════════════════════════════════════════════"
echo "📊 FINAL SUMMARY"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

if [ $LOCAL_EXIT -eq 0 ] && [ $VERCEL_EXIT -eq 0 ]; then
  echo "✅ All environment variables are clean!"
  echo "   - Local .env files: PASS"
  echo "   - Vercel production: PASS"
  echo ""
  exit 0
else
  echo "⚠️  Issues found:"

  if [ $LOCAL_EXIT -ne 0 ]; then
    echo "   - Local .env files: FAILED (see above)"
  else
    echo "   - Local .env files: PASS"
  fi

  if [ $VERCEL_EXIT -ne 0 ]; then
    echo "   - Vercel production: FAILED (see above)"
  else
    echo "   - Vercel production: PASS"
  fi

  echo ""
  echo "💡 To auto-fix Vercel issues:"
  echo "   node scripts/scan-vercel-env-whitespace.js --fix"
  echo ""
  exit 1
fi
