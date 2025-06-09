import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HelpSupportScreenProps {
  navigation: any;
}

interface FAQItem {
  question: string;
  answer: string;
  expanded?: boolean;
}

interface SupportOption {
  icon: string;
  title: string;
  description: string;
  action: () => void;
}

export default function HelpSupportScreen({ navigation }: HelpSupportScreenProps) {
  const [faqs, setFaqs] = useState<FAQItem[]>([
    {
      question: 'How do I track a bill?',
      answer: 'Navigate to the Discover tab, search for bills by keyword or browse by category, then tap the bookmark icon to add them to your tracked list.',
      expanded: false,
    },
    {
      question: 'How accurate is the bill information?',
      answer: 'We source our data directly from official government APIs and update it regularly. However, we recommend verifying critical information through official government sources.',
      expanded: false,
    },
    {
      question: 'Can I customize my notifications?',
      answer: 'Yes! Go to Profile > Notifications to customize when and how you receive alerts about bill updates, votes, and other legislative activity.',
      expanded: false,
    },
    {
      question: 'What does the Pro subscription include?',
      answer: 'Pro includes unlimited bill tracking, AI-powered summaries, advanced analytics, priority support, and early access to new features.',
      expanded: false,
    },
    {
      question: 'How do I find my representatives?',
      answer: 'Your representatives are automatically identified based on your address. Make sure your location is set correctly in your profile settings.',
      expanded: false,
    },
    {
      question: 'Is my data secure?',
      answer: 'Yes, we use industry-standard encryption and security practices. We never sell your data and only use it to provide you with personalized legislative information.',
      expanded: false,
    },
  ]);

  const supportOptions: SupportOption[] = [
    {
      icon: 'mail-outline',
      title: 'Email Support',
      description: 'Get help via email within 24 hours',
      action: () => Linking.openURL('mailto:support@civicwatch.com'),
    },
    {
      icon: 'chatbubble-outline',
      title: 'Live Chat',
      description: 'Chat with our support team',
      action: () => Alert.alert('Coming Soon', 'Live chat will be available soon'),
    },
    {
      icon: 'call-outline',
      title: 'Phone Support',
      description: 'Pro members get priority phone support',
      action: () => Linking.openURL('tel:+1-555-CIVIC-01'),
    },
    {
      icon: 'document-text-outline',
      title: 'User Guide',
      description: 'Comprehensive guide to using Civic Watch',
      action: () => Alert.alert('Coming Soon', 'User guide will be available soon'),
    },
  ];

  const toggleFAQ = (index: number) => {
    setFaqs(prev => 
      prev.map((faq, i) => 
        i === index ? { ...faq, expanded: !faq.expanded } : faq
      )
    );
  };

  const handleReportBug = () => {
    const subject = 'Bug Report - Civic Watch Mobile';
    const body = 'Please describe the bug you encountered:\n\n';
    Linking.openURL(`mailto:support@civicwatch.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const handleFeatureRequest = () => {
    const subject = 'Feature Request - Civic Watch Mobile';
    const body = 'Please describe the feature you would like to see:\n\n';
    Linking.openURL(`mailto:support@civicwatch.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
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
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickAction} onPress={handleReportBug}>
              <Ionicons name="bug-outline" size={24} color="#ef4444" />
              <Text style={styles.quickActionText}>Report Bug</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={handleFeatureRequest}>
              <Ionicons name="bulb-outline" size={24} color="#3b5bdb" />
              <Text style={styles.quickActionText}>Request Feature</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Support Options */}
        <View style={styles.supportSection}>
          <Text style={styles.sectionTitle}>Get Support</Text>
          <View style={styles.supportOptions}>
            {supportOptions.map((option, index) => (
              <TouchableOpacity 
                key={index}
                style={styles.supportOption}
                onPress={option.action}
              >
                <View style={styles.supportOptionIcon}>
                  <Ionicons 
                    name={option.icon as keyof typeof Ionicons.glyphMap} 
                    size={24} 
                    color="#3b5bdb" 
                  />
                </View>
                <View style={styles.supportOptionContent}>
                  <Text style={styles.supportOptionTitle}>{option.title}</Text>
                  <Text style={styles.supportOptionDescription}>{option.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6b7280" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <View style={styles.faqList}>
            {faqs.map((faq, index) => (
              <View key={index} style={styles.faqItem}>
                <TouchableOpacity 
                  style={styles.faqHeader}
                  onPress={() => toggleFAQ(index)}
                >
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <Ionicons 
                    name={faq.expanded ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#6b7280" 
                  />
                </TouchableOpacity>
                {faq.expanded && (
                  <View style={styles.faqAnswer}>
                    <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfoSection}>
          <Text style={styles.sectionTitle}>App Information</Text>
          <View style={styles.appInfoItem}>
            <Text style={styles.appInfoLabel}>Version</Text>
            <Text style={styles.appInfoValue}>1.0.0</Text>
          </View>
          <View style={styles.appInfoItem}>
            <Text style={styles.appInfoLabel}>Last Updated</Text>
            <Text style={styles.appInfoValue}>March 2024</Text>
          </View>
          <TouchableOpacity 
            style={styles.appInfoItem}
            onPress={() => Linking.openURL('https://civicwatch.com/privacy')}
          >
            <Text style={styles.appInfoLabel}>Privacy Policy</Text>
            <Ionicons name="open-outline" size={16} color="#3b5bdb" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.appInfoItem}
            onPress={() => Linking.openURL('https://civicwatch.com/terms')}
          >
            <Text style={styles.appInfoLabel}>Terms of Service</Text>
            <Ionicons name="open-outline" size={16} color="#3b5bdb" />
          </TouchableOpacity>
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  quickActionsSection: {
    marginBottom: 30,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAction: {
    flex: 1,
    backgroundColor: '#1e2642',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  supportSection: {
    marginBottom: 30,
  },
  supportOptions: {
    gap: 12,
  },
  supportOption: {
    backgroundColor: '#1e2642',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  supportOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b5bdb20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  supportOptionContent: {
    flex: 1,
  },
  supportOptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  supportOptionDescription: {
    fontSize: 14,
    color: '#9ca3af',
  },
  faqSection: {
    marginBottom: 30,
  },
  faqList: {
    gap: 12,
  },
  faqItem: {
    backgroundColor: '#1e2642',
    borderRadius: 12,
    overflow: 'hidden',
  },
  faqHeader: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  faqAnswerText: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
  },
  appInfoSection: {
    gap: 16,
  },
  appInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  appInfoLabel: {
    fontSize: 16,
    color: '#ffffff',
  },
  appInfoValue: {
    fontSize: 16,
    color: '#9ca3af',
  },
}); 