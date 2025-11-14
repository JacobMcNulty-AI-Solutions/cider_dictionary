/**
 * Trend Analysis Service
 *
 * Comprehensive trend analysis system for cider collection and experience data.
 * Implements linear regression, trend detection, and predictive analytics to
 * identify patterns in collection growth, ratings, spending, and preferences.
 *
 * Features:
 * - Time-series data grouping (day/week/month/year)
 * - Linear regression analysis with R² confidence
 * - Trend direction detection (increasing/decreasing/stable)
 * - 3-period predictions with decreasing confidence
 * - Chart-ready data formatting
 * - Integration with caching layer
 *
 * @module TrendAnalyzer
 */

import { CiderMasterRecord } from '../../types/cider';
import { ExperienceLog } from '../../types/experience';
import {
  AnalyticsConfig,
  TrendAnalysis,
  TrendDataPoint,
  Prediction,
  ChartData,
  ChartDataset,
} from '../../types/analytics';
import { linearRegression, mean, sum, round } from '../../utils/statistics';
import { cacheManager } from './AnalyticsCacheManager';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Result of a complete trend analysis computation
 */
export interface TrendAnalysisResult {
  /** Collection growth trend over time */
  collectionGrowth: TrendAnalysis | null;
  /** Rating trend over time */
  ratingTrend: TrendAnalysis | null;
  /** Spending trend over time */
  spendingTrend: TrendAnalysis | null;
  /** ABV preference trend over time */
  abvTrend: TrendAnalysis | null;
}

/**
 * Internal data point used during computation
 */
interface InternalDataPoint {
  period: string;
  timestamp: Date;
  value: number;
  count: number;
}

// ============================================================================
// Trend Analyzer Class
// ============================================================================

/**
 * Service for computing trend analyses on cider and experience data
 *
 * Implements the ComputeTrends algorithm from the pseudocode specification:
 * - Groups data by time period (day/week/month/year)
 * - Calculates linear regression for trend lines
 * - Detects trend direction based on slope thresholds
 * - Generates predictions for future periods
 * - Formats data for chart visualization
 */
export class TrendAnalyzer {
  /**
   * Compute all trend analyses for the given data
   *
   * TIME COMPLEXITY: O(n log n) for sorting
   * SPACE COMPLEXITY: O(g) where g = number of groups
   *
   * @param ciders - Array of cider records
   * @param experiences - Array of experience logs
   * @param config - Analytics configuration with time range and grouping
   * @returns Complete trend analysis results
   *
   * @example
   * const analyzer = new TrendAnalyzer();
   * const trends = await analyzer.computeTrends(ciders, experiences, {
   *   timeRange: '1Y',
   *   groupBy: 'month',
   *   enableSampling: false
   * });
   */
  async computeTrends(
    ciders: CiderMasterRecord[],
    experiences: ExperienceLog[],
    config: AnalyticsConfig
  ): Promise<TrendAnalysisResult> {
    const startTime = performance.now();
    console.log('[TrendAnalyzer] Computing trends...');

    try {
      // Check cache first
      const cacheKey = `trends:${config.timeRange}:${config.groupBy}`;
      const cached = await cacheManager.get<TrendAnalysisResult>(cacheKey);
      if (cached) {
        console.log('[TrendAnalyzer] Returning cached trends');
        return cached;
      }

      const result: TrendAnalysisResult = {
        collectionGrowth: null,
        ratingTrend: null,
        spendingTrend: null,
        abvTrend: null,
      };

      // Filter data by time range
      const filteredCiders = this.filterByTimeRange(ciders, config);
      const filteredExperiences = this.filterByTimeRange(experiences, config);

      console.log(
        `[TrendAnalyzer] Filtered data: ${filteredCiders.length} ciders, ${filteredExperiences.length} experiences`
      );

      // Group data by time period
      const groupedCiders = this.groupByTimePeriod(
        filteredCiders,
        config.groupBy,
        'createdAt'
      );
      const groupedExperiences = this.groupByTimePeriod(
        filteredExperiences,
        config.groupBy,
        'date'
      );

      // Collection growth trend
      if (filteredCiders.length > 0) {
        result.collectionGrowth = this.analyzeTrend(
          groupedCiders,
          (group) => group.length,
          'Collection Growth',
          config.groupBy
        );
      }

      // Rating trend
      if (filteredCiders.length > 0) {
        result.ratingTrend = this.analyzeTrend(
          groupedCiders,
          (group) => {
            const ratings = group.map((c) => c.overallRating).filter((r) => r != null);
            return ratings.length > 0 ? mean(ratings) : 0;
          },
          'Average Rating',
          config.groupBy
        );
      }

      // Spending trend
      if (filteredExperiences.length > 0) {
        result.spendingTrend = this.analyzeTrend(
          groupedExperiences,
          (group) => sum(group.map((e) => e.price)),
          'Total Spending',
          config.groupBy
        );

        // ABV preference trend
        if (filteredCiders.length > 0) {
          result.abvTrend = this.analyzeTrend(
            groupedCiders,
            (group) => {
              const abvs = group.map((c) => c.abv).filter((a) => a != null && a > 0);
              return abvs.length > 0 ? mean(abvs) : 0;
            },
            'Average ABV',
            config.groupBy
          );
        }
      }

      // Cache the result
      await cacheManager.set(cacheKey, result, {
        ttl: 5 * 60 * 1000, // 5 minutes
        dependencies: ['ciders', 'experiences'],
      });

      const duration = performance.now() - startTime;
      console.log(`[TrendAnalyzer] Trends computed in ${duration.toFixed(2)}ms`);

      return result;
    } catch (error) {
      console.error('[TrendAnalyzer] Error computing trends:', error);
      throw error;
    }
  }

