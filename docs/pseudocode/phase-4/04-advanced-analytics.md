# Advanced Analytics & Visualizations

## Purpose

Implements comprehensive analytics engine with interactive charts, heat maps, trend analysis, and comparative visualizations. Provides insights into collection patterns, spending habits, venue preferences, and taste profiles with performance-optimized rendering.

## Data Structures

### Analytics Configuration
```typescript
INTERFACE AnalyticsConfig:
  timeRange: ENUM('week', 'month', 'quarter', 'year', 'all')
  dateRange: {
    start: DATE
    end: DATE
  }
  chartType: ENUM('bar', 'line', 'pie', 'scatter', 'heatmap')
  groupBy: ENUM('day', 'week', 'month', 'year')
  metrics: ARRAY<ENUM('count', 'rating', 'abv', 'price', 'spending')>
```

### Chart Data
```typescript
INTERFACE ChartData:
  labels: ARRAY<STRING>
  datasets: ARRAY<{
    label: STRING
    data: ARRAY<NUMBER>
    color: STRING
    metadata: Object
  }>
  min: NUMBER
  max: NUMBER
  average: NUMBER
```

### Analytics Cache Entry
```typescript
INTERFACE AnalyticsCacheEntry:
  key: STRING
  data: ANY
  timestamp: TIMESTAMP
  ttl: NUMBER // milliseconds
  dependencies: ARRAY<STRING> // invalidation keys
```

### Trend Analysis
```typescript
INTERFACE TrendAnalysis:
  direction: ENUM('increasing', 'decreasing', 'stable')
  slope: NUMBER
  confidence: NUMBER // 0-1
  predictions: ARRAY<{
    date: DATE
    value: NUMBER
    confidenceInterval: [NUMBER, NUMBER]
  }>
```

## Core Algorithms

### 1. Analytics Computation Engine

```
ALGORITHM: ComputeAnalytics
INPUT: config (AnalyticsConfig), ciders (ARRAY<CiderMasterRecord>),
       experiences (ARRAY<ExperienceLog>)
OUTPUT: analytics (Object)

TIME COMPLEXITY: O(n + e) where n=ciders, e=experiences
SPACE COMPLEXITY: O(k) where k=unique grouping keys

BEGIN
  // Check cache first
  cacheKey ← GenerateCacheKey(config)
  cached ← GetFromCache(cacheKey)

  IF cached != NULL AND NOT CacheExpired(cached) THEN
    RETURN cached.data
  END IF

  // Filter data by date range
  filteredCiders ← FilterByDateRange(ciders, config.dateRange)
  filteredExperiences ← FilterByDateRange(experiences, config.dateRange)

  analytics ← {
    summary: ComputeSummaryStatistics(filteredCiders, filteredExperiences),
    trends: ComputeTrends(filteredCiders, filteredExperiences, config),
    distributions: ComputeDistributions(filteredCiders, filteredExperiences),
    comparisons: ComputeComparisons(filteredCiders),
    venueAnalytics: ComputeVenueAnalytics(filteredExperiences),
    valueAnalytics: ComputeValueAnalytics(filteredExperiences),
    tasteProfile: ComputeTasteProfile(filteredCiders)
  }

  // Cache result
  SetInCache(cacheKey, analytics, {
    ttl: 5 * 60 * 1000, // 5 minutes
    dependencies: ['ciders', 'experiences']
  })

  RETURN analytics
END

SUBROUTINE: ComputeSummaryStatistics
INPUT: ciders (ARRAY), experiences (ARRAY)
OUTPUT: summary (Object)

TIME COMPLEXITY: O(n + e)

BEGIN
  summary ← {
    totalCiders: ciders.length,
    totalExperiences: experiences.length,
    uniqueVenues: NEW SET(),
    uniqueBrands: NEW SET(),

    // Rating statistics
    averageRating: 0,
    medianRating: 0,
    ratingStdDev: 0,
    highestRated: NULL,
    lowestRated: NULL,

    // ABV statistics
    averageAbv: 0,
    medianAbv: 0,
    abvRange: [NULL, NULL],

    // Spending statistics
    totalSpent: 0,
    averagePrice: 0,
    averagePricePerPint: 0,

    // Temporal statistics
    cidersThisMonth: 0,
    cidersThisYear: 0,
    mostActiveMonth: NULL
  }

  IF ciders.length == 0 THEN
    RETURN summary
  END IF

  // Aggregate ratings
  ratings ← ciders.map(c => c.overallRating).sort((a, b) => a - b)
  summary.averageRating ← Mean(ratings)
  summary.medianRating ← Median(ratings)
  summary.ratingStdDev ← StandardDeviation(ratings)
  summary.highestRated ← ciders.reduce((max, c) =>
    c.overallRating > max.overallRating ? c : max
  )
  summary.lowestRated ← ciders.reduce((min, c) =>
    c.overallRating < min.overallRating ? c : min
  )

  // Aggregate ABV
  abvValues ← ciders.map(c => c.abv).sort((a, b) => a - b)
  summary.averageAbv ← Mean(abvValues)
  summary.medianAbv ← Median(abvValues)
  summary.abvRange ← [abvValues[0], abvValues[abvValues.length - 1]]

  // Unique counts
  FOR EACH cider IN ciders DO
    summary.uniqueBrands.add(cider.brand)
  END FOR

  FOR EACH exp IN experiences DO
    summary.uniqueVenues.add(exp.venue.id)
    summary.totalSpent += exp.price
  END FOR

  // Calculate averages
  IF experiences.length > 0 THEN
    summary.averagePrice ← summary.totalSpent / experiences.length
    pricesPerPint ← experiences.map(e => e.pricePerPint)
    summary.averagePricePerPint ← Mean(pricesPerPint)
  END IF

  // Temporal analysis
  currentMonth ← CurrentDate().getMonth()
  currentYear ← CurrentDate().getFullYear()

  FOR EACH cider IN ciders DO
    ciderDate ← cider.createdAt

    IF ciderDate.getMonth() == currentMonth AND
       ciderDate.getFullYear() == currentYear THEN
      summary.cidersThisMonth += 1
    END IF

    IF ciderDate.getFullYear() == currentYear THEN
      summary.cidersThisYear += 1
    END IF
  END FOR

  // Find most active month
  monthCounts ← GroupByMonth(ciders)
  summary.mostActiveMonth ← Object.entries(monthCounts)
    .reduce((max, [month, count]) => count > max.count ? {month, count} : max,
            {month: NULL, count: 0})

  RETURN summary
END
```

