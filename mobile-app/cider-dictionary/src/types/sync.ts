// Phase 3: Offline-First Sync Types
// Comprehensive sync operation definitions for Firebase integration

export type SyncOperationType =
  | 'CREATE_CIDER'
  | 'UPDATE_CIDER'
  | 'DELETE_CIDER'
  | 'CREATE_EXPERIENCE'
  | 'UPDATE_EXPERIENCE'
  | 'DELETE_EXPERIENCE'
  | 'UPLOAD_IMAGE';

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'conflict' | 'error';

export interface SyncOperation {
  id: string;
  type: SyncOperationType;
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  status: SyncStatus;
  errorMessage?: string;
}

export interface ImageUploadOperation {
  localPath: string;
  remotePath: string;
  ciderId: string;
}

export interface SyncQueueStats {
  pending: number;
  syncing: number;
  failed: number;
  lastSync: Date | null;
}

// Network state tracking
export interface NetworkState {
  isConnected: boolean;
  type: string | null;
  isInternetReachable: boolean | null;
}

// Sync conflict resolution
export interface ConflictResolution {
  strategy: 'local_wins' | 'remote_wins' | 'merge' | 'user_choice';
  resolvedAt: Date;
  conflictData: {
    local: any;
    remote: any;
    resolved: any;
  };
}

export interface SyncConflict {
  id: string;
  entityId: string;
  entityType: 'cider' | 'experience';
  localVersion: any;
  remoteVersion: any;
  conflictFields: string[];
  createdAt: Date;
  resolution?: ConflictResolution;
}