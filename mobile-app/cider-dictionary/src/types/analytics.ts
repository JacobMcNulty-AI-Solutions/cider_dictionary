/**
 * Type definitions for the Advanced Analytics System
 *
 * This module provides comprehensive TypeScript interfaces and types for the cider
 * tracking application's analytics features, including trend analysis, distributions,
 * statistical summaries, and data visualization.
 */

// ============================================================================
// Time and Grouping Types
// ============================================================================

/**
 * Predefined time range options for analytics queries
 * - 1M: Last 1 month
 * - 3M: Last 3 months
 * - 6M: Last 6 months
 * - 1Y: Last 1 year
 * - ALL: All time data
 */
export type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

/**
 * Grouping interval for time-series aggregation
 * Used to bucket data points into periods for trend analysis
 */
export type GroupBy = 'day' | 'week' | 'month' | 'quarter' | 'year';

/**
 * Supported chart visualization types
 */
export type ChartType = 'line' | 'bar' | 'pie' | 'scatter';

// ============================================================================
// Analytics Configuration
// ============================================================================

/**
 * Configuration options for analytics queries
 * Defines the scope and granularity of analytics data to retrieve
 */
export interface AnalyticsConfig {
  /** Predefined time range for the query */
  timeRange: TimeRange;

  /** Optional custom date range (overrides timeRange if specified) */
  dateRange?: {
    start: Date;
    end: Date;
  };

  /** Grouping interval for time-series data */
  groupBy: GroupBy;

  /** Whether to use sampling for large datasets */
  enableSampling: boolean;

  /** Number of samples to use when sampling is enabled */
  sampleSize?: number;
}

// ============================================================================
// Chart Data Structures
// ============================================================================

/**
 * Complete chart data structure for visualization components
 * Compatible with react-native-chart-kit and other charting libraries
 */
export interface ChartData {
  /** X-axis labels (typically time periods or categories) */
  labels: string[];

  /** One or more data series to display */
  datasets: ChartDataset[];

  /** Minimum value in the dataset (for scaling) */
  min?: number;

  /** Maximum value in the dataset (for scaling) */
  max?: number;

  /** Average value across all data points */
  average?: number;
}

/**
 * Individual dataset within a chart
 * Represents a single line, bar series, or data group
 */
export interface ChartDataset {
  /** Human-readable label for this dataset */
  label: string;

  /** Array of numeric values corresponding to chart labels */
  data: number[];

  /** Color for this dataset (hex string or function returning rgba) */
  color: string | ((opacity: number) => string);

  /** Line width for line charts (default: 2) */
  strokeWidth?: number;
}

// ============================================================================
// Trend Analysis Types
// ============================================================================

/**
 * Complete trend analysis result with regression and predictions
 * Includes historical data, trend line, and future projections
 */
export interface TrendAnalysis {
  /** Human-readable label for this trend */
  label: string;

  /** Overall direction of the trend */
  direction: 'increasing' | 'decreasing' | 'stable';

  /** Linear regression slope (change per period) */
  slope: number;

  /** R² value indicating trend reliability (0-1, higher is better) */
  confidence: number;

  /** Historical data points used for analysis */
  dataPoints: TrendDataPoint[];

  /** Future predictions based on trend */
  predictions: Prediction[];

  /** Chart-ready data for visualization */
  chartData: ChartData;
}

/**
 * Single data point in a trend analysis
 * Represents aggregated data for one time period
 */
export interface TrendDataPoint {
  /** Time period label (e.g., "2024-01", "Week 12") */
  period: string;

  /** Aggregated value for this period */
  value: number;

  /** Number of items contributing to this aggregation */
  count: number;
}

/**
 * Future prediction based on trend analysis
 * Used for forecasting and planning
 */
export interface Prediction {
  /** Future time period label */
  period: string;

  /** Predicted value */
  value: number;

  /** Confidence level in this prediction (0-1) */
  confidence: number;
}

// ============================================================================
// Distribution Types
// ============================================================================

/**
 * Complete distribution analysis across all categorical and numeric dimensions
 * Provides insights into how ciders are distributed across various attributes
 */
export interface DistributionData {
  /** ABV (alcohol by volume) distribution in bins */
  abv: BinnedDistribution;

  /** Distribution by cider style */
  style: CategoricalDistribution;

  /** Distribution by brand/producer */
  brand: CategoricalDistribution;

  /** Distribution of taste tags (sweet, dry, fruity, etc.) */
  tasteTags: CategoricalDistribution;

  /** Price distribution in bins */
  price: BinnedDistribution;

  /** Distribution by user rating */
  rating: CategoricalDistribution;
}

/**
 * Distribution of numeric data grouped into bins/ranges
 * Used for continuous variables like ABV and price
 */