### 2. Trend Analysis

```
ALGORITHM: ComputeTrends
INPUT: ciders (ARRAY), experiences (ARRAY), config (AnalyticsConfig)
OUTPUT: trends (Object)

TIME COMPLEXITY: O(n log n) for sorting
SPACE COMPLEXITY: O(g) where g = number of groups

BEGIN
  trends ← {
    collectionGrowth: NULL,
    ratingTrend: NULL,
    spendingTrend: NULL,
    abvTrend: NULL,
    venueTrend: NULL
  }

  // Group data by time period
  groupedCiders ← GroupByTimePeriod(ciders, config.groupBy)
  groupedExperiences ← GroupByTimePeriod(experiences, config.groupBy)

  // Collection growth trend
  trends.collectionGrowth ← AnalyzeTrend(
    groupedCiders,
    (group) => group.length,
    'Collection Growth'
  )

  // Rating trend
  trends.ratingTrend ← AnalyzeTrend(
    groupedCiders,
    (group) => Mean(group.map(c => c.overallRating)),
    'Average Rating'
  )

  // Spending trend
  IF experiences.length > 0 THEN
    trends.spendingTrend ← AnalyzeTrend(
      groupedExperiences,
      (group) => Sum(group.map(e => e.price)),
      'Total Spending'
    )

    // ABV preference trend
    trends.abvTrend ← AnalyzeTrend(
      groupedCiders,
      (group) => Mean(group.map(c => c.abv)),
      'Average ABV'
    )
  END IF

  RETURN trends
END

SUBROUTINE: AnalyzeTrend
INPUT: groupedData (MAP<STRING, ARRAY>),
       valueExtractor (FUNCTION),
       label (STRING)
OUTPUT: trend (Object)

BEGIN
  dataPoints ← []

  FOR EACH [period, items] IN groupedData DO
    IF items.length > 0 THEN
      value ← valueExtractor(items)
      dataPoints.push({
        period: period,
        value: value,
        count: items.length
      })
    END IF
  END FOR

  // Sort by period
  dataPoints.sort((a, b) => a.period < b.period ? -1 : 1)

  // Calculate linear regression
  regression ← CalculateLinearRegression(dataPoints)

  // Determine trend direction
  direction ← 'stable'
  IF regression.slope > 0.1 THEN
    direction ← 'increasing'
  ELSE IF regression.slope < -0.1 THEN
    direction ← 'decreasing'
  END IF

  // Generate predictions
  predictions ← []
  lastPeriod ← dataPoints[dataPoints.length - 1].period
  FOR i ← 1 TO 3 DO // Predict next 3 periods
    nextPeriod ← AddPeriod(lastPeriod, i)
    predictedValue ← regression.intercept + (regression.slope * (dataPoints.length + i))

    predictions.push({
      period: nextPeriod,
      value: Max(0, predictedValue), // Don't predict negative values
      confidence: Max(0, regression.r2 - (i * 0.1)) // Decrease confidence
    })
  END FOR

  trend ← {
    label: label,
    direction: direction,
    slope: regression.slope,
    confidence: regression.r2,
    dataPoints: dataPoints,
    predictions: predictions,
    chartData: FormatChartData(dataPoints, label)
  }

  RETURN trend
END

SUBROUTINE: CalculateLinearRegression
INPUT: dataPoints (ARRAY<{period, value}>)
OUTPUT: regression (Object)

TIME COMPLEXITY: O(n)

BEGIN
  n ← dataPoints.length

  IF n < 2 THEN
    RETURN {slope: 0, intercept: 0, r2: 0}
  END IF

  // Use x as index, y as value
  sumX ← 0
  sumY ← 0
  sumXY ← 0
  sumX2 ← 0
  sumY2 ← 0

  FOR i ← 0 TO n - 1 DO
    x ← i
    y ← dataPoints[i].value

    sumX += x
    sumY += y
    sumXY += x * y
    sumX2 += x * x
    sumY2 += y * y
  END FOR

  // Calculate slope (m) and intercept (b)
  slope ← (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  intercept ← (sumY - slope * sumX) / n

  // Calculate R² (coefficient of determination)
  meanY ← sumY / n
  ssTotal ← 0
  ssResidual ← 0

  FOR i ← 0 TO n - 1 DO
    y ← dataPoints[i].value
    yPred ← intercept + slope * i

    ssTotal += (y - meanY) * (y - meanY)
    ssResidual += (y - yPred) * (y - yPred)
  END FOR

  r2 ← 1 - (ssResidual / ssTotal)

  RETURN {
    slope: slope,
    intercept: intercept,
    r2: r2
  }
END
```

