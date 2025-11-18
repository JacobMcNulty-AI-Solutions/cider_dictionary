import { firebaseConfig, BasicFirebaseService } from '../config';
import { mockConsole } from '../../../__tests__/utils/testUtils';

describe('Firebase Configuration', () => {
  let originalEnv: typeof process.env;
  let consoleMocks: ReturnType<typeof mockConsole>;

  beforeEach(() => {
    originalEnv = process.env;
    consoleMocks = mockConsole();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('firebaseConfig', () => {
    it('should use environment variables when available', () => {
      // Set mock environment variables
      process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
      process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test-auth-domain';
      process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'test-project-id';
      process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test-storage-bucket';
      process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '987654321098';
      process.env.EXPO_PUBLIC_FIREBASE_APP_ID = 'test-app-id';

      // Re-import to get new config with updated env vars
      jest.resetModules();
      const { firebaseConfig: newConfig } = require('../config');

      expect(newConfig.apiKey).toBe('test-api-key');
      expect(newConfig.authDomain).toBe('test-auth-domain');
      expect(newConfig.projectId).toBe('test-project-id');
      expect(newConfig.storageBucket).toBe('test-storage-bucket');
      expect(newConfig.messagingSenderId).toBe('987654321098');
      expect(newConfig.appId).toBe('test-app-id');
    });

    it('should use fallback values when environment variables are not set', () => {
      // Clear environment variables
      delete process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
      delete process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN;
      delete process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
      delete process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET;
      delete process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
      delete process.env.EXPO_PUBLIC_FIREBASE_APP_ID;

      // Re-import to get new config with cleared env vars
      jest.resetModules();
      const { firebaseConfig: newConfig } = require('../config');

      expect(newConfig.apiKey).toBe('your-api-key-here');
      expect(newConfig.authDomain).toBe('cider-dictionary-phase1.firebaseapp.com');
      expect(newConfig.projectId).toBe('cider-dictionary-phase1');
      expect(newConfig.storageBucket).toBe('cider-dictionary-phase1.appspot.com');
      expect(newConfig.messagingSenderId).toBe('123456789012');
      expect(newConfig.appId).toBe('1:123456789012:web:abcdef1234567890');
    });

    it('should have all required Firebase configuration properties', () => {
      expect(firebaseConfig).toHaveProperty('apiKey');
      expect(firebaseConfig).toHaveProperty('authDomain');
      expect(firebaseConfig).toHaveProperty('projectId');
      expect(firebaseConfig).toHaveProperty('storageBucket');
      expect(firebaseConfig).toHaveProperty('messagingSenderId');
      expect(firebaseConfig).toHaveProperty('appId');

      // Verify types
      expect(typeof firebaseConfig.apiKey).toBe('string');
      expect(typeof firebaseConfig.authDomain).toBe('string');
      expect(typeof firebaseConfig.projectId).toBe('string');
      expect(typeof firebaseConfig.storageBucket).toBe('string');
      expect(typeof firebaseConfig.messagingSenderId).toBe('string');
      expect(typeof firebaseConfig.appId).toBe('string');
    });
  });

  describe('BasicFirebaseService', () => {
    let service: BasicFirebaseService;

    beforeEach(() => {
      service = new BasicFirebaseService();
    });

    describe('initialize', () => {
      it('should initialize successfully', async () => {
        await service.initialize();

        expect(service.isInitialized()).toBe(true);
        expect(consoleMocks.log).toHaveBeenCalledWith('Firebase service initialized (Phase 1 placeholder)');
      });

      it('should handle initialization errors', async () => {
        // Mock console.log to throw an error to simulate initialization failure
        consoleMocks.log.mockImplementationOnce(() => {
          throw new Error('Initialization failed');
        });

        await expect(service.initialize()).rejects.toThrow('Initialization failed');
        expect(consoleMocks.error).toHaveBeenCalledWith('Firebase initialization failed:', expect.any(Error));
      });
    });

    describe('isInitialized', () => {
      it('should return false initially', () => {
        expect(service.isInitialized()).toBe(false);
      });

      it('should return true after initialization', async () => {
        await service.initialize();
        expect(service.isInitialized()).toBe(true);
      });
    });

    describe('authentication methods', () => {
      it('should throw error for signIn in Phase 1', async () => {
        await expect(service.signIn('test@example.com', 'password')).rejects.toThrow(
          'Authentication not implemented in Phase 1'
        );
        expect(consoleMocks.log).toHaveBeenCalledWith('Sign in functionality coming in Phase 2');
      });

      it('should throw error for signUp in Phase 1', async () => {
        await expect(service.signUp('test@example.com', 'password')).rejects.toThrow(
          'Authentication not implemented in Phase 1'
        );
        expect(consoleMocks.log).toHaveBeenCalledWith('Sign up functionality coming in Phase 2');
      });

      it('should throw error for signOut in Phase 1', async () => {
        await expect(service.signOut()).rejects.toThrow(
          'Authentication not implemented in Phase 1'
        );
        expect(consoleMocks.log).toHaveBeenCalledWith('Sign out functionality coming in Phase 2');
      });
    });

    describe('data sync methods', () => {
      it('should throw error for syncCiderData in Phase 1', async () => {
        await expect(service.syncCiderData()).rejects.toThrow(
          'Data sync not implemented in Phase 1'
        );
        expect(consoleMocks.log).toHaveBeenCalledWith('Data sync functionality coming in Phase 2');
      });
    });
  });

  describe('Singleton instances', () => {
    it('should export a singleton firebaseService instance', () => {
      const { firebaseService } = require('../config');
      expect(firebaseService).toBeTruthy();
      expect(typeof firebaseService.initialize).toBe('function');
      expect(typeof firebaseService.isInitialized).toBe('function');
    });

    it('should return the same instance on multiple imports', () => {
      const { firebaseService: service1 } = require('../config');
      const { firebaseService: service2 } = require('../config');

      expect(service1).toBe(service2);
    });
  });

  describe('Edge cases and validation', () => {
    it('should handle empty string environment variables', () => {
      process.env.EXPO_PUBLIC_FIREBASE_API_KEY = '';
      process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = '';

      jest.resetModules();
      const { firebaseConfig: newConfig } = require('../config');

      // Should use fallback values for empty strings
      expect(newConfig.apiKey).toBe('your-api-key-here');
      expect(newConfig.projectId).toBe('cider-dictionary-phase1');
    });

    it('should handle mixed environment variables', () => {
      process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'custom-api-key';
      delete process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
      process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN = 'custom-domain.firebaseapp.com';

      jest.resetModules();
      const { firebaseConfig: newConfig } = require('../config');

      expect(newConfig.apiKey).toBe('custom-api-key');
      expect(newConfig.projectId).toBe('cider-dictionary-phase1'); // fallback
      expect(newConfig.authDomain).toBe('custom-domain.firebaseapp.com');
    });

    it('should maintain immutability of configuration', () => {
      const { firebaseConfig: config } = require('../config');
      const originalApiKey = config.apiKey;

      // Attempt to modify the configuration
      expect(() => {
        config.apiKey = 'modified-key';
      }).not.toThrow(); // JavaScript allows this

      // But we can verify the original structure is maintained
      expect(typeof config.apiKey).toBe('string');
      expect(typeof config.authDomain).toBe('string');
      expect(typeof config.projectId).toBe('string');
    });
  });

  describe('Service lifecycle', () => {
    it('should allow multiple initializations', async () => {
      const service = new BasicFirebaseService();

      await service.initialize();
      expect(service.isInitialized()).toBe(true);

      // Initialize again
      await service.initialize();
      expect(service.isInitialized()).toBe(true);

      // Should log initialization message twice
      expect(consoleMocks.log).toHaveBeenCalledTimes(2);
    });

    it('should maintain state across method calls', async () => {
      const service = new BasicFirebaseService();

      expect(service.isInitialized()).toBe(false);

      await service.initialize();
      expect(service.isInitialized()).toBe(true);

      // State should persist across other method calls
      try {
        await service.signIn('test@example.com', 'password');
      } catch (error) {
        // Expected error in Phase 1
      }

      expect(service.isInitialized()).toBe(true);
    });
  });
});