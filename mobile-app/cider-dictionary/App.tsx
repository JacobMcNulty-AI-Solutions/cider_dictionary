import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppState } from 'react-native';

import AppNavigator from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/services/error/ErrorBoundary';
import { performanceService } from './src/services/firebase/PerformanceService';
import { syncManager } from './src/services/sync/SyncManager';

export default function App() {
  useEffect(() => {
    // Initialize performance monitoring
    const initializeApp = async () => {
      try {
        // Start app performance trace
        const appTrace = await performanceService.startScreenTrace('app_startup');

        // Initialize sync manager
        console.log('Initializing sync manager...');

        // Stop app startup trace
        await appTrace.stop();

        console.log('Phase 3 MVP initialized successfully');
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();

    // Monitor app state changes for sync opportunities
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        // App became active, trigger sync if online
        syncManager.forceSyncNow();
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      appStateSubscription?.remove();
    };
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}