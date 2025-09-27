import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

import { RootTabParamList } from '../types/navigation';
import EnhancedCollectionScreen from '../screens/Collection/EnhancedCollectionScreen';
import EnhancedQuickEntryScreen from '../screens/QuickEntry/EnhancedQuickEntryScreen';
import { View, Text } from 'react-native';

// Temporary placeholder component to test if EnhancedQuickEntryScreen is causing infinite loop
const QuickEntryPlaceholder = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Quick Entry (Temporarily Disabled)</Text>
    <Text>Testing infinite loop fix</Text>
  </View>
);
import AnalyticsScreen from '../screens/Analytics/AnalyticsScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Collection') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'QuickEntry') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Analytics') {
            iconName = focused ? 'analytics' : 'analytics-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'help-circle-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen
        name="Collection"
        component={EnhancedCollectionScreen}
        options={{ title: 'My Ciders' }}
      />
      <Tab.Screen
        name="QuickEntry"
        component={EnhancedQuickEntryScreen}
        options={{ title: 'Add Cider' }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ title: 'Stats' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}