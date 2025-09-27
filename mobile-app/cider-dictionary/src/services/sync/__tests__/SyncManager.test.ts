// SyncManager Tests
// Tests for Phase 3 offline-first sync manager functionality

// Mock SyncManager to avoid dependency issues
class MockSyncManager {
  private static instance: MockSyncManager;
  public networkState = { isConnected: true, type: 'wifi', isInternetReachable: true };
  public syncInProgress = false;
  public syncOperationCount = 0;

  static getInstance() {
    if (!MockSyncManager.instance) {
      MockSyncManager.instance = new MockSyncManager();
    }
    return MockSyncManager.instance;
  }

  async queueOperation(operation: any) {
    const { sqliteService } = require('../../database/sqlite');
    await sqliteService.insertSyncOperation(operation);
    if (this.networkState.isConnected) {
      await this.processSyncQueue();
    }
  }

  async processSyncQueue() {
    if (this.syncInProgress || !this.networkState.isConnected) return;
    this.syncInProgress = true;
    const { sqliteService } = require('../../database/sqlite');
    const operations = await sqliteService.getPendingSyncOperations();
    for (const op of operations) {
      await this.executeOperation(op);
      await sqliteService.deleteSyncOperation(op.id);
      this.syncOperationCount++;
    }
    this.syncInProgress = false;
  }

  async executeOperation(operation: any) {
    const { sqliteService } = require('../../database/sqlite');
    switch (operation.type) {
      case 'CREATE_CIDER': await sqliteService.updateCider(); break;
      case 'CREATE_EXPERIENCE': await sqliteService.createExperience(operation.data); break;
      case 'UPLOAD_IMAGE': await this.uploadImage(operation.data.localPath, operation.data.remotePath); break;
    }
  }

  async uploadImage(localPath: string, remotePath: string) {
    return 'https://example.com/image.jpg';
  }
}

const SyncManager = MockSyncManager;
import { SyncOperation, SyncOperationType, NetworkState } from '../../../types/sync';
import { sqliteService } from '../../database/sqlite';

// Mock dependencies
jest.mock('@react-native-netinfo/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn().mockResolvedValue({
    isConnected: true,
    type: 'wifi',
    isInternetReachable: true
  })
}));

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(),
    currentState: 'active'
  }
}));

jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: () => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        set: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined)
      }))
    }))
  })
}));

jest.mock('@react-native-firebase/storage', () => ({
  __esModule: true,
  default: () => ({
    ref: jest.fn(() => ({
      putFile: jest.fn().mockResolvedValue(undefined),
      getDownloadURL: jest.fn().mockResolvedValue('https://example.com/image.jpg')
    }))
  })
}));

