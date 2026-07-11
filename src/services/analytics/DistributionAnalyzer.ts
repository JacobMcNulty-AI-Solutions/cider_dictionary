/**
 * Distribution Analysis Service
 *
 * Comprehensive service for computing statistical distributions across various
 * cider attributes including ratings, ABV, styles, brands, tags, prices, and venue types.
 *
 * Implements distribution analysis algorithms from pseudocode specification
 * (lines 748-876) with caching, edge case handling, and chart-ready formatting.
 *
 * Performance Target: <300ms per distribution computation
 * Cache TTL: 5 minutes
 *
 * @module DistributionAnalyzer
 */

import { CiderMasterRecord } from '../../types/cider';
import { ExperienceLog } from '../../types/experience';
import {
  ChartData,
  ChartDataset,
  DistributionData,
  BinnedDistribution,
  CategoricalDistribution,
  Bin,
  Category,
} from '../../types/analytics';
import { mean, median, mode, standardDeviation, min, max } from '../../utils/statistics';
import AnalyticsCacheManager from './AnalyticsCacheManager';
import {
  NewVsRepeatStats,
  DayOfWeekStat,
  DayOfWeekStats,
  QuarterStat,
  SeasonalStats,
  BrandRatingRow,
  SubRatingAverages,
  CiderConsistencyRow,
  RatingConsistencyResult,
  BrandLoyaltyRow,
  FlavourRadarData,
  TagRatingHeatmapRow,
  TagRatingHeatmapData,
} from '../../types/analytics';
import {
  HIGH_RATING_THRESHOLD,
  SWEETNESS_SCALE,
  CARBONATION_SCALE,
  CLARITY_SCALE,
} from './analyticsConstants';

interface BrandExperienceEntry {
  ratingSum: number;
  ratingCount: number;
  ciderIds: Set<string>;
  experienceCount: number;
  perCiderCounts: Map<string, number>;
}

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const QUARTER_LABELS: Record<'Q1' | 'Q2' | 'Q3' | 'Q4', string> = {
  Q1: 'Q1 (Jan-Mar)',
  Q2: 'Q2 (Apr-Jun)',
  Q3: 'Q3 (Jul-Sep)',
  Q4: 'Q4 (Oct-Dec)',
};

const monthToQuarter = (month: number): 'Q1' | 'Q2' | 'Q3' | 'Q4' => {
  if (month <= 2) return 'Q1';
  if (month <= 5) return 'Q2';
  if (month <= 8) return 'Q3';
  return 'Q4';
};

const round1 = (n: number): number => Math.round(n * 10) / 10;

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Result of a full distribution computation
 */
export interface FullDistributionResult {
  /** Rating distribution (1-10) */
  ratingDistribution: ChartData;

  /** ABV distribution in bins */
  abvDistribution: ChartData;

  /** Style distribution (categorical) */
  styleDistribution: ChartData;

  /** Top 10 brands by count */
  brandDistribution: ChartData;

  /** Top 10 taste tags by frequency */
  tagDistribution: ChartData;

  /** Price distribution in bins */
  priceDistribution: ChartData;

  /** Venue type distribution */
  venueTypeDistribution: ChartData;

  /** Computation metadata */
  metadata: {
    ciderCount: number;
    experienceCount: number;
    computationTime: number;
    cached: boolean;
  };
}

/**
 * ABV bin configuration
 */
interface AbvBin {
  label: string;
  min: number;
  max: number;
  count: number;
}

/**
 * Price bin configuration
 */
interface PriceBin {
  label: string;
  min: number;
  max: number;
  count: number;
}

// ============================================================================
// Constants
// ============================================================================

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_BRAND_NAME_LENGTH = 20;
const TOP_N_ITEMS = 10;

// Color schemes for different chart types
const COLORS = {
  rating: '#FF6384',
  abv: '#36A2EB',
  style: '#FFCE56',
  brand: '#4BC0C0',
  tag: '#9966FF',
  price: '#FF9F40',
  venue: '#FF6384',
};

// ============================================================================
// Distribution Analyzer Class
// ============================================================================

/**
 * Main distribution analyzer service
 * Provides comprehensive distribution analysis for cider collection
 */
export class DistributionAnalyzer {
  private static instance: DistributionAnalyzer;
  private cacheManager: AnalyticsCacheManager;

  constructor(cacheManager?: AnalyticsCacheManager) {
    this.cacheManager = cacheManager || AnalyticsCacheManager.getInstance();
  }

