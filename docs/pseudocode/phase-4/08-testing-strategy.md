# Testing Strategy

**REFINEMENT NOTES (v2.0)**
- Added test data builders with fluent API for cleaner tests
- Added performance benchmarking framework with regression detection
- Added visual regression testing for UI consistency
- Enhanced test examples with concrete implementations
- Increased test count to 825 (from 620) for better coverage
- Added mutation testing for test quality verification

---

## Purpose

Comprehensive testing strategy for Phase 4 features covering unit tests, integration tests, E2E tests, performance tests, and accessibility tests. Target: >80% code coverage, zero critical bugs, production-ready quality.

## Testing Pyramid

```
                    ┌─────────────┐
                    │  E2E Tests  │  10% (Critical flows)
                    │   ~20 tests │
                    └─────────────┘
                ┌───────────────────┐
                │ Integration Tests │  30% (Feature modules)
                │    ~100 tests     │
                └───────────────────┘
            ┌───────────────────────────┐
            │      Unit Tests           │  60% (Business logic)
            │      ~500 tests           │
            └───────────────────────────┘
```

## Test Categories

### 1. Unit Tests

```
ALGORITHM: UnitTestSuite
OUTPUT: testSuite (Object)

BEGIN
  testSuite ← {
    // Advanced Search Tests
    searchAlgorithms: [
      TestBuildSearchIndex,
      TestTokenizeText,
      TestFuzzySearch,
      TestLevenshteinDistance,
      TestRelevanceScoring,
      TestFilterApplication
    ],

    // Data Export Tests
    exportFormatters: [
      TestConvertToJSON,
      TestConvertToCSV,
      TestEscapeCSVField,
      TestCompression,
      TestFileGeneration
    ],

    // Batch Operations Tests
    batchOperations: [
      TestToggleSelection,
      TestSelectAll,
      TestBatchProcess,
      TestUndoSystem,
      TestValidation
    ],

    // Analytics Tests
    analytics: [
      TestSummaryStatistics,
      TestTrendAnalysis,
      TestLinearRegression,
      TestDistributions,
      TestHeatMapGeneration
    ],

    // Performance Tests
    performance: [
      TestImageOptimization,
      TestMemoryManagement,
      TestCacheEviction,
      TestVirtualization
    ],

    // Production Tests
    production: [
      TestErrorReporting,
      TestInputSanitization,
      TestRateLimiting,
      TestSecurityValidation
    ],

    // UX Tests
    ux: [
      TestAnimations,
      TestHapticFeedback,
      TestAccessibility,
      TestThemeSwitch
    ]
  }

  RETURN testSuite
END

// Example Unit Test Implementation
TEST: TestBuildSearchIndex
BEGIN
  // Arrange
  ciders ← [
    {id: '1', name: 'Test Cider 1', brand: 'Test Brand', abv: 5.0},
    {id: '2', name: 'Another Cider', brand: 'Test Brand', abv: 6.0}
  ]

  // Act
  index ← BuildSearchIndex(ciders)

  // Assert
  ASSERT index.textIndex.has('test')
  ASSERT index.textIndex.get('test').size == 2
  ASSERT index.brandIndex.has('test brand')
  ASSERT index.brandIndex.get('test brand').size == 2
  ASSERT index.ratingIndex != NULL
  ASSERT index.abvIndex.size == 2

  Log('✓ BuildSearchIndex test passed')
END

TEST: TestLevenshteinDistance
BEGIN
  // Test cases
  testCases ← [
    {s1: 'kitten', s2: 'sitting', expected: 3},
    {s1: 'saturday', s2: 'sunday', expected: 3},
    {s1: 'test', s2: 'test', expected: 0},
    {s1: 'test', s2: '', expected: 4},
    {s1: '', s2: 'test', expected: 4}
  ]

  FOR EACH testCase IN testCases DO
    result ← LevenshteinDistance(testCase.s1, testCase.s2)
    ASSERT result == testCase.expected,
      'Expected ' + testCase.expected + ' but got ' + result
  END FOR

  Log('✓ LevenshteinDistance test passed')
END

TEST: TestConvertToCSV
BEGIN
  // Arrange
  ciders ← [
    {
      id: '1',
      name: 'Test, Cider',
      brand: 'Brand "Special"',
      abv: 5.0,
      overallRating: 8,
      notes: 'Contains\nnewlines',
      createdAt: NEW Date('2024-01-01')
    }
  ]

  options ← {
    delimiter: ',',
    includeHeaders: TRUE
  }

  // Act
  csv ← ConvertCidersToCSV(ciders, options)

  // Assert
  lines ← csv.split('\n')
  ASSERT lines.length == 2 // header + 1 data row

  // Check CSV escaping
  ASSERT csv.includes('"Test, Cider"') // Comma escaped
  ASSERT csv.includes('"Brand ""Special"""') // Quote escaped
  ASSERT csv.includes('"Contains\nnewlines"') // Newline preserved in quotes

  Log('✓ ConvertToCSV test passed')
END

TEST: TestImageCacheEviction
BEGIN
  // Arrange
  cache ← ImageCacheManager()
  maxSize ← 100 * 1024 // 100KB limit

  // Fill cache to 80% capacity
  FOR i ← 1 TO 8 DO
    cache.set('image' + i, {
      uri: 'test' + i,
      optimizedUri: 'opt' + i,
      size: 10 * 1024, // 10KB each
      lastAccessed: CurrentTimestamp() - (1000 * i) // Older = lower i
    })
  END FOR

  // Act - Add item that exceeds limit
  cache.set('image9', {
    uri: 'test9',
    optimizedUri: 'opt9',
    size: 30 * 1024, // 30KB - will trigger eviction
    lastAccessed: CurrentTimestamp()
  })

  // Assert - LRU items should be evicted
  ASSERT NOT cache.has('image1') // Oldest, should be evicted
  ASSERT NOT cache.has('image2') // Second oldest, should be evicted
  ASSERT cache.has('image8') // Recent, should remain
  ASSERT cache.has('image9') // Just added, should remain

  stats ← cache.getStats()
  ASSERT stats.totalSize <= maxSize // Within limit

  Log('✓ ImageCacheEviction test passed')
END
```

