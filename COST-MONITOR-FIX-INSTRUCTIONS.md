# 🔧 Cost Monitor Fix - Instructions

## 🎯 Problem Identified
The cost monitor shows $0.00 because the **database table `api_cost_tracking` doesn't exist**.

All the tracking code is working perfectly - it just needs the database table to be created.

## ✅ Solution: Create the Database Table

### **Step 1: Open Supabase SQL Editor**
1. Go to: https://supabase.com/dashboard/project/gbmefnaqsxtoseufjixp/sql
2. Click **"New Query"**

### **Step 2: Copy and Run the SQL**
1. Open the file: `database/api-cost-tracking.sql`
2. Copy the **ENTIRE content** (all 303 lines)
3. Paste it into the Supabase SQL Editor
4. Click **"RUN"** (or press Ctrl/Cmd + Enter)

### **Step 3: Verify Table Creation**
After running the SQL, verify it worked:

```bash
# Option 1: Check via API
curl "http://localhost:3001/api/debug-costs"

# Option 2: In Supabase Dashboard
# Go to Table Editor and look for: api_cost_tracking
```

### **Step 4: Test Cost Tracking**
Once the table exists, test it:

```bash
# Start dev server
npm run dev

# Add test data
npx tsx scripts/add-test-costs.ts

# View costs page
# Open: http://localhost:3001/costs
```

## 📊 What Gets Created

The SQL file creates:

### **Tables:**
- `api_cost_tracking` - Stores every API call with cost
- `budget_alerts` - Stores budget alert history
- `budget_config` - Per-user budget configuration

### **Functions:**
- `get_spending_since()` - Get spending for a time period
- `get_monthly_spending()` - Get current month spending
- `get_daily_spending()` - Get today's spending
- `get_hourly_spending()` - Get current hour spending
- `get_top_expensive_calls()` - Get most expensive API calls

### **Views:**
- `daily_cost_summary` - Daily cost breakdown
- `monthly_cost_summary` - Monthly cost breakdown
- `cost_by_model` - Cost grouped by AI model
- `cost_by_endpoint` - Cost grouped by API endpoint

### **Security:**
- Row Level Security (RLS) policies
- Users can only see their own cost data
- Admins can see all cost data

## 🎉 After Table Creation

Once the table exists:

1. **Automatic Tracking**: Every chat request will automatically track costs
2. **Real-time Display**: The cost monitor at `/costs` will show live data
3. **Budget Alerts**: You'll get alerts at 50%, 75%, 90%, and 100% of budget
4. **Cost Analytics**: View detailed breakdowns by model, endpoint, and time period

## 📝 Files Modified

All these changes are already committed and ready for deployment:

- ✅ `app/costs/page.tsx` - Fixed user ID resolution
- ✅ `app/api/users/route.ts` - Created user lookup endpoint
- ✅ `app/api/costs/route.ts` - Added proper validation
- ✅ `middleware.ts` - Added public paths for cost tracking
- ✅ `scripts/add-test-costs.ts` - Script to add test data
- ✅ `app/api/debug-costs/route.ts` - Debugging endpoint
- ✅ `app/api/migrate-costs/route.ts` - Migration status endpoint

## 🚀 Deployment to Production

After verifying cost tracking works locally:

```bash
# Build and test
npm run build

# Deploy to Vercel
vercel --prod

# Run the SAME SQL in production Supabase
# (The SQL file works for both dev and prod)
```

## ⚠️ Important Notes

1. **One-time Setup**: The SQL only needs to be run once per environment (dev/prod)
2. **Existing Data**: The SQL uses `CREATE TABLE IF NOT EXISTS` - safe to run multiple times
3. **No Data Loss**: Running the SQL won't affect any existing data
4. **Budget Limits**: Default limits are configured in `lib/cost-monitor.ts`:
   - Hourly: $10
   - Daily: $25 (per user) / $50 (total)
   - Monthly: $250 (per user) / $500 (total)

## 🔍 Verification Commands

```bash
# Check if table exists
curl "http://localhost:3001/api/migrate-costs"

# Add test data
npx tsx scripts/add-test-costs.ts

# View cost summary
curl "http://localhost:3001/api/costs?action=summary&userId=<YOUR_USER_UUID>"

# Check debug info
curl "http://localhost:3001/api/debug-costs"
```

## 📞 Next Steps

1. **Execute the SQL in Supabase** (required)
2. Test locally with test data
3. Make a real chat request and verify cost tracking
4. Deploy to production
5. Run the same SQL in production Supabase
6. Celebrate working cost monitoring! 🎉