  /**
   * Get singleton instance of DistributionAnalyzer
   * Ensures cache sharing across all uses for maximum efficiency
   *
   * @returns Singleton instance
   */
  public static getInstance(): DistributionAnalyzer {
    if (!DistributionAnalyzer.instance) {
      DistributionAnalyzer.instance = new DistributionAnalyzer();
    }
    return DistributionAnalyzer.instance;
  }

  // ==========================================================================
  // Main Computation Method
  // ==========================================================================

  /**
   * Compute all distributions for a collection of ciders and experiences
   * Implements ComputeDistributions algorithm from pseudocode (lines 748-767)
   *
   * @param ciders - Array of cider master records
   * @param experiences - Array of experience logs
   * @returns Complete distribution analysis with all metrics
   *
   * @example
   * const analyzer = new DistributionAnalyzer();
   * const result = await analyzer.computeDistributions(ciders, experiences);
   * console.log(result.ratingDistribution); // Chart data for ratings
   */
  public async computeDistributions(
    ciders: CiderMasterRecord[],
    experiences: ExperienceLog[]
  ): Promise<FullDistributionResult> {
    const startTime = performance.now();

    // Check cache first
    const cacheKey = this.generateCacheKey(ciders, experiences);
    const cached = await this.cacheManager.get<FullDistributionResult>(cacheKey);
    if (cached) {
      console.log('[DistributionAnalyzer] Returning cached distributions');
      const cachedTime = performance.now() - startTime;
      return {
        ...cached,
        metadata: {
          ...cached.metadata,
          cached: true,
          computationTime: cachedTime,
        },
      };
    }

    console.log(
      `[DistributionAnalyzer] Computing distributions for ${ciders.length} ciders and ${experiences.length} experiences`
    );

    // Compute all distributions
    const ratingDistribution = this.computeRatingDistribution(ciders);
    const abvDistribution = this.computeAbvDistribution(ciders);
    const styleDistribution = this.computeStyleDistribution(ciders);
    const brandDistribution = this.computeBrandDistribution(ciders);
    const tagDistribution = this.computeTagDistribution(ciders);
    const priceDistribution = this.computePriceDistribution(experiences);
    const venueTypeDistribution = this.computeVenueTypeDistribution(experiences);

    const computationTime = performance.now() - startTime;

    const result: FullDistributionResult = {
      ratingDistribution,
      abvDistribution,
      styleDistribution,
      brandDistribution,
      tagDistribution,
      priceDistribution,
      venueTypeDistribution,
      metadata: {
        ciderCount: ciders.length,
        experienceCount: experiences.length,
        computationTime,
        cached: false,
      },
    };

    // Cache the result
    await this.cacheManager.set(cacheKey, result, { ttl: CACHE_TTL_MS });

    console.log(`[DistributionAnalyzer] Computation completed in ${computationTime.toFixed(2)}ms`);

    return result;
  }

  // ==========================================================================
  // Individual Distribution Computations
  // ==========================================================================

  /**
   * Compute rating distribution (1-10)
   * Implements ComputeRatingDistribution from pseudocode (lines 769-800)
   *
   * @param ciders - Array of cider master records
   * @returns Chart data with rating bins and counts
   *
   * @example
   * const ratingDist = analyzer.computeRatingDistribution(ciders);
   * // Returns bins for ratings 1-10 with counts
   */
  public computeRatingDistribution(ciders: CiderMasterRecord[]): ChartData {
    if (ciders.length === 0) {
      return this.createEmptyChartData('No ratings yet');
    }

    // Initialize bins for ratings 1-10
    const bins = new Map<number, number>();
    for (let rating = 1; rating <= 10; rating++) {
      bins.set(rating, 0);
    }

    // Count ciders per rating
    for (const cider of ciders) {
      if (cider.overallRating >= 1 && cider.overallRating <= 10) {
        const count = bins.get(cider.overallRating) || 0;
        bins.set(cider.overallRating, count + 1);
      }
    }

    // Extract data for chart
    const labels = Array.from(bins.keys()).map(r => r.toString());
    const data = Array.from(bins.values());
    const ratings = ciders.map(c => c.overallRating);

    return {
      labels,
      datasets: [
        {
          label: 'Number of Ciders',
          data,
          color: COLORS.rating,
          strokeWidth: 2,
        },
      ],
      min: 0,
      max: Math.max(...data, 1),
      average: mean(ratings),
    };
  }