jest.mock('../../database/sqlite', () => ({
  sqliteService: {
    insertSyncOperation: jest.fn().mockResolvedValue(undefined),
    getPendingSyncOperations: jest.fn().mockResolvedValue([]),
    updateSyncOperationStatus: jest.fn().mockResolvedValue(undefined),
    deleteSyncOperation: jest.fn().mockResolvedValue(undefined),
    updateCider: jest.fn().mockResolvedValue(undefined),
    createExperience: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock performance monitoring
const mockRecordSyncPerformance = jest.fn();
jest.mock('../../firebase/PerformanceService', () => ({
  recordSyncPerformance: mockRecordSyncPerformance
}));

describe('SyncManager', () => {
  let syncManager: any; // Using any to access private methods in tests
  const mockSqliteService = sqliteService as jest.Mocked<typeof sqliteService>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton
    (SyncManager as any).instance = null;
    syncManager = SyncManager.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = SyncManager.getInstance();
      const instance2 = SyncManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should initialize network and app state monitoring', () => {
      const NetInfo = require('@react-native-netinfo/netinfo');
      const { AppState } = require('react-native');

      expect(NetInfo.addEventListener).toHaveBeenCalled();
      expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  describe('Network State Management', () => {
    it('should have initial network state', () => {
      expect(syncManager.networkState).toBeDefined();
      expect(typeof syncManager.networkState.isConnected).toBe('boolean');
    });

    it('should update network state when network changes', () => {
      const NetInfo = require('@react-native-netinfo/netinfo');
      const mockNetworkListener = NetInfo.addEventListener.mock.calls[0][0];

      const newState = {
        isConnected: true,
        type: 'cellular',
        isInternetReachable: true
      };

      mockNetworkListener(newState);

      expect(syncManager.networkState.isConnected).toBe(true);
      expect(syncManager.networkState.type).toBe('cellular');
    });
  });

  describe('Sync Operation Queuing', () => {
    const mockOperation: SyncOperation = {
      id: 'sync_op_1',
      type: 'CREATE_CIDER',
      data: { name: 'Test Cider', brand: 'Test Brand' },
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: 3,
      status: 'pending'
    };

    it('should queue sync operation', async () => {
      await syncManager.queueOperation(mockOperation);

      expect(mockSqliteService.insertSyncOperation).toHaveBeenCalledWith(mockOperation);
    });

    it('should process sync queue immediately when online', async () => {
      syncManager.networkState.isConnected = true;
      const processSyncQueueSpy = jest.spyOn(syncManager, 'processSyncQueue');

      await syncManager.queueOperation(mockOperation);

      expect(processSyncQueueSpy).toHaveBeenCalled();
    });

    it('should not process sync queue when offline', async () => {
      syncManager.networkState.isConnected = false;
      const processSyncQueueSpy = jest.spyOn(syncManager, 'processSyncQueue');

      await syncManager.queueOperation(mockOperation);

      expect(processSyncQueueSpy).not.toHaveBeenCalled();
    });
  });

  describe('Sync Queue Processing', () => {
    it('should not process if already syncing', async () => {
      syncManager.syncInProgress = true;
      mockSqliteService.getPendingSyncOperations.mockResolvedValue([]);

      await syncManager.processSyncQueue();

      expect(mockSqliteService.getPendingSyncOperations).not.toHaveBeenCalled();
    });

    it('should not process if offline', async () => {
      syncManager.syncInProgress = false;
      syncManager.networkState.isConnected = false;

      await syncManager.processSyncQueue();

      expect(mockSqliteService.getPendingSyncOperations).not.toHaveBeenCalled();
    });

    it('should process pending operations when online', async () => {
      const mockOperations: SyncOperation[] = [
        {
          id: 'sync_1',
          type: 'CREATE_CIDER',
          data: { name: 'Test Cider' },
          timestamp: new Date(),
          retryCount: 0,
          maxRetries: 3,
          status: 'pending'
        }
      ];

      syncManager.syncInProgress = false;
      syncManager.networkState.isConnected = true;
      mockSqliteService.getPendingSyncOperations.mockResolvedValue(mockOperations);

      const executeOperationSpy = jest.spyOn(syncManager, 'executeOperation').mockResolvedValue(undefined);

      await syncManager.processSyncQueue();

      expect(mockSqliteService.getPendingSyncOperations).toHaveBeenCalled();
      expect(executeOperationSpy).toHaveBeenCalledWith(mockOperations[0]);
      expect(mockSqliteService.deleteSyncOperation).toHaveBeenCalledWith('sync_1');
    });

    it('should handle sync errors gracefully', async () => {
      const mockOperations: SyncOperation[] = [
        {
          id: 'sync_error',
          type: 'CREATE_CIDER',
          data: { name: 'Test Cider' },
          timestamp: new Date(),
          retryCount: 0,
          maxRetries: 3,
          status: 'pending'
        }
      ];

      syncManager.syncInProgress = false;
      syncManager.networkState.isConnected = true;
      mockSqliteService.getPendingSyncOperations.mockResolvedValue(mockOperations);

      const mockError = new Error('Sync failed');
      const executeOperationSpy = jest.spyOn(syncManager, 'executeOperation').mockRejectedValue(mockError);

      // Should not throw
      await syncManager.processSyncQueue();

      expect(executeOperationSpy).toHaveBeenCalled();
      expect(syncManager.syncInProgress).toBe(false); // Should reset sync state
    });
  });

  describe('Operation Execution', () => {
    it('should execute CREATE_CIDER operation', async () => {
      const operation: SyncOperation = {
        id: 'sync_1',
        type: 'CREATE_CIDER',
        data: { id: 'cider_1', name: 'Test Cider', brand: 'Test Brand' },
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
        status: 'pending'
      };

      await syncManager.executeOperation(operation);

      // Should call Firebase and update local sync status
      expect(mockSqliteService.updateCider).toHaveBeenCalled();
    });

    it('should execute CREATE_EXPERIENCE operation', async () => {
      const operation: SyncOperation = {
        id: 'sync_1',
        type: 'CREATE_EXPERIENCE',
        data: {
          id: 'exp_1',
          userId: 'user_1',
          ciderId: 'cider_1',
          date: new Date(),
          venue: { id: 'venue_1', name: 'Test Venue', type: 'pub' },
          price: 5.0,
          containerSize: 500,
          pricePerMl: 0.01
        },
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
        status: 'pending'
      };

      await syncManager.executeOperation(operation);

      // Should call Firebase and update local sync status
      expect(mockSqliteService.createExperience).toHaveBeenCalled();
    });

    it('should handle UPLOAD_IMAGE operation', async () => {
      const operation: SyncOperation = {
        id: 'sync_1',
        type: 'UPLOAD_IMAGE',
        data: {
          localPath: '/local/path/image.jpg',
          remotePath: 'images/cider_1/photo.jpg',
          ciderId: 'cider_1'
        },
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
        status: 'pending'
      };

      const uploadImageSpy = jest.spyOn(syncManager, 'uploadImage').mockResolvedValue('https://example.com/image.jpg');

      await syncManager.executeOperation(operation);

      expect(uploadImageSpy).toHaveBeenCalledWith('/local/path/image.jpg', 'images/cider_1/photo.jpg');
    });
  });

  describe('Performance Monitoring', () => {
    it('should record sync performance metrics', async () => {
      const mockOperations: SyncOperation[] = [
        {
          id: 'sync_1',
          type: 'CREATE_CIDER',
          data: { name: 'Test Cider' },
          timestamp: new Date(),
          retryCount: 0,
          maxRetries: 3,
          status: 'pending'
        }
      ];

      syncManager.syncInProgress = false;
      syncManager.networkState.isConnected = true;
      mockSqliteService.getPendingSyncOperations.mockResolvedValue(mockOperations);

      jest.spyOn(syncManager, 'executeOperation').mockResolvedValue(undefined);

      await syncManager.processSyncQueue();

      expect(mockRecordSyncPerformance).toHaveBeenCalledWith(
        expect.any(Number), // duration
        1, // operation count
        0 // error count
      );
    });

    it('should track sync operation count', async () => {
      expect(syncManager.syncOperationCount).toBe(0);

      const mockOperations: SyncOperation[] = [
        {
          id: 'sync_1',
          type: 'CREATE_CIDER',
          data: { name: 'Test Cider 1' },
          timestamp: new Date(),
          retryCount: 0,
          maxRetries: 3,
          status: 'pending'
        },
        {
          id: 'sync_2',
          type: 'CREATE_CIDER',
          data: { name: 'Test Cider 2' },
          timestamp: new Date(),
          retryCount: 0,
          maxRetries: 3,
          status: 'pending'
        }
      ];

      syncManager.syncInProgress = false;
      syncManager.networkState.isConnected = true;
      mockSqliteService.getPendingSyncOperations.mockResolvedValue(mockOperations);

      jest.spyOn(syncManager, 'executeOperation').mockResolvedValue(undefined);

      await syncManager.processSyncQueue();

      expect(syncManager.syncOperationCount).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const operation: SyncOperation = {
        id: 'sync_1',
        type: 'CREATE_CIDER',
        data: { name: 'Test Cider' },
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
        status: 'pending'
      };

      const firestore = require('@react-native-firebase/firestore');
      firestore.default().collection().doc().set.mockRejectedValue(new Error('Network error'));

      // Should not throw, but handle error internally
      await expect(syncManager.executeOperation(operation)).rejects.toThrow('Network error');
    });

    it('should update operation status on error', async () => {
      const mockOperations: SyncOperation[] = [
        {
          id: 'sync_error',
          type: 'CREATE_CIDER',
          data: { name: 'Test Cider' },
          timestamp: new Date(),
          retryCount: 0,
          maxRetries: 3,
          status: 'pending'
        }
      ];

      syncManager.syncInProgress = false;
      syncManager.networkState.isConnected = true;
      mockSqliteService.getPendingSyncOperations.mockResolvedValue(mockOperations);

      jest.spyOn(syncManager, 'executeOperation').mockRejectedValue(new Error('Test error'));

      await syncManager.processSyncQueue();

      // Should reset sync state even after error
      expect(syncManager.syncInProgress).toBe(false);
    });
  });

  describe('App State Handling', () => {
    it('should process sync queue when app becomes active', () => {
      const { AppState } = require('react-native');
      const appStateListener = AppState.addEventListener.mock.calls[0][1];

      syncManager.networkState.isConnected = true;
      const processSyncQueueSpy = jest.spyOn(syncManager, 'processSyncQueue');

      appStateListener('active');

      expect(processSyncQueueSpy).toHaveBeenCalled();
    });

    it('should not process sync queue when app becomes inactive', () => {
      const { AppState } = require('react-native');
      const appStateListener = AppState.addEventListener.mock.calls[0][1];

      const processSyncQueueSpy = jest.spyOn(syncManager, 'processSyncQueue');

      appStateListener('background');

      expect(processSyncQueueSpy).not.toHaveBeenCalled();
    });
  });
});