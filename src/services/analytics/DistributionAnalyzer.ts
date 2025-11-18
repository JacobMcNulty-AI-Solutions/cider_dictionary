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
}

// ============================================================================
// Default Export
// ============================================================================

export default DistributionAnalyzer;
