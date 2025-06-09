const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Testing Supabase connection...');
console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Not set');
console.log('Supabase Key:', supabaseKey ? `Set (length: ${supabaseKey.length})` : 'Not set');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase environment variables not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
  console.log('\n📊 Testing database tables...');
  
  // Test users table
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    console.log('Users table:', error ? `❌ ${error.message}` : `✅ Accessible`);
  } catch (e) {
    console.log('Users table: ❌ Error -', e.message);
  }

  // Test bills table
  try {
    const { data, error } = await supabase.from('bills').select('*').limit(1);
    console.log('Bills table:', error ? `❌ ${error.message}` : `✅ Accessible (${data?.length || 0} records found)`);
    if (data && data.length > 0) {
      console.log('Bills columns:', Object.keys(data[0]));
    }
  } catch (e) {
    console.log('Bills table: ❌ Error -', e.message);
  }

  // Test representatives table
  try {
    const { data, error } = await supabase.from('representatives').select('*').limit(1);
    console.log('Representatives table:', error ? `❌ ${error.message}` : `✅ Accessible (${data?.length || 0} records found)`);
    if (data && data.length > 0) {
      console.log('Representatives columns:', Object.keys(data[0]));
    }
  } catch (e) {
    console.log('Representatives table: ❌ Error -', e.message);
  }

  // Test for district boundaries tables
  const potentialTables = [
    'district_boundaries',
    'congressional_districts', 
    'districts',
    'boundaries',
    'geojson_districts',
    'district_shapes',
    'political_boundaries'
  ];

  console.log('\n🗺️ Checking for district boundary tables...');
  for (const tableName of potentialTables) {
    try {
      const { data, error } = await supabase.from(tableName).select('*').limit(1);
      if (!error && data !== null) {
        console.log(`${tableName} table: ✅ Found (${data?.length || 0} records)`);
        if (data && data.length > 0) {
          console.log(`${tableName} columns:`, Object.keys(data[0]));
        }
      } else if (error && !error.message.includes('does not exist')) {
        console.log(`${tableName} table: ❌ ${error.message}`);
      }
    } catch (e) {
      // Table doesn't exist, continue
    }
  }

  // Count records in each table
  try {
    const [billsResult, repsResult] = await Promise.all([
      supabase.from('bills').select('*', { count: 'exact', head: true }),
      supabase.from('representatives').select('*', { count: 'exact', head: true })
    ]);
    
    console.log('\n📈 Record counts:');
    console.log('Bills:', billsResult.count || 0);
    console.log('Representatives:', repsResult.count || 0);
  } catch (e) {
    console.log('Count error:', e.message);
  }
}

testDatabase().catch(console.error); 