  /**
   * Analyze a single trend from grouped data
   *
   * @param groupedData - Map of period -> array of items
   * @param valueExtractor - Function to extract numeric value from group
   * @param label - Human-readable label for the trend
   * @param groupBy - Time period grouping
   * @returns Complete trend analysis or null if insufficient data
   */
  analyzeTrend<T>(
    groupedData: Map<string, T[]>,
    valueExtractor: (items: T[]) => number,
    label: string,
    groupBy: string
  ): TrendAnalysis | null {
    try {
      // Build data points
      const dataPoints: InternalDataPoint[] = [];

      groupedData.forEach((items, period) => {
        if (items.length > 0) {
          const value = valueExtractor(items);
          // Parse period back to timestamp for predictions
          const timestamp = this.parsePeriod(period, groupBy);

          dataPoints.push({
            period,
            timestamp,
            value: round(value, 2),
            count: items.length,
          });
        }
      });

      // Need at least 1 data point to return a trend
      if (dataPoints.length === 0) {
        console.log(`[TrendAnalyzer] No data points for ${label}`);
        return null;
      }

      // Sort by period (chronological order)
      dataPoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Single data point - return stable trend
      if (dataPoints.length === 1) {
        const dataPoint = dataPoints[0];
        return {
          label,
          direction: 'stable',
          slope: 0,
          confidence: 0,
          dataPoints: dataPoints.map((dp) => ({
            period: dp.period,
            value: dp.value,
            count: dp.count,
          })),
          predictions: [],
          chartData: this.formatChartData(dataPoints, label),
        };
      }

      // Calculate linear regression
      const regressionData = dataPoints.map((dp, index) => ({
        x: index,
        y: dp.value,
      }));

      const regression = linearRegression(regressionData);

      // Determine trend direction
      let direction: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (regression.slope > 0.1) {
        direction = 'increasing';
      } else if (regression.slope < -0.1) {
        direction = 'decreasing';
      }

      // Generate predictions (3 periods)
      const predictions = this.generatePredictions(
        dataPoints,
        regression,
        groupBy,
        3
      );

      // Format chart data
      const chartData = this.formatChartData(dataPoints, label);

      const trend: TrendAnalysis = {
        label,
        direction,
        slope: regression.slope,
        confidence: regression.r2,
        dataPoints: dataPoints.map((dp) => ({
          period: dp.period,
          value: dp.value,
          count: dp.count,
        })),
        predictions,
        chartData,
      };

      return trend;
    } catch (error) {
      console.error(`[TrendAnalyzer] Error analyzing trend for ${label}:`, error);
      return null;
    }
  }

  /**
   * Group items by time period
   *
   * @param items - Array of items with date fields
   * @param groupBy - Time period (day/week/month/quarter/year)
   * @param dateField - Name of the date field to group by
   * @returns Map of period string -> items
   */
  groupByTimePeriod<T extends Record<string, any>>(
    items: T[],
    groupBy: string,
    dateField: string
  ): Map<string, T[]> {
    const groups = new Map<string, T[]>();

    for (const item of items) {
      const date = item[dateField];
      if (!date) continue;

      // Convert to Date if needed
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) continue; // Invalid date

      const periodKey = this.formatPeriod(dateObj, groupBy);

      if (!groups.has(periodKey)) {
        groups.set(periodKey, []);
      }
      groups.get(periodKey)!.push(item);
    }

