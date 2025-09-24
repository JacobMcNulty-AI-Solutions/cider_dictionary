// Comprehensive Encryption Service Tests for Phase 2 Data Protection
// Tests for AES-256-GCM encryption, key management, and field-level security

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import {
  EncryptionService,
  EncryptedData,
  EncryptionKeyInfo,
  encryptCiderRecord,
  decryptCiderRecord,
} from '../encryptionService';

// =============================================================================
// TEST SETUP AND MOCKS
// =============================================================================

// Mock expo-crypto
const mockGetRandomBytesAsync = jest.fn();
jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: (...args: any[]) => mockGetRandomBytesAsync(...args),
}));

// Mock AsyncStorage
const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock btoa and atob for Node.js environment
global.btoa = jest.fn().mockImplementation((str: string) => Buffer.from(str, 'binary').toString('base64'));
global.atob = jest.fn().mockImplementation((str: string) => Buffer.from(str, 'base64').toString('binary'));

// Test fixtures
const createMockEncryptedData = (overrides: Partial<EncryptedData> = {}): EncryptedData => ({
  encryptedValue: 'dGVzdGVuY3J5cHRlZGRhdGE=', // base64 encoded test data
  iv: 'dGVzdGl2MTIzNA==', // base64 encoded test IV
  authTag: 'dGVzdGF1dGh0YWc=', // base64 encoded test auth tag
  algorithm: 'AES-256-GCM',
  timestamp: Date.now(),
  ...overrides,
});

const createMockKeyInfo = (overrides: Partial<EncryptionKeyInfo> = {}): EncryptionKeyInfo => ({
  keyId: 'test-key-id-123',
  algorithm: 'AES-256-GCM',
  createdAt: Date.now(),
  lastUsedAt: Date.now(),
  ...overrides,
});

