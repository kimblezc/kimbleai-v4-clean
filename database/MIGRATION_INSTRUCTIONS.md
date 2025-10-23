# Database Migration Instructions

## Critical Bug Fix: Cost Tracking User ID Type Mismatch

### Problem
The cost tracking system was crashing with error:
```
invalid input syntax for type uuid: "rebecca"
```

**Root Cause:**
- Database tables expected `user_id` as UUID type
- Application code uses string identifiers ("zach", "rebecca")
- Mismatch caused all cost tracking queries to fail

### Solution
Migration file: `fix-cost-tracking-user-id.sql`

This migration:
1. ✅ Drops foreign key constraints
2. ✅ Changes `user_id` column from UUID → TEXT in 3 tables:
   - `api_cost_tracking`
   - `budget_alerts`
   - `budget_config`
3. ✅ Recreates helper functions with TEXT parameter type
4. ✅ Updates Row Level Security policies

### How to Run Migration

#### Option 1: Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in the left sidebar
4. Click "New Query"
5. Copy contents of `fix-cost-tracking-user-id.sql`
6. Paste into editor
7. Click "Run" button
8. Verify success - should see "Success. No rows returned"

#### Option 2: psql Command Line
```bash
# If you have direct database access
psql "postgresql://[connection-string]" -f database/fix-cost-tracking-user-id.sql
```

#### Option 3: Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db push
```

### Verification Steps

After running the migration, verify it worked:

```sql
-- Check column types
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'api_cost_tracking' AND column_name = 'user_id';

-- Should show: data_type = 'text'

-- Test queries with string user IDs
SELECT user_id, COUNT(*), SUM(cost_usd)
FROM api_cost_tracking
GROUP BY user_id;

-- Test cost tracking functions
SELECT get_daily_spending('zach');
SELECT get_daily_spending('rebecca');
```

### Expected Results

**Before Migration:**
```
ERROR: invalid input syntax for type uuid: "rebecca"
LINE 1: ... FROM api_cost_tracking WHERE user_id = 'rebecca'
```

**After Migration:**
```
 user_id | count |   sum
---------+-------+----------
 zach    |   145 | 2.340000
 rebecca |    87 | 1.250000
```

### Rollback (If Needed)

If you need to rollback this migration:

```sql
-- WARNING: This will lose data if you have mixed UUID and TEXT values

-- Rollback to UUID (destructive)
ALTER TABLE api_cost_tracking ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
ALTER TABLE budget_alerts ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
ALTER TABLE budget_config ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

-- Recreate foreign keys
ALTER TABLE api_cost_tracking
  ADD CONSTRAINT api_cost_tracking_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

## Migration Status

- [ ] Migration file created: `fix-cost-tracking-user-id.sql`
- [ ] Migration tested in development
- [ ] Migration run in production
- [ ] Verification queries passed
- [ ] Cost tracking working correctly

## Related Issues

This migration fixes:
- ❌ Cost dashboard showing errors
- ❌ Budget alerts not triggering
- ❌ API cost tracking failing
- ❌ User spending queries failing

After migration:
- ✅ Cost dashboard loads successfully
- ✅ Budget monitoring works
- ✅ All cost queries execute properly
- ✅ Supports both "zach" and "rebecca" user IDs

## Notes

- **No data loss**: Existing UUID values will be converted to text representation
- **Backward compatible**: TEXT columns can store both UUIDs and simple strings
- **Performance**: No significant impact (user_id is indexed)
- **Future-proof**: Supports flexible user ID formats

## Next Steps After Migration

1. Deploy code fixes (transcription polling timeout)
2. Test cost tracking on production
3. Monitor for any remaining errors
4. Update documentation if needed
