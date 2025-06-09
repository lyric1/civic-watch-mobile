import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

interface SubscriptionScreenProps {
  navigation: any;
}

interface PlanFeature {
  text: string;
  included: boolean;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  features: PlanFeature[];
  popular?: boolean;
}

export default function SubscriptionScreen({ navigation }: SubscriptionScreenProps) {
  const { userProfile } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string>('pro');

  const plans: SubscriptionPlan[] = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: 'forever',
      features: [
        { text: 'Track up to 5 bills', included: true },
        { text: 'Basic notifications', included: true },
        { text: 'Representative info', included: true },
        { text: 'Bill summaries', included: false },
        { text: 'Advanced analytics', included: false },
        { text: 'Priority support', included: false },
      ],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$9.99',
      period: 'month',
      popular: true,
      features: [
        { text: 'Track unlimited bills', included: true },
        { text: 'Real-time notifications', included: true },
        { text: 'Detailed representative profiles', included: true },
        { text: 'AI-powered bill summaries', included: true },
        { text: 'Advanced analytics & insights', included: true },
        { text: 'Priority support', included: true },
      ],
    },
  ];

  const handleSubscribe = async (planId: string) => {
    if (planId === 'free') {
      Alert.alert('Free Plan', 'You are already on the free plan');
      return;
    }

    Alert.alert(
      'Subscribe to Pro',
      'You will be charged $9.99/month. Cancel anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Subscribe', 
          onPress: () => {
            // Here you would integrate with your payment processor
            Alert.alert('Success', 'Welcome to Civic Watch Pro!');
          }
        },
      ]
    );
  };

  const handleManageSubscription = () => {
    Alert.alert(
      'Manage Subscription',
      'This will open your subscription management page.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => console.log('Open subscription management') },
      ]
    );
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
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {userProfile?.isPro && (
          <View style={styles.currentPlanCard}>
            <View style={styles.currentPlanHeader}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              <Text style={styles.currentPlanTitle}>Current Plan: Pro</Text>
            </View>
            <Text style={styles.currentPlanDescription}>
              You have access to all premium features
            </Text>
            <TouchableOpacity 
              style={styles.manageButton}
              onPress={handleManageSubscription}
            >
              <Text style={styles.manageButtonText}>Manage Subscription</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.plansSection}>
          <Text style={styles.sectionTitle}>Choose Your Plan</Text>
          <Text style={styles.sectionDescription}>
            Upgrade to Pro for unlimited access to all features
          </Text>

          <View style={styles.plans}>
            {plans.map((plan) => (
              <View 
                key={plan.id} 
                style={[
                  styles.planCard,
                  plan.popular && styles.popularPlan,
                  selectedPlan === plan.id && styles.selectedPlan
                ]}
              >
                {plan.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>MOST POPULAR</Text>
                  </View>
                )}

                <View style={styles.planHeader}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <View style={styles.planPricing}>
                    <Text style={styles.planPrice}>{plan.price}</Text>
                    <Text style={styles.planPeriod}>/{plan.period}</Text>
                  </View>
                </View>

                <View style={styles.planFeatures}>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.feature}>
                      <Ionicons 
                        name={feature.included ? "checkmark" : "close"} 
                        size={16} 
                        color={feature.included ? "#10b981" : "#ef4444"} 
                      />
                      <Text style={[
                        styles.featureText,
                        !feature.included && styles.disabledFeature
                      ]}>
                        {feature.text}
                      </Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity 
                  style={[
                    styles.selectButton,
                    plan.id === 'pro' && styles.proButton,
                    userProfile?.isPro && plan.id === 'pro' && styles.currentButton
                  ]}
                  onPress={() => handleSubscribe(plan.id)}
                  disabled={userProfile?.isPro && plan.id === 'pro'}
                >
                  <Text style={[
                    styles.selectButtonText,
                    plan.id === 'pro' && styles.proButtonText,
                    userProfile?.isPro && plan.id === 'pro' && styles.currentButtonText
                  ]}>
                    {userProfile?.isPro && plan.id === 'pro' 
                      ? 'Current Plan' 
                      : plan.id === 'free' 
                        ? 'Current Plan'
                        : 'Subscribe'
                    }
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.faqSection}>
          <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Can I cancel anytime?</Text>
            <Text style={styles.faqAnswer}>
              Yes, you can cancel your subscription at any time. Your Pro features will remain active until the end of your billing period.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>What payment methods do you accept?</Text>
            <Text style={styles.faqAnswer}>
              We accept all major credit cards and PayPal. Payments are processed securely through Stripe.
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  currentPlanCard: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  currentPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentPlanTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 8,
  },
  currentPlanDescription: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 16,
  },
  manageButton: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  manageButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10b981',
  },
  plansSection: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 16,
    color: '#9ca3af',
    marginBottom: 24,
  },
  plans: {
    gap: 16,
  },
  planCard: {
    backgroundColor: '#1e2642',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  popularPlan: {
    borderColor: '#3b5bdb',
    position: 'relative',
  },
  selectedPlan: {
    borderColor: '#10b981',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: 20,
    backgroundColor: '#3b5bdb',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  popularText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  planHeader: {
    marginBottom: 20,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  planPricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  planPeriod: {
    fontSize: 16,
    color: '#9ca3af',
    marginLeft: 4,
  },
  planFeatures: {
    marginBottom: 24,
    gap: 12,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#ffffff',
  },
  disabledFeature: {
    color: '#6b7280',
    textDecorationLine: 'line-through',
  },
  selectButton: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  proButton: {
    backgroundColor: '#3b5bdb',
  },
  currentButton: {
    backgroundColor: '#10b981',
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  proButtonText: {
    color: '#ffffff',
  },
  currentButtonText: {
    color: '#ffffff',
  },
  faqSection: {
    gap: 20,
  },
  faqTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  faqItem: {
    backgroundColor: '#1e2642',
    borderRadius: 12,
    padding: 16,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
  },
}); 