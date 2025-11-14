/**
 * Multi-Level Analytics Cache Manager
 *
 * Comprehensive caching system for analytics data with:
 * - Multi-level caching (in-memory Map + AsyncStorage persistence)
 * - TTL-based expiration with configurable timeouts
 * - Dependency-based invalidation for data consistency
 * - LRU eviction strategy to prevent memory bloat
 * - Cache statistics tracking for performance monitoring
 *
 * @module AnalyticsCacheManager
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnalyticsCacheEntry } from '../../types/analytics';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Cache performance statistics
 * Tracks hits, misses, and evictions for monitoring cache effectiveness
 */
interface CacheStats {
  /** Number of successful cache retrievals */
  hits: number;
  /** Number of cache misses (data not found or expired) */
  misses: number;
  /** Number of entries evicted due to size limits */
  evictions: number;
  /** Current number of entries in memory cache */
  size: number;
}

/**
 * Options for setting cache entries
 */
interface SetCacheOptions {
  /** Time to live in milliseconds (default: 5 minutes) */
  ttl?: number;
  /** Array of dependency keys for invalidation */
  dependencies?: string[];
}

/**
 * Internal cache entry with access tracking for LRU
 */
interface InternalCacheEntry extends AnalyticsCacheEntry {
  /** Last access timestamp for LRU eviction */
  lastAccessed: Date;
  /** Access counter for precise LRU ordering (monotonically increasing) */
  accessCount: number;
}

// ============================================================================
// Analytics Cache Manager Class
// ============================================================================

/**
 * Singleton cache manager for analytics data
 *
 * Implements a two-tier caching strategy:
 * 1. Memory cache (Map) - Fast access, volatile
 * 2. AsyncStorage - Persistent, slower access
 *
 * Features automatic eviction, TTL expiration, and dependency tracking
 */
class AnalyticsCacheManager {
  private static instance: AnalyticsCacheManager;

  /** In-memory cache for fast access */
  private memoryCache: Map<string, InternalCacheEntry>;

  /** Cache performance statistics */
  private stats: CacheStats;

  /** Maximum number of entries in memory cache */
  private readonly MAX_CACHE_SIZE = 100;

  /** Default TTL in milliseconds (5 minutes) */
  private readonly DEFAULT_TTL = 5 * 60 * 1000;

  /** Prefix for AsyncStorage keys to avoid conflicts */
  private readonly STORAGE_PREFIX = '@analytics_cache:';

  /** Flag to track if AsyncStorage is available */
  private storageAvailable = true;

  /** Set of keys currently being deleted to prevent race conditions */
  private deletingKeys: Set<string> = new Set();

