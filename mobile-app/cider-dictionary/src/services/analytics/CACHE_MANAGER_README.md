# Analytics Cache Manager

A comprehensive multi-level caching system for analytics data that improves performance through intelligent caching, TTL-based expiration, dependency tracking, and LRU eviction.

## Features

### 1. Multi-Level Caching
- **Memory Cache (Map)**: Ultra-fast in-memory storage for immediate access
- **AsyncStorage**: Persistent storage that survives app restarts
- **Automatic Promotion**: AsyncStorage entries are promoted to memory on access

### 2. TTL-Based Expiration
- Configurable time-to-live for each cache entry
- Default TTL: 5 minutes
- Automatic cleanup of expired entries
- Prevents stale data from being served

### 3. Dependency-Based Invalidation
- Track dependencies for each cache entry
- Invalidate all related caches when dependencies change
- Maintains data consistency across the application

### 4. LRU Eviction Strategy
- Maximum cache size: 100 entries
- Least Recently Used (LRU) eviction when cache is full
- Tracks access times for intelligent eviction decisions

### 5. Performance Monitoring
- Real-time statistics tracking
- Hit rate, miss rate, and eviction metrics
- Cache size monitoring
- Performance debugging utilities

## Installation

The cache manager is a singleton and is already included in the project:

```typescript
import { cacheManager } from './services/analytics/AnalyticsCacheManager';
```

## Basic Usage

### Storing Data

```typescript
// Basic storage with default TTL (5 minutes)
await cacheManager.set('analytics:summary:3M', summaryData);

// Storage with custom TTL
await cacheManager.set('analytics:summary:3M', summaryData, {
  ttl: 10 * 60 * 1000, // 10 minutes
});

// Storage with dependencies
await cacheManager.set('analytics:summary:3M', summaryData, {
  ttl: 5 * 60 * 1000,
  dependencies: ['ciders', 'experiences'], // Invalidate when these change
});
```

### Retrieving Data

```typescript
// Type-safe retrieval
const data = await cacheManager.get<AnalyticsData>('analytics:summary:3M');

if (data) {
  console.log('Cache hit!', data);
} else {
  console.log('Cache miss, need to compute');
  // Compute and cache the data
}
```

### Invalidation

```typescript
// Invalidate all caches that depend on 'ciders'
await cacheManager.invalidate('ciders');

// This will remove:
// - 'analytics:summary:3M' (if it depends on 'ciders')
// - 'analytics:trends:1Y' (if it depends on 'ciders')
// - Any other cache with 'ciders' in its dependencies
```

## Advanced Usage

### Performance Monitoring

```typescript
// Get cache statistics
const stats = cacheManager.getStats();
console.log('Cache Statistics:', {
  hits: stats.hits,
  misses: stats.misses,
  evictions: stats.evictions,
  size: stats.size,
});

// Calculate hit rate
const hitRate = cacheManager.getHitRate();
console.log(`Cache hit rate: ${hitRate.toFixed(2)}%`);
```

### Cache Inspection

```typescript
// Check if a key exists
const exists = await cacheManager.has('analytics:summary:3M');

// Get detailed entry information
const info = await cacheManager.getEntryInfo('analytics:summary:3M');
console.log('Entry Info:', {
  exists: info?.exists,
  expired: info?.expired,
  age: info?.age, // milliseconds since creation
  ttl: info?.ttl,
  dependencies: info?.dependencies,
});

// Get all cache keys
const keys = cacheManager.getKeys();
console.log('Cached keys:', keys);
```

### Manual Cache Management

```typescript
// Remove a specific entry
await cacheManager.remove('analytics:summary:3M');

// Clear all caches
await cacheManager.clear();
```

## Integration Examples

### With Analytics Service

```typescript
class AdvancedAnalyticsService {
  async getAnalyticsSummary(timeRange: TimeRange): Promise<AnalyticsData> {
    const cacheKey = `analytics:summary:${timeRange}`;

    // Try cache first
    const cached = await cacheManager.get<AnalyticsData>(cacheKey);
    if (cached) {
      return cached;
    }

    // Compute if not cached
    const data = await this.computeAnalytics(timeRange);

    // Store in cache
    await cacheManager.set(cacheKey, data, {
      ttl: 5 * 60 * 1000,
      dependencies: ['ciders', 'experiences'],
    });

    return data;
  }
}
```

### When Data Changes

```typescript
// When ciders are added/updated/deleted
async function onCidersChanged() {
  // Invalidate all analytics that depend on ciders
  await cacheManager.invalidate('ciders');
}

// When experiences are added/updated/deleted
async function onExperiencesChanged() {
  // Invalidate all analytics that depend on experiences
  await cacheManager.invalidate('experiences');
}
```

### Pre-warming Cache

```typescript
// Pre-load common queries on app start
async function prewarmAnalyticsCache() {
  const commonQueries = [
    { timeRange: '3M', groupBy: 'month' },
    { timeRange: '1Y', groupBy: 'month' },
    { timeRange: 'ALL', groupBy: 'year' },
  ];

  await Promise.all(
    commonQueries.map(async ({ timeRange, groupBy }) => {
      const cacheKey = `analytics:${timeRange}:${groupBy}`;
      const exists = await cacheManager.has(cacheKey);

      if (!exists) {
        const data = await computeAnalytics(timeRange, groupBy);
        await cacheManager.set(cacheKey, data, {
          ttl: 10 * 60 * 1000, // Longer TTL for pre-warmed data
          dependencies: ['ciders', 'experiences'],
        });
      }
    })
  );
}
```

