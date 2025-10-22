# Web Search Setup (FREE)

**Why:** Get FREE searches instead of paying $50/month for Tavily.

**Your usage:** ~600 searches/month (2 users × 10 searches/day × 30 days)

**Time to setup:** 5 minutes

---

## OPTION A: Use Zapier Pro (EASIEST - You Already Have This!)

**Best option since you already pay for Zapier Pro!**

### Step 1: Create Zapier Search Zap

1. Go to [Zapier](https://zapier.com/app/zaps)
2. Click **Create Zap**
3. **Trigger:** Webhooks by Zapier → Catch Hook
4. Copy the webhook URL (save for Step 2)
5. **Action:** Choose one:
   - **Search by Zapier** (built-in, no API needed)
   - **HTTP by Zapier** → Google Custom Search (more accurate)
   - **HTTP by Zapier** → Brave Search API (privacy-focused)
6. **Return Response:** Webhooks by Zapier → Custom Response
7. Test and publish

### Step 2: Add to .env.local

```env
# ==================== WEB SEARCH (ZAPIER) ====================
ZAPIER_SEARCH_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/YOUR_HOOK_ID
```

### Step 3: Update web-search-service.ts

Add Zapier option to your search service (I'll do this for you next).

**Cost:** $0 (included in your Zapier Pro subscription)

---

## OPTION B: Google Custom Search API (Also FREE)

### Step 1: Get Google Custom Search API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select or create a project (use your existing KimbleAI project)
3. Go to **APIs & Services** → **Library**
4. Search for "Custom Search API"
5. Click **Enable**
6. Go to **APIs & Services** → **Credentials**
7. Click **Create Credentials** → **API Key**
8. Copy your API key (looks like: `AIzaSyD...`)

**Free Tier:** 100 searches/day = 3000/month

---

## Step 2: Create Custom Search Engine

1. Go to [Programmable Search Engine](https://programmablesearchengine.google.com/controlpanel/create)
2. Fill in:
   - **Search engine name:** KimbleAI Web Search
   - **What to search:** Search the entire web
   - **Search settings:**
     - ✅ Check "Search the entire web"
     - ✅ Enable "Image search"
     - ✅ Enable "Safe search"
3. Click **Create**
4. Click **Customize** → **Basic** tab
5. Copy your **Search Engine ID** (looks like: `a1b2c3d4e5f6g7h8i`)

---

## Step 3: Add to .env.local

Open your `.env.local` file and add these lines:

```env
# ==================== WEB SEARCH (FREE) ====================

# Google Custom Search API (100 searches/day FREE)
GOOGLE_CUSTOM_SEARCH_API_KEY=AIzaSyD...your-key-here
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=a1b2c3d4e...your-engine-id

# Comment out or remove Tavily (save $50/mo)
# TAVILY_API_KEY=tvly-...
```

---

## Step 4: Test

Run this command to test:

```bash
npx tsx -e "import { webSearch } from './lib/web-search-service'; webSearch.search('test query').then(r => console.log('Provider:', r.provider, 'Results:', r.results.length))"
```

**Expected output:**
```
[WebSearch] Using provider: google
Provider: google Results: 10
```

---

## Step 5: Verify in Your App

The deep research agent will automatically use Google search:

1. Open your app
2. Try a research query
3. Check console logs - should see:
   ```
   [DeepResearch] Using google for search: "your query"
   ```

---

## Cost Comparison

| Option | Monthly Searches | Cost | Your Usage |
|--------|-----------------|------|------------|
| **Google (FREE)** | 3000 | $0 | 600/mo ✅ |
| Tavily | 5000 | $50 | 600/mo ❌ |
| Bing Free | 1000 | $0 | 600/mo ✅ |

**Annual savings vs Tavily:** $600

---

## Troubleshooting

### "Search returning setup instructions"
- Your API key isn't configured correctly
- Check `.env.local` has both variables uncommented
- Restart your dev server: `npm run dev`

### "API Key invalid"
- Make sure Custom Search API is enabled in Google Cloud Console
- Check for typos in API key
- Verify billing is enabled (required even for free tier)

### "Search Engine ID not found"
- Double-check the Engine ID from Programmable Search Engine control panel
- Make sure you created the search engine (Step 2)

---

## Alternative: Bing Search (Also FREE)

If you prefer Bing:

1. Go to [Azure Portal](https://portal.azure.com)
2. Create **Bing Search v7** resource
3. Free tier: 1000 searches/month
4. Add to `.env.local`:
   ```env
   BING_SEARCH_API_KEY=your-bing-key
   ```

---

**Done!** Your web search is now FREE and working.
