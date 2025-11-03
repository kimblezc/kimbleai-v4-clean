# v1.6.0 Deployment Verification Guide

## Current Status
- ✅ Code deployed to Vercel (1 minute ago)
- ✅ Deployment status: READY
- ⏳ Browser cache needs clearing
- ⏳ Database migrations not run yet

---

## STEP 1: Clear Browser Cache (CRITICAL)

The site is showing v1.5.0 because your browser has cached the old version.

### Option A: Hard Refresh (Fastest)
**Windows/Linux:**
- Chrome/Edge: Press `Ctrl + Shift + R`
- Firefox: Press `Ctrl + F5`

**Mac:**
- Chrome/Edge: Press `Cmd + Shift + R`
- Safari: Press `Cmd + Option + R`

### Option B: Clear Cache Manually
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### Option C: Incognito/Private Window
- Open new incognito window
- Visit https://www.kimbleai.com
- This bypasses all cache

---

## STEP 2: Verify Version

After clearing cache:

1. Press F12 to open DevTools
2. Go to Console tab
3. Type: `console.log(document.querySelector('body').innerText)`
4. Look for "v1.6.0" or check the Archie button (should show 🦉)

**Or check network tab:**
1. Go to Network tab
2. Refresh page
3. Click on the main HTML file
4. Check Response headers for build date/version

---

## STEP 3: Run Database Migrations

This is why you're seeing $0 for costs - the migrations haven't been run yet.

### Migration 1: Project Performance (REQUIRED)
**File:** `database/optimize-projects-performance.sql`

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy entire file contents
4. Paste and click "Run"
5. Verify output shows "Migration Complete"

### Migration 2: Cost Tracking Fix (REQUIRED for cost data)
**File:** `database/fix-cost-tracking-user-id-CORRECTED.sql`

1. Same process as above
2. This converts user_id from UUID to TEXT
3. After running, cost data should appear

---

## STEP 4: Verify Features Work

### Test 1: Version Check
- Main page should show v1.6.0
- Check browser console or footer

### Test 2: Archie Button
- Look for "🦉 Archie" button in sidebar (not "🚀 Accomplishments")
- Click it → should go to Archie dashboard
- Should show <20 suggestions (not 99+)

### Test 3: Project Loading
- Go to /projects
- Should load in <5 seconds
- Reload → should load in <1 second (cached)

### Test 4: Cost Tracking (After Migration 2)
- Main page should show token usage
- Should show $ spent
- Should show recent API calls

---

## Troubleshooting

### Still showing v1.5.0 after hard refresh?
1. Check Vercel deployment URL directly:
   ```
   https://kimbleai-v4-clean-d65ssc3yd-kimblezcs-projects.vercel.app
   ```
2. If that shows v1.6.0, it's a DNS/CDN issue
3. Wait 5-10 minutes for CDN to propagate
4. Clear DNS cache:
   - Windows: `ipconfig /flushdns`
   - Mac: `sudo dscacheutil -flushcache`

### Cost data still showing $0 after migration?
1. Verify migration ran successfully
2. Check Supabase for errors
3. Check that user_id column is TEXT not UUID:
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'api_cost_tracking'
   AND column_name = 'user_id';
   ```
   Should return: `TEXT`

### Projects still loading slowly?
1. Verify optimize-projects-performance.sql ran
2. Check indexes exist:
   ```sql
   SELECT indexname FROM pg_indexes
   WHERE tablename = 'projects';
   ```
   Should see: `idx_projects_updated_at`, `idx_projects_owner_updated`, `idx_projects_status_updated`

---

## Quick Verification Checklist

- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] See v1.6.0 in console or on page
- [ ] See "🦉 Archie" button in sidebar
- [ ] Run optimize-projects-performance.sql
- [ ] Run fix-cost-tracking-user-id-CORRECTED.sql
- [ ] See cost data appear on main page
- [ ] Projects page loads quickly (<5s)
- [ ] Archie dashboard shows <20 suggestions

---

## Expected Timeline

| Action | Time | Status |
|--------|------|--------|
| Vercel deployment | Complete | ✅ |
| CDN propagation | 1-5 min | ⏳ |
| Browser cache clear | Immediate | ⏳ |
| Database migrations | 30 sec each | ⏳ |
| Full verification | 5 min total | ⏳ |

---

## Contact Points

If issues persist after following all steps:
1. Check browser console for errors (F12)
2. Check Vercel logs for deployment errors
3. Check Supabase logs for migration errors
4. Report specific error messages

---

**Last Updated:** 2025-10-24 05:10 UTC
**Deployment:** da2fea9 (1 minute ago)
**Status:** 🟡 AWAITING CACHE CLEAR + MIGRATIONS
