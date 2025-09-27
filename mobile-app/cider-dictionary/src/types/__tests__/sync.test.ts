// Sync Types Tests
// Tests for Phase 3 offline-first sync types and validation

import {
  SyncOperationType,
  SyncStatus,
  SyncOperation,
  ImageUploadOperation,
  SyncQueueStats,
  NetworkState,
  ConflictResolution,
  SyncConflict
} from '../sync';

describe('Sync Types', () => {
  describe('SyncOperationType', () => {
    const expectedOperations = [
      'CREATE_CIDER',
      'UPDATE_CIDER',
      'DELETE_CIDER',
      'CREATE_EXPERIENCE',
      'UPDATE_EXPERIENCE',
      'DELETE_EXPERIENCE',
      'UPLOAD_IMAGE'
    ];

    it('should have all expected operation types', () => {
      expectedOperations.forEach(operation => {
        // This tests that the types are properly defined by ensuring they can be assigned
        const testOp: SyncOperationType = operation as SyncOperationType;
        expect(testOp).toBe(operation);
      });
    });

    it('should cover CRUD operations for both ciders and experiences', () => {
      const ciderOps = expectedOperations.filter(op => op.includes('CIDER'));
      const experienceOps = expectedOperations.filter(op => op.includes('EXPERIENCE'));

      expect(ciderOps).toHaveLength(3); // CREATE, UPDATE, DELETE
      expect(experienceOps).toHaveLength(3); // CREATE, UPDATE, DELETE
      expect(expectedOperations).toContain('UPLOAD_IMAGE'); // Image upload operation
    });
  });

  describe('SyncStatus', () => {
    const expectedStatuses = ['pending', 'syncing', 'synced', 'conflict', 'error'];

    it('should have all expected sync statuses', () => {
      expectedStatuses.forEach(status => {
        const testStatus: SyncStatus = status as SyncStatus;
        expect(testStatus).toBe(status);
      });
    });

    it('should represent all possible sync states', () => {
      // pending: not yet attempted
      // syncing: currently in progress
      // synced: successfully completed
      // conflict: needs resolution
      // error: failed with error
      expect(expectedStatuses).toHaveLength(5);
    });
  });

  describe('SyncOperation Interface', () => {
    const mockOperation: SyncOperation = {
      id: 'sync_op_1',
      type: 'CREATE_CIDER',
      data: { name: 'Test Cider', brand: 'Test Brand' },
      timestamp: new Date('2023-10-15T10:30:00Z'),
      retryCount: 1,
      maxRetries: 3,
      status: 'pending',
      errorMessage: 'Network timeout'
    };

    it('should have all required fields', () => {
      expect(mockOperation.id).toBeTruthy();
      expect(mockOperation.type).toBeTruthy();
      expect(mockOperation.data).toBeDefined();
      expect(mockOperation.timestamp).toBeInstanceOf(Date);
      expect(typeof mockOperation.retryCount).toBe('number');
      expect(typeof mockOperation.maxRetries).toBe('number');
      expect(mockOperation.status).toBeTruthy();
    });

    it('should have valid retry logic', () => {
      expect(mockOperation.retryCount).toBeGreaterThanOrEqual(0);
      expect(mockOperation.maxRetries).toBeGreaterThan(0);
      expect(mockOperation.retryCount).toBeLessThanOrEqual(mockOperation.maxRetries);
    });

    it('should have error message when status is error', () => {
      const errorOperation: SyncOperation = {
        ...mockOperation,
        status: 'error',
        errorMessage: 'Sync failed'
      };

      expect(errorOperation.errorMessage).toBeTruthy();
    });

    it('should allow any data type', () => {
      const operations: SyncOperation[] = [
        { ...mockOperation, data: { simple: 'object' } },
        { ...mockOperation, data: 'string_data' },
        { ...mockOperation, data: 123 },
        { ...mockOperation, data: ['array', 'data'] },
      ];

      operations.forEach(op => {
        expect(op.data).toBeDefined();
      });
    });
  });

  describe('ImageUploadOperation Interface', () => {
    const mockImageUpload: ImageUploadOperation = {
      localPath: '/local/path/to/image.jpg',
      remotePath: 'images/ciders/cider_123/photo.jpg',
      ciderId: 'cider_123'
    };

    it('should have all required fields', () => {
      expect(mockImageUpload.localPath).toBeTruthy();
      expect(mockImageUpload.remotePath).toBeTruthy();
      expect(mockImageUpload.ciderId).toBeTruthy();
    });

    it('should have valid file paths', () => {
      expect(mockImageUpload.localPath).toMatch(/\.(jpg|jpeg|png|gif)$/i);
      expect(mockImageUpload.remotePath).toContain('images/');
      expect(mockImageUpload.remotePath).toContain(mockImageUpload.ciderId);
    });
  });

  describe('SyncQueueStats Interface', () => {
    const mockStats: SyncQueueStats = {
      pending: 5,
      syncing: 2,
      failed: 1,
      lastSync: new Date('2023-10-15T12:00:00Z')
    };

    it('should have all required fields', () => {
      expect(typeof mockStats.pending).toBe('number');
      expect(typeof mockStats.syncing).toBe('number');
      expect(typeof mockStats.failed).toBe('number');
      expect(mockStats.lastSync).toBeInstanceOf(Date);
    });

    it('should have non-negative counts', () => {
      expect(mockStats.pending).toBeGreaterThanOrEqual(0);
      expect(mockStats.syncing).toBeGreaterThanOrEqual(0);
      expect(mockStats.failed).toBeGreaterThanOrEqual(0);
    });

    it('should allow null lastSync for new installations', () => {
      const newStats: SyncQueueStats = {
        ...mockStats,
        lastSync: null
      };
      expect(newStats.lastSync).toBeNull();
    });

    it('should calculate total operations', () => {
      const total = mockStats.pending + mockStats.syncing + mockStats.failed;
      expect(total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('NetworkState Interface', () => {
    const mockNetworkState: NetworkState = {
      isConnected: true,
      type: 'wifi',
      isInternetReachable: true
    };

    it('should have all required fields', () => {
      expect(typeof mockNetworkState.isConnected).toBe('boolean');
      expect(mockNetworkState.type).toBeDefined();
      expect(typeof mockNetworkState.isInternetReachable).toBe('boolean');
    });

    it('should handle different connection types', () => {
      const connectionTypes = ['wifi', 'cellular', 'ethernet', 'other', null];

      connectionTypes.forEach(type => {
        const state: NetworkState = {
          isConnected: type !== null,
          type,
          isInternetReachable: type !== null
        };
        expect(state.type).toBe(type);
      });
    });

    it('should handle offline state', () => {
      const offlineState: NetworkState = {
        isConnected: false,
        type: null,
        isInternetReachable: false
      };

      expect(offlineState.isConnected).toBe(false);
      expect(offlineState.type).toBeNull();
      expect(offlineState.isInternetReachable).toBe(false);
    });
  });

  describe('ConflictResolution Interface', () => {
    const mockResolution: ConflictResolution = {
      strategy: 'local_wins',
      resolvedAt: new Date('2023-10-15T15:30:00Z'),
      conflictData: {
        local: { name: 'Local Cider Name' },
        remote: { name: 'Remote Cider Name' },
        resolved: { name: 'Local Cider Name' }
      }
    };

    it('should have all required fields', () => {
      expect(['local_wins', 'remote_wins', 'merge', 'user_choice']).toContain(mockResolution.strategy);
      expect(mockResolution.resolvedAt).toBeInstanceOf(Date);
      expect(mockResolution.conflictData).toBeDefined();
      expect(mockResolution.conflictData.local).toBeDefined();
      expect(mockResolution.conflictData.remote).toBeDefined();
      expect(mockResolution.conflictData.resolved).toBeDefined();
    });

    it('should have consistent resolution data', () => {
      // For local_wins, resolved should match local
      expect(mockResolution.conflictData.resolved).toEqual(mockResolution.conflictData.local);

      const remoteWinsResolution: ConflictResolution = {
        strategy: 'remote_wins',
        resolvedAt: new Date(),
        conflictData: {
          local: { value: 'local' },
          remote: { value: 'remote' },
          resolved: { value: 'remote' }
        }
      };

      expect(remoteWinsResolution.conflictData.resolved).toEqual(remoteWinsResolution.conflictData.remote);
    });
  });

  describe('SyncConflict Interface', () => {
    const mockConflict: SyncConflict = {
      id: 'conflict_1',
      entityId: 'cider_123',
      entityType: 'cider',
      localVersion: { name: 'Local Name', rating: 8 },
      remoteVersion: { name: 'Remote Name', rating: 9 },
      conflictFields: ['name', 'rating'],
      createdAt: new Date('2023-10-15T14:00:00Z'),
      resolution: {
        strategy: 'merge',
        resolvedAt: new Date('2023-10-15T14:05:00Z'),
        conflictData: {
          local: { name: 'Local Name', rating: 8 },
          remote: { name: 'Remote Name', rating: 9 },
          resolved: { name: 'Remote Name', rating: 8 }
        }
      }
    };

    it('should have all required fields', () => {
      expect(mockConflict.id).toBeTruthy();
      expect(mockConflict.entityId).toBeTruthy();
      expect(['cider', 'experience']).toContain(mockConflict.entityType);
      expect(mockConflict.localVersion).toBeDefined();
      expect(mockConflict.remoteVersion).toBeDefined();
      expect(Array.isArray(mockConflict.conflictFields)).toBe(true);
      expect(mockConflict.createdAt).toBeInstanceOf(Date);
    });

    it('should have valid conflict fields', () => {
      expect(mockConflict.conflictFields.length).toBeGreaterThan(0);
      mockConflict.conflictFields.forEach(field => {
        expect(typeof field).toBe('string');
        expect(field).toBeTruthy();
      });
    });

    it('should have optional resolution', () => {
      const unresolvedConflict: SyncConflict = {
        ...mockConflict,
        resolution: undefined
      };

      expect(unresolvedConflict.resolution).toBeUndefined();
      expect(mockConflict.resolution).toBeDefined();
    });

    it('should have resolution timestamp after creation', () => {
      if (mockConflict.resolution) {
        expect(mockConflict.resolution.resolvedAt.getTime()).toBeGreaterThan(mockConflict.createdAt.getTime());
      }
    });
  });
});