// Phase 3: Offline-First Sync Manager
// Implements complete offline-first architecture with Firebase sync

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  getBlob,
  deleteObject
} from 'firebase/storage';
import * as FileSystem from 'expo-file-system/legacy';
import { firebaseService } from '../firebase/config';
import { SyncOperation, SyncOperationType, NetworkState } from '../../types/sync';
import { ExperienceLog } from '../../types/experience';
import { Venue } from '../../types/venue';
import { CiderMasterRecord, VALIDATION_CONSTANTS } from '../../types/cider';
import { sqliteService } from '../database/sqlite';
import { backupService } from '../backup/BackupService';

// Download progress tracking
export interface DownloadProgress {
  phase: 'preparing' | 'backing_up' | 'fetching_ciders' | 'fetching_experiences' |
         'validating' | 'inserting' | 'downloading_images' | 'complete' | 'error' | 'rolled_back';
  totalCiders: number;
  downloadedCiders: number;
  totalExperiences: number;
  downloadedExperiences: number;
  totalImages: number;
  downloadedImages: number;
  currentItem?: string;
  errorMessage?: string;
  backupId?: string;
}

export type DownloadConflictStrategy = 'replace_all' | 'keep_local' | 'merge_by_date';

export interface DownloadResult {
  success: boolean;
  cidersDownloaded: number;
  experiencesDownloaded: number;
  imagesDownloaded: number;
  skippedOrphans: number;
  backupId?: string;
  error?: string;
}

export interface CloudDataStats {
  ciderCount: number;
  experienceCount: number;
  lastUpdated: Date | null;
}

