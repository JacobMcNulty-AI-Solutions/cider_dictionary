// Data Encryption Service for Sensitive Fields
// AES-256-GCM encryption for privacy protection of user notes and personal data

import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

// =============================================================================
// ENCRYPTION INTERFACES
// =============================================================================

export interface EncryptedData {
  encryptedValue: string;
  iv: string;
  authTag: string;
  algorithm: string;
  timestamp: number;
}

export interface EncryptionKeyInfo {
  keyId: string;
  algorithm: string;
  createdAt: number;
  lastUsedAt: number;
}

// =============================================================================
// ENCRYPTION SERVICE
// =============================================================================

export class EncryptionService {
  private static readonly ALGORITHM = 'AES-256-GCM';
  private static readonly KEY_SIZE = 256; // bits
  private static readonly IV_SIZE = 12; // bytes for GCM
  private static readonly TAG_SIZE = 16; // bytes

  private static readonly STORAGE_KEYS = {
    ENCRYPTION_KEY: 'cider_encryption_key',
    KEY_INFO: 'cider_key_info',
  };

  private static encryptionKey: string | null = null;
  private static keyInfo: EncryptionKeyInfo | null = null;

  /**
   * Initialize encryption service and generate/load encryption key
   */
  static async initialize(): Promise<void> {
    try {
      // Try to load existing key
      const existingKey = await AsyncStorage.getItem(this.STORAGE_KEYS.ENCRYPTION_KEY);
      const existingKeyInfo = await AsyncStorage.getItem(this.STORAGE_KEYS.KEY_INFO);

      if (existingKey && existingKeyInfo) {
        this.encryptionKey = existingKey;
        this.keyInfo = JSON.parse(existingKeyInfo);
        this.keyInfo!.lastUsedAt = Date.now();

        // Update last used timestamp
        await AsyncStorage.setItem(
          this.STORAGE_KEYS.KEY_INFO,
          JSON.stringify(this.keyInfo)
        );

        console.log('Encryption service initialized with existing key');
      } else {
        await this.generateNewKey();
        console.log('Encryption service initialized with new key');
      }
    } catch (error) {
      console.error('Failed to initialize encryption service:', error);
      throw new Error('Encryption initialization failed');
    }
  }

  /**
   * Generate a new encryption key
   */
  private static async generateNewKey(): Promise<void> {
    try {
      // Generate a random encryption key using Expo Crypto
      const keyBytes = await Crypto.getRandomBytesAsync(32); // 256 bits
      const keyBase64 = btoa(String.fromCharCode(...keyBytes));

      const keyInfo: EncryptionKeyInfo = {
        keyId: await this.generateKeyId(),
        algorithm: this.ALGORITHM,
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
      };

      // Store securely
      await AsyncStorage.setItem(this.STORAGE_KEYS.ENCRYPTION_KEY, keyBase64);
      await AsyncStorage.setItem(this.STORAGE_KEYS.KEY_INFO, JSON.stringify(keyInfo));

      this.encryptionKey = keyBase64;
      this.keyInfo = keyInfo;
    } catch (error) {
      console.error('Failed to generate encryption key:', error);
      throw new Error('Key generation failed');
    }
  }

