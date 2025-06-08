import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import DashboardScreen from '../screens/DashboardScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import TrackedScreen from '../screens/TrackedScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AuthScreen from '../screens/AuthScreen';
import BillDetailScreen from '../screens/BillDetailScreen';
import RepresentativeDetailScreen from '../screens/RepresentativeDetailScreen';

// Import contexts
import { useAuth } from '../contexts/AuthContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Dashboard':
              iconName = focused ? 'apps' : 'apps-outline';
              break;
            case 'Discover':
              iconName = focused ? 'search' : 'search-outline';
              break;
            case 'Tracked':
              iconName = focused ? 'bookmark' : 'bookmark-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#60a5fa', // light blue
        tabBarInactiveTintColor: '#6b7280', // gray-500
        tabBarStyle: {
          backgroundColor: '#0f1419', // navy
          borderTopColor: '#374151', // gray-700
          paddingBottom: 32,
          paddingTop: 8,
          height: 90,
          marginBottom: 0,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#0f1419', // navy
        },
        headerTintColor: '#ffffff',
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          headerShown: false,
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{
          headerShown: false,
          tabBarLabel: 'Dashboard',
        }}
      />
      <Tab.Screen 
        name="Discover" 
        component={DiscoverScreen}
        options={{
          headerShown: false,
          tabBarLabel: 'Discover',
        }}
      />
      <Tab.Screen 
        name="Tracked" 
        component={TrackedScreen}
        options={{
          headerShown: false,
          tabBarLabel: 'Tracked',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          headerShown: false,
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Show loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#0f1419', // navy
          },
          headerTintColor: '#ffffff',
          cardStyle: {
            backgroundColor: '#0f1419', // navy
          },
        }}
      >
        {user ? (
          <>
            <Stack.Screen 
              name="MainTabs" 
              component={MainTabs} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="BillDetail" 
              component={BillDetailScreen}
              options={{ 
                headerTitle: '',
                headerBackTitle: '',
                headerStyle: {
                  backgroundColor: '#0f1419',
                  elevation: 0,
                  shadowOpacity: 0,
                },
                headerTintColor: '#ffffff',
              }}
            />
            <Stack.Screen 
              name="RepresentativeDetail" 
              component={RepresentativeDetailScreen}
              options={{ 
                headerTitle: '',
                headerBackTitle: '',
                headerStyle: {
                  backgroundColor: '#0f1419',
                  elevation: 0,
                  shadowOpacity: 0,
                },
                headerTintColor: '#ffffff',
              }}
            />
          </>
        ) : (
          <Stack.Screen 
            name="Auth" 
            component={AuthScreen}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
} 