## Cache Key Naming Conventions

Use consistent naming patterns for cache keys:

```typescript
// Format: <category>:<subcategory>:<parameters>
'analytics:summary:3M'
'analytics:trends:1Y:month'
'analytics:distributions:ALL'
'analytics:statistics'

// For entity-specific caches
'cider:<ciderId>:details'
'experience:<experienceId>:data'
```

## Performance Considerations

### Memory Usage
- Maximum 100 entries in memory cache
- LRU eviction prevents unbounded growth
- AsyncStorage provides overflow capacity

### Speed
- Memory cache: < 1ms access time
- AsyncStorage: ~10-50ms access time
- Automatic promotion of frequently accessed data to memory

### Storage Fallback
- Gracefully handles AsyncStorage failures
- Continues with memory-only cache if storage unavailable
- Logs errors without crashing the app

## Best Practices

### 1. Use Appropriate TTLs

```typescript
// Short TTL for frequently changing data
{ ttl: 1 * 60 * 1000 } // 1 minute

// Medium TTL for standard analytics
{ ttl: 5 * 60 * 1000 } // 5 minutes (default)

// Long TTL for stable historical data
{ ttl: 30 * 60 * 1000 } // 30 minutes
```

### 2. Set Dependencies Correctly

```typescript
// Analytics depending on ciders
await cacheManager.set('analytics:summary', data, {
  dependencies: ['ciders'],
});

// Analytics depending on multiple sources
await cacheManager.set('analytics:complete', data, {
  dependencies: ['ciders', 'experiences', 'ratings'],
});
```

### 3. Monitor Performance

```typescript
// Periodically check cache performance
setInterval(() => {
  const hitRate = cacheManager.getHitRate();

  if (hitRate < 50) {
    console.warn('Cache hit rate is low:', hitRate);
    // Consider increasing TTL or cache size
  }
}, 60000); // Check every minute
```

### 4. Clear Caches Appropriately

```typescript
// On logout
await cacheManager.clear();

// On major data import
await cacheManager.invalidate('ciders');
await cacheManager.invalidate('experiences');

// On app reset
await cacheManager.clear();
```

## Error Handling

The cache manager handles errors gracefully:

- **AsyncStorage failures**: Falls back to memory-only cache
- **Quota exceeded**: Switches to memory-only mode automatically
- **Corrupted data**: Returns null, logs error, continues
- **Invalid operations**: Logs warning, doesn't throw

All errors are logged to the console with the prefix `[AnalyticsCacheManager]`.

## Testing

The cache manager includes comprehensive tests:

```bash
npm test -- AnalyticsCacheManager.test.ts
```

Test coverage includes:
- Basic get/set operations
- TTL expiration
- Dependency invalidation
- LRU eviction
- Statistics tracking
- AsyncStorage fallback
- Error handling
- Edge cases

## Debugging

### Enable Detailed Logging

The cache manager logs important events:

```
[AnalyticsCacheManager] Evicted oldest entry: analytics:old-key (total evictions: 5)
[AnalyticsCacheManager] Invalidated 3 entries for dependency: ciders
[AnalyticsCacheManager] Cache cleared
```

### Inspect Cache State

```typescript
// View all cached keys
console.log('Cached keys:', cacheManager.getKeys());

// Check specific entry
const info = await cacheManager.getEntryInfo('analytics:summary:3M');
console.log('Entry details:', info);

// View statistics
const stats = cacheManager.getStats();
console.log('Cache stats:', stats);
```

## Architecture

```
AnalyticsCacheManager (Singleton)
├── Memory Cache (Map<string, InternalCacheEntry>)
│   ├── Fast access (<1ms)
│   ├── Limited size (100 entries)
│   └── LRU eviction
│
├── AsyncStorage Cache
│   ├── Persistent storage
│   ├── Slower access (~10-50ms)
│   └── Larger capacity
│
├── Statistics Tracker
│   ├── Hits
│   ├── Misses
│   ├── Evictions
│   └── Size
│
└── Dependency Manager
    ├── Tracks dependencies
    └── Cascading invalidation
```

## Future Enhancements

Potential improvements for future versions:

1. **Size-based eviction**: Evict based on entry size, not just count
2. **Configurable cache size**: Allow changing MAX_CACHE_SIZE
3. **Cache warming strategies**: Automatic pre-loading of common queries
4. **Compression**: Compress large entries before AsyncStorage
5. **Cache metrics export**: Export statistics for analytics
6. **Smart TTL**: Adjust TTL based on access patterns
7. **Batch operations**: Set/get multiple entries at once

## Support

For questions or issues with the cache manager:

1. Check this README for usage examples
2. Review the example file: `AnalyticsCacheManager.example.ts`
3. Run tests: `npm test -- AnalyticsCacheManager.test.ts`
4. Check console logs for error messages

## License

Part of the Cider Dictionary application.
