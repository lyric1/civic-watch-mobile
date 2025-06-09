# 🚀 Production Notification Verification Guide

## ✅ Pre-Production Checklist

### 1. **Database Setup Verification**
- [ ] Supabase project is set up and accessible
- [ ] All notification tables exist (`user_push_tokens`, `user_notification_preferences`, `notification_logs`)
- [ ] Row Level Security (RLS) is enabled and policies are active
- [ ] Database migrations have been run successfully

### 2. **GitHub Actions Secrets**
- [ ] `SUPABASE_URL` is set in Dev environment
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set in Dev environment  
- [ ] `CONGRESS_API_KEY` is set (get from https://api.congress.gov/sign-up/)
- [ ] `OPENSTATES_API_KEY` is set (optional, from https://openstates.org/accounts/profile/)

### 3. **Workflow Testing**
- [ ] Manual workflow runs successfully (GitHub Actions → "Manual Test Notifications")
- [ ] Hourly workflow is scheduled and active
- [ ] No errors in workflow logs

## 🧪 **Step-by-Step Production Testing**

### **Phase 1: Infrastructure Testing**

1. **Run Local Test Script**
   ```bash
   cd scripts
   # Set your real credentials:
   export SUPABASE_URL="https://your-project.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   export CONGRESS_API_KEY="your-congress-api-key"
   
   node test-notification-system.js
   ```
   
   **Expected Results:**
   - ✅ Database connection successful
   - ✅ Congress.gov API connection successful
   - ✅ Expo Push service is accessible
   - ⚠️ May show "No push tokens registered yet" (normal if no users)

### **Phase 2: App Integration Testing**

2. **Install App on Physical Device**
   ```bash
   # Build and install on device
   npx expo build:android  # or build:ios
   # OR for development:
   npx expo start --dev-client
   ```

3. **Register Push Token**
   - Open app on physical device
   - Sign in with a test account
   - Go to Profile → Notifications
   - Enable push notifications (should prompt for permission)
   - Save notification preferences

4. **Verify Database Registration**
   ```sql
   -- Check in Supabase dashboard:
   SELECT * FROM user_push_tokens;
   SELECT * FROM user_notification_preferences;
   ```

### **Phase 3: End-to-End Testing**

5. **Trigger Test Notification**
   - Go to GitHub Actions → "Manual Test Notifications"
   - Click "Run workflow" 
   - Wait for completion (should be ~1-2 minutes)

6. **Verify Notification Delivery**
   - Check device for push notification
   - Check Supabase `notification_logs` table:
   ```sql
   SELECT * FROM notification_logs ORDER BY created_at DESC LIMIT 10;
   ```

7. **Monitor Automated Workflow**
   - Wait for next hourly run (check GitHub Actions)
   - Verify it runs without errors
   - Check notification logs for any new entries

## 🔍 **Production Monitoring**

### **Daily Checks**
- [ ] GitHub Actions workflows running successfully
- [ ] No errors in workflow logs  
- [ ] Notification logs show successful deliveries
- [ ] No failed push token deliveries in Expo

### **Weekly Checks**
- [ ] Review notification analytics in Supabase
- [ ] Check API rate limits (Congress.gov: 5000/hour, OpenStates: varies)
- [ ] Monitor user engagement with notifications

### **Monthly Checks**
- [ ] Update API keys if needed
- [ ] Review and optimize notification content
- [ ] Check for new legislative data sources

## 🚨 **Troubleshooting Common Issues**

### **"No notifications received"**
1. Check device has push permissions enabled
2. Verify user has notifications enabled in app
3. Check push token is valid in database
4. Test with Expo's push tool: https://expo.dev/notifications

### **"GitHub Actions failing"**
1. Check all secrets are set correctly
2. Verify API keys are valid and have rate limit remaining
3. Check Supabase database is accessible
4. Review workflow logs for specific errors

### **"Database connection issues"**
1. Verify Supabase project is active
2. Check service role key permissions
3. Ensure database migrations are applied
4. Test connection with Supabase dashboard

## 📊 **Success Metrics**

### **Technical Metrics**
- [ ] 0% workflow failure rate
- [ ] <5% push notification delivery failure rate
- [ ] Database queries complete in <2 seconds
- [ ] API calls stay within rate limits

### **User Engagement Metrics**
- [ ] Users enable push notifications (target: >50%)
- [ ] Users customize notification preferences
- [ ] Low notification opt-out rate (<10%)
- [ ] High notification click-through rate (>20%)

## 🎯 **Production Readiness Criteria**

✅ **Ready for Production When:**
- [ ] All infrastructure tests pass
- [ ] Successful end-to-end test with real device
- [ ] Automated workflows run without errors for 24+ hours
- [ ] At least one successful notification delivery logged
- [ ] All monitoring dashboards are accessible

## 📱 **User Testing Checklist**

### **New User Flow**
1. [ ] Download and install app
2. [ ] Sign up for account
3. [ ] Complete address setup
4. [ ] Navigate to notifications settings
5. [ ] Enable push notifications (permission prompt)
6. [ ] Customize notification preferences
7. [ ] Receive first notification within 24 hours

### **Existing User Flow**
1. [ ] App update doesn't break notification preferences
2. [ ] Push tokens are re-registered after app updates
3. [ ] Notification preferences persist across app sessions
4. [ ] Users can modify preferences without issues

---

## 🔗 **Quick Links**

- **GitHub Actions**: https://github.com/lyric1/civic-watch-mobile/actions
- **Supabase Dashboard**: https://app.supabase.com
- **Expo Push Notifications Tool**: https://expo.dev/notifications
- **Congress.gov API**: https://api.congress.gov
- **OpenStates API**: https://openstates.org/api/

---

**Remember**: Push notifications only work on physical devices, not simulators/emulators! 