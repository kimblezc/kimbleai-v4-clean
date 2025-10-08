#!/bin/bash
# Continuous deploy and test loop until export succeeds

echo "╔═══════════════════════════════════════════╗"
echo "║   Continuous Deploy + Test Loop           ║"
echo "║   Testing export until it succeeds        ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

ATTEMPT=1
MAX_ATTEMPTS=10

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    echo ""
    echo "═════════════════════════════════════════"
    echo "  ATTEMPT #$ATTEMPT"
    echo "═════════════════════════════════════════"
    echo ""

    # Deploy to production
    echo "📦 Deploying to Vercel..."
    DEPLOYMENT_URL=$(vercel --prod 2>&1 | grep "https://" | head -1)

    if [ -z "$DEPLOYMENT_URL" ]; then
        echo "❌ Deployment failed"
        ATTEMPT=$((ATTEMPT + 1))
        sleep 5
        continue
    fi

    echo "✅ Deployed: $DEPLOYMENT_URL"

    # Update aliases
    echo "🔗 Updating domain aliases..."
    vercel alias set "$DEPLOYMENT_URL" www.kimbleai.com > /dev/null 2>&1
    vercel alias set "$DEPLOYMENT_URL" kimbleai.com > /dev/null 2>&1
    echo "✅ Aliases updated"

    # Wait for propagation
    echo "⏳ Waiting 15s for propagation..."
    sleep 15

    # Run automated test
    echo "🧪 Running automated test..."
    if npx tsx scripts/auto-test-with-auth.ts; then
        echo ""
        echo "╔═══════════════════════════════════════════╗"
        echo "║   ✅ SUCCESS! Export working!             ║"
        echo "╚═══════════════════════════════════════════╝"
        exit 0
    else
        echo "❌ Test failed, will retry..."
    fi

    ATTEMPT=$((ATTEMPT + 1))

    if [ $ATTEMPT -le $MAX_ATTEMPTS ]; then
        echo "⏳ Waiting 10s before next attempt..."
        sleep 10
    fi
done

echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║   ❌ Failed after $MAX_ATTEMPTS attempts  ║"
echo "╚═══════════════════════════════════════════╝"
exit 1
