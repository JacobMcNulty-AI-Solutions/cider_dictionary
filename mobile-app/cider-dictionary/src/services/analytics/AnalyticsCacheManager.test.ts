/**
 * Test Suite for AnalyticsCacheManager
 *
 * Comprehensive tests for the multi-level analytics cache manager covering:
 * - Basic get/set operations
 * - TTL expiration
 * - Dependency-based invalidation
 * - LRU eviction
 * - Cache statistics
 * - AsyncStorage persistence
 * - Error handling
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import AnalyticsCacheManager, { cacheManager } from './AnalyticsCacheManager';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

describe('AnalyticsCacheManager', () => {
  beforeEach(async () => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Reset AsyncStorage mock
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);
    (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);

    // Clear the cache between tests (await to ensure complete cleanup)
    await cacheManager.clear();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AnalyticsCacheManager.getInstance();
      const instance2 = AnalyticsCacheManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should share state between getInstance calls', async () => {
      const instance1 = AnalyticsCacheManager.getInstance();
      await instance1.set('test-key', { data: 'value' });

      const instance2 = AnalyticsCacheManager.getInstance();
      const value = await instance2.get('test-key');

      expect(value).toEqual({ data: 'value' });
    });
  });

  describe('Basic Get/Set Operations', () => {
    it('should store and retrieve data from memory cache', async () => {
      const testData = { analytics: 'data', count: 42 };

      await cacheManager.set('test-key', testData);
      const retrieved = await cacheManager.get('test-key');

      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent keys', async () => {
      const result = await cacheManager.get('non-existent-key');

      expect(result).toBeNull();
    });

    it('should handle different data types', async () => {
      const testCases = [
        { key: 'string', value: 'hello world' },
        { key: 'number', value: 12345 },
        { key: 'boolean', value: true },
        { key: 'array', value: [1, 2, 3, 4, 5] },
        { key: 'object', value: { nested: { data: 'value' } } },
        { key: 'null', value: null },
      ];

      for (const { key, value } of testCases) {
        await cacheManager.set(key, value);
        const retrieved = await cacheManager.get(key);
        expect(retrieved).toEqual(value);
      }
    });

    it('should persist data to AsyncStorage', async () => {
      const testData = { analytics: 'data' };

      await cacheManager.set('test-key', testData);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@analytics_cache:test-key',
        expect.stringContaining('"key":"test-key"')
      );
    });
  });

  describe('TTL Expiration', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should respect custom TTL', async () => {
      const testData = { data: 'value' };
      const ttl = 1000; // 1 second

      await cacheManager.set('test-key', testData, { ttl });

      // Should be available immediately
      let retrieved = await cacheManager.get('test-key');
      expect(retrieved).toEqual(testData);

      // Advance time past TTL
      jest.advanceTimersByTime(ttl + 100);

      // Should be expired
      retrieved = await cacheManager.get('test-key');
      expect(retrieved).toBeNull();
    });

    it('should use default TTL when not specified', async () => {
      const testData = { data: 'value' };

      await cacheManager.set('test-key', testData);

      // Should be available before default TTL (5 minutes)
      jest.advanceTimersByTime(4 * 60 * 1000); // 4 minutes
      let retrieved = await cacheManager.get('test-key');
      expect(retrieved).toEqual(testData);

      // Should be expired after default TTL
      jest.advanceTimersByTime(2 * 60 * 1000); // 2 more minutes (total 6)
      retrieved = await cacheManager.get('test-key');
      expect(retrieved).toBeNull();
    });

    it('should remove expired entries from storage', async () => {
      const testData = { data: 'value' };
      const ttl = 1000;

      await cacheManager.set('test-key', testData, { ttl });

      // Advance time past TTL
      jest.advanceTimersByTime(ttl + 100);

      // Try to get (should trigger removal)
      await cacheManager.get('test-key');

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@analytics_cache:test-key');
    });
  });

  describe('Dependency-Based Invalidation', () => {
    it('should invalidate entries with matching dependencies', async () => {
      await cacheManager.set('analytics:summary', { data: 'summary' }, {
        dependencies: ['ciders', 'experiences'],
      });

      await cacheManager.set('analytics:trends', { data: 'trends' }, {
        dependencies: ['ciders'],
      });

      await cacheManager.set('analytics:other', { data: 'other' }, {
        dependencies: ['experiences'],
      });

      // Invalidate entries depending on 'ciders'
      await cacheManager.invalidate('ciders');

      // Should invalidate summary and trends
      expect(await cacheManager.get('analytics:summary')).toBeNull();
      expect(await cacheManager.get('analytics:trends')).toBeNull();

      // Should not invalidate other
      expect(await cacheManager.get('analytics:other')).toEqual({ data: 'other' });
    });

    it('should remove invalidated entries from AsyncStorage', async () => {
      await cacheManager.set('test-key', { data: 'value' }, {
        dependencies: ['ciders'],
      });

      await cacheManager.invalidate('ciders');

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@analytics_cache:test-key');
    });

    it('should handle invalidation of non-existent dependencies gracefully', async () => {
      await cacheManager.set('test-key', { data: 'value' });

      await expect(
        cacheManager.invalidate('non-existent-dependency')
      ).resolves.not.toThrow();

      // Original entry should still exist
      expect(await cacheManager.get('test-key')).toEqual({ data: 'value' });
    });
  });

  describe('LRU Eviction Strategy', () => {
    it('should evict oldest entry when cache is full', async () => {
      // Set MAX_CACHE_SIZE entries (100)
      for (let i = 0; i < 101; i++) {
        await cacheManager.set(`key-${i}`, { data: i });
      }

      const stats = cacheManager.getStats();

      // Should have evicted at least one entry
      expect(stats.evictions).toBeGreaterThan(0);
      expect(stats.size).toBeLessThanOrEqual(100);
    });

    it('should evict least recently accessed entry', async () => {
      // Add three entries
      await cacheManager.set('key-1', { data: 1 });
      await cacheManager.set('key-2', { data: 2 });
      await cacheManager.set('key-3', { data: 3 });

      // Access key-1 and key-2 to update their access times
      await cacheManager.get('key-1');
      await cacheManager.get('key-2');

      // key-3 is now the least recently accessed
      // Fill cache to trigger eviction
      for (let i = 4; i <= 101; i++) {
        await cacheManager.set(`key-${i}`, { data: i });
      }

      // key-3 should have been evicted first
      expect(await cacheManager.get('key-3')).toBeNull();

      // key-1 and key-2 might still be there (depending on when eviction happened)
      // But they were accessed more recently than key-3
    });

    it('should update eviction statistics', async () => {
      const statsBefore = cacheManager.getStats();
      expect(statsBefore.evictions).toBe(0);

      // Fill cache beyond capacity
      for (let i = 0; i < 105; i++) {
        await cacheManager.set(`key-${i}`, { data: i });
      }

      const statsAfter = cacheManager.getStats();
      expect(statsAfter.evictions).toBeGreaterThan(0);
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache hits and misses', async () => {
      await cacheManager.set('test-key', { data: 'value' });

      // Hit
      await cacheManager.get('test-key');

      // Miss
      await cacheManager.get('non-existent-key');

      const stats = cacheManager.getStats();

      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it('should calculate hit rate correctly', async () => {
      await cacheManager.set('key-1', { data: 1 });
      await cacheManager.set('key-2', { data: 2 });

      // 3 hits
      await cacheManager.get('key-1');
      await cacheManager.get('key-2');
      await cacheManager.get('key-1');

      // 1 miss
      await cacheManager.get('non-existent');

      const hitRate = cacheManager.getHitRate();

      expect(hitRate).toBe(75); // 3/4 = 75%
    });

    it('should track cache size', async () => {
      const statsBefore = cacheManager.getStats();
      expect(statsBefore.size).toBe(0);

      await cacheManager.set('key-1', { data: 1 });
      await cacheManager.set('key-2', { data: 2 });

      const statsAfter = cacheManager.getStats();
      expect(statsAfter.size).toBe(2);
    });

    it('should return 0 hit rate when no accesses', () => {
      const hitRate = cacheManager.getHitRate();
      expect(hitRate).toBe(0);
    });
  });

  describe('AsyncStorage Fallback', () => {
    it('should load from AsyncStorage if not in memory', async () => {
      const testData = { data: 'value' };
      const storageEntry = JSON.stringify({
        key: 'test-key',
        data: testData,
        timestamp: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        ttl: 5 * 60 * 1000,
        dependencies: [],
      });

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(storageEntry);

      const retrieved = await cacheManager.get('test-key');

      expect(retrieved).toEqual(testData);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@analytics_cache:test-key');
    });

    it('should promote AsyncStorage entries to memory cache', async () => {
      const testData = { data: 'value' };
      const storageEntry = JSON.stringify({
        key: 'test-key',
        data: testData,
        timestamp: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        ttl: 5 * 60 * 1000,
        dependencies: [],
      });

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(storageEntry);

      // First access loads from storage
      await cacheManager.get('test-key');

      // Second access should be from memory (no storage call)
      (AsyncStorage.getItem as jest.Mock).mockClear();
      const retrieved = await cacheManager.get('test-key');

      expect(retrieved).toEqual(testData);
      expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(
        cacheManager.set('test-key', { data: 'value' })
      ).resolves.not.toThrow();
    });
  });

  describe('Clear Operation', () => {
    it('should clear memory cache', async () => {
      await cacheManager.set('key-1', { data: 1 });
      await cacheManager.set('key-2', { data: 2 });

      await cacheManager.clear();

      expect(await cacheManager.get('key-1')).toBeNull();
      expect(await cacheManager.get('key-2')).toBeNull();
    });

    it('should clear AsyncStorage', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
        '@analytics_cache:key-1',
        '@analytics_cache:key-2',
        '@other:key-3',
      ]);

      await cacheManager.clear();

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        '@analytics_cache:key-1',
        '@analytics_cache:key-2',
      ]);
    });

    it('should reset cache size', async () => {
      await cacheManager.set('key-1', { data: 1 });
      await cacheManager.set('key-2', { data: 2 });

      await cacheManager.clear();

      const stats = cacheManager.getStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Utility Methods', () => {
    it('should return all cache keys', async () => {
      await cacheManager.set('key-1', { data: 1 });
      await cacheManager.set('key-2', { data: 2 });
      await cacheManager.set('key-3', { data: 3 });

      const keys = cacheManager.getKeys();

      expect(keys).toHaveLength(3);
      expect(keys).toContain('key-1');
      expect(keys).toContain('key-2');
      expect(keys).toContain('key-3');
    });

    it('should check if key exists', async () => {
      await cacheManager.set('test-key', { data: 'value' });

      expect(await cacheManager.has('test-key')).toBe(true);
      expect(await cacheManager.has('non-existent')).toBe(false);
    });

    it('should return entry info', async () => {
      await cacheManager.set('test-key', { data: 'value' }, {
        ttl: 10000,
        dependencies: ['ciders', 'experiences'],
      });

      const info = await cacheManager.getEntryInfo('test-key');

      expect(info).toMatchObject({
        exists: true,
        expired: false,
        ttl: 10000,
        dependencies: ['ciders', 'experiences'],
      });
      expect(info?.age).toBeGreaterThanOrEqual(0);
    });

    it('should remove specific entry', async () => {
      await cacheManager.set('key-1', { data: 1 });
      await cacheManager.set('key-2', { data: 2 });

      await cacheManager.remove('key-1');

      expect(await cacheManager.get('key-1')).toBeNull();
      expect(await cacheManager.get('key-2')).toEqual({ data: 2 });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty cache operations', async () => {
      await expect(cacheManager.clear()).resolves.not.toThrow();
      await expect(cacheManager.invalidate('any-key')).resolves.not.toThrow();
    });

    it('should handle very large data objects', async () => {
      const largeData = {
        array: new Array(1000).fill({ nested: { data: 'value' } }),
      };

      await expect(
        cacheManager.set('large-key', largeData)
      ).resolves.not.toThrow();

      const retrieved = await cacheManager.get('large-key');
      expect(retrieved).toEqual(largeData);
    });

    it('should handle rapid successive operations', async () => {
      const operations = Array.from({ length: 50 }, (_, i) =>
        cacheManager.set(`key-${i}`, { data: i })
      );

      await expect(Promise.all(operations)).resolves.not.toThrow();
    });

    it('should handle special characters in keys', async () => {
      const specialKeys = [
        'key:with:colons',
        'key/with/slashes',
        'key.with.dots',
        'key-with-dashes',
        'key_with_underscores',
      ];

      for (const key of specialKeys) {
        await cacheManager.set(key, { data: key });
        const retrieved = await cacheManager.get(key);
        expect(retrieved).toEqual({ data: key });
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle AsyncStorage quota errors', async () => {
      const quotaError = new Error('QuotaExceededError: quota exceeded');
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(quotaError);

      // Should not throw, but continue with memory-only cache
      await expect(
        cacheManager.set('test-key', { data: 'value' })
      ).resolves.not.toThrow();

      // Data should still be in memory cache
      expect(await cacheManager.get('test-key')).toEqual({ data: 'value' });
    });

    it('should handle corrupted AsyncStorage data', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid-json{]');

      const result = await cacheManager.get('test-key');

      expect(result).toBeNull();
    });

    it('should handle null/undefined values', async () => {
      await cacheManager.set('null-key', null);
      await cacheManager.set('undefined-key', undefined);

      expect(await cacheManager.get('null-key')).toBe(null);
      expect(await cacheManager.get('undefined-key')).toBe(undefined);
    });
  });
});
