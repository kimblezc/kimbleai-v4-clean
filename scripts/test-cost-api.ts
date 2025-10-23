// Quick test to verify cost API works with string user IDs after migration
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gbmefnaqsxtoseufjixp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdibWVmbmFxc3h0b3NldWZqaXhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDg5NjkzNCwiZXhwIjoyMDcwNDcyOTM0fQ.LmZUd4t7NpGcVcJYDs1HuOQUOmCcNbc20bm9QUJkUpA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCostAPI() {
  console.log('🔍 Testing cost API with string user IDs after migration...\n');

  try {
    // Test 1: Check column type
    console.log('Test 1: Checking user_id column type...');
    const { data: columnInfo, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'api_cost_tracking')
      .eq('column_name', 'user_id')
      .single();

    if (columnError) {
      console.log('❌ Column check failed:', columnError.message);
    } else {
      console.log(`✅ user_id column type: ${columnInfo?.data_type || 'unknown'}`);
    }

    // Test 2: Query with string user_id "zach"
    console.log('\nTest 2: Querying costs for user_id="zach"...');
    const { data: zachData, error: zachError } = await supabase
      .from('api_cost_tracking')
      .select('user_id, cost_usd, timestamp')
      .eq('user_id', 'zach')
      .order('timestamp', { ascending: false })
      .limit(5);

    if (zachError) {
      console.log('❌ Error querying zach:', zachError.message);
    } else {
      console.log(`✅ Found ${zachData?.length || 0} records for zach`);
      if (zachData && zachData.length > 0) {
        console.log('   Latest:', zachData[0]);
      }
    }

    // Test 3: Query with string user_id "rebecca"
    console.log('\nTest 3: Querying costs for user_id="rebecca"...');
    const { data: rebeccaData, error: rebeccaError } = await supabase
      .from('api_cost_tracking')
      .select('user_id, cost_usd, timestamp')
      .eq('user_id', 'rebecca')
      .order('timestamp', { ascending: false })
      .limit(5);

    if (rebeccaError) {
      console.log('❌ Error querying rebecca:', rebeccaError.message);
    } else {
      console.log(`✅ Found ${rebeccaData?.length || 0} records for rebecca`);
      if (rebeccaData && rebeccaData.length > 0) {
        console.log('   Latest:', rebeccaData[0]);
      }
    }

    // Test 4: Get spending function
    console.log('\nTest 4: Testing get_daily_spending function...');
    const { data: spendingData, error: spendingError } = await supabase
      .rpc('get_daily_spending', { filter_user_id: 'zach' });

    if (spendingError) {
      console.log('❌ Error calling get_daily_spending:', spendingError.message);
    } else {
      console.log(`✅ Daily spending for zach: $${spendingData || 0}`);
    }

    console.log('\n🎉 All tests completed!');
  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

testCostAPI();
