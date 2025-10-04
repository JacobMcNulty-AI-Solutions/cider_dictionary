# Performance Optimization

## Purpose

Implements comprehensive performance optimization strategies including list virtualization (FlashList), image optimization, memory management, and bundle optimization. Target: 60fps scrolling, <100MB memory usage, <50MB app size.

## Data Structures

### Performance Metrics
```typescript
INTERFACE PerformanceMetrics:
  frameRate: NUMBER // fps
  memoryUsage: {
    current: NUMBER // MB
    peak: NUMBER // MB
    jsHeap: NUMBER // MB
    native: NUMBER // MB
  }
  renderTime: {
    average: NUMBER // ms
    p95: NUMBER // ms
    p99: NUMBER // ms
  }
  listPerformance: {
    blankCells: NUMBER
    scrollSpeed: NUMBER // items/second
    frameDrops: NUMBER
  }
```

### Image Cache Entry
```typescript
INTERFACE ImageCacheEntry:
  uri: STRING
  optimizedUri: STRING
  size: NUMBER // bytes
  width: NUMBER
  height: NUMBER
  timestamp: TIMESTAMP
  accessCount: NUMBER
  lastAccessed: TIMESTAMP
```

### Memory Pool
```typescript
INTERFACE MemoryPool:
  allocated: NUMBER // bytes
  limit: NUMBER // bytes
  entries: MAP<STRING, WeakRef<Object>>
  evictionQueue: PriorityQueue<STRING>
```

## Core Algorithms

### 1. FlashList Optimization

```
ALGORITHM: OptimizedListConfiguration
INPUT: data (ARRAY), estimatedItemSize (NUMBER)
OUTPUT: flashListConfig (Object)

BEGIN
  config ← {
    // Data
    data: data,

    // Performance props
    estimatedItemSize: estimatedItemSize,
    overrideItemLayout: (layout, item, index) => {
      // Override with actual measured sizes
      layout.size ← GetMeasuredItemSize(item, index)
    },

    // Rendering optimizations
    drawDistance: 250, // px ahead/behind viewport
    estimatedListSize: {
      height: ScreenHeight,
      width: ScreenWidth
    },

    // Recycling configuration
    recyclerBufferSize: 2,
    removeClippedSubviews: TRUE,

    // Batch rendering
    maxToRenderPerBatch: 10,
    windowSize: 10,
    initialNumToRender: 8,
    updateCellsBatchingPeriod: 50, // ms

    // Item type optimization
    getItemType: (item, index) => {
      // Group similar items for better recycling
      RETURN DetermineItemType(item)
    },

    // Key extraction
    keyExtractor: (item, index) => item.id,

    // Performance callbacks
    onLoad: (info) => {
      LogPerformance('List loaded', info)
    },

    onBlankArea: (blankAreaInfo) => {
      // Track blank areas (indicates performance issues)
      TrackBlankAreas(blankAreaInfo)
    }
  }

  RETURN config
END

SUBROUTINE: DetermineItemType
INPUT: item (Object)
OUTPUT: itemType (STRING)

BEGIN
  // Return consistent type for similar items
  // This enables better cell recycling

  hasImage ← item.photo != NULL
  hasNotes ← item.notes != NULL AND item.notes.length > 0
  hasDetailedRatings ← item.detailedRatings != NULL

  // Create type signature
  typeSignature ← [
    hasImage ? '1' : '0',
    hasNotes ? '1' : '0',
    hasDetailedRatings ? '1' : '0'
  ].join('')

  RETURN 'item_' + typeSignature
END

ALGORITHM: MemoizedRenderItem
INPUT: item (Object), index (NUMBER)
OUTPUT: component (ReactComponent)

BEGIN
  // Use React.memo to prevent unnecessary re-renders
  // Component only re-renders if item or index changes

  MemoizedCiderCard ← React.memo(
    ({cider, index}) => {
      // Optimize image loading
      imageUri ← useOptimizedImage(cider.photo, {
        width: 150,
        height: 150,
        quality: 0.8
      })

      // Lazy load complex components
      detailedRatings ← useLazyComponent(
        () => <DetailedRatingsView ratings={cider.detailedRatings} />,
        [cider.detailedRatings]
      )

      RETURN (
        <Card>
          <FastImage
            source={{uri: imageUri}}
            style={styles.image}
            resizeMode="cover"
          />
          <Text>{cider.name}</Text>
          <Rating value={cider.overallRating} />
          {detailedRatings}
        </Card>
      )
    },
    // Custom comparison function
    (prevProps, nextProps) => {
      RETURN (
        prevProps.cider.id == nextProps.cider.id AND
        prevProps.cider.updatedAt == nextProps.cider.updatedAt AND
        prevProps.index == nextProps.index
      )
    }
  )

  RETURN <MemoizedCiderCard cider={item} index={index} />
END
```

