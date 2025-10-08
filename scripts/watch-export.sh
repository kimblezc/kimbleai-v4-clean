#!/bin/bash
# Watch script - continuously test export endpoint until it works

echo "╔═══════════════════════════════════════════╗"
echo "║   Export Endpoint Watcher                 ║"
echo "║   Testing every 10 seconds...             ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

COUNTER=1

while true; do
    TIMESTAMP=$(date +"%H:%M:%S")
    echo "[$TIMESTAMP] Test #$COUNTER"

    # Test if endpoint exists and responds
    RESPONSE=$(curl -s -X POST "https://www.kimbleai.com/api/transcribe/export-to-drive" \
        -H "Content-Type: application/json" \
        -d '{"transcriptionId":"test-uuid-12345678","userId":"zach"}' \
        -w "\nHTTP_CODE:%{http_code}")

    HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d':' -f2)
    BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE")

    if [ "$HTTP_CODE" = "404" ]; then
        echo "   ❌ Still 404 - endpoint not found"
    elif [ "$HTTP_CODE" = "401" ]; then
        echo "   ⚠️  401 Unauthorized - endpoint exists but auth issue"
        echo "   Response: $BODY"
    elif [ "$HTTP_CODE" = "500" ]; then
        echo "   ⚠️  500 Server Error - endpoint exists but has error"
        echo "   Response: $BODY"
    else
        echo "   ✅ RESPONSE CODE: $HTTP_CODE"
        echo "   📄 Response: $BODY"

        if echo "$BODY" | grep -q "Transcription not found\|Not authenticated"; then
            echo ""
            echo "╔═══════════════════════════════════════════╗"
            echo "║   ✅ ENDPOINT IS WORKING!                 ║"
            echo "║   (Getting expected error responses)      ║"
            echo "╚═══════════════════════════════════════════╝"
            echo ""
            echo "You can now test manually on the website!"
            exit 0
        fi
    fi

    echo ""
    COUNTER=$((COUNTER + 1))
    sleep 10
done
