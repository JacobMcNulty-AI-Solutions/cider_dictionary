// Phase 3: Offline-First Sync Manager
// Implements complete offline-first architecture with Firebase sync

// Mock dependencies for development environment
// import NetInfo, { NetInfoState } from '@react-native-netinfo/netinfo';
// import { AppState, AppStateStatus } from 'react-native';
// import firestore from '@react-native-firebase/firestore';
// import storage from '@react-native-firebase/storage';

// Mock NetInfo for development
interface NetInfoState {
  isConnected: boolean | null;
  type: string | null;
  isInternetReachable: boolean | null;
}

const mockNetInfo = {
  addEventListener: (callback: (state: NetInfoState) => void) => {
    // Return mock unsubscribe function
    return () => {};
  },
  fetch: (): Promise<NetInfoState> => Promise.resolve({
    isConnected: true,
    type: 'wifi',
    isInternetReachable: true
  })
};

const NetInfo = mockNetInfo;

// Mock AppState
type AppStateStatus = 'active' | 'background' | 'inactive';

const mockAppState = {
  addEventListener: (event: string, callback: (state: AppStateStatus) => void) => {
    // Return mock subscription
    return { remove: () => {} };
  },
  currentState: 'active' as AppStateStatus
};

const AppState = mockAppState;

// Mock Firestore
const mockFirestoreInstance = {
  collection: (path: string) => ({
    doc: (id: string) => ({
      set: (data: any) => Promise.resolve(),
      update: (data: any) => Promise.resolve(),
      delete: () => Promise.resolve()
    })
  }),
  Timestamp: {
    fromDate: (date: Date) => ({ toDate: () => date })
  }
};

const firestore = () => mockFirestoreInstance;
firestore.Timestamp = mockFirestoreInstance.Timestamp;

// Mock Storage
const mockStorage = {
  ref: (path: string) => ({
    putFile: (localPath: string) => Promise.resolve({ ref: { fullPath: path } }),
    getDownloadURL: () => Promise.resolve('https://example.com/mock-url')
  })
};

const storage = mockStorage;
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
      await firestore().collection('ciders').doc(cider.id).set({
        ...cider,
        createdAt: firestore.Timestamp.fromDate(cider.createdAt),
        updatedAt: firestore.Timestamp.fromDate(cider.updatedAt)
      });

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
      await firestore().collection('ciders').doc(cider.id).update({
        ...cider,
        updatedAt: firestore.Timestamp.fromDate(cider.updatedAt)
      });

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
      await firestore().collection('ciders').doc(ciderId).delete();
    } catch (error) {
      console.error('Failed to sync delete cider:', error);
      throw error;
    }
  }

  private async syncCreateExperience(experience: ExperienceLog): Promise<void> {
    try {
      await firestore().collection('experiences').doc(experience.id).set({
        ...experience,
        date: firestore.Timestamp.fromDate(experience.date),
        createdAt: firestore.Timestamp.fromDate(experience.createdAt),
        updatedAt: firestore.Timestamp.fromDate(experience.updatedAt)
      });

      console.log('Experience synced to Firebase:', experience.id);
    } catch (error) {
      console.error('Failed to sync create experience:', error);
      throw error;
    }
  }

  private async syncUpdateExperience(experience: ExperienceLog): Promise<void> {
    try {
      await firestore().collection('experiences').doc(experience.id).update({
        ...experience,
        date: firestore.Timestamp.fromDate(experience.date),
        updatedAt: firestore.Timestamp.fromDate(experience.updatedAt)
      });
    } catch (error) {
      console.error('Failed to sync update experience:', error);
      throw error;
    }
  }

  private async syncDeleteExperience(experienceId: string): Promise<void> {
    try {
      await firestore().collection('experiences').doc(experienceId).delete();
    } catch (error) {
      console.error('Failed to sync delete experience:', error);
      throw error;
    }
  }

  private async syncUploadImage(imageData: { localPath: string; remotePath: string; ciderId: string }): Promise<void> {
    try {
      const reference = storage().ref(imageData.remotePath);
      await reference.putFile(imageData.localPath);
      const downloadURL = await reference.getDownloadURL();

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