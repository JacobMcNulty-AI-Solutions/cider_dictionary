import { NavigationContainer } from '@react-navigation/native';
import React from 'react';

import TabNavigator from './TabNavigator';

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <TabNavigator />
    </NavigationContainer>
  );
}