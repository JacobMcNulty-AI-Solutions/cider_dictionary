import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { View, Text } from 'react-native';

import TabNavigator from './TabNavigator';
import CiderDetailScreen from '../screens/Collection/CiderDetailScreen';
import ExperienceLogScreen from '../screens/ExperienceLog/ExperienceLogScreen';
import { RootStackParamList } from '../types/navigation';
import { ErrorBoundary } from '../services/error/ErrorBoundary';

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <ErrorBoundary>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="TabNavigator"
            component={TabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="CiderDetail"
            component={CiderDetailScreen}
            options={{
              title: 'Cider Details',
              headerStyle: { backgroundColor: '#007AFF' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' }
            }}
          />
          <Stack.Screen
            name="ExperienceLog"
            component={ExperienceLogScreen}
            options={{
              title: 'Log Experience',
              headerStyle: { backgroundColor: '#32D74B' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' }
            }}
          />
          <Stack.Screen
            name="ExperienceHistory"
            component={() => (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>Experience History (Coming Soon)</Text>
              </View>
            )}
            options={{
              title: 'Experience History',
              headerStyle: { backgroundColor: '#FF9500' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' }
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
}