### 3. Distribution Analysis

```
ALGORITHM: ComputeDistributions
INPUT: ciders (ARRAY), experiences (ARRAY)
OUTPUT: distributions (Object)

TIME COMPLEXITY: O(n)
SPACE COMPLEXITY: O(k) where k = unique values

BEGIN
  distributions ← {
    ratingDistribution: ComputeRatingDistribution(ciders),
    abvDistribution: ComputeAbvDistribution(ciders),
    styleDistribution: ComputeStyleDistribution(ciders),
    brandDistribution: ComputeBrandDistribution(ciders),
    tagDistribution: ComputeTagDistribution(ciders),
    priceDistribution: ComputePriceDistribution(experiences),
    venueTypeDistribution: ComputeVenueTypeDistribution(experiences)
  }

  RETURN distributions
END

SUBROUTINE: ComputeRatingDistribution
INPUT: ciders (ARRAY)
OUTPUT: distribution (ChartData)

BEGIN
  // Initialize bins for ratings 1-10
  bins ← NEW MAP<NUMBER, NUMBER>()
  FOR rating ← 1 TO 10 DO
    bins.set(rating, 0)
  END FOR

  // Count ciders per rating
  FOR EACH cider IN ciders DO
    count ← bins.get(cider.overallRating) || 0
    bins.set(cider.overallRating, count + 1)
  END FOR

  // Format for chart
  chartData ← {
    labels: Array.from(bins.keys()).map(r => r.toString()),
    datasets: [{
      label: 'Number of Ciders',
      data: Array.from(bins.values()),
      color: '#FF6384'
    }],
    min: 0,
    max: Math.max(...bins.values()),
    average: Mean(ciders.map(c => c.overallRating))
  }

  RETURN chartData
END

SUBROUTINE: ComputeAbvDistribution
INPUT: ciders (ARRAY)
OUTPUT: distribution (ChartData)

BEGIN
  // Create bins: 0-3%, 3-5%, 5-7%, 7-9%, 9+%
  bins ← [
    {label: '0-3%', min: 0, max: 3, count: 0},
    {label: '3-5%', min: 3, max: 5, count: 0},
    {label: '5-7%', min: 5, max: 7, count: 0},
    {label: '7-9%', min: 7, max: 9, count: 0},
    {label: '9%+', min: 9, max: Infinity, count: 0}
  ]

  // Categorize ciders
  FOR EACH cider IN ciders DO
    FOR EACH bin IN bins DO
      IF cider.abv >= bin.min AND cider.abv < bin.max THEN
        bin.count += 1
        BREAK
      END IF
    END FOR
  END FOR

  chartData ← {
    labels: bins.map(b => b.label),
    datasets: [{
      label: 'Number of Ciders',
      data: bins.map(b => b.count),
      color: '#36A2EB'
    }],
    min: 0,
    max: Math.max(...bins.map(b => b.count)),
    average: Mean(ciders.map(c => c.abv))
  }

  RETURN chartData
END

SUBROUTINE: ComputeTagDistribution
INPUT: ciders (ARRAY)
OUTPUT: distribution (ChartData)

BEGIN
  tagCounts ← NEW MAP<STRING, NUMBER>()

  // Count tag occurrences
  FOR EACH cider IN ciders DO
    IF cider.tasteTags EXISTS THEN
      FOR EACH tag IN cider.tasteTags DO
        count ← tagCounts.get(tag) || 0
        tagCounts.set(tag, count + 1)
      END FOR
    END IF
  END FOR

  // Sort by count descending, take top 10
  sortedTags ← Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  chartData ← {
    labels: sortedTags.map(([tag, _]) => tag),
    datasets: [{
      label: 'Occurrences',
      data: sortedTags.map(([_, count]) => count),
      color: '#FFCE56'
    }],
    min: 0,
    max: sortedTags.length > 0 ? sortedTags[0][1] : 0
  }

  RETURN chartData
END
```

