// Firebase configuration for Phase 3 (Expo compatible)
// Using Firebase JS SDK v9+ which works with Expo managed workflow

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
  Firestore
} from 'firebase/firestore';
import {
  getStorage,
  FirebaseStorage
} from 'firebase/storage';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// Load configuration from environment variables
export const firebaseConfig: FirebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || ''
};

// Validate configuration
function validateFirebaseConfig(config: FirebaseConfig): boolean {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'appId'];
  for (const field of requiredFields) {
    if (!config[field as keyof FirebaseConfig]) {
      console.error(`Missing Firebase config: ${field}`);
      return false;
    }
  }
  return true;
}

// Phase 3 Firebase Service (Expo compatible)
export class FirebaseService {
  private initialized = false;
  private app: FirebaseApp | null = null;
  private firestoreInstance: Firestore | null = null;
  private storageInstance: FirebaseStorage | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('Firebase already initialized');
      return;
    }

    try {
      // Validate configuration
      if (!validateFirebaseConfig(firebaseConfig)) {
        throw new Error('Invalid Firebase configuration. Check your .env file.');
      }

      console.log('Initializing Firebase with config:', {
        projectId: firebaseConfig.projectId,
        storageBucket: firebaseConfig.storageBucket
      });

      // Initialize Firebase app
      if (!getApps().length) {
        this.app = initializeApp(firebaseConfig);
      } else {
        this.app = getApp();
      }

      // Initialize Firestore
      this.firestoreInstance = getFirestore(this.app);

      // Note: We use SQLite for offline persistence (better for React Native)
      // Firebase JS SDK's IndexedDB persistence is web-only and not needed
      console.log('Firestore initialized (offline persistence handled by SQLite)');

      // Initialize Storage (optional - requires Blaze plan)
      try {
        this.storageInstance = getStorage(this.app);
        console.log('Firebase Storage initialized');
      } catch (storageError) {
        console.warn('Firebase Storage not available (Blaze plan required). Image uploads disabled.');
        this.storageInstance = null;
      }

      // Test Firestore connection
      const healthRef = doc(this.firestoreInstance, '_health_check', 'test');
      await setDoc(healthRef, {
        timestamp: serverTimestamp(),
        status: 'connected'
      });

      console.log('Firebase initialized successfully');
      this.initialized = true;
    } catch (error) {
      console.error('Firebase initialization failed:', error);
      throw error;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getFirestore(): Firestore {
    if (!this.initialized || !this.firestoreInstance) {
      throw new Error('Firebase not initialized. Call initialize() first.');
    }
    return this.firestoreInstance;
  }

  getStorage(): FirebaseStorage | null {
    if (!this.initialized) {
      throw new Error('Firebase not initialized. Call initialize() first.');
    }
    return this.storageInstance;
  }

  isStorageAvailable(): boolean {
    return this.storageInstance !== null;
  }

  getApp(): FirebaseApp {
    if (!this.app) {
      throw new Error('Firebase not initialized. Call initialize() first.');
    }
    return this.app;
  }

  // Authentication methods (for future phases)
  async signIn(email: string, password: string): Promise<void> {
    console.log('Authentication not implemented in Phase 3');
    throw new Error('Authentication coming in Phase 4');
  }

  async signUp(email: string, password: string): Promise<void> {
    console.log('Authentication not implemented in Phase 3');
    throw new Error('Authentication coming in Phase 4');
  }

  async signOut(): Promise<void> {
    console.log('Authentication not implemented in Phase 3');
    throw new Error('Authentication coming in Phase 4');
  }
}

// Singleton instance
export const firebaseService = new FirebaseService();