  /**
   * Compute ABV distribution in bins
   * Implements ComputeAbvDistribution from pseudocode (lines 802-839)
   *
   * Bins: 0-3%, 3-5%, 5-7%, 7-9%, 9%+
   *
   * @param ciders - Array of cider master records
   * @returns Chart data with ABV bins and counts
   */
  public computeAbvDistribution(ciders: CiderMasterRecord[]): ChartData {
    if (ciders.length === 0) {
      return this.createEmptyChartData('No ABV data');
    }

    // Create bins: 0-3%, 3-5%, 5-7%, 7-9%, 9+%
    const bins: AbvBin[] = [
      { label: '0-3%', min: 0, max: 3, count: 0 },
      { label: '3-5%', min: 3, max: 5, count: 0 },
      { label: '5-7%', min: 5, max: 7, count: 0 },
      { label: '7-9%', min: 7, max: 9, count: 0 },
      { label: '9%+', min: 9, max: Infinity, count: 0 },
    ];

    // Categorize ciders
    // Bin boundaries are inclusive on min, exclusive on max: [min, max)
    // Example: 3.0 goes in [3,5), but 5.0 goes in [5,7)
    // Last bin (9%+) uses Infinity as max, so all values >= 9 are included
    for (const cider of ciders) {
      if (typeof cider.abv === 'number' && isFinite(cider.abv)) {
        for (const bin of bins) {
          if (cider.abv >= bin.min && cider.abv < bin.max) {
            bin.count += 1;
            break;
          }
        }
      }
    }

    const labels = bins.map(b => b.label);
    const data = bins.map(b => b.count);
    const abvValues = ciders.map(c => c.abv).filter(v => typeof v === 'number' && isFinite(v));

    return {
      labels,
      datasets: [
        {
          label: 'Number of Ciders',
          data,
          color: COLORS.abv,
          strokeWidth: 2,
        },
      ],
      min: 0,
      max: Math.max(...data, 1),
      average: abvValues.length > 0 ? mean(abvValues) : 0,
    };
  }

  /**
   * Compute style distribution
   *
   * @param ciders - Array of cider master records
   * @returns Chart data with style categories and counts
   */
  public computeStyleDistribution(ciders: CiderMasterRecord[]): ChartData {
    if (ciders.length === 0) {
      return this.createEmptyChartData('No style data');
    }

    const styleCounts = new Map<string, number>();

    // Count each style, using sweetness as proxy if traditionalStyle not available
    for (const cider of ciders) {
      let style = cider.traditionalStyle || cider.sweetness || 'unknown';

      // Normalize style names for consistency
      style = this.normalizeStyleName(style);

      const count = styleCounts.get(style) || 0;
      styleCounts.set(style, count + 1);
    }

    // Sort by count descending
    const sortedStyles = Array.from(styleCounts.entries())
      .sort((a, b) => b[1] - a[1]);

    const labels = sortedStyles.map(([style, _]) => this.formatStyleLabel(style));
    const data = sortedStyles.map(([_, count]) => count);

    return {
      labels,
      datasets: [
        {
          label: 'Number of Ciders',
          data,
          color: COLORS.style,
          strokeWidth: 2,
        },
      ],
      min: 0,
      max: Math.max(...data, 1),
    };
  }

  /**
   * Compute brand distribution (top 10)
   *
   * @param ciders - Array of cider master records
   * @returns Chart data with top 10 brands and counts
   */
  public computeBrandDistribution(ciders: CiderMasterRecord[]): ChartData {
    if (ciders.length === 0) {
      return this.createEmptyChartData('No brand data');
    }

    const brandCounts = new Map<string, number>();

    // Count each brand
    for (const cider of ciders) {
      if (cider.brand) {
        const brand = cider.brand.trim();
        const count = brandCounts.get(brand) || 0;
        brandCounts.set(brand, count + 1);
      }
    }

    // Sort by count descending, take top 10
    const sortedBrands = Array.from(brandCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_N_ITEMS);

    const labels = sortedBrands.map(([brand, _]) => this.truncateLabel(brand, MAX_BRAND_NAME_LENGTH));
    const data = sortedBrands.map(([_, count]) => count);

    return {
      labels,
      datasets: [
        {
          label: 'Number of Ciders',
          data,
          color: COLORS.brand,
          strokeWidth: 2,
        },
      ],
      min: 0,
      max: Math.max(...data, 1),
    };
  }

