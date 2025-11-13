// Phase 3: Offline-First Sync Manager
// Implements complete offline-first architecture with Firebase sync

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL
} from 'firebase/storage';
import { firebaseService } from '../firebase/config';
import { SyncOperation, SyncOperationType, NetworkState } from '../../types/sync';
import { ExperienceLog } from '../../types/experience';
import { CiderMasterRecord } from '../../types/cider';
import { sqliteService } from '../database/sqlite';

class SyncManager {
  private static instance: SyncManager;
  private syncInProgress: boolean = false;
  private networkState: NetworkState = {
    isConnected: false,
    type: null,
    isInternetReachable: null
  };

  // Performance monitoring
  private syncStartTime: number = 0;
  private syncOperationCount: number = 0;

  constructor() {
    this.initializeNetworkMonitoring();
    this.initializeAppStateMonitoring();
  }

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  private initializeNetworkMonitoring(): void {
    NetInfo.addEventListener((state: NetInfoState) => {
      const previouslyConnected = this.networkState.isConnected;

      this.networkState = {
        isConnected: state.isConnected || false,
        type: state.type,
        isInternetReachable: state.isInternetReachable
      };

      console.log('Network state changed:', this.networkState);

      // Process sync queue when coming back online
      if (!previouslyConnected && this.networkState.isConnected && !this.syncInProgress) {
        console.log('Device came back online, processing sync queue...');
        this.processSyncQueue();
      }
    });

    // Get initial network state
    NetInfo.fetch().then((state: NetInfoState) => {
      this.networkState = {
        isConnected: state.isConnected || false,
        type: state.type,
        isInternetReachable: state.isInternetReachable
      };
    });
  }

