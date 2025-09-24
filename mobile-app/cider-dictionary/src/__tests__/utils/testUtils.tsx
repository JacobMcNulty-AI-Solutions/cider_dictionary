import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Mock navigation props for screens
export const createMockNavigationProps = (params?: any) => ({
  navigation: {
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    setOptions: jest.fn(),
    isFocused: jest.fn(() => true),
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
  route: {
    params: params || {},
    key: 'test-key',
    name: 'TestScreen',
  },
});

// Custom render function that includes providers
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SafeAreaProvider initialMetrics={{
      insets: { top: 0, left: 0, right: 0, bottom: 0 },
      frame: { x: 0, y: 0, width: 375, height: 812 },
    }}>
      <NavigationContainer>
        {children}
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

// re-export everything
export * from '@testing-library/react-native';

// override render method
export { customRender as render };

// Helper functions for common test patterns
export const waitForAsyncUpdate = () => new Promise(resolve => setTimeout(resolve, 0));

export const createMockDatabase = () => ({
  execAsync: jest.fn(),
  runAsync: jest.fn(),
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn(),
});

// Mock alert
export const mockAlert = () => {
  const originalAlert = require('react-native').Alert;
  jest.spyOn(originalAlert, 'alert').mockImplementation((title, message, buttons) => {
    if (buttons && buttons.length > 0) {
      // Simulate pressing the first button
      if (buttons[0].onPress) {
        buttons[0].onPress();
      }
    }
  });
  return originalAlert;
};

// Mock console methods for testing
export const mockConsole = () => {
  const originalConsole = console;
  return {
    log: jest.spyOn(originalConsole, 'log').mockImplementation(),
    error: jest.spyOn(originalConsole, 'error').mockImplementation(),
    warn: jest.spyOn(originalConsole, 'warn').mockImplementation(),
  };
};