# 🔔 Notification System Setup Guide

This guide will help you set up the complete notification system for the Civic Watch mobile app.

## 📋 Overview

The notification system includes:
- ✅ **Push Notifications** - Real-time alerts to user devices
- ✅ **Preference Management** - User-customizable notification settings  
- ✅ **Database Tables** - Proper storage for tokens and preferences
- ✅ **Permission Handling** - Native device permission requests
- ✅ **Testing Tools** - Built-in notification testing

## 🚀 Quick Start

### 1. Database Setup

Deploy the notification tables to your Supabase project:

```bash
# Deploy all migrations (includes notification tables)
npm run db:migrate
```

This creates:
- `user_push_tokens` - Stores device push tokens
- `user_notification_preferences` - User preference settings
- `notification_logs` - Event logging for debugging

### 2. App Configuration

The notification system is already integrated into:
- ✅ **NotificationsScreen** - User preference management UI
- ✅ **AuthContext** - Automatic token registration on login
- ✅ **NotificationService** - Core notification functionality

### 3. Test the System

1. **Run the app**: `npm start`
2. **Sign in** to any user account
3. **Navigate to Profile → Notifications**
4. **Enable push notifications** (will request device permission)
5. **Save settings** (triggers a test notification)

## 🔧 Detailed Setup

### Database Migration

The migration includes:

```sql
-- Core tables for notification system
user_push_tokens              -- Device tokens per user/platform
user_notification_preferences -- User settings for each notification type
notification_logs             -- Event logging and analytics

-- Security features
Row Level Security (RLS)      -- Users only see their own data
Proper foreign key constraints
Cascading deletes on user removal

-- Performance optimizations  
Indexes on frequently queried columns
Auto-updating timestamps via triggers
```

### Notification Types

The system supports these notification categories:

- 📄 **Bill Updates** - When tracked bills change status
- 🗳️ **Vote Alerts** - When representatives vote on tracked bills
- 🆕 **New Bills** - New legislation in areas of interest
- 👥 **Representative News** - Updates about tracked representatives
- 📅 **Weekly Summary** - Weekly legislative activity recap
- 📱 **Push Notifications** - Device notification permissions
- 📧 **Email Notifications** - Email delivery preferences

### Permission Flow

```typescript
// Automatic permission request when user enables push notifications
const enabled = await notificationService.initialize();
if (enabled) {
  await notificationService.registerPushToken(userId);
}
```

## 🧪 Testing

### Manual Testing

1. **Enable notifications** in Profile → Notifications
2. **Save settings** - should show success and trigger test notification
3. **Check device** - notification should appear in notification center

### Programmatic Testing

```typescript
// Send a test notification
await notificationService.scheduleLocalNotification(
  'Test Title',
  'Test message body'
);
```

## 📱 Platform-Specific Notes

### iOS
- Requires proper app signing for push notifications
- Notifications appear in notification center and as banners
- Sound and vibration are customizable

### Android  
- Uses notification channels for categorization
- Custom notification icon and color configured
- Supports rich notifications with actions

## 🔍 Debugging

### Common Issues

1. **Permissions denied**
   - Check device settings → App → Notifications
   - Re-enable in app settings

2. **Tokens not saving**
   - Check Supabase logs
   - Verify RLS policies are correct
   - Ensure user is authenticated

3. **Notifications not appearing**
   - Test on physical device (not simulator)
   - Check notification service initialization
   - Verify expo push token generation

### Debug Commands

```bash
# Check migration status
npm run db:status

# View Supabase logs  
supabase logs

# Test notification service
# (Add debug logs in notificationService.ts)
```

## 🚀 Production Deployment

### 1. Environment Variables

Ensure these are set in production:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_PROJECT_ID=your-expo-project-id
```

### 2. App Store Configuration

**iOS (Apple App Store)**
- Enable push notification capability in Xcode
- Configure APNs certificates in Apple Developer Console
- Test with TestFlight before release

**Android (Google Play Store)**  
- Configure Firebase Cloud Messaging (if needed)
- Test notification channels and categories
- Ensure proper notification icons are included

### 3. Backend Notification Sending

The database is now ready to support a backend notification service that can:
- Query user preferences before sending
- Log notification events for analytics
- Handle failed deliveries and retries
- Send targeted notifications based on user interests

## 📚 API Reference

### NotificationService Methods

```typescript
// Initialize and request permissions
await notificationService.initialize()

// Register device token  
await notificationService.registerPushToken(userId)

// Save user preferences
await notificationService.saveNotificationPreferences(userId, preferences)

// Get user preferences
const prefs = await notificationService.getNotificationPreferences(userId)

// Send local notification
await notificationService.scheduleLocalNotification(title, body, data)
```

### Database Queries

```sql
-- Get user notification preferences
SELECT * FROM user_notification_preferences WHERE user_id = $1;

-- Get user push tokens
SELECT push_token, platform FROM user_push_tokens WHERE user_id = $1;

-- Log notification event
INSERT INTO notification_logs (user_id, notification_type, title, body, data)
VALUES ($1, $2, $3, $4, $5);
```

## 🎉 Next Steps

With the notification system set up, you can now:

1. **Build notification sending service** - Backend service to send targeted notifications
2. **Add more notification types** - Extend the system for new features
3. **Implement rich notifications** - Add images, actions, and interactive elements
4. **Analytics and reporting** - Use notification_logs for insights
5. **A/B testing** - Test different notification strategies

The foundation is complete and ready for production use! 🚀 