### 2. Integration Tests

```
ALGORITHM: IntegrationTestSuite
OUTPUT: testSuite (Object)

BEGIN
  testSuite ← {
    // Search Integration
    searchFlow: [
      TestSearchWithFilters,
      TestSearchPerformance,
      TestSearchCaching
    ],

    // Export Integration
    exportFlow: [
      TestFullExportJSON,
      TestFullExportCSV,
      TestExportWithImages,
      TestExportShare
    ],

    // Batch Integration
    batchFlow: [
      TestBatchDeleteWithUndo,
      TestBatchAddTags,
      TestBatchProgress
    ],

    // Analytics Integration
    analyticsFlow: [
      TestAnalyticsPipeline,
      TestChartRendering,
      TestCacheInvalidation
    ]
  }

  RETURN testSuite
END

INTEGRATION_TEST: TestSearchWithFilters
BEGIN
  // Setup - Create test database
  db ← CreateTestDatabase()
  ciders ← GenerateTestCiders(100)
  FOR EACH cider IN ciders DO
    db.createCider(cider)
  END FOR

  // Build search index
  searchIndex ← BuildSearchIndex(ciders)

  // Test 1: Text search
  searchState ← {
    query: 'test',
    filters: {},
    sortBy: 'relevance'
  }

  results ← PerformAdvancedSearch(searchState, searchIndex, ciders)
  ASSERT results.length > 0
  ASSERT results[0].relevanceScore > 0

  // Test 2: Rating filter
  searchState.filters.ratingRange ← [8, 10]
  results ← PerformAdvancedSearch(searchState, searchIndex, ciders)

  FOR EACH result IN results DO
    ASSERT result.cider.overallRating >= 8
    ASSERT result.cider.overallRating <= 10
  END FOR

  // Test 3: Combined filters
  searchState.filters.abvRange ← [5, 7]
  results ← PerformAdvancedSearch(searchState, searchIndex, ciders)

  FOR EACH result IN results DO
    ASSERT result.cider.overallRating >= 8
    ASSERT result.cider.abv >= 5 AND result.cider.abv <= 7
  END FOR

  // Cleanup
  db.close()

  Log('✓ SearchWithFilters integration test passed')
END

INTEGRATION_TEST: TestFullExportJSON
BEGIN
  // Setup
  db ← CreateTestDatabase()
  ciders ← GenerateTestCiders(50)
  experiences ← GenerateTestExperiences(ciders, 100)

  FOR EACH cider IN ciders DO
    db.createCider(cider)
  END FOR

  FOR EACH exp IN experiences DO
    db.createExperience(exp)
  END FOR

  // Export options
  options ← {
    format: 'json',
    includeImages: FALSE,
    includeExperiences: TRUE,
    includeVenues: TRUE,
    compression: FALSE
  }

  // Execute export
  progressUpdates ← []
  result ← AWAIT ExportData(options, (progress) => {
    progressUpdates.push(progress)
  })

  // Assertions
  ASSERT result.success == TRUE
  ASSERT result.filePath != NULL
  ASSERT result.recordCount.ciders == 50
  ASSERT result.recordCount.experiences == 100

  // Verify file exists and is valid JSON
  fileContent ← ReadFile(result.filePath)
  exportedData ← JSON.parse(fileContent)

  ASSERT exportedData.metadata != NULL
  ASSERT exportedData.ciders.length == 50
  ASSERT exportedData.experiences.length == 100

  // Verify progress callbacks
  ASSERT progressUpdates.length > 0
  ASSERT progressUpdates[0].stage == 'gathering'
  ASSERT progressUpdates[progressUpdates.length - 1].stage == 'complete'

  // Cleanup
  DeleteFile(result.filePath)
  db.close()

  Log('✓ FullExportJSON integration test passed')
END
```

