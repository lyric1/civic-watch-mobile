import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { notificationService, NotificationPreferences } from '../services/notificationService';

interface NotificationsScreenProps {
  navigation: any;
}

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  icon: string;
}

export default function NotificationsScreen({ navigation }: NotificationsScreenProps) {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    {
      id: 'bill_updates',
      title: 'Bill Updates',
      description: 'Get notified when tracked bills are updated',
      enabled: true,
      icon: 'document-text-outline',
    },
    {
      id: 'vote_alerts',
      title: 'Vote Alerts',
      description: 'Alerts when representatives vote on tracked bills',
      enabled: true,
      icon: 'checkmark-circle-outline',
    },
    {
      id: 'new_bills',
      title: 'New Bills',
      description: 'Notifications for new bills in your areas of interest',
      enabled: false,
      icon: 'add-circle-outline',
    },
    {
      id: 'representative_news',
      title: 'Representative News',
      description: 'Updates about your representatives',
      enabled: true,
      icon: 'people-outline',
    },
    {
      id: 'weekly_summary',
      title: 'Weekly Summary',
      description: 'Weekly recap of legislative activity',
      enabled: true,
      icon: 'calendar-outline',
    },
    {
      id: 'push_notifications',
      title: 'Push Notifications',
      description: 'Allow push notifications from the app',
      enabled: true,
      icon: 'notifications-outline',
    },
    {
      id: 'email_notifications',
      title: 'Email Notifications',
      description: 'Receive notifications via email',
      enabled: false,
      icon: 'mail-outline',
    },
  ]);

  useEffect(() => {
    initializeNotifications();
  }, [userProfile]);

  const initializeNotifications = async () => {
    if (!userProfile?.id) return;

    setInitializing(true);
    try {
      // Initialize notification service
      const initialized = await notificationService.initialize();
      
      if (initialized) {
        // Register push token
        await notificationService.registerPushToken(userProfile.id);
      }

      // Load user's notification preferences
      const preferences = await notificationService.getNotificationPreferences(userProfile.id);
      
      if (preferences) {
        setNotifications(prev => 
          prev.map(notification => ({
            ...notification,
            enabled: preferences[notification.id as keyof NotificationPreferences],
          }))
        );
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
    } finally {
      setInitializing(false);
    }
  };

  const toggleNotification = async (id: string) => {
    // Handle push notification permission specially
    if (id === 'push_notifications') {
      const currentSetting = notifications.find(n => n.id === id)?.enabled;
      if (!currentSetting) {
        // User is trying to enable push notifications
        const initialized = await notificationService.initialize();
        if (!initialized) {
          Alert.alert(
            'Permission Required',
            'Please enable notifications in your device settings to receive push notifications.',
            [{ text: 'OK' }]
          );
          return;
        }
      }
    }

    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, enabled: !notification.enabled }
          : notification
      )
    );
  };

  const saveSettings = async () => {
    if (!userProfile?.id) {
      Alert.alert('Error', 'Please sign in to save notification settings');
      return;
    }

    setLoading(true);
    try {
      // Convert notifications array to preferences object
      const preferences: NotificationPreferences = {
        bill_updates: notifications.find(n => n.id === 'bill_updates')?.enabled || false,
        vote_alerts: notifications.find(n => n.id === 'vote_alerts')?.enabled || false,
        new_bills: notifications.find(n => n.id === 'new_bills')?.enabled || false,
        representative_news: notifications.find(n => n.id === 'representative_news')?.enabled || false,
        weekly_summary: notifications.find(n => n.id === 'weekly_summary')?.enabled || false,
        push_notifications: notifications.find(n => n.id === 'push_notifications')?.enabled || false,
        email_notifications: notifications.find(n => n.id === 'email_notifications')?.enabled || false,
      };

      const success = await notificationService.saveNotificationPreferences(userProfile.id, preferences);
      
      if (success) {
        Alert.alert('Success', 'Notification settings saved successfully!');
        
        // Test notification if push notifications are enabled
        if (preferences.push_notifications) {
          await notificationService.scheduleLocalNotification(
            'Settings Saved',
            'Your notification preferences have been updated!'
          );
        }
      } else {
        Alert.alert('Error', 'Failed to save notification settings. Please try again.');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'An error occurred while saving settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity 
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={saveSettings}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.sectionDescription}>
          Choose what notifications you'd like to receive to stay informed about legislative activity.
        </Text>

        <View style={styles.notificationsSection}>
          {notifications.map((notification) => (
            <View key={notification.id} style={styles.notificationItem}>
              <View style={styles.notificationIcon}>
                <Ionicons 
                  name={notification.icon as keyof typeof Ionicons.glyphMap} 
                  size={24} 
                  color="#3b5bdb" 
                />
              </View>
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                <Text style={styles.notificationDescription}>{notification.description}</Text>
              </View>
              <Switch
                value={notification.enabled}
                onValueChange={() => toggleNotification(notification.id)}
                trackColor={{ false: '#374151', true: '#3b5bdb' }}
                thumbColor={notification.enabled ? '#ffffff' : '#9ca3af'}
                ios_backgroundColor="#374151"
                disabled={initializing}
              />
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.testButton}
          onPress={async () => {
            await notificationService.scheduleLocalNotification(
              'Test Notification',
              'This is a test notification from Civic Watch! 🔔'
            );
          }}
        >
          <Ionicons name="notifications" size={20} color="#ffffff" />
          <Text style={styles.testButtonText}>Test Notification</Text>
        </TouchableOpacity>

        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color="#3b5bdb" />
            <Text style={styles.infoText}>
              You can change these settings anytime. Push notifications require device permissions.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#151c2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3b5bdb',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  sectionDescription: {
    fontSize: 16,
    color: '#9ca3af',
    lineHeight: 24,
    marginBottom: 30,
  },
  notificationsSection: {
    gap: 16,
    marginBottom: 30,
  },
  notificationItem: {
    backgroundColor: '#1e2642',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b5bdb20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  notificationContent: {
    flex: 1,
    marginRight: 16,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  notificationDescription: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
  },
  infoSection: {
    marginTop: 20,
  },
  infoCard: {
    backgroundColor: '#1e2642',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: 14,
    color: '#9ca3af',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  testButton: {
    backgroundColor: '#3b5bdb',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 8,
  },
}); 