export interface BinnedDistribution {
  /** Array of bins with counts and ranges */
  bins: Bin[];

  /** Chart-ready histogram data */
  chartData: ChartData;
}

/**
 * Single bin in a binned distribution
 * Represents a range of values and their frequency
 */
export interface Bin {
  /** Human-readable label (e.g., "3.0-4.0%", "$10-$15") */
  label: string;

  /** Minimum value in this bin (inclusive) */
  min: number;

  /** Maximum value in this bin (exclusive) */
  max: number;

  /** Number of items in this bin */
  count: number;

  /** Percentage of total items (0-100) */
  percentage: number;
}

/**
 * Distribution of categorical data
 * Used for discrete variables like style and brand
 */
export interface CategoricalDistribution {
  /** Array of categories with counts */
  categories: Category[];

  /** Chart-ready bar or pie chart data */
  chartData: ChartData;
}

/**
 * Single category in a categorical distribution
 * Represents one distinct value and its frequency
 */
export interface Category {
  /** Category name */
  label: string;

  /** Number of items in this category */
  count: number;

  /** Percentage of total items (0-100) */
  percentage: number;
}

// ============================================================================
// Statistical Analysis Types
// ============================================================================

/**
 * Comprehensive statistical summary across key metrics
 * Provides descriptive statistics and outlier detection
 */
export interface StatisticalSummary {
  /** Statistical metrics for user ratings */
  rating: StatisticalMetrics;

  /** Statistical metrics for ABV values */
  abv: StatisticalMetrics;

  /** Statistical metrics for prices */
  price: StatisticalMetrics;

  /** Detected outliers across all metrics */
  outliers: Outlier[];
}

/**
 * Complete set of statistical metrics for a single variable
 * Includes measures of central tendency, dispersion, and quartiles
 */
export interface StatisticalMetrics {
  /** Arithmetic mean (average) */
  mean: number;

  /** Middle value when sorted */
  median: number;

  /** Most frequent value (undefined if no clear mode) */
  mode?: number;

  /** Standard deviation (measure of spread) */
  standardDeviation: number;

  /** Variance (squared standard deviation) */
  variance: number;

  /** Minimum value in dataset */
  min: number;

  /** Maximum value in dataset */
  max: number;

  /** Quartile values for box plot analysis */
  quartiles: {
    /** First quartile (25th percentile) */
    q1: number;
    /** Second quartile (50th percentile, same as median) */
    q2: number;
    /** Third quartile (75th percentile) */
    q3: number;
  };

  /** Interquartile range (Q3 - Q1) */
  iqr: number;
}

/**
 * Detected outlier in the dataset
 * Represents an unusual data point that may need attention
 */
export interface Outlier {
  /** Unique identifier for the cider */
  ciderId: string;

  /** Name of the cider for display */
  ciderName: string;

  /** The outlier value */
  value: number;

  /** Which metric this is an outlier for */
  metric: 'rating' | 'abv' | 'price';

  /** Z-score (number of standard deviations from mean) */
  zscore: number;
}

// ============================================================================
// Incremental Analytics State
// ============================================================================

/**
 * State for incremental/streaming analytics computation
 * Maintains running totals to avoid full recalculation on every update
 */
export interface IncrementalAnalyticsState {
  /** Timestamp of last state update */
  lastUpdate: Date;

  /** Running totals for efficient computation */
  runningTotals: {
    /** Total number of ciders in collection */
    totalCiders: number;
    /** Total number of tasting experiences */
    totalExperiences: number;
    /** Sum of all ratings */
    sumRatings: number;
    /** Sum of all ABV values */
    sumAbv: number;
    /** Total amount spent on ciders */
    sumSpending: number;
  };

  /** Distribution counters for categorical data */
  distributions: Map<string, Map<any, number>>;

  /** Set of metrics that need recalculation */
  invalidatedMetrics: Set<string>;
}

// ============================================================================
// Sampling Strategy
// ============================================================================

/**
 * Configuration for data sampling on large datasets
 * Reduces computation time while maintaining statistical validity
 */
export interface SamplingStrategy {
  /** Whether sampling is enabled */
  enabled: boolean;

  /** Number of items to sample */
  sampleSize: number;

  /** Sampling method to use */
  method: 'random' | 'stratified' | 'systematic';

  /** Key to use for stratified sampling (e.g., 'style' or 'rating') */
  stratificationKey?: string;
}

/**
 * Metadata about sampling applied to analytics results
 * Helps users understand data quality and confidence
 */
export interface SamplingMetadata {
  /** Whether the data was sampled */
  sampled: boolean;

  /** Number of items in the sample */
  sampleSize: number;

  /** Total population size before sampling */
  totalPopulation: number;

  /** Sampling method used */
  samplingMethod: string;