  /**
   * Compute tag distribution (top 10)
   * Implements ComputeTagDistribution from pseudocode (lines 841-876)
   *
   * @param ciders - Array of cider master records
   * @returns Chart data with top 10 tags and counts
   */
  public computeTagDistribution(ciders: CiderMasterRecord[]): ChartData {
    if (ciders.length === 0) {
      return this.createEmptyChartData('No tag data');
    }

    const tagCounts = new Map<string, number>();

    // Count tag occurrences
    for (const cider of ciders) {
      if (cider.tasteTags && Array.isArray(cider.tasteTags)) {
        for (const tag of cider.tasteTags) {
          if (tag && typeof tag === 'string') {
            const normalizedTag = tag.trim().toLowerCase();
            const count = tagCounts.get(normalizedTag) || 0;
            tagCounts.set(normalizedTag, count + 1);
          }
        }
      }
    }

    if (tagCounts.size === 0) {
      return this.createEmptyChartData('No tags found');
    }

    // Sort by count descending, take top 10
    const sortedTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_N_ITEMS);

    const labels = sortedTags.map(([tag, _]) => this.capitalizeTag(tag));
    const data = sortedTags.map(([_, count]) => count);

    return {
      labels,
      datasets: [
        {
          label: 'Occurrences',
          data,
          color: COLORS.tag,
          strokeWidth: 2,
        },
      ],
      min: 0,
      max: sortedTags.length > 0 ? sortedTags[0][1] : 0,
    };
  }

  /**
   * Compute price distribution in bins
   *
   * Bins: £0-3, £3-5, £5-7, £7-10, £10+
   *
   * @param experiences - Array of experience logs
   * @returns Chart data with price bins and counts
   */
  public computePriceDistribution(experiences: ExperienceLog[]): ChartData {
    if (experiences.length === 0) {
      return this.createEmptyChartData('No price data');
    }

    // Create price bins
    const bins: PriceBin[] = [
      { label: '£0-3', min: 0, max: 3, count: 0 },
      { label: '£3-5', min: 3, max: 5, count: 0 },
      { label: '£5-7', min: 5, max: 7, count: 0 },
      { label: '£7-10', min: 7, max: 10, count: 0 },
      { label: '£10+', min: 10, max: Infinity, count: 0 },
    ];

    // Categorize prices (using pricePerPint for normalized comparison)
    // Bin boundaries are inclusive on min, exclusive on max: [min, max)
    // Example: £3.00 goes in [£3, £5), but £5.00 goes in [£5, £7)
    // Last bin (£10+) uses Infinity as max, so all values >= £10 are included
    for (const experience of experiences) {
      // Use nullish coalescing to handle 0 correctly
      const price = experience.pricePerPint ?? experience.price;
      if (typeof price === 'number' && isFinite(price) && !isNaN(price) && price >= 0) {
        for (const bin of bins) {
          if (price >= bin.min && price < bin.max) {
            bin.count += 1;
            break;
          }
        }
      }
    }

    const labels = bins.map(b => b.label);
    const data = bins.map(b => b.count);
    const prices = experiences
      .map(e => e.pricePerPint ?? e.price)
      .filter(p => typeof p === 'number' && isFinite(p) && !isNaN(p) && p >= 0);

    return {
      labels,
      datasets: [
        {
          label: 'Number of Experiences',
          data,
          color: COLORS.price,
          strokeWidth: 2,
        },
      ],
      min: 0,
      max: Math.max(...data, 1),
      average: prices.length > 0 ? mean(prices) : 0,
    };
  }

  /**
   * Compute venue type distribution
   *
   * @param experiences - Array of experience logs
   * @returns Chart data with venue types and counts
   */
  public computeVenueTypeDistribution(experiences: ExperienceLog[]): ChartData {
    if (experiences.length === 0) {
      return this.createEmptyChartData('No venue data');
    }

    const venueCounts = new Map<string, number>();

    // Count each venue type
    for (const experience of experiences) {
      if (experience.venue && experience.venue.type) {
        const venueType = experience.venue.type;
        const count = venueCounts.get(venueType) || 0;
        venueCounts.set(venueType, count + 1);
      }
    }

    if (venueCounts.size === 0) {
      return this.createEmptyChartData('No venue types found');
    }

    // Sort by count descending
    const sortedVenues = Array.from(venueCounts.entries())
      .sort((a, b) => b[1] - a[1]);

    const labels = sortedVenues.map(([type, _]) => this.formatVenueType(type));
    const data = sortedVenues.map(([_, count]) => count);

    return {
      labels,
      datasets: [
        {
          label: 'Number of Visits',
          data,
          color: COLORS.venue,
          strokeWidth: 2,
        },
      ],
      min: 0,
      max: Math.max(...data, 1),
    };
  }

  // ==========================================================================
  // Chart Formatting Helpers
  // ==========================================================================

  /**
   * Format data for a standard bar chart
   *
   * @param data - Map of labels to values
   * @param label - Dataset label
   * @param color - Bar color
   * @returns ChartData object
   */
  public formatForBarChart(
    data: Map<string, number>,
    label: string,
    color: string = COLORS.style
  ): ChartData {
    const entries = Array.from(data.entries()).sort((a, b) => b[1] - a[1]);
    const labels = entries.map(([key, _]) => key);
    const values = entries.map(([_, value]) => value);

    return {
      labels,
      datasets: [
        {
          label,
          data: values,
          color,
          strokeWidth: 2,
        },
      ],
      min: 0,
      max: Math.max(...values, 1),
    };
  }

  /**
   * Format binned data for a histogram
   *
   * @param bins - Array of bins with labels and counts
   * @param label - Dataset label
   * @param color - Bar color
   * @returns ChartData object
   */
  public formatForHistogram(
    bins: Array<{ label: string; count: number }>,
    label: string,
    color: string = COLORS.abv
  ): ChartData {
    const labels = bins.map(b => b.label);
    const data = bins.map(b => b.count);

    return {
      labels,
      datasets: [
        {
          label,
          data,
          color,
          strokeWidth: 2,
        },
      ],
      min: 0,
      max: Math.max(...data, 1),
    };
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Create empty chart data for when no data is available
   *
   * @param message - Message to display
   * @returns Empty ChartData object
   */
  private createEmptyChartData(message: string = 'No data'): ChartData {
    return {
      labels: [message],
      datasets: [
        {
          label: 'No Data',
          data: [0],
          color: '#CCCCCC',
          strokeWidth: 2,
        },
      ],
      min: 0,
      max: 1,
    };
  }

  /**
   * Truncate a label to maximum length
   *
   * @param label - Label to truncate
   * @param maxLength - Maximum length
   * @returns Truncated label
   */
  private truncateLabel(label: string, maxLength: number): string {
    if (label.length <= maxLength) {
      return label;
    }
    return label.substring(0, maxLength - 3) + '...';
  }

  /**
   * Normalize style name for consistency
   *
   * @param style - Raw style name
   * @returns Normalized style name
   */
  private normalizeStyleName(style: string): string {
    if (!style) return '';
    return style.toLowerCase().replace(/_/g, ' ').trim();
  }

  /**
   * Format style label for display
   *
   * @param style - Normalized style name
   * @returns Formatted style label
   */
  private formatStyleLabel(style: string): string {
    return style
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Capitalize tag for display
   *
   * @param tag - Lowercase tag
   * @returns Capitalized tag
   */
  private capitalizeTag(tag: string): string {
    return tag.charAt(0).toUpperCase() + tag.slice(1);
  }

  /**
   * Format venue type for display
   *
   * @param venueType - Raw venue type
   * @returns Formatted venue type
   */
  private formatVenueType(venueType: string): string {
    return venueType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Generate cache key for distributions
   *
   * @param ciders - Cider array
   * @param experiences - Experience array
   * @returns Cache key string
   */
  private generateCacheKey(ciders: CiderMasterRecord[], experiences: ExperienceLog[]): string {
    // Create a more unique key based on IDs to detect actual data changes
    const ciderIds = ciders.map(c => c.id).sort().join(',');
    const expIds = experiences.map(e => e.id).sort().join(',');
    const hash = `${ciderIds}_${expIds}`.substring(0, 100); // Limit length
    return `distributions_${ciders.length}_${experiences.length}_${hash}`;
  }

  // ==========================================================================
  // Analytics Enhancement — Phase 1
  // ==========================================================================

  // Feature 4: New vs Repeat Ciders
  public computeNewVsRepeatStats(experiences: ExperienceLog[]): NewVsRepeatStats {
    if (experiences.length === 0) {
      return { newCount: 0, repeatCount: 0, totalCount: 0, explorerPercentage: 0 };
    }

    const sorted = [...experiences].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const seen = new Set<string>();
    let newCount = 0;
    let repeatCount = 0;

    for (const exp of sorted) {
      if (!exp.ciderId) continue;
      if (seen.has(exp.ciderId)) {
        repeatCount++;
      } else {
        seen.add(exp.ciderId);
        newCount++;
      }
    }

    const totalCount = newCount + repeatCount;
    const explorerPercentage = totalCount > 0
      ? Math.round((newCount / totalCount) * 100)
      : 0;

    return { newCount, repeatCount, totalCount, explorerPercentage };
  }

  // Feature 9: Best Drinking Day
  // Note: uses local timezone via Date.getDay() — consistent with the rest of the app.
  public computeDayOfWeekStats(experiences: ExperienceLog[]): DayOfWeekStats {
    const buckets: Array<{ count: number; ratingSum: number; ratingCount: number }> =
      Array.from({ length: 7 }, () => ({ count: 0, ratingSum: 0, ratingCount: 0 }));

    for (const exp of experiences) {
      const date = new Date(exp.date);
      if (isNaN(date.getTime())) continue;
      const idx = date.getDay();
      buckets[idx].count++;
      if (typeof exp.rating === 'number') {
        buckets[idx].ratingSum += exp.rating;
        buckets[idx].ratingCount++;
      }
    }

    const days: DayOfWeekStat[] = buckets.map((b, idx) => ({
      dayName: DAY_NAMES[idx],
      dayIndex: idx,
      count: b.count,
      averageRating: b.ratingCount > 0 ? round1(b.ratingSum / b.ratingCount) : 0,
    }));

    const busiestDay = days.reduce(
      (best, day) => (day.count > best.count ? day : best),
      days[0]
    );

    const eligibleForRating = days.filter(d => d.count >= 3);
    const highestRatedDay = eligibleForRating.length > 0
      ? eligibleForRating.reduce(
          (best, day) => (day.averageRating > best.averageRating ? day : best),
          eligibleForRating[0]
        )
      : null;

    return { days, busiestDay, highestRatedDay };
  }

  // Feature 10: Seasonal Patterns
  public computeSeasonalStats(experiences: ExperienceLog[]): SeasonalStats {
    const buckets: Record<'Q1' | 'Q2' | 'Q3' | 'Q4', { count: number; ratingSum: number; ratingCount: number }> = {
      Q1: { count: 0, ratingSum: 0, ratingCount: 0 },
      Q2: { count: 0, ratingSum: 0, ratingCount: 0 },
      Q3: { count: 0, ratingSum: 0, ratingCount: 0 },
      Q4: { count: 0, ratingSum: 0, ratingCount: 0 },
    };

    for (const exp of experiences) {
      const date = new Date(exp.date);
      if (isNaN(date.getTime())) continue;
      const q = monthToQuarter(date.getMonth());
      buckets[q].count++;
      if (typeof exp.rating === 'number') {
        buckets[q].ratingSum += exp.rating;
        buckets[q].ratingCount++;
      }
    }

    const quarters: QuarterStat[] = (['Q1', 'Q2', 'Q3', 'Q4'] as const).map(q => ({
      quarter: q,
      label: QUARTER_LABELS[q],
      count: buckets[q].count,
      averageRating:
        buckets[q].ratingCount > 0 ? round1(buckets[q].ratingSum / buckets[q].ratingCount) : 0,
    }));

    const peakQuarter = quarters.reduce(
      (best, q) => (q.count > best.count ? q : best),
      quarters[0]
    );

    const chartData: ChartData = {
      labels: ['Q1\nJan-Mar', 'Q2\nApr-Jun', 'Q3\nJul-Sep', 'Q4\nOct-Dec'],
      datasets: [
        {
          label: 'Experiences',
          data: quarters.map(q => q.count),
        },
      ],
    };

    return { quarters, peakQuarter, chartData };
  }

  // Shared helper for Features 11 and 12.
  private buildBrandExperienceMap(
    ciders: CiderMasterRecord[],
    experiences: ExperienceLog[]
  ): Map<string, BrandExperienceEntry> {
    const ciderIdToBrand = new Map<string, string>();
    for (const cider of ciders) {
      const brand = cider.brand?.trim();
      if (brand) ciderIdToBrand.set(cider.id, brand);
    }

    const result = new Map<string, BrandExperienceEntry>();

    for (const exp of experiences) {
      const brand = ciderIdToBrand.get(exp.ciderId);
      if (!brand) continue;

      let entry = result.get(brand);
      if (!entry) {
        entry = {
          ratingSum: 0,
          ratingCount: 0,
          ciderIds: new Set<string>(),
          experienceCount: 0,
          perCiderCounts: new Map<string, number>(),
        };
        result.set(brand, entry);
      }

      entry.experienceCount++;
      entry.ciderIds.add(exp.ciderId);
      entry.perCiderCounts.set(
        exp.ciderId,
        (entry.perCiderCounts.get(exp.ciderId) || 0) + 1
      );

      if (typeof exp.rating === 'number') {
        entry.ratingSum += exp.rating;
        entry.ratingCount++;
      }
    }

    return result;
  }

  // Feature 12: Brand Avg Rating Table
  public computeBrandRatingTable(
    ciders: CiderMasterRecord[],
    experiences: ExperienceLog[]
  ): BrandRatingRow[] {
    const map = this.buildBrandExperienceMap(ciders, experiences);
    const rows: BrandRatingRow[] = [];

    for (const [brand, entry] of map.entries()) {
      if (!brand) continue;
      if (entry.ratingCount === 0) continue; // Skip: no rated experiences.
      rows.push({
        brand,
        avgRating: round1(entry.ratingSum / entry.ratingCount),
        ciderCount: entry.ciderIds.size,
        experienceCount: entry.experienceCount,
      });
    }

    rows.sort((a, b) => {
      if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
      return a.brand.localeCompare(b.brand);
    });

    return rows;
  }

  // ==========================================================================
  // Analytics Enhancement — Phase 2
  // ==========================================================================

  // Feature 7: Sub-rating Radar
  public computeSubRatingAverages(experiences: ExperienceLog[]): SubRatingAverages {
    const empty: SubRatingAverages = {
      appearance: 0,
      aroma: 0,
      taste: 0,
      mouthfeel: 0,
      sampleCount: 0,
      hasEnoughData: false,
    };

    const cohort = experiences.filter(e => {
      const dr = e.detailedRatings;
      return (
        dr &&
        typeof dr.appearance === 'number' &&
        typeof dr.aroma === 'number' &&
        typeof dr.taste === 'number' &&
        typeof dr.mouthfeel === 'number'
      );
    });

    if (cohort.length === 0) return empty;

    let sumApp = 0, sumAro = 0, sumTas = 0, sumMou = 0;
    for (const e of cohort) {
      const dr = e.detailedRatings!;
      sumApp += dr.appearance!;
      sumAro += dr.aroma!;
      sumTas += dr.taste!;
      sumMou += dr.mouthfeel!;
    }

    return {
      appearance: round1(sumApp / cohort.length),
      aroma: round1(sumAro / cohort.length),
      taste: round1(sumTas / cohort.length),
      mouthfeel: round1(sumMou / cohort.length),
      sampleCount: cohort.length,
      hasEnoughData: cohort.length >= 3,
    };
  }

  // Feature 8: Rating Consistency
  public computeRatingConsistency(
    ciders: CiderMasterRecord[],
    experiences: ExperienceLog[]
  ): RatingConsistencyResult {
    const cidersById = new Map<string, CiderMasterRecord>();
    for (const cider of ciders) cidersById.set(cider.id, cider);

    const grouped = new Map<string, number[]>();
    for (const exp of experiences) {
      if (typeof exp.rating !== 'number') continue;
      const list = grouped.get(exp.ciderId) || [];
      list.push(exp.rating);
      grouped.set(exp.ciderId, list);
    }

    const rows: CiderConsistencyRow[] = [];
    for (const [ciderId, ratings] of grouped.entries()) {
      if (ratings.length < 2) continue;
      const cider = cidersById.get(ciderId);
      if (!cider) continue;

      const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      const variance =
        ratings.reduce((acc, r) => acc + (r - avg) ** 2, 0) / ratings.length;
      const stdDev = Math.sqrt(variance);

      rows.push({
        cider,
        experienceCount: ratings.length,
        avgRating: round1(avg),
        ratingVariance: round1(variance),
        ratingStdDev: round1(stdDev),
        minRating: Math.min(...ratings),
        maxRating: Math.max(...ratings),
        isHighVariance: stdDev >= 2,
      });
    }

    rows.sort((a, b) => b.ratingStdDev - a.ratingStdDev);

    const highVarianceCount = rows.filter(r => r.isHighVariance).length;
    const mostConsistent = rows.length > 0 ? rows[rows.length - 1] : null;
    const leastConsistent = rows.length > 0 ? rows[0] : null;

    return { rows, mostConsistent, leastConsistent, highVarianceCount };
  }

  // Feature 11: Brand Re-trial Rate
  public computeBrandLoyaltyScores(
    ciders: CiderMasterRecord[],
    experiences: ExperienceLog[]
  ): BrandLoyaltyRow[] {
    const map = this.buildBrandExperienceMap(ciders, experiences);
    const rows: BrandLoyaltyRow[] = [];

    for (const [brand, entry] of map.entries()) {
      if (!brand) continue;
      if (entry.experienceCount < 5) continue; // Filter noise threshold.

      let repeatExperiences = 0;
      for (const count of entry.perCiderCounts.values()) {
        repeatExperiences += Math.max(0, count - 1);
      }

      const loyaltyScore =
        entry.experienceCount > 0
          ? Math.round((repeatExperiences / entry.experienceCount) * 100)
          : 0;

      rows.push({
        brand,
        totalExperiences: entry.experienceCount,
        uniqueCiders: entry.ciderIds.size,
        repeatExperiences,
        loyaltyScore,
      });
    }

    rows.sort((a, b) => {
      if (b.loyaltyScore !== a.loyaltyScore) return b.loyaltyScore - a.loyaltyScore;
      return a.brand.localeCompare(b.brand);
    });

    return rows;
  }

  // ==========================================================================
  // Analytics Enhancement — Phase 3
  // ==========================================================================

  // Feature 1: Flavour Radar
  public computeFlavourRadar(ciders: CiderMasterRecord[]): FlavourRadarData {
    let sweetSum = 0, sweetCount = 0;
    let carbSum = 0, carbCount = 0;
    let claritySum = 0, clarityCount = 0;

    for (const cider of ciders) {
      const s = cider.sweetness && SWEETNESS_SCALE[cider.sweetness];
      const c = cider.carbonation && CARBONATION_SCALE[cider.carbonation];
      const cl = cider.clarity && CLARITY_SCALE[cider.clarity];
      if (typeof s === 'number') { sweetSum += s; sweetCount++; }
      if (typeof c === 'number') { carbSum += c; carbCount++; }
      if (typeof cl === 'number') { claritySum += cl; clarityCount++; }
    }

    const sweetnessAvg = sweetCount > 0 ? sweetSum / sweetCount : 0;
    const carbonationAvg = carbCount > 0 ? carbSum / carbCount : 0;
    const clarityAvg = clarityCount > 0 ? claritySum / clarityCount : 0;

    // Normalize to 0..10 based on each scale's domain.
    const sweetnessNorm = sweetCount > 0 ? ((sweetnessAvg - 1) / 4) * 10 : 0;
    const carbonationNorm = carbCount > 0 ? ((carbonationAvg - 1) / 3) * 10 : 0;
    const clarityNorm = clarityCount > 0 ? ((clarityAvg - 1) / 4) * 10 : 0;

    const sampleCount = Math.min(sweetCount, carbCount, clarityCount);

    return {
      sweetnessAvg: round1(sweetnessAvg),
      carbonationAvg: round1(carbonationAvg),
      clarityAvg: round1(clarityAvg),
      sampleCount,
      hasEnoughData: sampleCount >= 3,
      chartValues: [round1(sweetnessNorm), round1(carbonationNorm), round1(clarityNorm)],
      chartLabels: ['Sweetness', 'Carbonation', 'Clarity'],
    };
  }

  // Feature 3: Tag Frequency Heatmap
  public computeTagRatingHeatmap(
    ciders: CiderMasterRecord[],
    experiences: ExperienceLog[]
  ): TagRatingHeatmapData {
    const cidersById = new Map<string, CiderMasterRecord>();
    for (const c of ciders) cidersById.set(c.id, c);

    const tagCounts = new Map<string, { high: number; low: number }>();

    for (const exp of experiences) {
      if (typeof exp.rating !== 'number') continue;
      const cider = cidersById.get(exp.ciderId);
      if (!cider) continue;
      if (!cider.tasteTags || cider.tasteTags.length === 0) continue;

      const bucket = exp.rating >= HIGH_RATING_THRESHOLD ? 'high' : 'low';
      for (const rawTag of cider.tasteTags) {
        if (!rawTag) continue;
        const tag = rawTag.trim().toLowerCase();
        if (!tag) continue;
        const current = tagCounts.get(tag) || { high: 0, low: 0 };
        current[bucket]++;
        tagCounts.set(tag, current);
      }
    }

    const rows: TagRatingHeatmapRow[] = [];
    for (const [tag, counts] of tagCounts.entries()) {
      const totalCount = counts.high + counts.low;
      let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
      if (totalCount >= 5) {
        if (counts.high / totalCount > 0.65) sentiment = 'positive';
        else if (counts.low / totalCount > 0.65) sentiment = 'negative';
      }
      rows.push({
        tag,
        highRatedCount: counts.high,
        lowRatedCount: counts.low,
        totalCount,
        sentiment,
      });
    }

    rows.sort((a, b) => b.totalCount - a.totalCount);
    const top = rows.slice(0, 15);

    let maxCount = 0;
    for (const row of top) {
      if (row.highRatedCount > maxCount) maxCount = row.highRatedCount;
      if (row.lowRatedCount > maxCount) maxCount = row.lowRatedCount;
    }

    return { rows: top, maxCount, hasEnoughData: top.length >= 5 };
  }
}

// ============================================================================
// Default Export
// ============================================================================

export default DistributionAnalyzer;