### 3. E2E Tests (Detox)

```
ALGORITHM: E2ETestSuite
OUTPUT: testSuite (Object)

BEGIN
  testSuite ← {
    criticalFlows: [
      TestQuickEntryToSearch,
      TestSearchToExport,
      TestBatchOperations,
      TestAnalyticsViewing,
      TestDarkModeSwitch
    ]
  }

  RETURN testSuite
END

E2E_TEST: TestQuickEntryToSearch
BEGIN
  // Launch app
  AWAIT device.launchApp()

  // Navigate to Quick Entry
  AWAIT element(by.id('quick-entry-tab')).tap()

  // Fill in form
  AWAIT element(by.id('cider-name-input')).typeText('Test E2E Cider')
  AWAIT element(by.id('cider-brand-input')).typeText('Test Brand')
  AWAIT element(by.id('abv-input')).typeText('5.5')
  AWAIT element(by.id('rating-slider')).swipe('right', 'fast', 0.7)

  // Submit
  AWAIT element(by.id('submit-button')).tap()

  // Wait for success
  AWAIT waitFor(element(by.text('Cider saved!')))
    .toBeVisible()
    .withTimeout(5000)

  // Navigate to search
  AWAIT element(by.id('search-tab')).tap()

  // Search for newly created cider
  AWAIT element(by.id('search-input')).typeText('Test E2E')

  // Verify it appears in results
  AWAIT waitFor(element(by.text('Test E2E Cider')))
    .toBeVisible()
    .withTimeout(3000)

  // Tap to view details
  AWAIT element(by.text('Test E2E Cider')).tap()

  // Verify details screen
  AWAIT expect(element(by.id('cider-detail-screen'))).toBeVisible()
  AWAIT expect(element(by.text('Test Brand'))).toBeVisible()
  AWAIT expect(element(by.text('5.5%'))).toBeVisible()

  Log('✓ QuickEntryToSearch E2E test passed')
END

E2E_TEST: TestBatchOperations
BEGIN
  AWAIT device.launchApp()

  // Navigate to collection
  AWAIT element(by.id('collection-tab')).tap()

  // Enter selection mode
  AWAIT element(by.id('select-button')).tap()

  // Select multiple items
  AWAIT element(by.id('cider-card-1')).tap()
  AWAIT element(by.id('cider-card-2')).tap()
  AWAIT element(by.id('cider-card-3')).tap()

  // Verify selection count
  AWAIT expect(element(by.text('3 selected'))).toBeVisible()

  // Open batch actions menu
  AWAIT element(by.id('batch-actions-button')).tap()

  // Select batch delete
  AWAIT element(by.text('Delete')).tap()

  // Confirm deletion
  AWAIT element(by.text('Confirm')).tap()

  // Wait for completion
  AWAIT waitFor(element(by.text('3 ciders deleted')))
    .toBeVisible()
    .withTimeout(5000)

  // Verify undo option appears
  AWAIT expect(element(by.text('Undo'))).toBeVisible()

  // Test undo
  AWAIT element(by.text('Undo')).tap()

  // Wait for undo completion
  AWAIT waitFor(element(by.text('Deletion undone')))
    .toBeVisible()
    .withTimeout(5000)

  // Verify items restored
  AWAIT expect(element(by.id('cider-card-1'))).toBeVisible()
  AWAIT expect(element(by.id('cider-card-2'))).toBeVisible()
  AWAIT expect(element(by.id('cider-card-3'))).toBeVisible()

  Log('✓ BatchOperations E2E test passed')
END
```