### 2. Image Optimization

```
ALGORITHM: OptimizeImage
INPUT: uri (STRING), options (Object)
OUTPUT: optimizedUri (STRING)

TIME COMPLEXITY: O(1) if cached, O(w * h) for resize
SPACE COMPLEXITY: O(w * h) for image buffer

BEGIN
  // Check cache first
  cacheKey ← GenerateImageCacheKey(uri, options)
  cached ← GetFromImageCache(cacheKey)

  IF cached != NULL THEN
    UpdateCacheAccess(cacheKey)
    RETURN cached.optimizedUri
  END IF

  // Optimize image
  optimized ← AWAIT ResizeImage(uri, {
    maxWidth: options.width || 1920,
    maxHeight: options.height || 1080,
    quality: options.quality || 0.8,
    format: 'JPEG',
    mode: 'contain'
  })

  // Save to cache
  cacheEntry ← {
    uri: uri,
    optimizedUri: optimized.uri,
    size: optimized.size,
    width: optimized.width,
    height: optimized.height,
    timestamp: CurrentTimestamp(),
    accessCount: 1,
    lastAccessed: CurrentTimestamp()
  }

  AddToImageCache(cacheKey, cacheEntry)

  RETURN optimized.uri
END

ALGORITHM: ImageCacheManager
OUTPUT: manager (Object)

BEGIN
  STATIC cache ← NEW MAP<STRING, ImageCacheEntry>()
  STATIC maxCacheSize ← 100 * 1024 * 1024 // 100MB
  STATIC currentCacheSize ← 0

  manager ← {
    get: (key) => {
      IF cache.has(key) THEN
        entry ← cache.get(key)
        entry.accessCount += 1
        entry.lastAccessed ← CurrentTimestamp()
        RETURN entry
      END IF
      RETURN NULL
    },

    set: (key, entry) => {
      // Check if adding would exceed limit
      IF currentCacheSize + entry.size > maxCacheSize THEN
        EvictLRUImages(entry.size)
      END IF

      cache.set(key, entry)
      currentCacheSize += entry.size
    },

    clear: () => {
      cache.clear()
      currentCacheSize ← 0
    },

    getStats: () => {
      RETURN {
        entryCount: cache.size,
        totalSize: currentCacheSize,
        maxSize: maxCacheSize,
        utilizationPercent: (currentCacheSize / maxCacheSize) * 100
      }
    }
  }

  RETURN manager
END

SUBROUTINE: EvictLRUImages
INPUT: sizeNeeded (NUMBER)
OUTPUT: void

BEGIN
  // Sort cache entries by last accessed (LRU)
  entries ← Array.from(cache.entries())
    .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)

  freedSpace ← 0

  FOR EACH [key, entry] IN entries DO
    IF freedSpace >= sizeNeeded THEN
      BREAK
    END IF

    // Delete cached file
    DeleteFile(entry.optimizedUri)

    // Remove from cache
    cache.delete(key)
    currentCacheSize -= entry.size
    freedSpace += entry.size

    Log('Evicted image from cache:', key, entry.size)
  END FOR

  Log('Freed ' + freedSpace + ' bytes from image cache')
END

ALGORITHM: LazyImageLoader
INPUT: uri (STRING), options (Object)
OUTPUT: component (ReactComponent)

BEGIN
  // Only load images when visible in viewport
  // Use IntersectionObserver or react-native-viewport

  [isVisible, setIsVisible] ← useState(FALSE)
  [imageUri, setImageUri] ← useState(NULL)

  useEffect(() => {
    IF isVisible AND imageUri == NULL THEN
      OptimizeImage(uri, options).then(optimizedUri => {
        setImageUri(optimizedUri)
      })
    END IF
  }, [isVisible, uri])

  RETURN (
    <ViewportAware onEnterViewport={() => setIsVisible(TRUE)}>
      {imageUri ? (
        <FastImage
          source={{uri: imageUri}}
          style={options.style}
          resizeMode={options.resizeMode || 'cover'}
        />
      ) : (
        <Placeholder width={options.width} height={options.height} />
      )}
    </ViewportAware>
  )
END
```