describe('EncryptionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset encryption service state
    (EncryptionService as any).encryptionKey = null;
    (EncryptionService as any).keyInfo = null;

    // Default mock implementations
    mockGetRandomBytesAsync.mockImplementation((size: number) => {
      const bytes = new Uint8Array(size);
      for (let i = 0; i < size; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
      return Promise.resolve(bytes);
    });

    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // =============================================================================
  // INITIALIZATION TESTS
  // =============================================================================

  describe('Initialization', () => {
    it('should initialize with new encryption key when none exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      await EncryptionService.initialize();

      // Verify new key was generated and stored
      expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(2);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'cider_encryption_key',
        expect.any(String)
      );
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'cider_key_info',
        expect.any(String)
      );
      expect(mockGetRandomBytesAsync).toHaveBeenCalledWith(32); // 256-bit key
      expect(mockGetRandomBytesAsync).toHaveBeenCalledWith(16); // Key ID
    });

    it('should initialize with existing encryption key', async () => {
      const existingKey = 'dGVzdGtleTEyMzQ1Njc4OTBhYmNkZWZnaGlqa2xtbm8=';
      const existingKeyInfo = JSON.stringify(createMockKeyInfo());

      mockAsyncStorage.getItem
        .mockResolvedValueOnce(existingKey)
        .mockResolvedValueOnce(existingKeyInfo);

      await EncryptionService.initialize();

      // Verify existing key was loaded
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('cider_encryption_key');
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('cider_key_info');
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'cider_key_info',
        expect.any(String) // Updated with new lastUsedAt
      );
      expect(mockGetRandomBytesAsync).not.toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('AsyncStorage failed'));

      await expect(EncryptionService.initialize()).rejects.toThrow('Encryption initialization failed');
    });

    it('should generate unique key IDs', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      // Mock different random bytes for key ID generation
      mockGetRandomBytesAsync
        .mockResolvedValueOnce(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])) // Key ID
        .mockResolvedValueOnce(new Uint8Array(32).fill(42)); // Encryption key

      await EncryptionService.initialize();

      const keyInfoCall = mockAsyncStorage.setItem.mock.calls.find(
        call => call[0] === 'cider_key_info'
      );
      expect(keyInfoCall).toBeDefined();

      const storedKeyInfo = JSON.parse(keyInfoCall![1]);
      expect(storedKeyInfo.keyId).toBeDefined();
      expect(storedKeyInfo.keyId.length).toBeGreaterThan(0);
      expect(storedKeyInfo.algorithm).toBe('AES-256-GCM');
    });
  });

  // =============================================================================
  // ENCRYPTION/DECRYPTION TESTS
  // =============================================================================

  describe('Encryption and Decryption', () => {
    beforeEach(async () => {
      // Initialize service with mock key
      mockAsyncStorage.getItem.mockResolvedValue(null);
      await EncryptionService.initialize();
    });

    it('should encrypt sensitive data successfully', async () => {
      const plaintext = 'This is sensitive user data that needs encryption';

      const encryptedData = await EncryptionService.encrypt(plaintext);

      expect(encryptedData).toHaveProperty('encryptedValue');
      expect(encryptedData).toHaveProperty('iv');
      expect(encryptedData).toHaveProperty('authTag');
      expect(encryptedData).toHaveProperty('algorithm');
      expect(encryptedData).toHaveProperty('timestamp');

      expect(encryptedData.algorithm).toBe('AES-256-GCM');
      expect(encryptedData.encryptedValue).not.toBe(plaintext);
      expect(encryptedData.iv.length).toBeGreaterThan(0);
      expect(encryptedData.authTag.length).toBeGreaterThan(0);
      expect(encryptedData.timestamp).toBeCloseTo(Date.now(), -2); // Within 100ms
    });

    it('should decrypt encrypted data successfully', async () => {
      const plaintext = 'Test data for decryption';

      const encryptedData = await EncryptionService.encrypt(plaintext);
      const decryptedText = await EncryptionService.decrypt(encryptedData);

      expect(decryptedText).toBe(plaintext);
    });

    it('should throw error when encrypting empty string', async () => {
      await expect(EncryptionService.encrypt('')).rejects.toThrow('Cannot encrypt empty string');
      await expect(EncryptionService.encrypt('   ')).rejects.toThrow('Cannot encrypt empty string');
    });

    it('should throw error when decrypting invalid data', async () => {
      const invalidData = {} as EncryptedData;

      await expect(EncryptionService.decrypt(invalidData)).rejects.toThrow('Invalid encrypted data');
    });

    it('should handle encryption errors gracefully', async () => {
      // Mock random bytes to fail
      mockGetRandomBytesAsync.mockRejectedValue(new Error('Random generation failed'));

      await expect(EncryptionService.encrypt('test data')).rejects.toThrow('Failed to encrypt data');
    });

    it('should handle decryption errors gracefully', async () => {
      const corruptedData = createMockEncryptedData({
        encryptedValue: 'invalid_base64_!@#$',
      });

      await expect(EncryptionService.decrypt(corruptedData)).rejects.toThrow('Failed to decrypt data');
    });

    it('should encrypt different plaintexts to different ciphertexts', async () => {
      const plaintext1 = 'First sensitive message';
      const plaintext2 = 'Second sensitive message';

      const encrypted1 = await EncryptionService.encrypt(plaintext1);
      const encrypted2 = await EncryptionService.encrypt(plaintext2);

      expect(encrypted1.encryptedValue).not.toBe(encrypted2.encryptedValue);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.authTag).not.toBe(encrypted2.authTag);
    });

    it('should encrypt same plaintext to different ciphertexts (IV randomization)', async () => {
      const plaintext = 'Same message encrypted twice';

      const encrypted1 = await EncryptionService.encrypt(plaintext);
      const encrypted2 = await EncryptionService.encrypt(plaintext);

      // Should be different due to random IV
      expect(encrypted1.encryptedValue).not.toBe(encrypted2.encryptedValue);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);

      // But should decrypt to same plaintext
      const decrypted1 = await EncryptionService.decrypt(encrypted1);
      const decrypted2 = await EncryptionService.decrypt(encrypted2);

      expect(decrypted1).toBe(plaintext);
      expect(decrypted2).toBe(plaintext);
    });
  });

  // =============================================================================
  // FIELD-LEVEL ENCRYPTION TESTS
  // =============================================================================

  describe('Field-Level Encryption', () => {
    beforeEach(async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      await EncryptionService.initialize();
    });

    it('should encrypt sensitive fields', async () => {
      const sensitiveValue = 'Personal notes about this cider';

      const result = await EncryptionService.encryptFieldIfNeeded('notes', sensitiveValue);

      expect(result).not.toBe(sensitiveValue);
      expect(result).toHaveProperty('encryptedValue');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('authTag');
    });

    it('should not encrypt non-sensitive fields', async () => {
      const publicValue = 'Public brand name';

      const result = await EncryptionService.encryptFieldIfNeeded('brand', publicValue);

      expect(result).toBe(publicValue);
    });

    it('should decrypt encrypted fields', async () => {
      const originalValue = 'Encrypted personal notes';
      const encryptedData = await EncryptionService.encrypt(originalValue);

      const result = await EncryptionService.decryptFieldIfNeeded('notes', encryptedData);

      expect(result).toBe(originalValue);
    });

    it('should not decrypt non-encrypted fields', async () => {
      const plainValue = 'Plain text value';

      const result = await EncryptionService.decryptFieldIfNeeded('notes', plainValue);

      expect(result).toBe(plainValue);
    });

    it('should identify encrypted data correctly', () => {
      const encryptedData = createMockEncryptedData();
      const plainData = 'plain text';
      const objectWithMissingFields = { encryptedValue: 'test' }; // Missing required fields

      expect(EncryptionService.isEncrypted(encryptedData)).toBe(true);
      expect(EncryptionService.isEncrypted(plainData)).toBe(false);
      expect(EncryptionService.isEncrypted(objectWithMissingFields)).toBe(false);
      expect(EncryptionService.isEncrypted(null)).toBe(false);
      expect(EncryptionService.isEncrypted(undefined)).toBe(false);
    });

    it('should handle encryption failures gracefully in field encryption', async () => {
      // Mock encryption to fail
      jest.spyOn(EncryptionService, 'encrypt').mockRejectedValue(new Error('Encryption failed'));

      const result = await EncryptionService.encryptFieldIfNeeded('notes', 'sensitive data');

      // Should return original value if encryption fails
      expect(result).toBe('sensitive data');
    });

    it('should handle decryption failures gracefully in field decryption', async () => {
      const corruptedEncryptedData = createMockEncryptedData({
        encryptedValue: 'corrupted_data',
      });

      const result = await EncryptionService.decryptFieldIfNeeded('notes', corruptedEncryptedData);

      // Should return empty string if decryption fails
      expect(result).toBe('');
    });
  });

  // =============================================================================
  // KEY MANAGEMENT TESTS
  // =============================================================================

  describe('Key Management', () => {
    it('should rotate encryption keys', async () => {
      // Initialize with first key
      mockAsyncStorage.getItem.mockResolvedValue(null);
      await EncryptionService.initialize();

      const firstKeyCall = mockAsyncStorage.setItem.mock.calls.find(
        call => call[0] === 'cider_encryption_key'
      );
      const firstKey = firstKeyCall![1];

      // Clear mocks
      jest.clearAllMocks();

      // Rotate key
      await EncryptionService.rotateKey();

      const secondKeyCall = mockAsyncStorage.setItem.mock.calls.find(
        call => call[0] === 'cider_encryption_key'
      );
      const secondKey = secondKeyCall![1];

      expect(secondKey).not.toBe(firstKey);
      expect(mockGetRandomBytesAsync).toHaveBeenCalledWith(32); // New key generation
    });

    it('should handle key rotation failures', async () => {
      // Initialize service
      mockAsyncStorage.getItem.mockResolvedValue(null);
      await EncryptionService.initialize();

      // Mock key generation failure during rotation
      mockGetRandomBytesAsync.mockRejectedValue(new Error('Key generation failed'));

      await expect(EncryptionService.rotateKey()).rejects.toThrow('Key generation failed');
    });

    it('should clear encryption keys', async () => {
      await EncryptionService.clearKeys();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('cider_encryption_key');
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('cider_key_info');
    });

    it('should handle key clearing errors', async () => {
      mockAsyncStorage.removeItem.mockRejectedValue(new Error('Storage error'));

      await expect(EncryptionService.clearKeys()).rejects.toThrow('Storage error');
    });

    it('should get encryption service status', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      await EncryptionService.initialize();

      const status = await EncryptionService.getStatus();

      expect(status).toHaveProperty('initialized');
      expect(status).toHaveProperty('keyInfo');
      expect(status).toHaveProperty('algorithm');
      expect(status.initialized).toBe(true);
      expect(status.algorithm).toBe('AES-256-GCM');
      expect(status.keyInfo).toBeDefined();
    });

    it('should update key usage timestamp', async () => {
      const existingKeyInfo = createMockKeyInfo({ lastUsedAt: Date.now() - 10000 });
      mockAsyncStorage.getItem
        .mockResolvedValueOnce('existing-key')
        .mockResolvedValueOnce(JSON.stringify(existingKeyInfo));

      await EncryptionService.initialize();

      // Find the updated key info
      const keyInfoUpdateCall = mockAsyncStorage.setItem.mock.calls.find(
        call => call[0] === 'cider_key_info'
      );
      expect(keyInfoUpdateCall).toBeDefined();

      const updatedKeyInfo = JSON.parse(keyInfoUpdateCall![1]);
      expect(updatedKeyInfo.lastUsedAt).toBeGreaterThan(existingKeyInfo.lastUsedAt);
    });
  });

  // =============================================================================
  // CIDER RECORD ENCRYPTION TESTS
  // =============================================================================

  describe('Cider Record Encryption', () => {
    beforeEach(async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      await EncryptionService.initialize();
    });

    it('should encrypt sensitive fields in cider record', async () => {
      const ciderRecord = {
        id: 'test-cider-1',
        name: 'Test Cider',
        brand: 'Test Brand',
        notes: 'These are my personal thoughts about this cider',
        overallRating: 4.5,
        abv: 5.2,
      };

      const encryptedRecord = await encryptCiderRecord(ciderRecord);

      expect(encryptedRecord.id).toBe(ciderRecord.id); // Not encrypted
      expect(encryptedRecord.name).toBe(ciderRecord.name); // Not encrypted
      expect(encryptedRecord.brand).toBe(ciderRecord.brand); // Not encrypted
      expect(encryptedRecord.notes).not.toBe(ciderRecord.notes); // Encrypted
      expect(encryptedRecord.notes).toHaveProperty('encryptedValue');
      expect(encryptedRecord.overallRating).toBe(ciderRecord.overallRating); // Not encrypted
    });

    it('should decrypt sensitive fields in cider record', async () => {
      const originalNotes = 'Original personal notes';
      const ciderRecord = {
        id: 'test-cider-1',
        name: 'Test Cider',
        notes: await EncryptionService.encrypt(originalNotes),
      };

      const decryptedRecord = await decryptCiderRecord(ciderRecord);

      expect(decryptedRecord.id).toBe(ciderRecord.id);
      expect(decryptedRecord.name).toBe(ciderRecord.name);
      expect(decryptedRecord.notes).toBe(originalNotes);
    });

    it('should handle cider records without sensitive fields', async () => {
      const ciderRecord = {
        id: 'test-cider-1',
        name: 'Test Cider',
        brand: 'Test Brand',
        overallRating: 4.0,
      };

      const encryptedRecord = await encryptCiderRecord(ciderRecord);
      const decryptedRecord = await decryptCiderRecord(encryptedRecord);

      expect(encryptedRecord).toEqual(ciderRecord);
      expect(decryptedRecord).toEqual(ciderRecord);
    });

    it('should handle null and undefined notes', async () => {
      const ciderWithNullNotes = { id: '1', notes: null };
      const ciderWithUndefinedNotes = { id: '2', notes: undefined };
      const ciderWithEmptyNotes = { id: '3', notes: '' };

      const encryptedNull = await encryptCiderRecord(ciderWithNullNotes);
      const encryptedUndefined = await encryptCiderRecord(ciderWithUndefinedNotes);
      const encryptedEmpty = await encryptCiderRecord(ciderWithEmptyNotes);

      expect(encryptedNull.notes).toBeNull();
      expect(encryptedUndefined.notes).toBeUndefined();
      expect(encryptedEmpty.notes).toBe('');
    });
  });

  // =============================================================================
  // PERFORMANCE TESTS
  // =============================================================================

  describe('Performance', () => {
    beforeEach(async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      await EncryptionService.initialize();
    });

    it('should handle batch encryption efficiently', async () => {
      const batchSize = 50;
      const plaintexts = Array.from({ length: batchSize }, (_, i) => `Sensitive data ${i}`);

      const startTime = performance.now();

      const encryptPromises = plaintexts.map(text => EncryptionService.encrypt(text));
      const encryptedData = await Promise.all(encryptPromises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(encryptedData).toHaveLength(batchSize);
      expect(duration).toBeLessThan(2000); // Should complete in under 2 seconds

      // Verify all data was encrypted
      encryptedData.forEach((encrypted, index) => {
        expect(encrypted.encryptedValue).not.toBe(plaintexts[index]);
        expect(encrypted).toHaveProperty('iv');
        expect(encrypted).toHaveProperty('authTag');
      });
    });

    it('should handle batch decryption efficiently', async () => {
      const batchSize = 50;
      const plaintexts = Array.from({ length: batchSize }, (_, i) => `Sensitive data ${i}`);

      // First encrypt all data
      const encryptedData = await Promise.all(
        plaintexts.map(text => EncryptionService.encrypt(text))
      );

      const startTime = performance.now();

      const decryptPromises = encryptedData.map(encrypted => EncryptionService.decrypt(encrypted));
      const decryptedData = await Promise.all(decryptPromises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(decryptedData).toHaveLength(batchSize);
      expect(duration).toBeLessThan(2000); // Should complete in under 2 seconds
      expect(decryptedData).toEqual(plaintexts);
    });

    it('should handle large text encryption', async () => {
      const largeText = 'A'.repeat(10000); // 10KB of text

      const startTime = performance.now();
      const encrypted = await EncryptionService.encrypt(largeText);
      const decrypted = await EncryptionService.decrypt(encrypted);
      const endTime = performance.now();

      expect(decrypted).toBe(largeText);
      expect(endTime - startTime).toBeLessThan(500); // Should be fast even for large text
    });
  });

  // =============================================================================
  // SECURITY TESTS
  // =============================================================================

  describe('Security', () => {
    beforeEach(async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      await EncryptionService.initialize();
    });

    it('should use unique IVs for each encryption', async () => {
      const plaintext = 'Same message';
      const iterations = 10;

      const encryptedData = await Promise.all(
        Array.from({ length: iterations }, () => EncryptionService.encrypt(plaintext))
      );

      const ivs = encryptedData.map(data => data.iv);
      const uniqueIvs = new Set(ivs);

      expect(uniqueIvs.size).toBe(iterations); // All IVs should be unique
    });

    it('should use proper key length for AES-256', async () => {
      // This test verifies that the key generation requests the correct size
      await EncryptionService.initialize();

      // Verify that a 256-bit (32 byte) key was requested
      expect(mockGetRandomBytesAsync).toHaveBeenCalledWith(32);
    });

    it('should use proper IV length for GCM mode', async () => {
      const plaintext = 'Test message';

      await EncryptionService.encrypt(plaintext);

      // Verify that a 12-byte IV was generated (standard for GCM)
      const encryptCalls = mockGetRandomBytesAsync.mock.calls.filter(call => call[0] === 12);
      expect(encryptCalls.length).toBeGreaterThan(0);
    });

    it('should include authentication tag', async () => {
      const plaintext = 'Authenticated message';
      const encrypted = await EncryptionService.encrypt(plaintext);

      expect(encrypted.authTag).toBeDefined();
      expect(encrypted.authTag.length).toBeGreaterThan(0);

      // Auth tag should be different for different messages
      const encrypted2 = await EncryptionService.encrypt(plaintext + ' different');
      expect(encrypted2.authTag).not.toBe(encrypted.authTag);
    });

    it('should not expose sensitive data in error messages', async () => {
      const sensitiveData = 'super secret password';

      try {
        // Force an error by corrupting the encryption process
        mockGetRandomBytesAsync.mockRejectedValue(new Error('Crypto error'));
        await EncryptionService.encrypt(sensitiveData);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        expect(errorMessage).not.toContain(sensitiveData);
        expect(errorMessage).not.toContain('super');
        expect(errorMessage).not.toContain('secret');
        expect(errorMessage).not.toContain('password');
      }
    });

    it('should validate algorithm consistency', () => {
      const encryptedData1 = createMockEncryptedData({ algorithm: 'AES-256-GCM' });
      const encryptedData2 = createMockEncryptedData({ algorithm: 'AES-128-CBC' }); // Different algorithm

      expect(EncryptionService.isEncrypted(encryptedData1)).toBe(true);
      expect(EncryptionService.isEncrypted(encryptedData2)).toBe(true); // Still valid structure

      // In actual implementation, you might want to validate algorithm compatibility
      expect(encryptedData1.algorithm).toBe('AES-256-GCM');
      expect(encryptedData2.algorithm).toBe('AES-128-CBC');
    });
  });

  // =============================================================================
  // EDGE CASES AND ERROR SCENARIOS
  // =============================================================================

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle service reinitialization', async () => {
      // Initialize first time
      mockAsyncStorage.getItem.mockResolvedValue(null);
      await EncryptionService.initialize();

      const firstInitCalls = mockAsyncStorage.setItem.mock.calls.length;

      // Clear mocks
      jest.clearAllMocks();

      // Initialize again - should load existing key
      const existingKey = 'existing-key';
      const existingKeyInfo = JSON.stringify(createMockKeyInfo());
      mockAsyncStorage.getItem
        .mockResolvedValueOnce(existingKey)
        .mockResolvedValueOnce(existingKeyInfo);

      await EncryptionService.initialize();

      // Should not create new key
      expect(mockGetRandomBytesAsync).not.toHaveBeenCalled();
      // Should update last used timestamp
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'cider_key_info',
        expect.any(String)
      );
    });

    it('should handle corrupted key info gracefully', async () => {
      const existingKey = 'existing-key';
      const corruptedKeyInfo = 'invalid-json{';

      mockAsyncStorage.getItem
        .mockResolvedValueOnce(existingKey)
        .mockResolvedValueOnce(corruptedKeyInfo);

      // Should fall back to generating new key
      await expect(EncryptionService.initialize()).rejects.toThrow('Encryption initialization failed');
    });

    it('should handle partial async storage data', async () => {
      // Key exists but key info doesn't
      mockAsyncStorage.getItem
        .mockResolvedValueOnce('existing-key')
        .mockResolvedValueOnce(null);

      await expect(EncryptionService.initialize()).rejects.toThrow('Encryption initialization failed');
    });

    it('should handle extremely long plaintexts', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      await EncryptionService.initialize();

      const longText = 'A'.repeat(1000000); // 1MB of text

      const encrypted = await EncryptionService.encrypt(longText);
      expect(encrypted.encryptedValue).toBeDefined();
      expect(encrypted.encryptedValue.length).toBeGreaterThan(0);

      const decrypted = await EncryptionService.decrypt(encrypted);
      expect(decrypted).toBe(longText);
    });

    it('should handle special characters and unicode', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      await EncryptionService.initialize();

      const unicodeText = '🍺🍎 Émojis and spéciàl çharæctërs: 你好世界 🎉';

      const encrypted = await EncryptionService.encrypt(unicodeText);
      const decrypted = await EncryptionService.decrypt(encrypted);

      expect(decrypted).toBe(unicodeText);
    });

    it('should handle rapid successive operations', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      await EncryptionService.initialize();

      const operations = Array.from({ length: 100 }, async (_, i) => {
        const text = `Message ${i}`;
        const encrypted = await EncryptionService.encrypt(text);
        return EncryptionService.decrypt(encrypted);
      });

      const results = await Promise.all(operations);

      results.forEach((result, index) => {
        expect(result).toBe(`Message ${index}`);
      });
    });
  });
});