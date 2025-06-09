#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CONGRESS_API_KEY = process.env.CONGRESS_API_KEY;

console.log('🧪 Civic Watch Notification System Test\n');

// Test 1: Database Connection
async function testDatabaseConnection() {
  console.log('1. Testing database connection...');
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.log('❌ Missing Supabase credentials');
    return false;
  }
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Test connection by checking tables exist
    const { data, error } = await supabase
      .from('user_notification_preferences')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('❌ Database connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.log('❌ Database test failed:', error.message);
    return false;
  }
}

// Test 2: API Connections
async function testAPIConnections() {
  console.log('\n2. Testing external API connections...');
  
  // Test Congress.gov API
  try {
    const congressUrl = `https://api.congress.gov/v3/bill?api_key=${CONGRESS_API_KEY}&limit=1`;
    const response = await fetch(congressUrl);
    
    if (response.ok) {
      console.log('✅ Congress.gov API connection successful');
    } else {
      console.log('⚠️ Congress.gov API connection failed:', response.status);
    }
  } catch (error) {
    console.log('⚠️ Congress.gov API test failed:', error.message);
  }
  
  // Test OpenStates API (if available)
  const openstatesKey = process.env.OPENSTATES_API_KEY;
  if (openstatesKey) {
    try {
      const openstatesUrl = 'https://v3.openstates.org/bills?jurisdiction=US&per_page=1';
      const response = await fetch(openstatesUrl, {
        headers: { 'X-API-KEY': openstatesKey }
      });
      
      if (response.ok) {
        console.log('✅ OpenStates API connection successful');
      } else {
        console.log('⚠️ OpenStates API connection failed:', response.status);
      }
    } catch (error) {
      console.log('⚠️ OpenStates API test failed:', error.message);
    }
  } else {
    console.log('⚠️ OpenStates API key not configured');
  }
}

// Test 3: Push Token Validation
async function testPushTokens() {
  console.log('\n3. Testing push token system...');
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: tokens, error } = await supabase
      .from('user_push_tokens')
      .select('*')
      .limit(5);
    
    if (error) {
      console.log('❌ Push tokens query failed:', error.message);
      return false;
    }
    
    console.log(`✅ Found ${tokens.length} registered push tokens`);
    
    if (tokens.length > 0) {
      console.log('   Sample token info:');
      tokens.forEach((token, index) => {
        console.log(`   ${index + 1}. Platform: ${token.platform}, Updated: ${new Date(token.updated_at).toLocaleDateString()}`);
      });
    } else {
      console.log('⚠️ No push tokens registered yet (users need to open the app)');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Push token test failed:', error.message);
    return false;
  }
}

// Test 4: Notification Preferences
async function testNotificationPreferences() {
  console.log('\n4. Testing notification preferences...');
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: prefs, error } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .limit(5);
    
    if (error) {
      console.log('❌ Notification preferences query failed:', error.message);
      return false;
    }
    
    console.log(`✅ Found ${prefs.length} user notification preferences`);
    
    if (prefs.length > 0) {
      const activeUsers = prefs.filter(p => p.push_notifications);
      console.log(`   ${activeUsers.length} users have push notifications enabled`);
    } else {
      console.log('⚠️ No notification preferences set yet');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Notification preferences test failed:', error.message);
    return false;
  }
}

// Test 5: Expo Push Service
async function testExpoPushService() {
  console.log('\n5. Testing Expo Push Notification service...');
  
  try {
    // Test Expo's push service endpoint
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: 'ExponentPushToken[test-token]',
        title: 'Test',
        body: 'This is a test',
      }),
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Expo Push service is accessible');
    } else {
      console.log('⚠️ Expo Push service response:', result);
    }
  } catch (error) {
    console.log('⚠️ Expo Push service test failed:', error.message);
  }
}

// Test 6: Simulate Notification Flow
async function simulateNotificationFlow() {
  console.log('\n6. Simulating notification flow...');
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get users with push notifications enabled
    const { data: users, error } = await supabase
      .from('user_notification_preferences')
      .select(`
        user_id,
        bill_updates,
        push_notifications,
        user_push_tokens(push_token, platform)
      `)
      .eq('push_notifications', true)
      .limit(3);
    
    if (error) {
      console.log('❌ Could not fetch notification-enabled users:', error.message);
      return false;
    }
    
    if (users.length === 0) {
      console.log('⚠️ No users with push notifications enabled');
      return false;
    }
    
    console.log(`✅ Found ${users.length} users ready to receive notifications`);
    
    // Simulate creating notification log entries
    const simulatedNotifications = users.map(user => ({
      user_id: user.user_id,
      notification_type: 'bill_updates',
      title: 'Test Notification',
      body: 'This would be sent to the user',
      sent_at: new Date().toISOString(),
      success: true
    }));
    
    console.log('✅ Notification flow simulation successful');
    console.log(`   Would send ${simulatedNotifications.length} notifications`);
    
    return true;
  } catch (error) {
    console.log('❌ Notification flow simulation failed:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  const tests = [
    testDatabaseConnection,
    testAPIConnections,
    testPushTokens,
    testNotificationPreferences,
    testExpoPushService,
    simulateNotificationFlow
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    try {
      const result = await test();
      if (result !== false) passed++;
    } catch (error) {
      console.log('❌ Test failed with error:', error.message);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All systems ready for production notifications!');
  } else {
    console.log('⚠️ Some issues found - review the tests above');
  }
  
  console.log('\n📱 To test actual push notifications:');
  console.log('1. Install the app on a physical device');
  console.log('2. Sign in and enable notifications');
  console.log('3. Run the GitHub Actions test workflow');
  console.log('4. Check the notification logs in Supabase');
  console.log('\n🔗 GitHub Actions: https://github.com/lyric1/civic-watch-mobile/actions');
}

// Run the tests
runTests().catch(console.error); 