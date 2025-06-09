import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AboutScreenProps {
  navigation: any;
}

export default function AboutScreen({ navigation }: AboutScreenProps) {
  const handleOpenLink = (url: string) => {
    Linking.openURL(url);
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
        <Text style={styles.headerTitle}>About</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* App Logo & Title */}
        <View style={styles.logoSection}>
          <View style={styles.logo}>
            <Ionicons name="eye" size={60} color="#3b5bdb" />
          </View>
          <Text style={styles.appName}>Civic Watch</Text>
          <Text style={styles.tagline}>Democracy in Your Pocket</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
        </View>

        {/* Mission Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Mission</Text>
          <Text style={styles.missionText}>
            Civic Watch empowers citizens to stay informed and engaged with their democracy. 
            We believe that an informed public is essential for a healthy democracy, and we're 
            committed to making legislative information accessible to everyone.
          </Text>
        </View>

        {/* Features Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What We Offer</Text>
          <View style={styles.featuresList}>
            <View style={styles.feature}>
              <Ionicons name="document-text" size={20} color="#3b5bdb" />
              <Text style={styles.featureText}>Track legislation that matters to you</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="people" size={20} color="#3b5bdb" />
              <Text style={styles.featureText}>Monitor your representatives' activities</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="notifications" size={20} color="#3b5bdb" />
              <Text style={styles.featureText}>Get real-time updates on bill progress</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="analytics" size={20} color="#3b5bdb" />
              <Text style={styles.featureText}>Analyze voting patterns and trends</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="search" size={20} color="#3b5bdb" />
              <Text style={styles.featureText}>Discover new legislation by category</Text>
            </View>
          </View>
        </View>

        {/* Team Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Team</Text>
          <Text style={styles.teamText}>
            Civic Watch is built by a team of passionate developers, designers, and civic 
            engagement advocates who believe in the power of technology to strengthen democracy.
          </Text>
          <Text style={styles.teamText}>
            We're committed to transparency, accuracy, and user privacy in everything we do.
          </Text>
        </View>

        {/* Data Sources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Sources</Text>
          <Text style={styles.dataText}>
            We source our legislative data from official government APIs, including:
          </Text>
          <View style={styles.sourcesList}>
            <Text style={styles.sourceItem}>• Congress.gov API</Text>
            <Text style={styles.sourceItem}>• ProPublica Congress API</Text>
            <Text style={styles.sourceItem}>• Official state legislature databases</Text>
            <Text style={styles.sourceItem}>• GovTrack.us</Text>
          </View>
        </View>

        {/* Social Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connect With Us</Text>
          <View style={styles.socialLinks}>
            <TouchableOpacity 
              style={styles.socialLink}
              onPress={() => handleOpenLink('https://civicwatch.com')}
            >
              <Ionicons name="globe-outline" size={24} color="#3b5bdb" />
              <Text style={styles.socialLinkText}>Website</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.socialLink}
              onPress={() => handleOpenLink('https://twitter.com/civicwatch')}
            >
              <Ionicons name="logo-twitter" size={24} color="#3b5bdb" />
              <Text style={styles.socialLinkText}>Twitter</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.socialLink}
              onPress={() => handleOpenLink('https://github.com/civicwatch')}
            >
              <Ionicons name="logo-github" size={24} color="#3b5bdb" />
              <Text style={styles.socialLinkText}>GitHub</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.socialLink}
              onPress={() => handleOpenLink('mailto:hello@civicwatch.com')}
            >
              <Ionicons name="mail-outline" size={24} color="#3b5bdb" />
              <Text style={styles.socialLinkText}>Contact</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Legal Links */}
        <View style={styles.legalSection}>
          <TouchableOpacity 
            style={styles.legalLink}
            onPress={() => handleOpenLink('https://civicwatch.com/privacy')}
          >
            <Text style={styles.legalLinkText}>Privacy Policy</Text>
            <Ionicons name="open-outline" size={16} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.legalLink}
            onPress={() => handleOpenLink('https://civicwatch.com/terms')}
          >
            <Text style={styles.legalLinkText}>Terms of Service</Text>
            <Ionicons name="open-outline" size={16} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.legalLink}
            onPress={() => handleOpenLink('https://civicwatch.com/licenses')}
          >
            <Text style={styles.legalLinkText}>Open Source Licenses</Text>
            <Ionicons name="open-outline" size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Copyright */}
        <View style={styles.copyrightSection}>
          <Text style={styles.copyrightText}>
            © 2024 Civic Watch. All rights reserved.
          </Text>
          <Text style={styles.copyrightText}>
            Made with ❤️ for democracy
          </Text>
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
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
    paddingVertical: 20,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1e2642',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 18,
    color: '#3b5bdb',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  version: {
    fontSize: 16,
    color: '#9ca3af',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  missionText: {
    fontSize: 16,
    color: '#9ca3af',
    lineHeight: 24,
  },
  featuresList: {
    gap: 12,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#9ca3af',
    flex: 1,
  },
  teamText: {
    fontSize: 16,
    color: '#9ca3af',
    lineHeight: 24,
    marginBottom: 12,
  },
  dataText: {
    fontSize: 16,
    color: '#9ca3af',
    lineHeight: 24,
    marginBottom: 12,
  },
  sourcesList: {
    paddingLeft: 16,
    gap: 8,
  },
  sourceItem: {
    fontSize: 14,
    color: '#9ca3af',
  },
  socialLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  socialLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e2642',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    minWidth: '45%',
  },
  socialLinkText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  legalSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    gap: 16,
  },
  legalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  legalLinkText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  copyrightSection: {
    alignItems: 'center',
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    gap: 8,
  },
  copyrightText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
}); 