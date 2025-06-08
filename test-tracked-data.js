const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase environment variables not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTrackedData() {
  console.log('🔍 Testing tracked data...');
  
  // Check users
  try {
    const { data: users, error } = await supabase.from('users').select('id, email').limit(5);
    console.log('Users:', users?.length || 0);
    if (users && users.length > 0) {
      console.log('Sample user:', users[0]);
      
      // Check tracked bills for first user
      const { data: trackedBills, error: billsError } = await supabase
        .from('user_tracked_bills')
        .select('*')
        .eq('userId', users[0].id);
      
      console.log(`Tracked bills for user ${users[0].email}:`, trackedBills?.length || 0);
      
      // Check tracked representatives for first user
      const { data: trackedReps, error: repsError } = await supabase
        .from('user_tracked_representatives')
        .select('*')
        .eq('userId', users[0].id);
      
      console.log(`Tracked representatives for user ${users[0].email}:`, trackedReps?.length || 0);
    }
  } catch (e) {
    console.log('Error:', e.message);
  }

  // Check total tracked items
  try {
    const [billsResult, repsResult] = await Promise.all([
      supabase.from('user_tracked_bills').select('*', { count: 'exact', head: true }),
      supabase.from('user_tracked_representatives').select('*', { count: 'exact', head: true })
    ]);
    
    console.log('\n📈 Total tracked items:');
    console.log('Tracked bills (all users):', billsResult.count || 0);
    console.log('Tracked representatives (all users):', repsResult.count || 0);
  } catch (e) {
    console.log('Count error:', e.message);
  }
}

testTrackedData().catch(console.error); 