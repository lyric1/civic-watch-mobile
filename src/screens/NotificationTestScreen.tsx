import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { notificationService } from '../services/notificationService';

interface NotificationTestScreenProps {
  navigation: any;
}

export default function NotificationTestScreen({ navigation }: NotificationTestScreenProps) {
  const [customTitle, setCustomTitle] = useState('Custom Test');
  const [customBody, setCustomBody] = useState('This is a custom test notification');

  const testScenarios = [
    {
      id: 'local',
      title: 'Local Notification',
      description: 'Test immediate local notification',
      icon: 'notifications',
      action: () => notificationService.scheduleLocalNotification(
        'Local Test',
        'This is a local notification test! 🔔'
      )
    },
    {
      id: 'bill_update',
      title: 'Bill Update',
      description: 'Simulate a bill status change',
      icon: 'document-text',
      action: () => notificationService.scheduleLocalNotification(
        'Bill Update',
        'H.R. 1234 has passed the House and moved to the Senate! 📄'
      )
    },
    {
      id: 'vote_alert',
      title: 'Vote Alert',
      description: 'Simulate a representative vote',
      icon: 'checkmark-circle',
      action: () => notificationService.scheduleLocalNotification(
        'Vote Alert',
        'Your representative just voted on the Infrastructure Bill! 🗳️'
      )
    },
    {
      id: 'new_bill',
      title: 'New Bill',
      description: 'Simulate a new bill introduction',
      icon: 'add-circle',
      action: () => notificationService.scheduleLocalNotification(
        'New Bill',
        'A new bill about climate change has been introduced! 🌱'
      )
    },
    {
      id: 'rep_news',
      title: 'Representative News',
      description: 'Simulate representative update',
      icon: 'person',
      action: () => notificationService.scheduleLocalNotification(
        'Representative Update',
        'Sen. Smith has announced a new town hall meeting! 👥'
      )
    },
    {
      id: 'weekly',
      title: 'Weekly Summary',
      description: 'Simulate weekly digest',
      icon: 'calendar',
      action: () => notificationService.scheduleLocalNotification(
        'Weekly Summary',
        'Your weekly legislative summary is ready! 📊'
      )
    }
  ];

  const testCustomNotification = () => {
    if (!customTitle.trim() || !customBody.trim()) {
      Alert.alert('Error', 'Please enter both title and body for the notification');
      return;
    }
    notificationService.scheduleLocalNotification(customTitle, customBody);
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
        <Text style={styles.headerTitle}>Notification Tests</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.sectionDescription}>
          Test different notification scenarios to see how they work in your app.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Tests</Text>
          {testScenarios.map((scenario) => (
            <TouchableOpacity
              key={scenario.id}
              style={styles.testItem}
              onPress={scenario.action}
            >
              <View style={styles.testIcon}>
                <Ionicons 
                  name={scenario.icon as keyof typeof Ionicons.glyphMap} 
                  size={24} 
                  color="#3b5bdb" 
                />
              </View>
              <View style={styles.testContent}>
                <Text style={styles.testTitle}>{scenario.title}</Text>
                <Text style={styles.testDescription}>{scenario.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Custom Notification</Text>
          <View style={styles.customNotificationCard}>
            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.input}
              value={customTitle}
              onChangeText={setCustomTitle}
              placeholder="Enter notification title"
              placeholderTextColor="#9ca3af"
            />
            
            <Text style={styles.inputLabel}>Body</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={customBody}
              onChangeText={setCustomBody}
              placeholder="Enter notification body"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
            />
            
            <TouchableOpacity
              style={styles.customTestButton}
              onPress={testCustomNotification}
            >
              <Ionicons name="send" size={20} color="#ffffff" />
              <Text style={styles.customTestButtonText}>Send Custom Test</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color="#3b5bdb" />
            <Text style={styles.infoText}>
              In Expo Go, notifications appear as alerts. In a development build or production app, they appear as real push notifications.
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
  placeholder: {
    width: 40,
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
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  testItem: {
    backgroundColor: '#1e2642',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  testIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b5bdb20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  testContent: {
    flex: 1,
    marginRight: 16,
  },
  testTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  testDescription: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
  },
  customNotificationCard: {
    backgroundColor: '#1e2642',
    borderRadius: 12,
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 8,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  customTestButton: {
    backgroundColor: '#3b5bdb',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  customTestButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 8,
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
}); 