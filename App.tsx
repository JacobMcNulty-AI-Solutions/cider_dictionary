import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppState, ActivityIndicator, View, Text } from 'react-native';

import AppNavigator from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/services/error/ErrorBoundary';
import { performanceService } from './src/services/firebase/PerformanceService';
import { syncManager } from './src/services/sync/SyncManager';
import { firebaseService } from './src/services/firebase/config';

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize Firebase and app services
    const initializeApp = async () => {
      try {
        console.log('Starting app initialization...');

        // 1. Initialize Firebase first
        console.log('Initializing Firebase...');
        await firebaseService.initialize();
        console.log('Firebase initialized successfully');

        // 2. Start app performance trace
        const appTrace = await performanceService.startScreenTrace('app_startup');

        // 3. Initialize sync manager (which depends on Firebase)
        console.log('Initializing sync manager...');
        // SyncManager initializes automatically via constructor

        // 4. Trigger sync queue now that Firebase is ready
        console.log('Processing pending sync operations...');
        await syncManager.processSyncQueue();

        // 5. Stop app startup trace
        await appTrace.stop();

        console.log('Phase 3 MVP initialized successfully');
        setIsInitializing(false);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setInitError(error instanceof Error ? error.message : 'Unknown initialization error');
        setIsInitializing(false);
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

  // Show loading screen while initializing
  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' }}>
        <ActivityIndicator size="large" color="#D4A574" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>
          Initializing Cider Dictionary...
        </Text>
      </View>
    );
  }

  // Show error screen if initialization failed
  if (initError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5', padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#D32F2F', marginBottom: 8 }}>
          Initialization Failed
        </Text>
        <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
          {initError}
        </Text>
        <Text style={{ fontSize: 12, color: '#999', textAlign: 'center', marginTop: 16 }}>
          Please check your Firebase configuration and internet connection.
        </Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}