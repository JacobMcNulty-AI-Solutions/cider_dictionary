/**
 * Usage Examples for AnalyticsCacheManager
 *
 * This file demonstrates common usage patterns for the analytics cache manager.
 * These examples show how to integrate caching into your analytics service.
 *
 * @module AnalyticsCacheManager.example
 */

import { cacheManager } from './AnalyticsCacheManager';
import type { AdvancedAnalyticsData, TimeRange, GroupBy } from '../../types/analytics';

// ============================================================================
// Example 1: Basic Cache Usage
// ============================================================================

/**
 * Example: Caching analytics summary data
 */
async function getAnalyticsSummaryWithCache(timeRange: TimeRange): Promise<AdvancedAnalyticsData | null> {
  const cacheKey = `analytics:summary:${timeRange}`;

  // Try to get from cache first
  const cached = await cacheManager.get<AdvancedAnalyticsData>(cacheKey);
  if (cached) {
    console.log('Cache hit! Using cached analytics data');
    return cached;
  }

  console.log('Cache miss! Computing analytics...');

  // Compute analytics (expensive operation)
  const analyticsData = await computeAdvancedAnalytics(timeRange);

  // Store in cache with 5-minute TTL and dependencies
  await cacheManager.set(cacheKey, analyticsData, {
    ttl: 5 * 60 * 1000, // 5 minutes
    dependencies: ['ciders', 'experiences'], // Invalidate when these change
  });

  return analyticsData;
}

// ============================================================================
// Example 2: Dependency-Based Invalidation
// ============================================================================

/**
 * Example: Invalidate all analytics caches when ciders are modified
 */
async function onCidersUpdated(): Promise<void> {
  console.log('Ciders updated, invalidating related caches...');

  // This will remove all cache entries that depend on 'ciders'
  await cacheManager.invalidate('ciders');

  // You can also invalidate multiple dependencies
  await cacheManager.invalidate('experiences');

  console.log('Cache invalidation complete');
}

/**
 * Example: Selective invalidation when a specific cider is updated
 */
async function onCiderModified(ciderId: string): Promise<void> {
  // Invalidate caches that depend on this specific cider
  await cacheManager.invalidate(`cider:${ciderId}`);

  // Also invalidate general cider statistics
  await cacheManager.invalidate('ciders');
}

// ============================================================================
// Example 3: Custom TTL for Different Data Types
// ============================================================================

/**
 * Example: Use different TTLs based on data freshness requirements
 */
async function cacheAnalyticsWithCustomTTL(): Promise<void> {
  // Short TTL (1 minute) for frequently changing data
  await cacheManager.set('analytics:live:trends', { /* data */ }, {
    ttl: 1 * 60 * 1000, // 1 minute
    dependencies: ['ciders', 'experiences'],
  });

  // Medium TTL (5 minutes) for standard analytics
  await cacheManager.set('analytics:summary:3M', { /* data */ }, {
    ttl: 5 * 60 * 1000, // 5 minutes
    dependencies: ['ciders'],
  });

  // Long TTL (30 minutes) for historical/stable data
  await cacheManager.set('analytics:historical:1Y', { /* data */ }, {
    ttl: 30 * 60 * 1000, // 30 minutes
    dependencies: ['ciders'],
  });

  // Very long TTL (24 hours) for rarely changing statistics
  await cacheManager.set('analytics:lifetime:stats', { /* data */ }, {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    dependencies: ['ciders'],
  });
}

// ============================================================================
// Example 4: Cache Statistics and Monitoring
// ============================================================================

/**
 * Example: Monitor cache performance
 */
async function logCachePerformance(): Promise<void> {
  const stats = cacheManager.getStats();
  const hitRate = cacheManager.getHitRate();

  console.log('=== Cache Performance ===');
  console.log(`Hit Rate: ${hitRate.toFixed(2)}%`);
  console.log(`Total Hits: ${stats.hits}`);
  console.log(`Total Misses: ${stats.misses}`);
  console.log(`Total Evictions: ${stats.evictions}`);
  console.log(`Current Size: ${stats.size}/${100}`); // 100 is MAX_CACHE_SIZE
  console.log('========================');

  // Alert if hit rate is too low
  if (hitRate < 50 && stats.hits + stats.misses > 100) {
    console.warn('Cache hit rate is below 50%! Consider increasing cache size or TTL.');
  }

  // Alert if evictions are high
  if (stats.evictions > 50) {
    console.warn('High number of evictions! Consider increasing MAX_CACHE_SIZE.');
  }
}

/**
 * Example: Check if specific data is cached before expensive operation
 */
async function shouldRecomputeAnalytics(cacheKey: string): Promise<boolean> {
  const exists = await cacheManager.has(cacheKey);

  if (exists) {
    const info = await cacheManager.getEntryInfo(cacheKey);
    console.log(`Cache entry info for ${cacheKey}:`, info);

    // Don't recompute if cache is fresh
    return false;
  }

  // Recompute if not cached
  return true;
}

// ============================================================================
// Example 5: Integration with Analytics Service
// ============================================================================

/**
 * Example: Complete analytics service method with caching
 */
