import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { View, Text } from 'react-native';

import TabNavigator from './TabNavigator';
import AdvancedSearchScreen from '../screens/AdvancedSearch/AdvancedSearchScreen';
import DataExportScreen from '../screens/DataExport/DataExportScreen';
import CiderDetailScreen from '../screens/Collection/CiderDetailScreen';
import CiderEditScreen from '../screens/Collection/CiderEditScreen';
import ExperienceLogScreen from '../screens/ExperienceLog/ExperienceLogScreen';
import ExperienceHistoryScreen from '../screens/ExperienceHistory/ExperienceHistoryScreen';
import ExperienceDetailScreen from '../screens/ExperienceDetail/ExperienceDetailScreen';
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
            name="AdvancedSearch"
            component={AdvancedSearchScreen}
            options={{
              title: 'Advanced Search',
              headerStyle: { backgroundColor: '#D4A574' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' }
            }}
          />
          <Stack.Screen
            name="DataExport"
            component={DataExportScreen}
            options={{
              title: 'Export Data',
              headerStyle: { backgroundColor: '#32D74B' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' }
            }}
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
            name="CiderEdit"
            component={CiderEditScreen}
            options={{
              title: 'Edit Cider',
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
            component={ExperienceHistoryScreen}
            options={{
              title: 'Experience History',
              headerStyle: { backgroundColor: '#FF9500' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' }
            }}
          />
          <Stack.Screen
            name="ExperienceDetail"
            component={ExperienceDetailScreen}
            options={{
              title: 'Experience Details',
              headerStyle: { backgroundColor: '#5856D6' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' }
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
}