### 3. Memory Management

```
ALGORITHM: MemoryManager
OUTPUT: manager (Object)

BEGIN
  STATIC allocatedMemory ← 0
  STATIC memoryLimit ← 150 * 1024 * 1024 // 150MB
  STATIC weakRefPool ← NEW MAP<STRING, WeakRef>()
  STATIC cleanupCallbacks ← []

  manager ← {
    allocate: (key, object, size) => {
      IF allocatedMemory + size > memoryLimit THEN
        TriggerGarbageCollection()
        CleanupUnusedReferences()

        IF allocatedMemory + size > memoryLimit THEN
          THROW MemoryError('Memory limit exceeded')
        END IF
      END IF

      weakRefPool.set(key, NEW WeakRef(object))
      allocatedMemory += size

      RETURN TRUE
    },

    get: (key) => {
      IF weakRefPool.has(key) THEN
        ref ← weakRefPool.get(key)
        obj ← ref.deref()

        IF obj != NULL THEN
          RETURN obj
        ELSE
          // Object was garbage collected
          weakRefPool.delete(key)
        END IF
      END IF

      RETURN NULL
    },

    registerCleanup: (callback) => {
      cleanupCallbacks.push(callback)
    },

    cleanup: () => {
      FOR EACH callback IN cleanupCallbacks DO
        TRY
          callback()
        CATCH error
          Log('Cleanup error:', error)
        END TRY
      END FOR

      cleanupCallbacks ← []
    },

    getMemoryUsage: () => {
      RETURN {
        allocated: allocatedMemory,
        limit: memoryLimit,
        percentUsed: (allocatedMemory / memoryLimit) * 100,
        weakRefCount: weakRefPool.size
      }
    }
  }

  RETURN manager
END

ALGORITHM: TriggerGarbageCollection
OUTPUT: void

BEGIN
  // React Native doesn't expose explicit GC
  // But we can hint by clearing large data structures

  // Clear expired cache entries
  ImageCacheManager.clear()

  // Clear old analytics cache
  InvalidateCache('all')

  // Null out large temporary objects
  FOR EACH [key, ref] IN weakRefPool DO
    obj ← ref.deref()
    IF obj == NULL THEN
      weakRefPool.delete(key)
    END IF
  END FOR

  // Request GC (if available)
  IF global.gc != NULL THEN
    global.gc()
  END IF

  Log('Garbage collection triggered')
END

ALGORITHM: useMemoryMonitor
OUTPUT: memoryStats (Object)

BEGIN
  [stats, setStats] ← useState(NULL)

  useEffect(() => {
    // Monitor memory every 5 seconds
    interval ← setInterval(() => {
      IF PerformanceAPI.available THEN
        memoryInfo ← PerformanceAPI.memory()

        setStats({
          jsHeapSize: memoryInfo.usedJSHeapSize / (1024 * 1024), // MB
          totalHeapSize: memoryInfo.totalJSHeapSize / (1024 * 1024),
          heapLimit: memoryInfo.jsHeapSizeLimit / (1024 * 1024)
        })

        // Warn if memory usage high
        IF memoryInfo.usedJSHeapSize > (memoryLimit * 0.8) THEN
          LogWarning('High memory usage detected')
          TriggerGarbageCollection()
        END IF
      END IF
    }, 5000)

    RETURN () => clearInterval(interval)
  }, [])

  RETURN stats
END
```