async function getAdvancedAnalytics(
  timeRange: TimeRange,
  groupBy: GroupBy,
  forceRefresh = false
): Promise<AdvancedAnalyticsData> {
  const cacheKey = `analytics:advanced:${timeRange}:${groupBy}`;

  // Check cache unless force refresh is requested
  if (!forceRefresh) {
    const cached = await cacheManager.get<AdvancedAnalyticsData>(cacheKey);
    if (cached) {
      console.log('[Analytics] Using cached data');
      return cached;
    }
  }

  // Compute analytics
  console.log('[Analytics] Computing fresh analytics...');
  const startTime = Date.now();

  const analyticsData = await computeAdvancedAnalytics(timeRange, groupBy);

  const computationTime = Date.now() - startTime;
  console.log(`[Analytics] Computation took ${computationTime}ms`);

  // Cache the result
  await cacheManager.set(cacheKey, analyticsData, {
    ttl: 5 * 60 * 1000, // 5 minutes
    dependencies: ['ciders', 'experiences', `timeRange:${timeRange}`],
  });

  return analyticsData;
}

// ============================================================================
// Example 6: Batch Operations and Pre-warming
// ============================================================================

/**
 * Example: Pre-warm cache with common queries
 */
async function prewarmCache(): Promise<void> {
  console.log('[Cache] Pre-warming cache with common queries...');

  const commonQueries = [
    { timeRange: '3M' as TimeRange, groupBy: 'month' as GroupBy },
    { timeRange: '1Y' as TimeRange, groupBy: 'month' as GroupBy },
    { timeRange: 'ALL' as TimeRange, groupBy: 'year' as GroupBy },
  ];

  // Compute and cache all common queries in parallel
  await Promise.all(
    commonQueries.map(async ({ timeRange, groupBy }) => {
      const cacheKey = `analytics:advanced:${timeRange}:${groupBy}`;
      const exists = await cacheManager.has(cacheKey);

      if (!exists) {
        const data = await computeAdvancedAnalytics(timeRange, groupBy);
        await cacheManager.set(cacheKey, data, {
          ttl: 10 * 60 * 1000, // 10 minutes for pre-warmed data
          dependencies: ['ciders', 'experiences'],
        });
      }
    })
  );

  console.log('[Cache] Pre-warming complete');
}

/**
 * Example: Clear cache on logout or data reset
 */
async function onUserLogout(): Promise<void> {
  console.log('[Cache] Clearing all analytics caches on logout...');
  await cacheManager.clear();
  console.log('[Cache] All caches cleared');
}

// ============================================================================
// Example 7: Debugging and Inspection
// ============================================================================

/**
 * Example: Debug cache state
 */
async function debugCacheState(): Promise<void> {
  console.log('=== Cache Debug Info ===');

  // Get all cache keys
  const keys = cacheManager.getKeys();
  console.log(`Total keys in memory: ${keys.length}`);

  // Inspect each entry
  for (const key of keys) {
    const info = await cacheManager.getEntryInfo(key);
    console.log(`\n${key}:`);
    console.log(`  - Expired: ${info?.expired}`);
    console.log(`  - Age: ${info?.age ? (info.age / 1000).toFixed(1) : 'N/A'}s`);
    console.log(`  - TTL: ${info?.ttl ? (info.ttl / 1000).toFixed(0) : 'N/A'}s`);
    console.log(`  - Dependencies: ${info?.dependencies?.join(', ') || 'None'}`);
  }

  console.log('\n========================');
}

// ============================================================================
// Helper Functions (Mock implementations)
// ============================================================================

/**
 * Mock function to simulate analytics computation
 * Replace with actual implementation
 */
async function computeAdvancedAnalytics(
  timeRange: TimeRange,
  groupBy?: GroupBy
): Promise<AdvancedAnalyticsData> {
  // This would be your actual analytics computation
  // For now, return a mock structure
  return {
    summary: {
      rating: {
        mean: 4.2,
        median: 4.0,
        standardDeviation: 0.8,
        variance: 0.64,
        min: 1.0,
        max: 5.0,
        quartiles: { q1: 3.5, q2: 4.0, q3: 4.5 },
        iqr: 1.0,
      },
      abv: {
        mean: 5.5,
        median: 5.2,
        standardDeviation: 1.2,
        variance: 1.44,
        min: 3.0,
        max: 8.5,
        quartiles: { q1: 4.5, q2: 5.2, q3: 6.2 },
        iqr: 1.7,
      },
      price: {
        mean: 8.99,
        median: 8.50,
        standardDeviation: 2.5,
        variance: 6.25,
        min: 4.99,
        max: 15.99,
        quartiles: { q1: 6.99, q2: 8.50, q3: 10.99 },
        iqr: 4.0,
      },
      outliers: [],
    },
    trends: {
      collectionGrowth: {} as any,
      ratingTrend: {} as any,
      spendingTrend: {} as any,
      abvTrend: {} as any,
    },
    distributions: {} as any,
    computationTime: 150,
  };
}

// ============================================================================
// Export Examples
// ============================================================================

export {
  getAnalyticsSummaryWithCache,
  onCidersUpdated,
  onCiderModified,
  cacheAnalyticsWithCustomTTL,
  logCachePerformance,
  shouldRecomputeAnalytics,
  getAdvancedAnalytics,
  prewarmCache,
  onUserLogout,
  debugCacheState,
};