  /** Monotonically increasing counter for precise LRU ordering */
  private accessCounter: number = 0;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.memoryCache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
    };

    // Test AsyncStorage availability on initialization
    this.testStorageAvailability();
  }

  /**
   * Get singleton instance
   * @returns The shared AnalyticsCacheManager instance
   */
  static getInstance(): AnalyticsCacheManager {
    if (!AnalyticsCacheManager.instance) {
      AnalyticsCacheManager.instance = new AnalyticsCacheManager();
    }
    return AnalyticsCacheManager.instance;
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * Get data from cache
   *
   * Checks memory cache first for speed, then falls back to AsyncStorage.
   * Automatically handles TTL expiration and promotes AsyncStorage entries
   * to memory cache on access.
   *
   * @template T - Type of cached data
   * @param key - Cache key to retrieve
   * @returns Cached data or null if not found/expired
   *
   * @example
   * const data = await cacheManager.get<AnalyticsData>('analytics:summary:3M');
   * if (data) {
   *   console.log('Cache hit!', data);
   * }
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Check if key is currently being deleted to prevent race conditions
      if (this.deletingKeys.has(key)) {
        this.stats.misses++;
        return null;
      }

      // Check memory cache first
      const memoryEntry = this.memoryCache.get(key);

      if (memoryEntry) {
        // Check if expired
        if (this.isExpired(memoryEntry)) {
          // Mark key as being deleted to prevent concurrent access
          this.deletingKeys.add(key);

          // Remove expired entry
          this.memoryCache.delete(key);
          this.stats.size = this.memoryCache.size;
          await this.removeFromStorage(key);

          // Unmark after deletion complete
          this.deletingKeys.delete(key);

          this.stats.misses++;
          return null;
        }

        // Update access time and counter for LRU
        memoryEntry.lastAccessed = new Date();
        memoryEntry.accessCount = ++this.accessCounter;
        this.stats.hits++;
        return memoryEntry.data as T;
      }

      // Fallback to AsyncStorage
      if (this.storageAvailable) {
        const storageEntry = await this.loadFromStorage(key);

        if (storageEntry) {
          // Check if expired
          if (this.isExpired(storageEntry)) {
            await this.removeFromStorage(key);
            this.stats.misses++;
            return null;
          }

          // Promote to memory cache
          const internalEntry: InternalCacheEntry = {
            ...storageEntry,
            lastAccessed: new Date(),
            accessCount: ++this.accessCounter,
          };
          this.memoryCache.set(key, internalEntry);
          this.stats.size = this.memoryCache.size;

          // Manage cache size
          if (this.memoryCache.size > this.MAX_CACHE_SIZE) {
            this.evictOldest();
          }

          this.stats.hits++;
          return storageEntry.data as T;
        }
      }

      // Cache miss
      this.stats.misses++;
      return null;
    } catch (error) {
      console.error('[AnalyticsCacheManager] Error getting from cache:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set data in cache
   *
   * Stores data in both memory cache and AsyncStorage with optional TTL
   * and dependency tracking. Automatically manages cache size through LRU eviction.
   *
   * @param key - Cache key
   * @param data - Data to cache (must be JSON-serializable)
   * @param options - Optional TTL and dependencies
   *
   * @example
   * await cacheManager.set('analytics:summary:3M', summaryData, {
   *   ttl: 10 * 60 * 1000, // 10 minutes
   *   dependencies: ['ciders', 'experiences']
   * });
   */
  async set(key: string, data: any, options?: SetCacheOptions): Promise<void> {
    try {
      const ttl = options?.ttl ?? this.DEFAULT_TTL;
      const dependencies = options?.dependencies ?? [];
      const timestamp = new Date();

      // Create cache entry
      const entry: InternalCacheEntry = {
        key,
        data,
        timestamp,
        ttl,
        dependencies,
        lastAccessed: timestamp,
        accessCount: ++this.accessCounter,
      };

      // Persist to AsyncStorage FIRST (if available)
      if (this.storageAvailable) {
        try {
          await this.persistToStorage(key, entry);
        } catch (error) {
          console.error(`[AnalyticsCacheManager] Failed to persist ${key} to storage:`, error);

          // Check if this is a quota error
          if (error instanceof Error && error.message.includes('quota')) {
            console.warn('[AnalyticsCacheManager] Storage quota exceeded, continuing with memory-only cache');
            // Continue with memory-only cache for this entry
          } else {
            // For other errors, don't add to cache at all to prevent data loss
            console.error('[AnalyticsCacheManager] Skipping cache entry due to storage error');
            return;
          }
        }
      }

      // Evict oldest entry BEFORE adding if at capacity
      if (this.memoryCache.size >= this.MAX_CACHE_SIZE) {
        this.evictOldest();
      }

      // Only add to memory cache after successful storage persistence (or quota error)
      this.memoryCache.set(key, entry);
      this.stats.size = this.memoryCache.size;

      console.log(`[AnalyticsCacheManager] Set cache entry: ${key} (TTL: ${entry.ttl}ms)`);
    } catch (error) {
      console.error('[AnalyticsCacheManager] Set failed:', error);
    }
  }

  /**
   * Invalidate cache entries by dependency
   *
   * Removes all cache entries that depend on the specified key.
   * Useful for maintaining data consistency when underlying data changes.
   *
   * @param dependencyKey - Dependency key to invalidate
   *
   * @example
   * // When ciders are updated, invalidate all related analytics
   * await cacheManager.invalidate('ciders');
   */
  async invalidate(dependencyKey: string): Promise<void> {
    try {
      const startTime = performance.now();
      const keysToRemove: string[] = [];

      // Find all entries with this dependency
      this.memoryCache.forEach((entry, key) => {
        if (entry.dependencies.includes(dependencyKey)) {
          keysToRemove.push(key);
        }
      });

      if (keysToRemove.length === 0) {
        console.log(`[AnalyticsCacheManager] No entries to invalidate for dependency: ${dependencyKey}`);
        return;
      }

      console.log(`[AnalyticsCacheManager] Invalidating ${keysToRemove.length} entries for dependency: ${dependencyKey}`);

      // Remove entries with error handling
      for (const key of keysToRemove) {
        try {
          // Remove from storage first (more likely to fail)
          await this.removeFromStorage(key);

          // Only remove from memory if storage removal succeeded
          this.memoryCache.delete(key);
          this.stats.size = this.memoryCache.size;
        } catch (error) {
          // Log error but continue with other keys
          console.error(`[AnalyticsCacheManager] Failed to remove ${key} from storage:`, error);

          // Still remove from memory to prevent serving stale data
          this.memoryCache.delete(key);
          this.stats.size = this.memoryCache.size;

          // Could add to a "failed cleanup" queue here for retry later
        }
      }

      const duration = performance.now() - startTime;
      console.log(`[AnalyticsCacheManager] Invalidation completed in ${duration.toFixed(2)}ms`);
    } catch (error) {
      console.error('[AnalyticsCacheManager] Invalidate failed:', error);
    }
  }

  /**
   * Clear all cache entries
   *
   * Removes all data from both memory cache and AsyncStorage.
   * Resets statistics but preserves hit/miss history.
   *
   * @example
   * // Clear all analytics caches on logout
   * await cacheManager.clear();
   */
  async clear(): Promise<void> {
    try {
      // Clear memory cache
      this.memoryCache.clear();
      this.stats.size = 0;

      // Reset statistics
      this.stats.hits = 0;
      this.stats.misses = 0;
      this.stats.evictions = 0;

      // Reset access counter
      this.accessCounter = 0;

      // Clear AsyncStorage
      if (this.storageAvailable) {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter((key) => key.startsWith(this.STORAGE_PREFIX));
        await AsyncStorage.multiRemove(cacheKeys);
      }

      console.log('[AnalyticsCacheManager] Cache cleared');
    } catch (error) {
      console.error('[AnalyticsCacheManager] Error clearing cache:', error);
    }
  }

  /**
   * Get cache statistics
   *
   * Returns current cache performance metrics including hit rate,
   * miss rate, and eviction count.
   *
   * @returns Copy of cache statistics
   *
   * @example
   * const stats = cacheManager.getStats();
   * const hitRate = (stats.hits / (stats.hits + stats.misses)) * 100;
   * console.log(`Cache hit rate: ${hitRate.toFixed(2)}%`);
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache hit rate as percentage
   *
   * @returns Hit rate (0-100) or 0 if no cache accesses yet
   *
   * @example
   * console.log(`Cache efficiency: ${cacheManager.getHitRate().toFixed(2)}%`);
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    if (total === 0) return 0;
    return (this.stats.hits / total) * 100;
  }

  /**
   * Remove a specific cache entry
   *
   * @param key - Cache key to remove
   *
   * @example
   * await cacheManager.remove('analytics:summary:3M');
   */
  async remove(key: string): Promise<void> {
    try {
      this.memoryCache.delete(key);
      this.stats.size = this.memoryCache.size;

      if (this.storageAvailable) {
        await this.removeFromStorage(key);
      }
    } catch (error) {
      console.error('[AnalyticsCacheManager] Error removing cache entry:', error);
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Check if a cache entry is expired
   *
   * @param entry - Cache entry to check
   * @returns True if entry is past its TTL
   */
  private isExpired(entry: AnalyticsCacheEntry): boolean {
    const now = Date.now();
    const entryTime = new Date(entry.timestamp).getTime();
    return now - entryTime > entry.ttl;
  }

  /**
   * Evict oldest entry from cache (LRU strategy)
   *
   * Finds the entry with the lowest access count (least recently used) and removes it.
   * Uses accessCount instead of timestamps to ensure accurate ordering even
   * when operations occur within the same millisecond.
   * Updates eviction statistics.
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestCount: number = Infinity;

    // Find entry with lowest access count (least recently used)
    this.memoryCache.forEach((entry, key) => {
      if (entry.accessCount < oldestCount) {
        oldestCount = entry.accessCount;
        oldestKey = key;
      }
    });

    // Remove oldest entry
    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
      this.stats.size = this.memoryCache.size;
      this.stats.evictions++;

      // Also remove from AsyncStorage (fire and forget)
      if (this.storageAvailable) {
        this.removeFromStorage(oldestKey).catch((error) => {
          console.warn('[AnalyticsCacheManager] Failed to evict from storage:', error);
        });
      }

      console.log(
        `[AnalyticsCacheManager] Evicted oldest entry: ${oldestKey} (total evictions: ${this.stats.evictions})`
      );
    }
  }

  /**
   * Persist entry to AsyncStorage
   *
   * Serializes the cache entry to JSON and stores it. Handles Date serialization
   * by converting to ISO strings.
   *
   * @param key - Cache key
   * @param entry - Entry to persist
   */
  private async persistToStorage(
    key: string,
    entry: InternalCacheEntry
  ): Promise<void> {
    try {
      const storageKey = this.STORAGE_PREFIX + key;

      // Serialize entry with Date conversion
      const serialized = JSON.stringify({
        ...entry,
        timestamp: entry.timestamp.toISOString(),
        lastAccessed: entry.lastAccessed.toISOString(),
      });

      await AsyncStorage.setItem(storageKey, serialized);
    } catch (error) {
      console.error('[AnalyticsCacheManager] Failed to persist to storage:', error);
      // Mark storage as unavailable if quota exceeded or other critical errors
      if (error instanceof Error && error.message.includes('quota')) {
        this.storageAvailable = false;
        console.warn(
          '[AnalyticsCacheManager] AsyncStorage quota exceeded, switching to memory-only mode'
        );
      }
    }
  }

  /**
   * Load entry from AsyncStorage
   *
   * Retrieves and deserializes a cache entry, converting ISO date strings
   * back to Date objects.
   *
   * @param key - Cache key
   * @returns Deserialized cache entry or null if not found
   */
  private async loadFromStorage(key: string): Promise<InternalCacheEntry | null> {
    try {
      const storageKey = this.STORAGE_PREFIX + key;
      const serialized = await AsyncStorage.getItem(storageKey);

      if (!serialized) {
        return null;
      }

      // Deserialize with Date conversion
      const parsed = JSON.parse(serialized);
      return {
        ...parsed,
        timestamp: new Date(parsed.timestamp),
        lastAccessed: new Date(parsed.lastAccessed),
      };
    } catch (error) {
      console.error('[AnalyticsCacheManager] Failed to load from storage:', error);
      return null;
    }
  }

  /**
   * Remove entry from AsyncStorage
   *
   * @param key - Cache key to remove
   */
  private async removeFromStorage(key: string): Promise<void> {
    try {
      const storageKey = this.STORAGE_PREFIX + key;
      await AsyncStorage.removeItem(storageKey);
    } catch (error) {
      console.error('[AnalyticsCacheManager] Failed to remove from storage:', error);
    }
  }

  /**
   * Test if AsyncStorage is available and working
   *
   * Attempts a simple read/write operation to detect if AsyncStorage
   * is accessible and not at quota.
   */
  private async testStorageAvailability(): Promise<void> {
    try {
      const testKey = this.STORAGE_PREFIX + '__test__';
      await AsyncStorage.setItem(testKey, 'test');
      await AsyncStorage.removeItem(testKey);
      this.storageAvailable = true;
    } catch (error) {
      console.warn(
        '[AnalyticsCacheManager] AsyncStorage not available, using memory-only cache:',
        error
      );
      this.storageAvailable = false;
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Get all cache keys currently in memory
   *
   * Useful for debugging and monitoring
   *
   * @returns Array of cache keys
   */
  getKeys(): string[] {
    return Array.from(this.memoryCache.keys());
  }

  /**
   * Check if a key exists in cache (without updating access time)
   *
   * @param key - Cache key to check
   * @returns True if key exists and is not expired
   */
  async has(key: string): Promise<boolean> {
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      return true;
    }

    if (this.storageAvailable) {
      const storageEntry = await this.loadFromStorage(key);
      return storageEntry !== null && !this.isExpired(storageEntry);
    }

    return false;
  }

  /**
   * Get detailed information about a cache entry
   *
   * Useful for debugging and monitoring cache behavior
   *
   * @param key - Cache key
   * @returns Entry metadata or null if not found
   */
  async getEntryInfo(key: string): Promise<{
    exists: boolean;
    expired?: boolean;
    ttl?: number;
    age?: number;
    dependencies?: string[];
  } | null> {
    const entry = this.memoryCache.get(key);
    if (!entry) {
      return { exists: false };
    }

    const now = Date.now();
    const entryTime = new Date(entry.timestamp).getTime();
    const age = now - entryTime;
    const expired = this.isExpired(entry);

    return {
      exists: true,
      expired,
      ttl: entry.ttl,
      age,
      dependencies: entry.dependencies,
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

/**
 * Shared singleton instance for application-wide use
 *
 * @example
 * import { cacheManager } from './services/analytics/AnalyticsCacheManager';
 *
 * // Cache analytics data
 * await cacheManager.set('analytics:summary:3M', data, {
 *   ttl: 5 * 60 * 1000,
 *   dependencies: ['ciders', 'experiences']
 * });
 *
 * // Retrieve from cache
 * const cached = await cacheManager.get('analytics:summary:3M');
 */
export const cacheManager = AnalyticsCacheManager.getInstance();

export default AnalyticsCacheManager;