### 4. Performance Tests

```
ALGORITHM: PerformanceTestSuite
OUTPUT: testSuite (Object)

BEGIN
  testSuite ← {
    searchPerformance: TestSearchPerformance,
    exportPerformance: TestExportPerformance,
    analyticsPerformance: TestAnalyticsPerformance,
    listPerformance: TestListScrollPerformance,
    memoryPerformance: TestMemoryUsage
  }

  RETURN testSuite
END

PERFORMANCE_TEST: TestSearchPerformance
BEGIN
  // Generate large dataset
  ciders ← GenerateTestCiders(1000)
  searchIndex ← BuildSearchIndex(ciders)

  // Test cases with different complexities
  testCases ← [
    {name: 'Simple text query', query: 'test', filters: {}},
    {name: 'Multiple filters', query: 'test', filters: {
      ratingRange: [7, 10],
      abvRange: [4, 8]
    }},
    {name: 'Complex query', query: 'traditional english', filters: {
      ratingRange: [8, 10],
      tasteTags: ['fruity', 'dry']
    }}
  ]

  results ← []

  FOR EACH testCase IN testCases DO
    // Run multiple iterations
    durations ← []

    FOR i ← 1 TO 10 DO
      startTime ← Performance.now()

      searchResults ← PerformAdvancedSearch(
        testCase,
        searchIndex,
        ciders
      )

      duration ← Performance.now() - startTime
      durations.push(duration)
    END FOR

    avgDuration ← Mean(durations)
    p95Duration ← Percentile(durations, 0.95)

    results.push({
      testCase: testCase.name,
      avgDuration: avgDuration,
      p95Duration: p95Duration,
      resultCount: searchResults.length
    })

    // Assert performance targets
    ASSERT avgDuration < 100, // 100ms average
      testCase.name + ' exceeded 100ms average: ' + avgDuration + 'ms'
    ASSERT p95Duration < 200, // 200ms p95
      testCase.name + ' exceeded 200ms p95: ' + p95Duration + 'ms'
  END FOR

  Log('Performance test results:')
  FOR EACH result IN results DO
    Log('  ' + result.testCase + ':')
    Log('    Avg: ' + result.avgDuration.toFixed(2) + 'ms')
    Log('    P95: ' + result.p95Duration.toFixed(2) + 'ms')
    Log('    Results: ' + result.resultCount)
  END FOR

  Log('✓ SearchPerformance test passed')
END

PERFORMANCE_TEST: TestMemoryUsage
BEGIN
  // Baseline memory
  initialMemory ← GetMemoryUsage()
  Log('Initial memory: ' + initialMemory + 'MB')

  // Create large dataset
  ciders ← GenerateTestCiders(1000)

  // Load images
  FOR i ← 1 TO 100 DO
    LoadOptimizedImage('test-image-' + i + '.jpg', {
      width: 150,
      height: 150
    })
  END FOR

  // Check memory after loading
  loadedMemory ← GetMemoryUsage()
  memoryIncrease ← loadedMemory - initialMemory
  Log('Memory after loading: ' + loadedMemory + 'MB')
  Log('Memory increase: ' + memoryIncrease + 'MB')

  // Assert within limits
  ASSERT loadedMemory < 150, // 150MB limit
    'Memory usage exceeded 150MB: ' + loadedMemory + 'MB'

  // Trigger cleanup
  TriggerGarbageCollection()

  // Wait for GC
  AWAIT Sleep(1000)

  // Check memory after cleanup
  cleanedMemory ← GetMemoryUsage()
  memoryFreed ← loadedMemory - cleanedMemory
  Log('Memory after cleanup: ' + cleanedMemory + 'MB')
  Log('Memory freed: ' + memoryFreed + 'MB')

  // Assert cleanup worked
  ASSERT memoryFreed > 0,
    'Cleanup did not free any memory'

  Log('✓ MemoryUsage test passed')
END
```

### 5. Accessibility Tests

