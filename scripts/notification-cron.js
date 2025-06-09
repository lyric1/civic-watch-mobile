#!/usr/bin/env node

// Civic Watch - Notification Cron Job
// This script checks for legislative updates and sends notifications to users

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CONGRESS_API_KEY = process.env.CONGRESS_API_KEY;
const OPENSTATES_API_KEY = process.env.OPENSTATES_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

class NotificationService {
  constructor() {
    this.lastRunTime = null;
  }

  async run() {
    console.log('🔔 Starting notification check...', new Date().toISOString());
    
    try {
      // Get the last run time from database
      await this.getLastRunTime();
      
      // Check for different types of updates
      await Promise.all([
        this.checkBillUpdates(),
        this.checkVoteUpdates(),
        this.checkNewBills(),
        this.checkRepresentativeNews()
      ]);
      
      // Update last run time
      await this.updateLastRunTime();
      
      console.log('✅ Notification check completed');
    } catch (error) {
      console.error('❌ Error in notification service:', error);
    }
  }

  async getLastRunTime() {
    const { data, error } = await supabase
      .from('notification_logs')
      .select('sent_at')
      .eq('notification_type', 'cron_run')
      .order('sent_at', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      this.lastRunTime = new Date(data[0].sent_at);
    } else {
      // First run - check last 24 hours
      this.lastRunTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }
    
    console.log('📅 Last run time:', this.lastRunTime);
  }

  async updateLastRunTime() {
    await supabase
      .from('notification_logs')
      .insert({
        user_id: 'system',
        notification_type: 'cron_run',
        title: 'Cron job executed',
        body: 'Notification check completed',
        data: { timestamp: new Date().toISOString() }
      });
  }

  async checkBillUpdates() {
    console.log('📄 Checking bill updates...');
    
    try {
      // Get users who want bill updates
      const { data: users, error } = await supabase
        .from('user_notification_preferences')
        .select(`
          user_id,
          bill_updates,
          users!inner(id, fullName)
        `)
        .eq('bill_updates', true)
        .eq('push_notifications', true);

      if (error) throw error;

      // Get tracked bills for these users
      for (const user of users || []) {
        const { data: trackedBills } = await supabase
          .from('user_tracked_bills')
          .select('bill_id, bills(*)')
          .eq('user_id', user.user_id);

        for (const tracked of trackedBills || []) {
          // Check if bill status changed
          const updatedBill = await this.fetchBillDetails(tracked.bill_id);
          
          if (updatedBill && this.hasBillChanged(tracked.bills, updatedBill)) {
            await this.sendNotification(user.user_id, {
              title: 'Bill Update',
              body: `${tracked.bills.title} status changed to: ${updatedBill.status}`,
              data: { billId: tracked.bill_id, type: 'bill_update' }
            });
          }
        }
      }
    } catch (error) {
      console.error('Error checking bill updates:', error);
    }
  }

  async checkVoteUpdates() {
    console.log('🗳️ Checking vote updates...');
    
    // Similar logic for checking recent votes
    // Check if tracked representatives voted on tracked bills
  }

  async checkNewBills() {
    console.log('🆕 Checking new bills...');
    
    try {
      // Get users who want new bill notifications
      const { data: users } = await supabase
        .from('user_notification_preferences')
        .select('user_id, new_bills')
        .eq('new_bills', true)
        .eq('push_notifications', true);

      // Fetch recent bills from Congress API
      const recentBills = await this.fetchRecentBills();
      
      for (const bill of recentBills) {
        // Check if users might be interested based on their tracked topics/representatives
        for (const user of users || []) {
          if (await this.isUserInterestedInBill(user.user_id, bill)) {
            await this.sendNotification(user.user_id, {
              title: 'New Bill Introduced',
              body: `${bill.title}`,
              data: { billId: bill.id, type: 'new_bill' }
            });
          }
        }
      }
    } catch (error) {
      console.error('Error checking new bills:', error);
    }
  }

  async checkRepresentativeNews() {
    console.log('👥 Checking representative updates...');
    
    // Check for representative voting records, statements, etc.
  }

  async fetchBillDetails(billId) {
    if (!CONGRESS_API_KEY) return null;
    
    try {
      const response = await fetch(
        `https://api.congress.gov/v3/bill/${billId}?api_key=${CONGRESS_API_KEY}`
      );
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('Error fetching bill details:', error);
      return null;
    }
  }

  async fetchRecentBills() {
    if (!CONGRESS_API_KEY) return [];
    
    try {
      const since = this.lastRunTime.toISOString().split('T')[0];
      const response = await fetch(
        `https://api.congress.gov/v3/bill?fromDateTime=${since}&api_key=${CONGRESS_API_KEY}`
      );
      
      if (response.ok) {
        const data = await response.json();
        return data.bills || [];
      }
    } catch (error) {
      console.error('Error fetching recent bills:', error);
    }
    
    return [];
  }

  hasBillChanged(oldBill, newBill) {
    // Compare bill status, actions, etc.
    return oldBill.status !== newBill.status ||
           oldBill.latest_action_date !== newBill.latest_action_date;
  }

  async isUserInterestedInBill(userId, bill) {
    // Check if user tracks representatives who sponsored the bill
    // Or if bill contains keywords from user's interests
    // This is a simplified version
    return Math.random() > 0.9; // Only notify 10% of users to avoid spam
  }

  async sendNotification(userId, notification) {
    try {
      // Get user's push tokens
      const { data: tokens } = await supabase
        .from('user_push_tokens')
        .select('push_token, platform')
        .eq('user_id', userId);

      // Log notification
      await supabase
        .from('notification_logs')
        .insert({
          user_id: userId,
          notification_type: notification.data.type,
          title: notification.title,
          body: notification.body,
          data: notification.data
        });

      // Send push notifications via Expo
      for (const token of tokens || []) {
        await this.sendExpoPushNotification(token.push_token, notification);
      }

      console.log(`📤 Sent notification to user ${userId}: ${notification.title}`);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  async sendExpoPushNotification(pushToken, notification) {
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: pushToken,
          title: notification.title,
          body: notification.body,
          data: notification.data,
          sound: 'default',
          badge: 1
        })
      });

      if (!response.ok) {
        console.error('Failed to send push notification:', await response.text());
      }
    } catch (error) {
      console.error('Error sending Expo push notification:', error);
    }
  }
}

// Run the service
async function main() {
  const service = new NotificationService();
  await service.run();
}

// Handle different execution modes
if (require.main === module) {
  // Direct execution
  main().catch(console.error);
} else {
  // Module export for testing
  module.exports = NotificationService;
} 