  /** Statistical confidence level (0-1) */
  confidenceLevel: number;
}

// ============================================================================
// Cache Structures
// ============================================================================

/**
 * Single entry in the analytics cache
 * Stores computed results with TTL and dependency tracking
 */
export interface AnalyticsCacheEntry {
  /** Unique cache key */
  key: string;

  /** Cached data (type varies by metric) */
  data: any;

  /** When this entry was created */
  timestamp: Date;

  /** Time to live in milliseconds */
  ttl: number;

  /** List of data dependencies (cache keys or data IDs) */
  dependencies: string[];
}

// ============================================================================
// Complete Analytics Data
// ============================================================================

/**
 * Complete advanced analytics data structure
 * Top-level result containing all analytics computations
 */
export interface AdvancedAnalyticsData {
  /** Statistical summary across key metrics */
  summary: StatisticalSummary;

  /** Trend analyses for various metrics over time */
  trends: {
    /** Growth in collection size over time */
    collectionGrowth: TrendAnalysis;
    /** Trend in average ratings over time */
    ratingTrend: TrendAnalysis;
    /** Trend in spending over time */
    spendingTrend: TrendAnalysis;
    /** Trend in average ABV of ciders tried */
    abvTrend: TrendAnalysis;
  };

  /** Distribution analyses across all dimensions */
  distributions: DistributionData;

  /** Metadata if sampling was applied */
  samplingMetadata?: SamplingMetadata;

  /** Total computation time in milliseconds */
  computationTime: number;
}

// ============================================================================
// Venue Analytics Types (Phase 4)
// ============================================================================

/**
 * Geographic point representing a venue location
 */
export interface VenuePoint {
  /** Venue latitude in decimal degrees */
  latitude: number;
  /** Venue longitude in decimal degrees */
  longitude: number;
  /** Weight/importance of this point (typically experience count) */
  weight: number;
  /** Name of the venue */
  venueName: string;
  /** Type of venue (bar, pub, restaurant, etc.) */
  venueType: string;
}

/**
 * Clustered point representing multiple nearby venues
 * Used for heat map visualization
 */
export interface ClusteredPoint {
  /** Cluster center latitude (weighted average) */
  latitude: number;
  /** Cluster center longitude (weighted average) */
  longitude: number;
  /** Total weight of cluster (sum of all points) */
  weight: number;
  /** Names of all venues in this cluster */
  venueNames: string[];
  /** Total number of experiences in this cluster */
  experiences: number;
}

/**
 * Geographic bounding box
 * Defines the map viewport to show all venues
 */
export interface GeoBounds {
  /** Minimum latitude (south) */
  minLat: number;
  /** Maximum latitude (north) */
  maxLat: number;
  /** Minimum longitude (west) */
  minLng: number;
  /** Maximum longitude (east) */
  maxLng: number;
  /** Center latitude for map centering */
  centerLat: number;
  /** Center longitude for map centering */
  centerLng: number;
}

/**
 * Complete heat map data structure
 * Contains clustered points and metadata for visualization
 */
export interface HeatMapData {
  /** Array of clustered points for display */
  points: ClusteredPoint[];
  /** Geographic bounds encompassing all venues */
  bounds: GeoBounds;
  /** Intensity scale factor for heat map visualization */
  intensity: number;
  /** Metadata about the heat map */
  metadata: {
    /** Total number of unique venue clusters */
    totalVenues: number;
    /** Total number of experiences included */
    totalExperiences: number;
    /** Clustering radius used in meters */
    clusterRadius: number;
  };
}

/**
 * Venue ranking entry
 * Represents a venue with visit statistics
 */
export interface VenueRanking {
  /** Venue name */
  venueName: string;
  /** Venue type */
  venueType: string;
  /** Number of visits/experiences at this venue */
  visitCount: number;
  /** Percentage of total visits */
  percentage: number;
  /** Average rating at this venue (if available) */
  averageRating?: number;
}

/**
 * Comprehensive venue insights
 * Provides analytics about venue usage patterns
 */
export interface VenueInsights {
  /** Most frequently visited venues */
  mostVisited: VenueRanking[];
  /** Distribution of experiences by venue type */
  venueTypes: Map<string, number>;
  /** Average ratings by venue name */
  averageRatings: Map<string, number>;
  /** Total number of unique venues visited */
  totalUniqueVenues: number;
  /** Total number of venue visits/experiences */
  totalVisits: number;
  /** Average distance from home location (if available) */
  averageDistanceFromHome?: number;
  /** Rate of discovering new venues vs revisiting */
  discoveryRate?: {
    /** Number of new venues in recent period */
    newVenues: number;
    /** Number of repeat visits in recent period */
    repeatVisits: number;
    /** Ratio of new to total (0-1) */
    discoveryRatio: number;
  };
}