### 4. Component Optimization

```
ALGORITHM: OptimizedComponent
INPUT: component (ReactComponent)
OUTPUT: optimizedComponent (ReactComponent)

BEGIN
  // Apply multiple optimization techniques

  optimized ← component

  // 1. Memoization
  optimized ← React.memo(optimized, (prev, next) => {
    // Custom shallow comparison
    RETURN ShallowEqual(prev, next)
  })

  // 2. Use callbacks
  optimized ← WithOptimizedCallbacks(optimized)

  // 3. Lazy loading
  optimized ← WithLazyLoading(optimized)

  // 4. Virtualization
  optimized ← WithVirtualization(optimized)

  RETURN optimized
END

SUBROUTINE: WithOptimizedCallbacks
INPUT: Component (ReactComponent)
OUTPUT: OptimizedComponent (ReactComponent)

BEGIN
  RETURN (props) => {
    // Memoize callbacks to prevent re-renders
    handlePress ← useCallback((item) => {
      props.onPress(item)
    }, [props.onPress])

    handleLongPress ← useCallback((item) => {
      props.onLongPress(item)
    }, [props.onLongPress])

    // Memoize computed values
    sortedData ← useMemo(() => {
      RETURN props.data.sort(props.sortComparator)
    }, [props.data, props.sortComparator])

    RETURN (
      <Component
        {...props}
        data={sortedData}
        onPress={handlePress}
        onLongPress={handleLongPress}
      />
    )
  }
END

ALGORITHM: BatchStateUpdates
INPUT: updates (ARRAY<Function>)
OUTPUT: void

BEGIN
  // React 18 automatic batching
  // But we can be explicit for complex updates

  ReactNative.unstable_batchedUpdates(() => {
    FOR EACH update IN updates DO
      update()
    END FOR
  })
END
```

### 5. Bundle Optimization

```
ALGORITHM: CodeSplitting
OUTPUT: optimizedBundle (Object)

BEGIN
  // Dynamic imports for lazy loading
  analyticsModule ← NULL
  exportModule ← NULL
  chartsModule ← NULL

  optimizedBundle ← {
    loadAnalytics: async () => {
      IF analyticsModule == NULL THEN
        analyticsModule ← AWAIT import('./analytics')
      END IF
      RETURN analyticsModule
    },

    loadExport: async () => {
      IF exportModule == NULL THEN
        exportModule ← AWAIT import('./export')
      END IF
      RETURN exportModule
    },

    loadCharts: async () => {
      IF chartsModule == NULL THEN
        chartsModule ← AWAIT import('./charts')
      END IF
      RETURN chartsModule
    }
  }

  RETURN optimizedBundle
END

ALGORITHM: TreeShaking
OUTPUT: configuration (Object)

BEGIN
  // Metro bundler configuration for tree shaking

  config ← {
    transformer: {
      getTransformOptions: async () => ({
        transform: {
          experimentalImportSupport: FALSE,
          inlineRequires: TRUE, // Inline requires for better tree shaking
        },
      }),
    },

    resolver: {
      // Resolve only used modules
      blacklistRE: /node_modules\/.*\/test\/.*/,
    },

    minifierPath: 'metro-minify-terser',
    minifierConfig: {
      compress: {
        drop_console: TRUE, // Remove console.log in production
        drop_debugger: TRUE,
        pure_funcs: ['console.log', 'console.debug'], // Remove specific functions
      },
      mangle: {
        keep_fnames: FALSE, // Mangle function names
      },
      output: {
        comments: FALSE, // Remove comments
      },
    },
  }

  RETURN config
END
```