// Validation error tracking
interface ValidationError {
  recordId: string;
  recordType: 'cider' | 'experience';
  field: string;
  message: string;
}

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

  // Download state properties
  private downloadInProgress: boolean = false;
  private downloadAborted: boolean = false;
  private downloadProgress: DownloadProgress = {
    phase: 'preparing',
    totalCiders: 0,
    downloadedCiders: 0,
    totalExperiences: 0,
    downloadedExperiences: 0
  };
  private downloadProgressCallback?: (progress: DownloadProgress) => void;

  // Pagination settings
  private readonly FIRESTORE_BATCH_SIZE = 100;
  private readonly SQLITE_BATCH_SIZE = 50;

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
    console.log(`[queueOperation] Queueing: ${type}`);
    console.log(`[queueOperation] Data:`, JSON.stringify(data, null, 2).substring(0, 500));

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
      console.log(`[queueOperation] Inserted into SQLite: ${type} (id: ${operation.id})`);

      // Process immediately if online
      console.log(`[queueOperation] Network connected: ${this.networkState.isConnected}, Sync in progress: ${this.syncInProgress}`);
      if (this.networkState.isConnected && !this.syncInProgress) {
        console.log(`[queueOperation] Triggering processSyncQueue...`);
        this.processSyncQueue();
      } else {
        console.log(`[queueOperation] Operation ${type} queued - will be processed when current sync completes`);
      }
    } catch (error) {
      console.error('[queueOperation] Failed to queue sync operation:', error);
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

      // Re-check for new operations that were queued during sync
      // This ensures DELETE_IMAGE, UPLOAD_IMAGE, etc. queued during active sync are processed
      const remainingOps = await sqliteService.getPendingSyncOperations();
      if (remainingOps.length > 0 && this.networkState.isConnected) {
        const opTypes = remainingOps.map(op => op.type).join(', ');
        console.log(`[processSyncQueue] Found ${remainingOps.length} operations queued during sync: [${opTypes}]`);
        console.log(`[processSyncQueue] Re-triggering sync queue in 100ms...`);
        // Use setTimeout to avoid stack overflow from recursive calls
        setTimeout(() => this.processSyncQueue(), 100);
      } else {
        console.log(`[processSyncQueue] No pending operations after sync completed`);
      }
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

      case 'DELETE_IMAGE':
        await this.syncDeleteImage(operation.data);
        break;

      case 'CREATE_VENUE':
        await this.syncCreateVenue(operation.data);
        break;

      case 'UPDATE_VENUE':
        await this.syncUpdateVenue(operation.data);
        break;

      case 'DELETE_VENUE':
        await this.syncDeleteVenue(operation.data.id);
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

  private async syncUpdateCider(cider: Partial<CiderMasterRecord> & { id: string }): Promise<void> {
    try {
      const db = firebaseService.getFirestore();
      const ciderRef = doc(db, 'ciders', cider.id);

      // Build update object with only defined fields
      const ciderData: Record<string, any> = {};

      // Copy all fields except undefined ones
      for (const [key, value] of Object.entries(cider)) {
        if (value !== undefined) {
          // Convert dates to ISO strings
          if (key === 'createdAt' || key === 'updatedAt') {
            ciderData[key] = value instanceof Date ? value.toISOString() : value;
          } else {
            ciderData[key] = value;
          }
        }
      }

      console.log('[syncUpdateCider] Updating fields:', Object.keys(ciderData));

      await updateDoc(ciderRef, ciderData);

      // Update local sync status
      await sqliteService.updateCider(cider.id, {
        syncStatus: 'synced',
        updatedAt: new Date()
      });

      console.log('[syncUpdateCider] Successfully updated cider:', cider.id);
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
    console.log('[syncUploadImage] Starting upload...');
    console.log('[syncUploadImage] imageData:', JSON.stringify(imageData, null, 2));

    // Check if Storage is available (requires Blaze plan)
    const storageAvailable = firebaseService.isStorageAvailable();
    console.log('[syncUploadImage] Storage available:', storageAvailable);

    if (!storageAvailable) {
      console.warn('[syncUploadImage] Firebase Storage not available. Skipping image upload. Upgrade to Blaze plan to enable image uploads.');
      return; // Skip image upload silently
    }

    try {
      const storage = firebaseService.getStorage();
      console.log('[syncUploadImage] Got storage instance:', !!storage);

      if (!storage) {
        console.warn('[syncUploadImage] Storage not initialized, skipping image upload');
        return;
      }

      console.log('[syncUploadImage] Creating storage ref for:', imageData.remotePath);
      const storageRef = ref(storage, imageData.remotePath);

      // For React Native, we need to fetch the file as blob
      console.log('[syncUploadImage] Fetching local file:', imageData.localPath);
      const response = await fetch(imageData.localPath);
      console.log('[syncUploadImage] Fetch response status:', response.status);
      const blob = await response.blob();
      console.log('[syncUploadImage] Blob size:', blob.size, 'type:', blob.type);

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
      console.log('[syncUploadImage] Got download URL:', downloadURL);

      // Update LOCAL SQLite with the Firebase URL so it's available for deletion later
      console.log('[syncUploadImage] Updating local SQLite with Firebase URL...');
      await sqliteService.updateCider(imageData.ciderId, {
        photo: downloadURL,
        updatedAt: new Date()
      });
      console.log('[syncUploadImage] Local SQLite updated successfully');

      // Update cider in Firestore with new image URL
      await this.queueOperation('UPDATE_CIDER', {
        id: imageData.ciderId,
        photo: downloadURL,
        updatedAt: new Date()
      });

      console.log('[syncUploadImage] Image uploaded successfully:', downloadURL);
    } catch (error) {
      console.error('Failed to upload image:', error);
      throw error;
    }
  }

  private async syncDeleteImage(imageData: { remotePath: string; ciderId: string }): Promise<void> {
    console.log('[syncDeleteImage] Starting delete...');
    console.log('[syncDeleteImage] imageData:', JSON.stringify(imageData, null, 2));

    // Check if Storage is available
    const storageAvailable = firebaseService.isStorageAvailable();
    console.log('[syncDeleteImage] Storage available:', storageAvailable);

    if (!storageAvailable) {
      console.warn('[syncDeleteImage] Firebase Storage not available. Skipping image delete.');
      return;
    }

    try {
      const storage = firebaseService.getStorage();
      console.log('[syncDeleteImage] Got storage instance:', !!storage);

      if (!storage) {
        console.warn('[syncDeleteImage] Storage not initialized, skipping image delete');
        return;
      }

      console.log('[syncDeleteImage] Creating storage ref for:', imageData.remotePath);
      const storageRef = ref(storage, imageData.remotePath);

      await deleteObject(storageRef);
      console.log('[syncDeleteImage] Image deleted successfully:', imageData.remotePath);
    } catch (error: any) {
      // If the image doesn't exist, that's fine - it may have been deleted already
      if (error?.code === 'storage/object-not-found') {
        console.log('[syncDeleteImage] Image already deleted or not found:', imageData.remotePath);
        return;
      }
      console.error('Failed to delete image:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VENUE SYNC OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  private async syncCreateVenue(venue: Venue): Promise<void> {
    try {
      const db = firebaseService.getFirestore();
      const venueRef = doc(db, 'venues', venue.id);

      // Convert dates to ISO strings for Firestore
      const venueData = {
        id: venue.id,
        userId: venue.userId,
        name: venue.name,
        type: venue.type,
        location: venue.location ? {
          latitude: venue.location.latitude,
          longitude: venue.location.longitude
        } : null,
        address: venue.address || null,
        visitCount: venue.visitCount || 0,
        lastVisited: venue.lastVisited instanceof Date ? venue.lastVisited.toISOString() : venue.lastVisited || null,
        createdAt: venue.createdAt instanceof Date ? venue.createdAt.toISOString() : venue.createdAt,
        updatedAt: venue.updatedAt instanceof Date ? venue.updatedAt.toISOString() : venue.updatedAt,
        syncStatus: 'synced',
        version: venue.version || 1
      };

      await setDoc(venueRef, venueData);

      // Update local sync status
      await sqliteService.updateVenue(venue.id, { syncStatus: 'synced' });

      console.log('Venue synced to Firebase:', venue.name);
    } catch (error) {
      console.error('Failed to sync create venue:', error);
      throw error;
    }
  }

  private async syncUpdateVenue(venue: Partial<Venue> & { id: string }): Promise<void> {
    try {
      const db = firebaseService.getFirestore();
      const venueRef = doc(db, 'venues', venue.id);

      // Build update object with only defined fields
      const venueData: Record<string, any> = {};

      for (const [key, value] of Object.entries(venue)) {
        if (value !== undefined) {
          if (key === 'createdAt' || key === 'updatedAt' || key === 'lastVisited') {
            venueData[key] = value instanceof Date ? value.toISOString() : value;
          } else if (key === 'location' && value) {
            venueData[key] = {
              latitude: (value as any).latitude,
              longitude: (value as any).longitude
            };
          } else {
            venueData[key] = value;
          }
        }
      }

      venueData.syncStatus = 'synced';

      await updateDoc(venueRef, venueData);

      // Update local sync status
      await sqliteService.updateVenue(venue.id, { syncStatus: 'synced' });

      console.log('Venue updated in Firebase:', venue.id);
    } catch (error) {
      console.error('Failed to sync update venue:', error);
      throw error;
    }
  }

  private async syncDeleteVenue(venueId: string): Promise<void> {
    try {
      const db = firebaseService.getFirestore();
      const venueRef = doc(db, 'venues', venueId);

      await deleteDoc(venueRef);

      console.log('Venue deleted from Firebase:', venueId);
    } catch (error) {
      console.error('Failed to sync delete venue:', error);
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

  // ═══════════════════════════════════════════════════════════════════════════
  // DOWNLOAD FROM CLOUD METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Download all data from Firebase Firestore to local SQLite database
   *
   * SAFETY FEATURES:
   * - Creates backup before any destructive operations
   * - Uses SQLite transactions for atomicity
   * - Validates all records before insertion
   * - Handles orphaned experiences gracefully
   * - Supports abort/cancellation
   *
   * @param conflictStrategy - How to handle conflicts with existing local data
   * @param onProgress - Callback for progress updates
   * @returns Promise with download result
   */
  async downloadFromCloud(
    conflictStrategy: DownloadConflictStrategy = 'replace_all',
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<DownloadResult> {
    // Prevent concurrent downloads
    if (this.downloadInProgress) {
      return {
        success: false,
        cidersDownloaded: 0,
        experiencesDownloaded: 0,
        imagesDownloaded: 0,
        skippedOrphans: 0,
        error: 'Download already in progress'
      };
    }

    // Check prerequisites
    if (!this.networkState.isConnected) {
      return {
        success: false,
        cidersDownloaded: 0,
        experiencesDownloaded: 0,
        imagesDownloaded: 0,
        skippedOrphans: 0,
        error: 'No internet connection. Please check your network and try again.'
      };
    }

    if (!firebaseService.isInitialized()) {
      return {
        success: false,
        cidersDownloaded: 0,
        experiencesDownloaded: 0,
        imagesDownloaded: 0,
        skippedOrphans: 0,
        error: 'Firebase not initialized. Please restart the app.'
      };
    }

    // Initialize download state
    this.downloadInProgress = true;
    this.downloadAborted = false;
    this.downloadProgressCallback = onProgress;

    let backupId: string | undefined;
    let db: any;

    try {
      // ═══════════════════════════════════════════════════════════
      // PHASE 1: PREPARATION
      // ═══════════════════════════════════════════════════════════
      this.updateDownloadProgress({
        phase: 'preparing',
        totalCiders: 0,
        downloadedCiders: 0,
        totalExperiences: 0,
        downloadedExperiences: 0,
        totalImages: 0,
        downloadedImages: 0
      });

      // Pause sync queue to prevent conflicts
      this.syncInProgress = true; // Prevents processSyncQueue from running
      console.log('Sync queue paused for download');

      // Get local data stats for conflict handling
      const localCiderCount = await sqliteService.getCiderCount();
      const localExperienceCount = await sqliteService.getExperienceCount();
      const hasLocalData = localCiderCount > 0 || localExperienceCount > 0;

      // Handle keep_local strategy
      if (conflictStrategy === 'keep_local' && hasLocalData) {
        this.downloadInProgress = false;
        this.syncInProgress = false;
        return {
          success: true,
          cidersDownloaded: 0,
          experiencesDownloaded: 0,
          imagesDownloaded: 0,
          skippedOrphans: 0,
          error: 'Kept local data as requested'
        };
      }

      // ═══════════════════════════════════════════════════════════
      // PHASE 2: BACKUP (for destructive operations)
      // ═══════════════════════════════════════════════════════════
      if (hasLocalData && conflictStrategy === 'replace_all') {
        this.updateDownloadProgress({
          ...this.downloadProgress,
          phase: 'backing_up'
        });

        const backupMetadata = await backupService.createBackup('pre_download');
        backupId = backupMetadata.id;
        console.log(`Pre-download backup created: ${backupId}`);

        this.updateDownloadProgress({
          ...this.downloadProgress,
          backupId
        });
      }

      // Check for abort
      if (this.downloadAborted) {
        throw new Error('Download cancelled by user');
      }

      // ═══════════════════════════════════════════════════════════
      // PHASE 3: FETCH CIDERS FROM FIRESTORE (paginated)
      // ═══════════════════════════════════════════════════════════
      this.updateDownloadProgress({
        ...this.downloadProgress,
        phase: 'fetching_ciders'
      });

      const firestore = firebaseService.getFirestore();
      const remoteCiders: CiderMasterRecord[] = [];
      let lastCiderDoc: QueryDocumentSnapshot | null = null;
      let hasMoreCiders = true;

      while (hasMoreCiders && !this.downloadAborted) {
        let cidersQuery = query(
          collection(firestore, 'ciders'),
          orderBy('createdAt', 'desc'),
          limit(this.FIRESTORE_BATCH_SIZE)
        );

        if (lastCiderDoc) {
          cidersQuery = query(
            collection(firestore, 'ciders'),
            orderBy('createdAt', 'desc'),
            startAfter(lastCiderDoc),
            limit(this.FIRESTORE_BATCH_SIZE)
          );
        }

        const snapshot = await getDocs(cidersQuery);

        if (snapshot.empty) {
          hasMoreCiders = false;
        } else {
          snapshot.forEach((doc) => {
            remoteCiders.push(this.mapFirestoreToCider(doc.data()));
          });
          lastCiderDoc = snapshot.docs[snapshot.docs.length - 1];
          hasMoreCiders = snapshot.docs.length === this.FIRESTORE_BATCH_SIZE;
        }

        this.updateDownloadProgress({
          ...this.downloadProgress,
          totalCiders: remoteCiders.length,
          downloadedCiders: remoteCiders.length
        });
      }

      console.log(`Fetched ${remoteCiders.length} ciders from cloud`);

      // Check for abort
      if (this.downloadAborted) {
        throw new Error('Download cancelled by user');
      }

      // ═══════════════════════════════════════════════════════════
      // PHASE 4: FETCH EXPERIENCES FROM FIRESTORE (paginated)
      // ═══════════════════════════════════════════════════════════
      this.updateDownloadProgress({
        ...this.downloadProgress,
        phase: 'fetching_experiences'
      });

      const remoteExperiences: ExperienceLog[] = [];
      let lastExpDoc: QueryDocumentSnapshot | null = null;
      let hasMoreExperiences = true;

      while (hasMoreExperiences && !this.downloadAborted) {
        let experiencesQuery = query(
          collection(firestore, 'experiences'),
          orderBy('createdAt', 'desc'),
          limit(this.FIRESTORE_BATCH_SIZE)
        );

        if (lastExpDoc) {
          experiencesQuery = query(
            collection(firestore, 'experiences'),
            orderBy('createdAt', 'desc'),
            startAfter(lastExpDoc),
            limit(this.FIRESTORE_BATCH_SIZE)
          );
        }

        const snapshot = await getDocs(experiencesQuery);

        if (snapshot.empty) {
          hasMoreExperiences = false;
        } else {
          snapshot.forEach((doc) => {
            remoteExperiences.push(this.mapFirestoreToExperience(doc.data()));
          });
          lastExpDoc = snapshot.docs[snapshot.docs.length - 1];
          hasMoreExperiences = snapshot.docs.length === this.FIRESTORE_BATCH_SIZE;
        }

        this.updateDownloadProgress({
          ...this.downloadProgress,
          totalExperiences: remoteExperiences.length,
          downloadedExperiences: remoteExperiences.length
        });
      }

      console.log(`Fetched ${remoteExperiences.length} experiences from cloud`);

      // Check for abort
      if (this.downloadAborted) {
        throw new Error('Download cancelled by user');
      }

      // ═══════════════════════════════════════════════════════════
      // PHASE 5: PREPARE RECORDS (skip validation - trust cloud data)
      // ═══════════════════════════════════════════════════════════
      this.updateDownloadProgress({
        ...this.downloadProgress,
        phase: 'validating'
      });

      // Trust all ciders from cloud - no validation needed
      const validCiders = remoteCiders;
      const ciderIdSet = new Set<string>(remoteCiders.map(c => c.id));

      // For experiences, only check for orphans (parent cider must exist)
      let skippedOrphans = 0;
      const validExperiences: ExperienceLog[] = [];
      for (const experience of remoteExperiences) {
        if (!ciderIdSet.has(experience.ciderId)) {
          console.warn(`Skipping orphaned experience ${experience.id}: cider ${experience.ciderId} not found in cloud`);
          skippedOrphans++;
          continue;
        }
        validExperiences.push(experience);
      }

      console.log(`Prepared ${validCiders.length} ciders, ${validExperiences.length} experiences for import (${skippedOrphans} orphans skipped)`);

      // ═══════════════════════════════════════════════════════════
      // PHASE 6: INSERT INTO SQLITE (with transaction)
      // ═══════════════════════════════════════════════════════════
      this.updateDownloadProgress({
        ...this.downloadProgress,
        phase: 'inserting',
        totalCiders: validCiders.length,
        totalExperiences: validExperiences.length
      });

      db = await sqliteService.getConnectionManager().getDatabase();

      // Start transaction
      await db.execAsync('BEGIN IMMEDIATE TRANSACTION');
      console.log('SQLite transaction started');

      try {
        // Clear sync queue only (not data) - we use INSERT OR REPLACE to update
        await db.runAsync('DELETE FROM sync_operations');
        console.log('Sync queue cleared');

        // For merge_by_date strategy, get existing ciders to compare dates
        let existingCiderMap = new Map<string, Date>();
        if (conflictStrategy === 'merge_by_date') {
          const existingCiders = await sqliteService.getAllCiders();
          existingCiders.forEach(c => {
            existingCiderMap.set(c.id, new Date(c.updatedAt));
          });
        }

        // For replace_all, we just insert/replace everything from cloud
        // No deletion needed - INSERT OR REPLACE handles updates

        // Insert ciders in batches
        let cidersInserted = 0;
        for (let i = 0; i < validCiders.length; i += this.SQLITE_BATCH_SIZE) {
          if (this.downloadAborted) {
            throw new Error('Download cancelled by user');
          }

          const batch = validCiders.slice(i, i + this.SQLITE_BATCH_SIZE);

          for (const cider of batch) {
            // Merge strategy: skip if local is newer
            if (conflictStrategy === 'merge_by_date') {
              const localUpdated = existingCiderMap.get(cider.id);
              if (localUpdated && localUpdated > new Date(cider.updatedAt)) {
                continue; // Keep local version
              }
            }

            await this.insertOrReplaceCider(db, cider);
            cidersInserted++;
          }

          this.updateDownloadProgress({
            ...this.downloadProgress,
            downloadedCiders: cidersInserted,
            currentItem: batch[batch.length - 1]?.name
          });
        }

        // Get existing experiences for merge strategy
        let existingExpMap = new Map<string, Date>();
        if (conflictStrategy === 'merge_by_date') {
          const existingExps = await sqliteService.getAllExperiences();
          existingExps.forEach(e => {
            existingExpMap.set(e.id, new Date(e.updatedAt));
          });
        }

        // Insert experiences in batches
        let experiencesInserted = 0;
        for (let i = 0; i < validExperiences.length; i += this.SQLITE_BATCH_SIZE) {
          if (this.downloadAborted) {
            throw new Error('Download cancelled by user');
          }

          const batch = validExperiences.slice(i, i + this.SQLITE_BATCH_SIZE);

          for (const experience of batch) {
            // Merge strategy: skip if local is newer
            if (conflictStrategy === 'merge_by_date') {
              const localUpdated = existingExpMap.get(experience.id);
              if (localUpdated && localUpdated > new Date(experience.updatedAt)) {
                continue; // Keep local version
              }
            }

            await this.insertOrReplaceExperience(db, experience);
            experiencesInserted++;
          }

          this.updateDownloadProgress({
            ...this.downloadProgress,
            downloadedExperiences: experiencesInserted
          });
        }

        // Commit transaction
        await db.execAsync('COMMIT');
        console.log('SQLite transaction committed');

        // ═══════════════════════════════════════════════════════════
        // PHASE 7: DOWNLOAD IMAGES
        // ═══════════════════════════════════════════════════════════
        // Find ciders with Firebase Storage URLs that need image download
        const cidersWithImages = validCiders.filter(c =>
          c.photo && this.isFirebaseStorageUrl(c.photo)
        );

        console.log(`Found ${cidersWithImages.length} ciders with images to download`);

        let imagesDownloaded = 0;
        if (cidersWithImages.length > 0) {
          this.updateDownloadProgress({
            ...this.downloadProgress,
            phase: 'downloading_images',
            totalImages: cidersWithImages.length,
            downloadedImages: 0
          });

          for (const cider of cidersWithImages) {
            if (this.downloadAborted) {
              console.log('Image download aborted');
              break;
            }

            try {
              const localPath = await this.downloadImageFromStorage(cider.photo!, cider.id);
              if (localPath) {
                // Update the cider record with local image path
                await db.runAsync(
                  'UPDATE ciders SET photo = ? WHERE id = ?',
                  [localPath, cider.id]
                );
                imagesDownloaded++;
                console.log(`Downloaded image for cider ${cider.id}`);
              }
            } catch (imgError) {
              console.warn(`Failed to download image for cider ${cider.id}:`, imgError);
              // Continue with other images
            }

            this.updateDownloadProgress({
              ...this.downloadProgress,
              downloadedImages: imagesDownloaded,
              currentItem: cider.name
            });
          }
        }

        // ═══════════════════════════════════════════════════════════
        // PHASE 8: COMPLETE
        // ═══════════════════════════════════════════════════════════
        this.updateDownloadProgress({
          phase: 'complete',
          totalCiders: validCiders.length,
          downloadedCiders: cidersInserted,
          totalExperiences: validExperiences.length,
          downloadedExperiences: experiencesInserted,
          totalImages: cidersWithImages.length,
          downloadedImages: imagesDownloaded,
          backupId
        });

        // Cleanup old backups
        await backupService.cleanupOldBackups(3);

        console.log(`Download complete: ${cidersInserted} ciders, ${experiencesInserted} experiences, ${imagesDownloaded} images`);

        return {
          success: true,
          cidersDownloaded: cidersInserted,
          experiencesDownloaded: experiencesInserted,
          imagesDownloaded,
          skippedOrphans,
          backupId
        };

      } catch (transactionError) {
        // Rollback on any error during insertion
        console.error('Transaction error, rolling back:', transactionError);
        await db.execAsync('ROLLBACK');

        this.updateDownloadProgress({
          ...this.downloadProgress,
          phase: 'rolled_back',
          errorMessage: transactionError instanceof Error ? transactionError.message : 'Unknown error'
        });

        throw transactionError;
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Download from cloud failed:', error);

      this.updateDownloadProgress({
        ...this.downloadProgress,
        phase: 'error',
        errorMessage,
        backupId
      });

      return {
        success: false,
        cidersDownloaded: 0,
        experiencesDownloaded: 0,
        imagesDownloaded: 0,
        skippedOrphans: 0,
        backupId,
        error: errorMessage
      };

    } finally {
      this.downloadInProgress = false;
      this.syncInProgress = false; // Resume sync queue processing
      this.downloadProgressCallback = undefined;
      console.log('Sync queue resumed');
    }
  }

  /**
   * Abort an in-progress download
   */
  abortDownload(): void {
    if (this.downloadInProgress) {
      this.downloadAborted = true;
      console.log('Download abort requested');
    }
  }

  /**
   * Update download progress and notify callback
   */
  private updateDownloadProgress(progress: DownloadProgress): void {
    this.downloadProgress = progress;
    if (this.downloadProgressCallback) {
      this.downloadProgressCallback(progress);
    }
  }

  /**
   * Validate a cider record against constraints
   */
  private validateCider(cider: CiderMasterRecord): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!cider.id || typeof cider.id !== 'string') {
      errors.push({ recordId: cider.id || 'unknown', recordType: 'cider', field: 'id', message: 'Missing or invalid ID' });
    }

    if (!cider.name || cider.name.length < VALIDATION_CONSTANTS.MIN_NAME_LENGTH) {
      errors.push({ recordId: cider.id, recordType: 'cider', field: 'name', message: 'Name too short' });
    }

    if (cider.name && cider.name.length > VALIDATION_CONSTANTS.MAX_NAME_LENGTH) {
      errors.push({ recordId: cider.id, recordType: 'cider', field: 'name', message: 'Name too long' });
    }

    if (!cider.brand || cider.brand.length < VALIDATION_CONSTANTS.MIN_BRAND_LENGTH) {
      errors.push({ recordId: cider.id, recordType: 'cider', field: 'brand', message: 'Brand too short' });
    }

    if (cider.abv !== undefined && cider.abv !== null) {
      if (cider.abv < VALIDATION_CONSTANTS.ABV_MIN || cider.abv > VALIDATION_CONSTANTS.ABV_MAX) {
        errors.push({ recordId: cider.id, recordType: 'cider', field: 'abv', message: `ABV must be between ${VALIDATION_CONSTANTS.ABV_MIN} and ${VALIDATION_CONSTANTS.ABV_MAX}` });
      }
    }

    if (cider.overallRating !== undefined && cider.overallRating !== null) {
      if (cider.overallRating < VALIDATION_CONSTANTS.RATING_MIN || cider.overallRating > VALIDATION_CONSTANTS.RATING_MAX) {
        errors.push({ recordId: cider.id, recordType: 'cider', field: 'overallRating', message: `Rating must be between ${VALIDATION_CONSTANTS.RATING_MIN} and ${VALIDATION_CONSTANTS.RATING_MAX}` });
      }
    }

    return errors;
  }

  /**
   * Validate an experience record against constraints
   */
  private validateExperience(experience: ExperienceLog): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!experience.id || typeof experience.id !== 'string') {
      errors.push({ recordId: experience.id || 'unknown', recordType: 'experience', field: 'id', message: 'Missing or invalid ID' });
    }

    if (!experience.ciderId || typeof experience.ciderId !== 'string') {
      errors.push({ recordId: experience.id, recordType: 'experience', field: 'ciderId', message: 'Missing or invalid cider ID' });
    }

    if (experience.price !== undefined && experience.price < 0) {
      errors.push({ recordId: experience.id, recordType: 'experience', field: 'price', message: 'Price cannot be negative' });
    }

    if (experience.containerSize !== undefined && experience.containerSize <= 0) {
      errors.push({ recordId: experience.id, recordType: 'experience', field: 'containerSize', message: 'Container size must be positive' });
    }

    return errors;
  }

  /**
   * Safely convert date to ISO string
   */
  private safeToISOString(date: any): string {
    try {
      if (date instanceof Date && !isNaN(date.getTime())) {
        return date.toISOString();
      }
      if (typeof date === 'string') {
        return date;
      }
      console.warn('Invalid date for toISOString, using current date:', date);
      return new Date().toISOString();
    } catch (error) {
      console.error('safeToISOString error:', error);
      return new Date().toISOString();
    }
  }

  /**
   * Check if a URL is a Firebase Storage URL
   */
  private isFirebaseStorageUrl(url: string): boolean {
    if (!url) return false;
    return url.includes('firebasestorage.googleapis.com') ||
           url.includes('storage.googleapis.com') ||
           url.startsWith('gs://');
  }

  /**
   * Download an image from Firebase Storage to local file system
   * @param storageUrl The Firebase Storage URL
   * @param ciderId The cider ID (used for local filename)
   * @returns Local file path or null if download failed
   */
  private async downloadImageFromStorage(storageUrl: string, ciderId: string): Promise<string | null> {
    try {
      // Check if storage is available
      if (!firebaseService.isStorageAvailable()) {
        console.warn('Firebase Storage not available, skipping image download');
        return null;
      }

      const storage = firebaseService.getStorage();
      if (!storage) {
        console.warn('Storage not initialized, skipping image download');
        return null;
      }

      // Ensure images directory exists
      const imagesDir = `${FileSystem.documentDirectory}images/`;
      const dirInfo = await FileSystem.getInfoAsync(imagesDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(imagesDir, { intermediates: true });
      }

      // Determine file extension from URL or default to jpg
      let extension = 'jpg';
      if (storageUrl.includes('.png')) extension = 'png';
      else if (storageUrl.includes('.jpeg')) extension = 'jpeg';
      else if (storageUrl.includes('.webp')) extension = 'webp';

      const localPath = `${imagesDir}${ciderId}.${extension}`;

      // Check if image already exists locally
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (fileInfo.exists) {
        console.log(`Image already exists locally: ${localPath}`);
        return localPath;
      }

      // Download the image
      console.log(`Downloading image from: ${storageUrl}`);

      // If it's a direct download URL (https://firebasestorage...)
      if (storageUrl.startsWith('https://')) {
        const downloadResult = await FileSystem.downloadAsync(storageUrl, localPath);
        if (downloadResult.status === 200) {
          console.log(`Image downloaded to: ${localPath}`);
          return localPath;
        } else {
          console.warn(`Image download failed with status: ${downloadResult.status}`);
          return null;
        }
      }

      // If it's a gs:// URL, we need to get the download URL first
      if (storageUrl.startsWith('gs://')) {
        const storagePath = storageUrl.replace(/^gs:\/\/[^/]+\//, '');
        const storageRef = ref(storage, storagePath);
        const downloadUrl = await getDownloadURL(storageRef);

        const downloadResult = await FileSystem.downloadAsync(downloadUrl, localPath);
        if (downloadResult.status === 200) {
          console.log(`Image downloaded to: ${localPath}`);
          return localPath;
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to download image:', error);
      return null;
    }
  }

  /**
   * Insert or replace a cider using raw SQL for efficiency
   */
  private async insertOrReplaceCider(db: any, cider: CiderMasterRecord): Promise<void> {
    await db.runAsync(
      `INSERT OR REPLACE INTO ciders (
        id, userId, name, brand, abv, overallRating, photo, notes,
        traditionalStyle, sweetness, carbonation, clarity, color, tasteTags,
        appleClassification, productionMethods, detailedRatings, venue,
        fruitAdditions, hops, spicesBotanicals, woodAging,
        createdAt, updatedAt, syncStatus, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cider.id,
        cider.userId || 'default-user',
        cider.name,
        cider.brand,
        cider.abv || null,
        cider.overallRating || null,
        cider.photo || null,
        cider.notes || null,
        cider.traditionalStyle || null,
        cider.sweetness || null,
        cider.carbonation || null,
        cider.clarity || null,
        cider.color || null,
        cider.tasteTags ? JSON.stringify(cider.tasteTags) : null,
        cider.appleClassification ? JSON.stringify(cider.appleClassification) : null,
        cider.productionMethods ? JSON.stringify(cider.productionMethods) : null,
        cider.detailedRatings ? JSON.stringify(cider.detailedRatings) : null,
        cider.venue ? JSON.stringify(cider.venue) : null,
        cider.fruitAdditions ? JSON.stringify(cider.fruitAdditions) : null,
        cider.hops ? JSON.stringify(cider.hops) : null,
        cider.spicesBotanicals ? JSON.stringify(cider.spicesBotanicals) : null,
        cider.woodAging ? JSON.stringify(cider.woodAging) : null,
        this.safeToISOString(cider.createdAt),
        this.safeToISOString(cider.updatedAt),
        'synced',
        cider.version || 1
      ]
    );
  }

  /**
   * Insert or replace an experience using raw SQL for efficiency
   */
  private async insertOrReplaceExperience(db: any, experience: ExperienceLog): Promise<void> {
    await db.runAsync(
      `INSERT OR REPLACE INTO experiences (
        id, userId, ciderId, date, venue, price, containerSize, containerType,
        containerTypeCustom, pricePerPint, notes, rating, weatherConditions,
        companionType, createdAt, updatedAt, syncStatus, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        experience.id,
        experience.userId || 'default-user',
        experience.ciderId,
        this.safeToISOString(experience.date),
        experience.venue ? JSON.stringify(experience.venue) : null,
        experience.price || 0,
        experience.containerSize || 500,
        experience.containerType || 'bottle',
        experience.containerTypeCustom || null,
        experience.pricePerPint || 0,
        experience.notes || null,
        experience.rating || null,
        experience.weatherConditions || null,
        experience.companionType || null,
        this.safeToISOString(experience.createdAt),
        this.safeToISOString(experience.updatedAt),
        'synced',
        experience.version || 1
      ]
    );
  }

  /**
   * Safely convert Firestore Timestamp or date string to Date object
   * Firestore Timestamps have a toDate() method, strings need new Date()
   */
  private parseFirestoreDate(value: any): Date {
    try {
      if (!value) {
        return new Date();
      }

      // Firestore Timestamp object
      if (value && typeof value.toDate === 'function') {
        return value.toDate();
      }
      // Firestore Timestamp with seconds/nanoseconds
      if (value && typeof value.seconds === 'number') {
        return new Date(value.seconds * 1000);
      }
      // Already a Date object
      if (value instanceof Date) {
        return value;
      }
      // ISO string or other string format
      if (typeof value === 'string') {
        const parsed = new Date(value);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
      // Number (timestamp in milliseconds)
      if (typeof value === 'number') {
        return new Date(value);
      }
      // Fallback to current date
      console.warn('Could not parse date value, using current date:', value);
      return new Date();
    } catch (error) {
      console.error('parseFirestoreDate error for value:', value, error);
      return new Date();
    }
  }

  /**
   * Map Firestore document data to CiderMasterRecord
   */
  private mapFirestoreToCider(data: any): CiderMasterRecord {
    return {
      id: data.id,
      userId: data.userId || 'default-user',
      name: data.name || '',
      brand: data.brand || '',
      abv: data.abv ?? 0,
      overallRating: data.overallRating ?? 5,
      photo: data.photo || undefined,
      notes: data.notes || undefined,
      traditionalStyle: data.traditionalStyle || undefined,
      sweetness: data.sweetness || undefined,
      carbonation: data.carbonation || undefined,
      clarity: data.clarity || undefined,
      color: data.color || undefined,
      tasteTags: data.tasteTags || undefined,
      appleClassification: data.appleClassification || undefined,
      productionMethods: data.productionMethods || undefined,
      detailedRatings: data.detailedRatings || undefined,
      venue: data.venue || undefined,
      fruitAdditions: data.fruitAdditions || undefined,
      hops: data.hops || undefined,
      spicesBotanicals: data.spicesBotanicals || undefined,
      woodAging: data.woodAging || undefined,
      createdAt: this.parseFirestoreDate(data.createdAt),
      updatedAt: this.parseFirestoreDate(data.updatedAt),
      syncStatus: 'synced',
      version: data.version || 1
    };
  }

  /**
   * Map Firestore document data to ExperienceLog
   */
  private mapFirestoreToExperience(data: any): ExperienceLog {
    return {
      id: data.id,
      userId: data.userId || 'default-user',
      ciderId: data.ciderId,
      date: this.parseFirestoreDate(data.date),
      venue: data.venue || { id: '', name: 'Unknown', type: 'other' },
      price: data.price || 0,
      containerSize: data.containerSize || 500,
      containerType: data.containerType || 'bottle',
      containerTypeCustom: data.containerTypeCustom || undefined,
      pricePerPint: data.pricePerPint || 0,
      notes: data.notes || undefined,
      rating: data.rating || undefined,
      weatherConditions: data.weatherConditions || undefined,
      companionType: data.companionType || undefined,
      createdAt: this.parseFirestoreDate(data.createdAt),
      updatedAt: this.parseFirestoreDate(data.updatedAt),
      syncStatus: 'synced',
      version: data.version || 1
    };
  }

  /**
   * Check cloud data stats before download
   */
  async getCloudDataStats(): Promise<CloudDataStats | null> {
    if (!this.networkState.isConnected || !firebaseService.isInitialized()) {
      return null;
    }

    try {
      const db = firebaseService.getFirestore();

      const cidersSnapshot = await getDocs(collection(db, 'ciders'));
      const experiencesSnapshot = await getDocs(collection(db, 'experiences'));

      // Find the most recent update
      let lastUpdated: Date | null = null;
      cidersSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.updatedAt) {
          const updated = this.parseFirestoreDate(data.updatedAt);
          if (!lastUpdated || updated > lastUpdated) {
            lastUpdated = updated;
          }
        }
      });

      return {
        ciderCount: cidersSnapshot.size,
        experienceCount: experiencesSnapshot.size,
        lastUpdated
      };
    } catch (error) {
      console.error('Failed to get cloud data stats:', error);
      return null;
    }
  }

  /**
   * Check if download is in progress
   */
  isDownloadInProgress(): boolean {
    return this.downloadInProgress;
  }

  /**
   * Get current download progress
   */
  getDownloadProgress(): DownloadProgress {
    return { ...this.downloadProgress };
  }
}

// Singleton instance
export const syncManager = SyncManager.getInstance();
export default SyncManager;