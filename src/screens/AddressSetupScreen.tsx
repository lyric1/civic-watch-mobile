import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

export default function AddressSetupScreen({ navigation }: any) {
  const { updateAddress, userProfile } = useAuth();
  
  const [address, setAddress] = useState(userProfile?.address || '');
  const [city, setCity] = useState(userProfile?.city || '');
  const [state, setState] = useState(userProfile?.state || '');
  const [zip, setZip] = useState(userProfile?.zip || '');
  const [loading, setLoading] = useState(false);

  // Update form fields when userProfile changes (e.g., if it loads after component mount)
  useEffect(() => {
    if (userProfile) {
      setAddress(userProfile.address || '');
      setCity(userProfile.city || '');
      setState(userProfile.state || '');
      setZip(userProfile.zip || '');
    }
  }, [userProfile]);

  const handleSave = async () => {
    if (!address || !city || !state || !zip) {
      Alert.alert('Error', 'Please fill in all address fields');
      return;
    }

    setLoading(true);
    try {
      await updateAddress(address, city, state, zip);
      Alert.alert('Success', 
        userProfile?.address ? 'Address updated successfully!' : 'Address saved successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {userProfile?.address ? 'Edit Your Address' : 'Add Your Address'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <Text style={styles.subtitle}>
          {userProfile?.address 
            ? 'Update your address to ensure accurate representative and district information'
            : 'Enter your address to see your representatives and district information'
          }
        </Text>

        {userProfile?.address && (
          <View style={styles.currentAddressCard}>
            <View style={styles.currentAddressHeader}>
              <Ionicons name="location" size={20} color="#3b5bdb" />
              <Text style={styles.currentAddressTitle}>Current Address</Text>
            </View>
            <Text style={styles.currentAddressText}>
              {userProfile.address}, {userProfile.city}, {userProfile.state} {userProfile.zip}
            </Text>
          </View>
        )}

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Street Address"
            placeholderTextColor="#6b7280"
            value={address}
            onChangeText={setAddress}
          />
          
          <View style={styles.rowContainer}>
            <TextInput
              style={[styles.input, styles.inputHalf]}
              placeholder="City"
              placeholderTextColor="#6b7280"
              value={city}
              onChangeText={setCity}
            />
            
            <TextInput
              style={[styles.input, styles.inputQuarter]}
              placeholder="State"
              placeholderTextColor="#6b7280"
              value={state}
              onChangeText={setState}
              autoCapitalize="characters"
              maxLength={2}
            />
            
            <TextInput
              style={[styles.input, styles.inputQuarter]}
              placeholder="ZIP"
              placeholderTextColor="#6b7280"
              value={zip}
              onChangeText={setZip}
              keyboardType="numeric"
              maxLength={5}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading 
                ? 'Saving...' 
                : userProfile?.address 
                  ? 'Update Address' 
                  : 'Save Address'
              }
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#151c2e',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 120, // Extra padding for safe area + potential bottom nav
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingTop: 40,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  placeholder: {
    width: 40,
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#1e2642',
    borderColor: '#374151',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 16,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  inputHalf: {
    flex: 1,
    marginRight: 5,
  },
  inputQuarter: {
    flex: 0.3,
    marginLeft: 5,
  },
  button: {
    backgroundColor: '#3b5bdb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  currentAddressCard: {
    backgroundColor: '#1e2642',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#3b5bdb20',
  },
  currentAddressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentAddressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 8,
  },
  currentAddressText: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
  },
}); 