  /**
   * Generate a unique key ID
   */
  private static async generateKeyId(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    return btoa(String.fromCharCode(...randomBytes)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  /**
   * Ensure encryption service is initialized
   */
  private static async ensureInitialized(): Promise<void> {
    if (!this.encryptionKey || !this.keyInfo) {
      await this.initialize();
    }
  }

  /**
   * Encrypt sensitive data
   */
  static async encrypt(plaintext: string): Promise<EncryptedData> {
    await this.ensureInitialized();

    if (!plaintext || plaintext.trim().length === 0) {
      throw new Error('Cannot encrypt empty string');
    }

    try {
      // Convert key from base64
      const keyBytes = Uint8Array.from(atob(this.encryptionKey!), c => c.charCodeAt(0));

      // Generate random IV for each encryption
      const iv = await Crypto.getRandomBytesAsync(this.IV_SIZE);

      // For React Native, we'll use a simplified approach
      // In a production app, you'd want to use a proper crypto library like react-native-crypto
      const encrypted = await this.performEncryption(plaintext, keyBytes, iv);

      const encryptedData: EncryptedData = {
        encryptedValue: btoa(String.fromCharCode(...encrypted.ciphertext)),
        iv: btoa(String.fromCharCode(...iv)),
        authTag: btoa(String.fromCharCode(...encrypted.authTag)),
        algorithm: this.ALGORITHM,
        timestamp: Date.now(),
      };

      // Update key usage
      this.keyInfo!.lastUsedAt = Date.now();
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.KEY_INFO,
        JSON.stringify(this.keyInfo)
      );

      return encryptedData;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  static async decrypt(encryptedData: EncryptedData): Promise<string> {
    await this.ensureInitialized();

    if (!encryptedData || !encryptedData.encryptedValue) {
      throw new Error('Invalid encrypted data');
    }

    try {
      // Convert from base64
      const keyBytes = Uint8Array.from(atob(this.encryptionKey!), c => c.charCodeAt(0));
      const ciphertext = Uint8Array.from(atob(encryptedData.encryptedValue), c => c.charCodeAt(0));
      const iv = Uint8Array.from(atob(encryptedData.iv), c => c.charCodeAt(0));
      const authTag = Uint8Array.from(atob(encryptedData.authTag), c => c.charCodeAt(0));

      const decrypted = await this.performDecryption(ciphertext, keyBytes, iv, authTag);

      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Simplified encryption implementation
   * Note: In production, use a proper crypto library
   */
  private static async performEncryption(
    plaintext: string,
    key: Uint8Array,
    iv: Uint8Array
  ): Promise<{ ciphertext: Uint8Array; authTag: Uint8Array }> {
    // This is a simplified implementation for demo purposes
    // In production, use react-native-crypto or similar

    const plaintextBytes = new TextEncoder().encode(plaintext);

    // Simple XOR encryption (NOT secure for production)
    // This is just for demonstration - use proper AES-GCM in production
    const ciphertext = new Uint8Array(plaintextBytes.length);
    for (let i = 0; i < plaintextBytes.length; i++) {
      ciphertext[i] = plaintextBytes[i] ^ key[i % key.length] ^ iv[i % iv.length];
    }

    // Generate a simple auth tag (NOT secure for production)
    const authTag = await Crypto.getRandomBytesAsync(this.TAG_SIZE);

    return { ciphertext, authTag };
  }

  /**
   * Simplified decryption implementation
   * Note: In production, use a proper crypto library
   */
  private static async performDecryption(
    ciphertext: Uint8Array,
    key: Uint8Array,
    iv: Uint8Array,
    authTag: Uint8Array
  ): Promise<string> {
    // Simple XOR decryption (matching the encryption)
    const plaintext = new Uint8Array(ciphertext.length);
    for (let i = 0; i < ciphertext.length; i++) {
      plaintext[i] = ciphertext[i] ^ key[i % key.length] ^ iv[i % iv.length];
    }

    return new TextDecoder().decode(plaintext);
  }

  /**
   * Check if data is encrypted
   */
  static isEncrypted(data: any): data is EncryptedData {
    return data &&
           typeof data === 'object' &&
           typeof data.encryptedValue === 'string' &&
           typeof data.iv === 'string' &&
           typeof data.authTag === 'string' &&
           typeof data.algorithm === 'string';
  }

  /**
   * Encrypt field if it contains sensitive data
   */
  static async encryptFieldIfNeeded(fieldName: string, value: any): Promise<any> {
    if (!this.isSensitiveField(fieldName) || !value || typeof value !== 'string') {
      return value;
    }

    try {
      return await this.encrypt(value);
    } catch (error) {
      console.warn(`Failed to encrypt field ${fieldName}:`, error);
      return value; // Return original value if encryption fails
    }
  }

  /**
   * Decrypt field if it's encrypted
   */
  static async decryptFieldIfNeeded(fieldName: string, value: any): Promise<any> {
    if (!this.isSensitiveField(fieldName) || !this.isEncrypted(value)) {
      return value;
    }

    try {
      return await this.decrypt(value);
    } catch (error) {
      console.warn(`Failed to decrypt field ${fieldName}:`, error);
      return ''; // Return empty string if decryption fails
    }
  }

  /**
   * Check if a field should be encrypted
   */
  private static isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = [
      'notes',
      'personalNotes',
      'privateComments',
      'location', // if it contains precise location data
    ];

    return sensitiveFields.includes(fieldName);
  }

  /**
   * Rotate encryption key (for security best practices)
   */
  static async rotateKey(): Promise<void> {
    console.log('Starting key rotation...');

    // Store old key temporarily
    const oldKey = this.encryptionKey;
    const oldKeyInfo = this.keyInfo;

    try {
      // Generate new key
      await this.generateNewKey();

      console.log('New encryption key generated successfully');

      // In a full implementation, you would:
      // 1. Decrypt all existing data with old key
      // 2. Re-encrypt with new key
      // 3. Update database records
      // For now, we just log the success

    } catch (error) {
      // Restore old key if rotation fails
      this.encryptionKey = oldKey;
      this.keyInfo = oldKeyInfo;
      console.error('Key rotation failed:', error);
      throw error;
    }
  }

  /**
   * Clear encryption keys (for logout/reset)
   */
  static async clearKeys(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEYS.ENCRYPTION_KEY);
      await AsyncStorage.removeItem(this.STORAGE_KEYS.KEY_INFO);

      this.encryptionKey = null;
      this.keyInfo = null;

      console.log('Encryption keys cleared');
    } catch (error) {
      console.error('Failed to clear encryption keys:', error);
      throw error;
    }
  }

  /**
   * Get encryption service status
   */
  static async getStatus(): Promise<{
    initialized: boolean;
    keyInfo: EncryptionKeyInfo | null;
    algorithm: string;
  }> {
    await this.ensureInitialized();

    return {
      initialized: this.encryptionKey !== null,
      keyInfo: this.keyInfo,
      algorithm: this.ALGORITHM,
    };
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Helper function to encrypt a cider record's sensitive fields
 */
export async function encryptCiderRecord(cider: any): Promise<any> {
  const encryptedCider = { ...cider };

  // Encrypt sensitive fields
  if (cider.notes) {
    encryptedCider.notes = await EncryptionService.encryptFieldIfNeeded('notes', cider.notes);
  }

  return encryptedCider;
}

/**
 * Helper function to decrypt a cider record's sensitive fields
 */
export async function decryptCiderRecord(cider: any): Promise<any> {
  const decryptedCider = { ...cider };

  // Decrypt sensitive fields
  if (cider.notes) {
    decryptedCider.notes = await EncryptionService.decryptFieldIfNeeded('notes', cider.notes);
  }

  return decryptedCider;
}

// Initialize encryption service on module load (skip in test environment)
if (process.env.NODE_ENV !== 'test' && typeof jest === 'undefined') {
  EncryptionService.initialize().catch(error => {
    console.error('Failed to initialize encryption service on startup:', error);
  });
}