### 4. Heat Map Generation

```
ALGORITHM: GenerateVenueHeatMap
INPUT: experiences (ARRAY<ExperienceLog>)
OUTPUT: heatMapData (Object)

TIME COMPLEXITY: O(e) where e = experiences
SPACE COMPLEXITY: O(v) where v = unique venues

BEGIN
  // Group experiences by venue with coordinates
  venuePoints ← []

  FOR EACH exp IN experiences DO
    IF exp.venue.location EXISTS THEN
      venuePoints.push({
        latitude: exp.venue.location.latitude,
        longitude: exp.venue.location.longitude,
        weight: 1,
        venueName: exp.venue.name,
        venueType: exp.venue.type
      })
    END IF
  END FOR

  // Cluster nearby points
  clusters ← ClusterPoints(venuePoints, 100) // 100m radius

  heatMapData ← {
    points: clusters,
    bounds: CalculateBounds(venuePoints),
    intensity: CalculateIntensityScale(clusters),
    metadata: {
      totalVenues: clusters.length,
      totalExperiences: experiences.length
    }
  }

  RETURN heatMapData
END

SUBROUTINE: ClusterPoints
INPUT: points (ARRAY), radiusMeters (NUMBER)
OUTPUT: clusters (ARRAY)

TIME COMPLEXITY: O(n²) naive, O(n log n) with spatial index
SPACE COMPLEXITY: O(n)

BEGIN
  clusters ← []
  visited ← NEW SET<NUMBER>()

  FOR i ← 0 TO points.length - 1 DO
    IF visited.has(i) THEN
      CONTINUE
    END IF

    cluster ← {
      latitude: points[i].latitude,
      longitude: points[i].longitude,
      weight: 1,
      venueNames: [points[i].venueName],
      experiences: 1
    }

    visited.add(i)

    // Find nearby points
    FOR j ← i + 1 TO points.length - 1 DO
      IF visited.has(j) THEN
        CONTINUE
      END IF

      distance ← HaversineDistance(
        points[i].latitude, points[i].longitude,
        points[j].latitude, points[j].longitude
      )

      IF distance <= radiusMeters THEN
        // Add to cluster
        cluster.weight += 1
        cluster.experiences += 1
        cluster.venueNames.push(points[j].venueName)
        visited.add(j)

        // Update cluster center (weighted average)
        cluster.latitude ← (cluster.latitude * (cluster.weight - 1) +
                           points[j].latitude) / cluster.weight
        cluster.longitude ← (cluster.longitude * (cluster.weight - 1) +
                            points[j].longitude) / cluster.weight
      END IF
    END FOR

    clusters.push(cluster)
  END FOR

  RETURN clusters
END

SUBROUTINE: HaversineDistance
INPUT: lat1, lon1, lat2, lon2 (NUMBER)
OUTPUT: distanceMeters (NUMBER)

BEGIN
  R ← 6371000 // Earth radius in meters

  φ1 ← lat1 * Math.PI / 180
  φ2 ← lat2 * Math.PI / 180
  Δφ ← (lat2 - lat1) * Math.PI / 180
  Δλ ← (lon2 - lon1) * Math.PI / 180

  a ← Math.sin(Δφ/2) * Math.sin(Δφ/2) +
       Math.cos(φ1) * Math.cos(φ2) *
       Math.sin(Δλ/2) * Math.sin(Δλ/2)

  c ← 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

  distance ← R * c

  RETURN distance
END
```