    return groups;
  }

  /**
   * Format a date as a period string
   *
   * @param date - Date to format
   * @param groupBy - Time period type
   * @returns Period string (e.g., "2024-01" for month, "2024-W12" for week)
   */
  private formatPeriod(date: Date, groupBy: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    switch (groupBy) {
      case 'day':
        return `${year}-${month}-${day}`;

      case 'week': {
        const weekNum = this.getWeekNumber(date);
        return `${year}-W${String(weekNum).padStart(2, '0')}`;
      }

      case 'month':
        return `${year}-${month}`;

      case 'quarter': {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `${year}-Q${quarter}`;
      }

      case 'year':
        return `${year}`;

      default:
        return `${year}-${month}`;
    }
  }

  /**
   * Parse a period string back to a Date
   *
   * @param period - Period string
   * @param groupBy - Time period type
   * @returns Date object representing start of period
   */
  private parsePeriod(period: string, groupBy: string): Date {
    try {
      switch (groupBy) {
        case 'day': {
          const [year, month, day] = period.split('-').map(Number);
          return new Date(year, month - 1, day);
        }

        case 'week': {
          const [year, weekPart] = period.split('-W');
          const weekNum = parseInt(weekPart, 10);
          return this.getDateFromWeek(parseInt(year, 10), weekNum);
        }

        case 'month': {
          const [year, month] = period.split('-').map(Number);
          return new Date(year, month - 1, 1);
        }

        case 'quarter': {
          const [year, quarterPart] = period.split('-Q');
          const quarter = parseInt(quarterPart, 10);
          return new Date(year, (quarter - 1) * 3, 1);
        }

        case 'year': {
          const year = parseInt(period, 10);
          return new Date(year, 0, 1);
        }

        default: {
          const [year, month] = period.split('-').map(Number);
          return new Date(year, month - 1, 1);
        }
      }
    } catch (error) {
      console.error(`[TrendAnalyzer] Error parsing period ${period}:`, error);
      return new Date();
    }
  }

  /**
   * Get ISO week number for a date
   *
   * @param date - Date to get week number for
   * @returns Week number (1-53)
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  /**
   * Get date from year and week number
   *
   * @param year - Year
   * @param week - Week number (1-53)
   * @returns Date representing Monday of that week
   */
  private getDateFromWeek(year: number, week: number): Date {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const isoWeekStart = simple;
    if (dow <= 4) {
      isoWeekStart.setDate(simple.getDate() - simple.getDay() + 1);
    } else {
      isoWeekStart.setDate(simple.getDate() + 8 - simple.getDay());
    }
    return isoWeekStart;
  }

  /**
   * Generate future predictions based on regression
   *
   * @param dataPoints - Historical data points
   * @param regression - Linear regression model
   * @param groupBy - Time period type
   * @param numPredictions - Number of future periods to predict
   * @returns Array of predictions
   */
  private generatePredictions(
    dataPoints: InternalDataPoint[],
    regression: { slope: number; intercept: number; r2: number },
    groupBy: string,
    numPredictions: number
  ): Prediction[] {
    const predictions: Prediction[] = [];

    if (dataPoints.length === 0) {
      return predictions;
    }

    const lastPoint = dataPoints[dataPoints.length - 1];
    const lastIndex = dataPoints.length - 1;

    for (let i = 1; i <= numPredictions; i++) {
      // Add period to last timestamp
      const nextDate = this.addPeriod(lastPoint.timestamp, i, groupBy);
      const nextPeriod = this.formatPeriod(nextDate, groupBy);

      // Calculate predicted value using regression
      const predictedValue = regression.intercept + regression.slope * (lastIndex + i);

      // Don't predict negative values
      const value = Math.max(0, predictedValue);

      // Decrease confidence for each future period (10% per period)
      const confidence = Math.max(0, regression.r2 - i * 0.1);

      predictions.push({
        period: nextPeriod,
        value: round(value, 2),
        confidence: round(confidence, 2),
      });
    }

    return predictions;
  }

  /**
   * Add periods to a date
   *
   * @param date - Base date
   * @param periods - Number of periods to add
   * @param groupBy - Period type
   * @returns New date with periods added
   */
  private addPeriod(date: Date, periods: number, groupBy: string): Date {
    const newDate = new Date(date);

    switch (groupBy) {
      case 'day':
        newDate.setDate(newDate.getDate() + periods);
        break;

      case 'week':
        newDate.setDate(newDate.getDate() + periods * 7);
        break;

      case 'month':
        newDate.setMonth(newDate.getMonth() + periods);
        break;

      case 'quarter':
        newDate.setMonth(newDate.getMonth() + periods * 3);
        break;

      case 'year':
        newDate.setFullYear(newDate.getFullYear() + periods);
        break;

      default:
        newDate.setMonth(newDate.getMonth() + periods);
    }

    return newDate;
  }

  /**
   * Format data points for chart visualization
   *
   * @param dataPoints - Array of data points
   * @param label - Label for the dataset
   * @returns Chart-ready data structure
   */
  private formatChartData(
    dataPoints: InternalDataPoint[],
    label: string
  ): ChartData {
    const labels = dataPoints.map((dp) => this.formatPeriodLabel(dp.period));
    const values = dataPoints.map((dp) => dp.value);

    const dataset: ChartDataset = {
      label,
      data: values,
      color: (opacity = 1) => `rgba(34, 128, 176, ${opacity})`,
      strokeWidth: 2,
    };

    return {
      labels,
      datasets: [dataset],
      min: Math.min(...values),
      max: Math.max(...values),
      average: mean(values),
    };
  }

  /**
   * Format a period string for display
   *
   * @param period - Period string (e.g., "2024-01", "2024-W12")
   * @returns Formatted label (e.g., "Jan 2024", "Week 12")
   */
  private formatPeriodLabel(period: string): string {
    try {
      if (period.includes('W')) {
        // Week format: 2024-W12
        const [, weekPart] = period.split('-W');
        return `W${weekPart}`;
      } else if (period.includes('Q')) {
        // Quarter format: 2024-Q1
        const [year, quarterPart] = period.split('-Q');
        return `Q${quarterPart} ${year}`;
      } else if (period.length === 4) {
        // Year format: 2024
        return period;
      } else if (period.split('-').length === 2) {
        // Month format: 2024-01
        const [year, month] = period.split('-');
        const monthNames = [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ];
        return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
      } else {
        // Day format: 2024-01-15
        const [, month, day] = period.split('-');
        return `${month}/${day}`;
      }
    } catch (error) {
      return period;
    }
  }

  /**
   * Filter items by time range from config
   *
   * @param items - Items with date fields
   * @param config - Analytics config with time range
   * @returns Filtered items within time range
   */
  private filterByTimeRange<T extends Record<string, any>>(
    items: T[],
    config: AnalyticsConfig
  ): T[] {
    // If custom date range provided, use it
    if (config.dateRange) {
      return items.filter((item) => {
        const date = item.createdAt || item.date;
        if (!date) return false;
        const dateObj = date instanceof Date ? date : new Date(date);
        return (
          dateObj >= config.dateRange!.start && dateObj <= config.dateRange!.end
        );
      });
    }

    // For 'ALL' time range, don't filter
    if (config.timeRange === 'ALL') {
      return items;
    }

    // Find the latest date in the dataset to use as reference
    let referenceDate = new Date();
    const itemDates = items
      .map((item) => {
        const date = item.createdAt || item.date;
        return date instanceof Date ? date : new Date(date);
      })
      .filter((d) => !isNaN(d.getTime()));

    if (itemDates.length > 0) {
      referenceDate = new Date(Math.max(...itemDates.map((d) => d.getTime())));
    }

    let startDate: Date;

    switch (config.timeRange) {
      case '1M':
        startDate = new Date(referenceDate);
        startDate.setMonth(referenceDate.getMonth() - 1);
        break;
      case '3M':
        startDate = new Date(referenceDate);
        startDate.setMonth(referenceDate.getMonth() - 3);
        break;
      case '6M':
        startDate = new Date(referenceDate);
        startDate.setMonth(referenceDate.getMonth() - 6);
        break;
      case '1Y':
        startDate = new Date(referenceDate);
        startDate.setFullYear(referenceDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date(referenceDate);
        startDate.setMonth(referenceDate.getMonth() - 3);
    }

    return items.filter((item) => {
      const date = item.createdAt || item.date;
      if (!date) return false;
      const dateObj = date instanceof Date ? date : new Date(date);
      return dateObj >= startDate;
    });
  }
}

// ============================================================================
// Exports
// ============================================================================

/**
 * Shared singleton instance
 */
export const trendAnalyzer = new TrendAnalyzer();

export default TrendAnalyzer;