### 6. Performance Monitoring

```
ALGORITHM: PerformanceMonitor
OUTPUT: monitor (Object)

BEGIN
  STATIC metrics ← {
    frameRate: [],
    renderTimes: [],
    memorySnapshots: [],
    slowOperations: []
  }

  monitor ← {
    startMeasure: (label) => {
      RETURN {
        label: label,
        startTime: Performance.now(),
        startMemory: GetMemoryUsage()
      }
    },

    endMeasure: (measurement) => {
      endTime ← Performance.now()
      endMemory ← GetMemoryUsage()

      duration ← endTime - measurement.startTime
      memoryDelta ← endMemory - measurement.startMemory

      // Log slow operations
      IF duration > 100 THEN // 100ms threshold
        metrics.slowOperations.push({
          label: measurement.label,
          duration: duration,
          memoryDelta: memoryDelta,
          timestamp: CurrentTimestamp()
        })

        LogWarning('Slow operation detected: ' + measurement.label +
                   ' took ' + duration + 'ms')
      END IF

      RETURN {duration, memoryDelta}
    },

    trackFrameRate: () => {
      // Monitor frame rate using requestAnimationFrame
      lastFrameTime ← Performance.now()
      frameCount ← 0

      measureFrame ← () => {
        currentTime ← Performance.now()
        frameCount += 1

        IF currentTime - lastFrameTime >= 1000 THEN
          fps ← frameCount
          metrics.frameRate.push({
            fps: fps,
            timestamp: CurrentTimestamp()
          })

          // Warn if FPS drops below 50
          IF fps < 50 THEN
            LogWarning('Low frame rate detected: ' + fps + ' fps')
          END IF

          frameCount ← 0
          lastFrameTime ← currentTime
        END IF

        requestAnimationFrame(measureFrame)
      }

      requestAnimationFrame(measureFrame)
    },

    getMetrics: () => {
      RETURN {
        averageFPS: Mean(metrics.frameRate.map(m => m.fps)),
        averageRenderTime: Mean(metrics.renderTimes),
        peakMemory: Max(metrics.memorySnapshots),
        slowOperations: metrics.slowOperations.slice(-10) // Last 10
      }
    },

    reset: () => {
      metrics ← {
        frameRate: [],
        renderTimes: [],
        memorySnapshots: [],
        slowOperations: []
      }
    }
  }

  RETURN monitor
END
```

## Performance Targets

### Response Times
- List scroll: 60fps (16.67ms per frame)
- Image load: < 100ms per image
- Search results: < 100ms
- Analytics calculation: < 300ms
- Export generation: < 2s

### Memory Limits
- Baseline: < 50MB
- Normal operation: < 100MB
- Peak (heavy operations): < 150MB
- Image cache: < 100MB

### Bundle Size
- Total app: < 50MB
- JavaScript bundle: < 5MB
- Assets: < 20MB

## Edge Cases

1. **Memory pressure**: Trigger GC, clear caches
2. **Slow device**: Reduce batch sizes, disable animations
3. **Large images**: Compress more aggressively
4. **Thousands of items**: Virtualize, paginate
5. **Low storage**: Clear cache more frequently

## Testing Approach

```
PERFORMANCE TESTS:
- FlashList with 1000 items: 60fps
- Scroll speed test: No blank cells
- Memory leak detection: No growth over time
- Image cache: LRU eviction works
- Bundle size: < 50MB

PROFILING:
- React DevTools Profiler
- Flamegraph analysis
- Memory snapshots
- Network waterfall
```

---

**Key Optimizations**:
- FlashList for 60fps scrolling
- LRU image cache with 100MB limit
- Memoization prevents re-renders
- Code splitting reduces initial bundle
- Memory monitoring prevents leaks
