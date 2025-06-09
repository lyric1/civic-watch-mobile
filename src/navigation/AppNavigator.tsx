import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import DashboardScreen from '../screens/DashboardScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import TrackedScreen from '../screens/TrackedScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AuthScreen from '../screens/AuthScreen';
import BillDetailScreen from '../screens/BillDetailScreen';
import RepresentativeDetailScreen from '../screens/RepresentativeDetailScreen';
import AddressSetupScreen from '../screens/AddressSetupScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import NotificationTestScreen from '../screens/NotificationTestScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import AboutScreen from '../screens/AboutScreen';

// Import contexts
import { useAuth } from '../contexts/AuthContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Create stack navigators for each tab to include detail screens
function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#151c2e',
        },
        headerTintColor: '#ffffff',
      }}
    >
      <Stack.Screen 
        name="HomeMain" 
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="BillDetail" 
        component={BillDetailScreen}
        options={{ 
          headerTitle: '',
          headerBackTitle: '',
          headerStyle: {
            backgroundColor: '#151c2e',
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
            backgroundColor: '#151c2e',
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: '#ffffff',
        }}
      />
    </Stack.Navigator>
  );
}

function DashboardStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#151c2e',
        },
        headerTintColor: '#ffffff',
      }}
    >
      <Stack.Screen 
        name="DashboardMain" 
        component={DashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="BillDetail" 
        component={BillDetailScreen}
        options={{ 
          headerTitle: '',
          headerBackTitle: '',
          headerStyle: {
            backgroundColor: '#151c2e',
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
            backgroundColor: '#151c2e',
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: '#ffffff',
        }}
      />
      <Stack.Screen 
        name="AddressSetup" 
        component={AddressSetupScreen}
        options={{ 
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

function DiscoverStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#151c2e',
        },
        headerTintColor: '#ffffff',
      }}
    >
      <Stack.Screen 
        name="DiscoverMain" 
        component={DiscoverScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="BillDetail" 
        component={BillDetailScreen}
        options={{ 
          headerTitle: '',
          headerBackTitle: '',
          headerStyle: {
            backgroundColor: '#151c2e',
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
            backgroundColor: '#151c2e',
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: '#ffffff',
        }}
      />
    </Stack.Navigator>
  );
}

function TrackedStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#151c2e',
        },
        headerTintColor: '#ffffff',
      }}
    >
      <Stack.Screen 
        name="TrackedMain" 
        component={TrackedScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="BillDetail" 
        component={BillDetailScreen}
        options={{ 
          headerTitle: '',
          headerBackTitle: '',
          headerStyle: {
            backgroundColor: '#151c2e',
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
            backgroundColor: '#151c2e',
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: '#ffffff',
        }}
      />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#151c2e',
        },
        headerTintColor: '#ffffff',
      }}
    >
      <Stack.Screen 
        name="ProfileMain" 
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="BillDetail" 
        component={BillDetailScreen}
        options={{ 
          headerTitle: '',
          headerBackTitle: '',
          headerStyle: {
            backgroundColor: '#151c2e',
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
            backgroundColor: '#151c2e',
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: '#ffffff',
        }}
      />
      <Stack.Screen 
        name="AddressSetup" 
        component={AddressSetupScreen}
        options={{ 
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="EditProfile" 
        component={EditProfileScreen}
        options={{ 
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{ 
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="NotificationTest" 
        component={NotificationTestScreen}
        options={{ 
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="Subscription" 
        component={SubscriptionScreen}
        options={{ 
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="HelpSupport" 
        component={HelpSupportScreen}
        options={{ 
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="About" 
        component={AboutScreen}
        options={{ 
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

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
          backgroundColor: '#151c2e', // navy
          borderTopColor: '#374151', // gray-700
          paddingBottom: 32,
          paddingTop: 8,
          height: 90,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
        },
        tabBarHideOnKeyboard: true, // Hide tab bar when keyboard is open
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#151c2e', // navy
        },
        headerTintColor: '#ffffff',
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStack}
        options={{
          headerShown: false,
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardStack}
        options={{
          headerShown: false,
          tabBarLabel: 'Dashboard',
        }}
      />
      <Tab.Screen 
        name="Discover" 
        component={DiscoverStack}
        options={{
          headerShown: false,
          tabBarLabel: 'Discover',
        }}
      />
      <Tab.Screen 
        name="Tracked" 
        component={TrackedStack}
        options={{
          headerShown: false,
          tabBarLabel: 'Tracked',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStack}
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
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: '#151c2e', // navy
            },
            headerTintColor: '#ffffff',
            cardStyle: {
              backgroundColor: '#151c2e', // navy
            },
          }}
        >
        {user ? (
          <Stack.Screen 
            name="MainTabs" 
            component={MainTabs} 
            options={{ headerShown: false }}
          />
        ) : (
          <Stack.Screen 
            name="Auth" 
            component={AuthScreen}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
    </SafeAreaProvider>
  );
} 