  private initializeAppStateMonitoring(): void {
    AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && this.networkState.isConnected && !this.syncInProgress) {
        console.log('App became active, checking sync queue...');
        this.processSyncQueue();
      }
    });
  }

  async queueOperation(type: SyncOperationType, data: any): Promise<void> {
    try {
      const operation: SyncOperation = {
        id: this.generateUUID(),
        type,
        data,
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
        status: 'pending'
      };

      // Add to SQLite queue table
      await sqliteService.insertSyncOperation(operation);
      console.log(`Queued sync operation: ${type}`);

      // Process immediately if online
      if (this.networkState.isConnected && !this.syncInProgress) {
        this.processSyncQueue();
      }
    } catch (error) {
      console.error('Failed to queue sync operation:', error);
      throw error;
    }
  }

  async processSyncQueue(): Promise<void> {
    if (this.syncInProgress || !this.networkState.isConnected) {
      console.log('Sync already in progress or offline, skipping...');
      return;
    }

    // Check if Firebase is initialized before syncing
    if (!firebaseService.isInitialized()) {
      console.log('Firebase not ready yet, deferring sync...');
      return;
    }

    this.syncInProgress = true;
    this.syncStartTime = Date.now();
    this.syncOperationCount = 0;

    try {
      console.log('Starting sync queue processing...');
      const pendingOperations = await sqliteService.getPendingSyncOperations();

      if (pendingOperations.length === 0) {
        console.log('No pending sync operations');
        return;
      }

      console.log(`Processing ${pendingOperations.length} pending sync operations`);

      for (const operation of pendingOperations) {
        try {
          await this.executeOperation(operation);
          await sqliteService.deleteSyncOperation(operation.id);
          this.syncOperationCount++;

          console.log(`Successfully synced operation: ${operation.type}`);
        } catch (error) {
          console.error(`Failed to sync operation ${operation.id}:`, error);

          const newRetryCount = operation.retryCount + 1;

          if (newRetryCount >= operation.maxRetries) {
            await sqliteService.updateSyncOperationStatus(
              operation.id,
              'error',
              error instanceof Error ? error.message : 'Unknown error'
            );
            console.error(`Operation ${operation.id} exceeded max retries`);
          } else {
            // Update retry count but keep as pending
            await sqliteService.updateSyncOperationStatus(
              operation.id,
              'pending',
              error instanceof Error ? error.message : 'Unknown error'
            );
          }
        }

        // Break if we go offline during sync
        if (!this.networkState.isConnected) {
          console.log('Went offline during sync, stopping...');
          break;
        }
      }

      // Record performance metrics
      const syncDuration = Date.now() - this.syncStartTime;
      console.log(`Sync completed: ${this.syncOperationCount} operations in ${syncDuration}ms`);

    } catch (error) {
      console.error('Sync queue processing failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async executeOperation(operation: SyncOperation): Promise<void> {
    switch (operation.type) {
      case 'CREATE_CIDER':
        await this.syncCreateCider(operation.data);
        break;

      case 'UPDATE_CIDER':
        await this.syncUpdateCider(operation.data);
        break;

      case 'DELETE_CIDER':
        await this.syncDeleteCider(operation.data.id);
        break;

      case 'CREATE_EXPERIENCE':
        await this.syncCreateExperience(operation.data);
        break;

      case 'UPDATE_EXPERIENCE':
        await this.syncUpdateExperience(operation.data);
        break;

      case 'DELETE_EXPERIENCE':
        await this.syncDeleteExperience(operation.data.id);
        break;

      case 'UPLOAD_IMAGE':
        await this.syncUploadImage(operation.data);
        break;

      default:
        throw new Error(`Unknown sync operation type: ${operation.type}`);
    }
  }

  private async syncCreateCider(cider: CiderMasterRecord): Promise<void> {
    try {
      const db = firebaseService.getFirestore();
      const ciderRef = doc(db, 'ciders', cider.id);

      // Debug: Log the incoming cider data
      console.log('Syncing cider - createdAt type:', typeof cider.createdAt, 'value:', cider.createdAt);
      console.log('Syncing cider - updatedAt type:', typeof cider.updatedAt, 'value:', cider.updatedAt);

      // Convert all date fields to ISO strings
      // Handle both Date objects and date strings from SQLite
      const safeDate = (dateValue: any): string => {
        if (!dateValue) return new Date().toISOString();
        if (dateValue instanceof Date) return dateValue.toISOString();
        if (typeof dateValue === 'string') return dateValue;
        // If it's a number (timestamp), convert it
        if (typeof dateValue === 'number') return new Date(dateValue).toISOString();
        // Fallback
        return new Date().toISOString();
      };

      // Build clean data object with only the fields we want
      const ciderData = {
        id: cider.id,
        name: cider.name,
        brand: cider.brand,
        abv: cider.abv || null,
        style: cider.style || null,
        traditionalStyle: cider.traditionalStyle || null,
        overallRating: cider.overallRating || null,
        tasteTags: cider.tasteTags || null,
        sweetness: cider.sweetness || null,
        carbonation: cider.carbonation || null,
        clarity: cider.clarity || null,
        color: cider.color || null,
        photo: cider.photo || null,
        notes: cider.notes || null,
        userId: cider.userId || 'default-user',
        syncStatus: 'synced',
        version: cider.version || 1,
        createdAt: safeDate(cider.createdAt),
        updatedAt: safeDate(cider.updatedAt),
      };

      console.log('Sending to Firebase:', JSON.stringify(ciderData, null, 2));

      await setDoc(ciderRef, ciderData);

      console.log('✅ Cider synced to Firestore successfully:', cider.id);

      // Update local sync status
      await sqliteService.updateCider(cider.id, {
        syncStatus: 'synced',
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Failed to sync create cider:', error);
      throw error;
    }
  }

  private async syncUpdateCider(cider: CiderMasterRecord): Promise<void> {
    try {
      const db = firebaseService.getFirestore();
      const ciderRef = doc(db, 'ciders', cider.id);

      // Convert dates to ISO strings
      const ciderData = {
        ...cider,
        createdAt: cider.createdAt instanceof Date ? cider.createdAt.toISOString() : cider.createdAt,
        updatedAt: cider.updatedAt instanceof Date ? cider.updatedAt.toISOString() : cider.updatedAt,
      };

      await updateDoc(ciderRef, ciderData);

      // Update local sync status
      await sqliteService.updateCider(cider.id, {
        syncStatus: 'synced',
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Failed to sync update cider:', error);
      throw error;
    }
  }

  private async syncDeleteCider(ciderId: string): Promise<void> {
    try {
      const db = firebaseService.getFirestore();
      const ciderRef = doc(db, 'ciders', ciderId);

      await deleteDoc(ciderRef);
    } catch (error) {
      console.error('Failed to sync delete cider:', error);
      throw error;
    }
  }

  private async syncCreateExperience(experience: ExperienceLog): Promise<void> {
    try {
      const db = firebaseService.getFirestore();
      const experienceRef = doc(db, 'experiences', experience.id);

      // Convert dates to ISO strings
      const experienceData = {
        ...experience,
        date: experience.date instanceof Date ? experience.date.toISOString() : experience.date,
        createdAt: experience.createdAt instanceof Date ? experience.createdAt.toISOString() : experience.createdAt,
        updatedAt: experience.updatedAt instanceof Date ? experience.updatedAt.toISOString() : experience.updatedAt,
      };

      await setDoc(experienceRef, experienceData);

      console.log('Experience synced to Firebase:', experience.id);
    } catch (error) {
      console.error('Failed to sync create experience:', error);
      throw error;
    }
  }

  private async syncUpdateExperience(experience: ExperienceLog): Promise<void> {
    try {
      const db = firebaseService.getFirestore();
      const experienceRef = doc(db, 'experiences', experience.id);

      // Convert dates to ISO strings
      const experienceData = {
        ...experience,
        date: experience.date instanceof Date ? experience.date.toISOString() : experience.date,
        createdAt: experience.createdAt instanceof Date ? experience.createdAt.toISOString() : experience.createdAt,
        updatedAt: experience.updatedAt instanceof Date ? experience.updatedAt.toISOString() : experience.updatedAt,
      };

      await updateDoc(experienceRef, experienceData);
    } catch (error) {
      console.error('Failed to sync update experience:', error);
      throw error;
    }
  }

  private async syncDeleteExperience(experienceId: string): Promise<void> {
    try {
      const db = firebaseService.getFirestore();
      const experienceRef = doc(db, 'experiences', experienceId);

      await deleteDoc(experienceRef);
    } catch (error) {
      console.error('Failed to sync delete experience:', error);
      throw error;
    }
  }

  private async syncUploadImage(imageData: { localPath: string; remotePath: string; ciderId: string }): Promise<void> {
    // Check if Storage is available (requires Blaze plan)
    if (!firebaseService.isStorageAvailable()) {
      console.warn('Firebase Storage not available. Skipping image upload. Upgrade to Blaze plan to enable image uploads.');
      return; // Skip image upload silently
    }

    try {
      const storage = firebaseService.getStorage();
      if (!storage) {
        console.warn('Storage not initialized, skipping image upload');
        return;
      }

      const storageRef = ref(storage, imageData.remotePath);

      // For React Native, we need to fetch the file as blob
      const response = await fetch(imageData.localPath);
      const blob = await response.blob();

      const uploadTask = uploadBytesResumable(storageRef, blob);

      // Wait for upload to complete
      await new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`Upload is ${progress}% done`);
          },
          (error) => {
            console.error('Upload error:', error);
            reject(error);
          },
          () => {
            console.log('Upload complete');
            resolve(uploadTask.snapshot);
          }
        );
      });

      const downloadURL = await getDownloadURL(storageRef);

      // Update cider with new image URL
      await this.queueOperation('UPDATE_CIDER', {
        id: imageData.ciderId,
        photo: downloadURL,
        updatedAt: new Date()
      });

      console.log('Image uploaded successfully:', downloadURL);
    } catch (error) {
      console.error('Failed to upload image:', error);
      throw error;
    }
  }

  // Utility methods
  async getSyncQueueStats() {
    try {
      const pendingOperations = await sqliteService.getPendingSyncOperations();
      const failedCount = pendingOperations.filter(op => op.status === 'error').length;

      return {
        pending: pendingOperations.filter(op => op.status === 'pending').length,
        syncing: pendingOperations.filter(op => op.status === 'syncing').length,
        failed: failedCount,
        lastSync: pendingOperations.length > 0 ? pendingOperations[0].timestamp : null
      };
    } catch (error) {
      console.error('Failed to get sync stats:', error);
      return {
        pending: 0,
        syncing: 0,
        failed: 0,
        lastSync: null
      };
    }
  }

  isOnline(): boolean {
    return this.networkState.isConnected;
  }

  getNetworkState(): NetworkState {
    return { ...this.networkState };
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Force sync for testing
  async forceSyncNow(): Promise<void> {
    console.log('Force sync requested...');
    await this.processSyncQueue();
  }
}

// Singleton instance
export const syncManager = SyncManager.getInstance();
export default SyncManager;