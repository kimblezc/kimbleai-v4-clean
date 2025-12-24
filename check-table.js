const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTable() {
  const { data, error } = await supabase
    .from('uploaded_files')
    .select('*')
    .limit(1);
  
  if (error) {
    console.log('Error:', error);
  } else {
    console.log('Sample record:', data);
    if (data && data.length > 0) {
      console.log('\nColumns:', Object.keys(data[0]));
    } else {
      console.log('\nNo records found');
    }
  }
}

checkTable();