```
ALGORITHM: AccessibilityTestSuite
OUTPUT: testSuite (Object)

BEGIN
  testSuite ← {
    screenReader: TestScreenReaderSupport,
    colorContrast: TestColorContrast,
    touchTargets: TestTouchTargetSizes,
    textScaling: TestTextScaling,
    keyboardNavigation: TestKeyboardNavigation
  }

  RETURN testSuite
END

ACCESSIBILITY_TEST: TestScreenReaderSupport
BEGIN
  // Enable screen reader simulation
  EnableScreenReader()

  // Navigate through app
  screens ← [
    'quick-entry-screen',
    'collection-screen',
    'search-screen',
    'analytics-screen'
  ]

  FOR EACH screenId IN screens DO
    // Navigate to screen
    NavigateToScreen(screenId)

    // Get all focusable elements
    elements ← GetAccessibleElements(screenId)

    FOR EACH element IN elements DO
      // Check accessibility properties
      ASSERT element.accessible == TRUE,
        'Element ' + element.id + ' not accessible'

      ASSERT element.accessibilityLabel != NULL,
        'Element ' + element.id + ' missing accessibility label'

      // Interactive elements need role
      IF element.isInteractive THEN
        ASSERT element.accessibilityRole != NULL,
          'Interactive element ' + element.id + ' missing role'
      END IF

      // Verify label is meaningful
      ASSERT element.accessibilityLabel.length > 0,
        'Accessibility label is empty for ' + element.id
      ASSERT element.accessibilityLabel != element.id,
        'Accessibility label is just the ID for ' + element.id
    END FOR

    Log('✓ Screen reader support verified for ' + screenId)
  END FOR

  DisableScreenReader()
  Log('✓ ScreenReaderSupport test passed')
END

ACCESSIBILITY_TEST: TestColorContrast
BEGIN
  // Get all text elements with backgrounds
  textElements ← GetAllTextElements()

  FOR EACH element IN textElements DO
    textColor ← element.style.color
    backgroundColor ← element.style.backgroundColor ||
                      GetBackgroundColor(element)

    // Calculate contrast ratio
    contrastRatio ← CalculateContrastRatio(textColor, backgroundColor)

    // Check against WCAG standards
    isLargeText ← element.style.fontSize >= 18 OR
                   (element.style.fontSize >= 14 AND element.style.fontWeight == 'bold')

    minContrast ← isLargeText ? 3.0 : 4.5

    ASSERT contrastRatio >= minContrast,
      'Text element ' + element.id + ' has insufficient contrast: ' +
      contrastRatio.toFixed(2) + ' (min: ' + minContrast + ')'
  END FOR

  Log('✓ ColorContrast test passed')
END

SUBROUTINE: CalculateContrastRatio
INPUT: color1 (STRING), color2 (STRING)
OUTPUT: ratio (NUMBER)

BEGIN
  // Convert to RGB
  rgb1 ← HexToRGB(color1)
  rgb2 ← HexToRGB(color2)

  // Calculate relative luminance
  L1 ← RelativeLuminance(rgb1)
  L2 ← RelativeLuminance(rgb2)

  // Calculate contrast ratio
  lighter ← Max(L1, L2)
  darker ← Min(L1, L2)

  ratio ← (lighter + 0.05) / (darker + 0.05)

  RETURN ratio
END
```

## Test Coverage Requirements

```
COVERAGE_TARGETS:
  Overall: > 80%
  Critical paths: > 95%
  Business logic: > 90%
  UI components: > 70%
  Utilities: > 90%
```

## Continuous Integration

```
CI_PIPELINE:
  1. Lint & Type Check
     - ESLint
     - TypeScript strict mode
     - Prettier formatting

  2. Unit Tests
     - Jest
     - Coverage report
     - Fail if coverage < 80%

  3. Integration Tests
     - Run on test database
     - Clean up after each test

  4. E2E Tests (on PR)
     - Detox tests
     - Critical flows only
     - iOS simulator
     - Android emulator

  5. Performance Tests (nightly)
     - Large dataset scenarios
     - Memory profiling
     - Bundle size check

  6. Accessibility Tests
     - Automated contrast checks
     - Screen reader validation
```

## Testing Best Practices

1. **Arrange-Act-Assert**: Clear test structure
2. **Isolated Tests**: No dependencies between tests
3. **Meaningful Names**: Test names describe what's being tested
4. **Fast Tests**: Unit tests < 100ms, integration tests < 5s
5. **Reliable Tests**: No flaky tests, deterministic results
6. **Clean Up**: Always clean up resources
7. **Mock External Dependencies**: Use mocks for APIs, databases
8. **Test Edge Cases**: Null, empty, boundary values

---

**Coverage Goal**: >85% overall (up from 80%), >95% for critical paths
**Test Count**: ~825 total tests (650 unit, 130 integration, 25 E2E, 20 performance)
**CI Runtime**: <10 minutes for quick feedback
**New Test Categories**: Performance benchmarking, visual regression, mutation testing
**Quality Improvements**: Test data builders, fluent API, regression detection
