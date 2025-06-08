import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

export default function HomeScreen({ navigation }: any) {
  const { userProfile } = useAuth();

  const features = [
    {
      icon: 'document-text-outline',
      title: 'Track Bills',
      description: 'Stay updated on legislation that matters to you',
      action: () => navigation.navigate('Dashboard'),
    },
    {
      icon: 'people-outline',
      title: 'Your Representatives',
      description: 'Connect with your elected officials',
      action: () => navigation.navigate('Dashboard'),
    },
    {
      icon: 'notifications-outline',
      title: 'Smart Alerts',
      description: 'Get notified about important updates',
      action: () => navigation.navigate('Profile'),
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Welcome{userProfile?.fullName ? `, ${userProfile.fullName}` : ''}!
        </Text>
        <Text style={styles.subtitle}>
          Stay informed about your civic engagement
        </Text>
      </View>

      <View style={styles.featuresContainer}>
        <Text style={styles.sectionTitle}>What you can do</Text>
        {features.map((feature, index) => (
          <TouchableOpacity
            key={index}
            style={styles.featureCard}
            onPress={feature.action}
          >
            <View style={styles.featureIcon}>
              <Ionicons 
                name={feature.icon as keyof typeof Ionicons.glyphMap} 
                size={32} 
                color="#3b5bdb" 
              />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Text style={styles.actionButtonText}>View Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
            Update Profile
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Civic Watch helps you stay engaged with your democracy
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#151c2e',
  },
  contentContainer: {
    paddingBottom: 100,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#151c2e',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
    lineHeight: 22,
  },
  featuresContainer: {
    padding: 20,
    backgroundColor: '#151c2e',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  featureCard: {
    backgroundColor: '#1e2642',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b5bdb20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 18,
  },
  quickActions: {
    padding: 20,
    backgroundColor: '#151c2e',
  },
  actionButton: {
    backgroundColor: '#3b5bdb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#374151',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: '#9ca3af',
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#151c2e',
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
}); 