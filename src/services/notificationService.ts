import { Platform, Alert } from 'react-native';
import { supabase } from '../lib/supabase';

export interface NotificationPreferences {
  bill_updates: boolean;
  vote_alerts: boolean;
  new_bills: boolean;
  representative_news: boolean;
  weekly_summary: boolean;
  push_notifications: boolean;
  email_notifications: boolean;
}

// Conditionally import notifications only when available
let Notifications: any = null;
let Device: any = null;

try {
  // Only import if we're in a development build or production
  if (typeof __DEV__ === 'undefined' || !__DEV__) {
    Notifications = require('expo-notifications');
    Device = require('expo-device');
  } else {
    // Check if we're in a development build (has native modules)
    try {
      Notifications = require('expo-notifications');
      Device = require('expo-device');
      
      // Configure notification handler only if modules are available
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    } catch (error) {
      console.log('expo-notifications not available in this environment (Expo Go)');
      Notifications = null;
      Device = null;
    }
  }
} catch (error) {
  console.log('expo-notifications not available:', error instanceof Error ? error.message : 'Unknown error');
  Notifications = null;
  Device = null;
}

class NotificationService {
  private expoPushToken: string | null = null;

  async initialize() {
    // If notifications aren't available, return false gracefully
    if (!Notifications || !Device) {
      console.log('Notifications not available in this environment');
      if (__DEV__) {
        Alert.alert(
          'Development Notice',
          'Push notifications require a development build or device testing. Notification preferences will still be saved.',
          [{ text: 'OK' }]
        );
      }
      return false;
    }

    try {
      // Only run on physical devices
      if (!Device.isDevice) {
        console.log('Notifications only work on physical devices');
        return false;
      }

      // Get existing permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not already granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return false;
      }

      // Get the push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      });
      
      this.expoPushToken = token.data;
      console.log('Expo push token:', this.expoPushToken);

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3b5bdb',
        });
      }

      return true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  async registerPushToken(userId: string) {
    if (!this.expoPushToken) {
      console.log('No push token available');
      return false;
    }

    try {
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: userId,
          push_token: this.expoPushToken,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error saving push token:', error);
        return false;
      }

      console.log('Push token registered successfully');
      return true;
    } catch (error) {
      console.error('Exception registering push token:', error);
      return false;
    }
  }

  async saveNotificationPreferences(userId: string, preferences: NotificationPreferences) {
    try {
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: userId,
          bill_updates: preferences.bill_updates,
          vote_alerts: preferences.vote_alerts,
          new_bills: preferences.new_bills,
          representative_news: preferences.representative_news,
          weekly_summary: preferences.weekly_summary,
          push_notifications: preferences.push_notifications,
          email_notifications: preferences.email_notifications,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error saving notification preferences:', error);
        return false;
      }

      console.log('Notification preferences saved successfully');
      return true;
    } catch (error) {
      console.error('Exception saving notification preferences:', error);
      return false;
    }
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching notification preferences:', error);
        return null;
      }

      if (!data) {
        // Return default preferences if none exist
        return {
          bill_updates: true,
          vote_alerts: true,
          new_bills: false,
          representative_news: true,
          weekly_summary: true,
          push_notifications: true,
          email_notifications: false,
        };
      }

      return {
        bill_updates: data.bill_updates,
        vote_alerts: data.vote_alerts,
        new_bills: data.new_bills,
        representative_news: data.representative_news,
        weekly_summary: data.weekly_summary,
        push_notifications: data.push_notifications,
        email_notifications: data.email_notifications,
      };
    } catch (error) {
      console.error('Exception fetching notification preferences:', error);
      return null;
    }
  }

  async scheduleLocalNotification(title: string, body: string, data?: any) {
    if (!Notifications) {
      // Fallback to alert in development
      if (__DEV__) {
        Alert.alert(title, body);
      }
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      // Fallback to alert
      if (__DEV__) {
        Alert.alert(title, body);
      }
    }
  }

  async cancelAllNotifications() {
    if (!Notifications) {
      return;
    }

    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling notifications:', error);
    }
  }

  addNotificationReceivedListener(listener: (notification: any) => void) {
    if (!Notifications) {
      return { remove: () => {} };
    }
    return Notifications.addNotificationReceivedListener(listener);
  }

  addNotificationResponseReceivedListener(listener: (response: any) => void) {
    if (!Notifications) {
      return { remove: () => {} };
    }
    return Notifications.addNotificationResponseReceivedListener(listener);
  }
}

export const notificationService = new NotificationService(); 