### 5. Chart Data Formatting

```
ALGORITHM: FormatChartData
INPUT: dataPoints (ARRAY), label (STRING), chartType (STRING)
OUTPUT: chartData (ChartData)

BEGIN
  SWITCH chartType
    CASE 'line':
      RETURN FormatLineChartData(dataPoints, label)

    CASE 'bar':
      RETURN FormatBarChartData(dataPoints, label)

    CASE 'pie':
      RETURN FormatPieChartData(dataPoints, label)

    CASE 'scatter':
      RETURN FormatScatterChartData(dataPoints, label)

    DEFAULT:
      RETURN FormatLineChartData(dataPoints, label)
  END SWITCH
END

SUBROUTINE: FormatLineChartData
INPUT: dataPoints (ARRAY), label (STRING)
OUTPUT: chartData (Object)

BEGIN
  chartData ← {
    labels: dataPoints.map(d => FormatPeriodLabel(d.period)),
    datasets: [{
      label: label,
      data: dataPoints.map(d => d.value),
      color: (opacity = 1) => `rgba(54, 162, 235, ${opacity})`,
      strokeWidth: 2
    }],
    legend: [label]
  }

  RETURN chartData
END
```

### 6. Analytics Caching

```
ALGORITHM: GetFromCache
INPUT: key (STRING)
OUTPUT: cached (AnalyticsCacheEntry | NULL)

BEGIN
  STATIC cache ← NEW MAP<STRING, AnalyticsCacheEntry>()

  IF NOT cache.has(key) THEN
    RETURN NULL
  END IF

  entry ← cache.get(key)

  // Check if expired
  IF CurrentTimestamp() > (entry.timestamp + entry.ttl) THEN
    cache.delete(key)
    RETURN NULL
  END IF

  RETURN entry
END

ALGORITHM: SetInCache
INPUT: key (STRING), data (ANY), options (Object)
OUTPUT: void

BEGIN
  STATIC cache ← NEW MAP<STRING, AnalyticsCacheEntry>()

  entry ← {
    key: key,
    data: data,
    timestamp: CurrentTimestamp(),
    ttl: options.ttl || 300000, // 5 minutes default
    dependencies: options.dependencies || []
  }

  cache.set(key, entry)

  // Limit cache size
  IF cache.size > 100 THEN
    // Remove oldest entry
    oldestKey ← FindOldestCacheKey(cache)
    cache.delete(oldestKey)
  END IF
END

ALGORITHM: InvalidateCache
INPUT: dependencyKey (STRING)
OUTPUT: void

BEGIN
  STATIC cache ← NEW MAP<STRING, AnalyticsCacheEntry>()

  keysToDelete ← []

  FOR EACH [key, entry] IN cache DO
    IF entry.dependencies.includes(dependencyKey) THEN
      keysToDelete.push(key)
    END IF
  END FOR

  FOR EACH key IN keysToDelete DO
    cache.delete(key)
  END FOR

  Log('Invalidated ' + keysToDelete.length + ' cache entries for: ' + dependencyKey)
END
```

## Edge Cases & Performance

### Edge Cases
1. **No data**: Return empty structures with zero values
2. **Single data point**: Cannot calculate trends, show as stable
3. **Missing coordinates**: Skip venue from heat map
4. **Division by zero**: Check before averaging
5. **Invalid dates**: Filter out malformed dates
6. **Outliers**: Use median for robust statistics

### Performance Optimizations
- ✅ Cache analytics for 5 minutes
- ✅ Lazy calculation (compute on demand)
- ✅ Memoize expensive computations
- ✅ Use incremental updates when possible
- ✅ Sample large datasets for visualizations
- ✅ Render charts only when visible

### Testing Approach
```
UNIT TESTS:
- Statistical calculations (mean, median, stddev)
- Linear regression accuracy
- Distribution binning
- Trend detection
- Cache invalidation

INTEGRATION TESTS:
- Full analytics pipeline
- Chart rendering performance
- Real-world data accuracy

PERFORMANCE TESTS:
- 100 ciders + 500 experiences: < 300ms
- 1000 ciders + 5000 experiences: < 1s
- Heat map clustering: < 500ms
```

---

**Complexity**: O(n) for most operations, O(n log n) for sorting and trend analysis.
**Memory**: O(k) where k = unique grouping keys, typically << n.
**Caching**: 5-minute TTL prevents stale data while improving performance.
