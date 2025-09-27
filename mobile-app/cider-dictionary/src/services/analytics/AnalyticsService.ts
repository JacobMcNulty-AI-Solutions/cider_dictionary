// Phase 3: Analytics Service
// Personal Collection Completeness Algorithm and Enhanced Analytics

import { CiderMasterRecord, TraditionalStyle, Rating } from '../../types/cider';
import { ExperienceLog, VenueInfo } from '../../types/experience';
import { sqliteService } from '../database/sqlite';

export interface AnalyticsData {
  collectionStats: {
    totalCiders: number;
    averageRating: number;
    completionPercentage: number;
    totalExperiences: number;
  };
  valueAnalytics: {
    bestValue: {
      cider: CiderMasterRecord;
      pricePerPint: number;
      venue: string;
    } | null;
    worstValue: {
      cider: CiderMasterRecord;
      pricePerPint: number;
      venue: string;
    } | null;
    averagePricePerPint: number;
    monthlySpending: number;
  };
  venueAnalytics: {
    mostVisited: {
      venue: VenueInfo;
      visitCount: number;
    } | null;
    cheapest: {
      venue: VenueInfo;
      averagePrice: number;
    } | null;
    mostExpensive: {
      venue: VenueInfo;
      averagePrice: number;
    } | null;
    totalVenues: number;
  };
  trends: {
    monthlyTrend: { month: string; count: number; spending: number }[];
    ratingDistribution: { rating: number; count: number }[];
  };
}

export type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

class AnalyticsService {
  private static instance: AnalyticsService;

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  async calculateAnalytics(timeRange: TimeRange = '3M'): Promise<AnalyticsData> {
    const startTime = Date.now();

    try {
      const cutoffDate = this.getTimeRangeCutoff(timeRange);

      // Parallel data fetching for performance (<500ms target)
      const [allCiders, allExperiences] = await Promise.all([
        sqliteService.getAllCiders(),
        sqliteService.getAllExperiences()
      ]);

      // Filter by time range
      const experiencesInRange = allExperiences.filter(exp =>
        exp.date >= cutoffDate
      );

      const cidersInRange = timeRange === 'ALL'
        ? allCiders
        : allCiders.filter(cider =>
            experiencesInRange.some(exp => exp.ciderId === cider.id)
          );

      // Calculate personal completeness based on user's collection only (NOT global)
      const completionPercentage = await this.calculatePersonalCompleteness(allCiders);

      // Build analytics data
      const analyticsData: AnalyticsData = {
        collectionStats: {
          ...this.calculateCollectionStats(cidersInRange, experiencesInRange),
          completionPercentage
        },
        valueAnalytics: this.calculateValueAnalytics(cidersInRange, experiencesInRange),
        venueAnalytics: this.calculateVenueAnalytics(experiencesInRange),
        trends: this.calculateTrends(experiencesInRange, timeRange)
      };

      const calculationTime = Date.now() - startTime;
      console.log(`Analytics calculated in ${calculationTime}ms (target: <500ms)`);

      return analyticsData;
    } catch (error) {
      console.error('Failed to calculate analytics:', error);
      throw error;
    }
  }

  // CRITICAL: Personal Collection Completeness Algorithm
  // This calculates diversity ONLY within the user's own collection, NOT against a global database
  private async calculatePersonalCompleteness(userCiders: CiderMasterRecord[]): Promise<number> {
    if (userCiders.length === 0) return 0;

    const weights = {
      producer: 0.3,      // Brand diversity within user's collection
      style: 0.25,        // Style diversity within user's collection
      region: 0.2,        // Regional diversity within user's collection
      characteristics: 0.15, // Technical characteristic diversity
      quality: 0.1        // Quality distribution balance
    };

    // Calculate diversity scores based on user's collection only
    const [
      producerScore,
      styleScore,
      regionScore,
      characteristicsScore,
      qualityScore
    ] = await Promise.all([
      this.calculateProducerDiversity(userCiders),
      this.calculateStyleDiversity(userCiders),
      this.calculateRegionalDiversity(userCiders),
      this.calculateCharacteristicDiversity(userCiders),
      this.calculateQualityDistribution(userCiders)
    ]);

    // Weighted combination with diminishing returns
    const completenessScore =
      (producerScore * weights.producer) +
      (styleScore * weights.style) +
      (regionScore * weights.region) +
      (characteristicsScore * weights.characteristics) +
      (qualityScore * weights.quality);

    return Math.min(completenessScore, 100.0);
  }

  private calculateProducerDiversity(ciders: CiderMasterRecord[]): number {
    if (ciders.length === 0) return 0;

    const producers = new Set(ciders.map(c => c.brand.toLowerCase()));
    const uniqueProducers = producers.size;
    const totalCiders = ciders.length;

    // Diversity increases with more unique producers relative to collection size
    const diversityRatio = uniqueProducers / totalCiders;

    // Apply diminishing returns: good diversity is around 0.7-0.8 ratio
    const normalizedScore = Math.min(diversityRatio / 0.75, 1.0) * 100;

    return Math.round(normalizedScore);
  }

  private calculateStyleDiversity(ciders: CiderMasterRecord[]): number {
    if (ciders.length === 0) return 0;

    // Calculate Shannon entropy for style diversity within user's collection
    const styleCounts = ciders.reduce((acc, cider) => {
      const style = cider.traditionalStyle || 'unknown';
      acc[style] = (acc[style] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalCiders = ciders.length;
    let entropy = 0;

    for (const count of Object.values(styleCounts)) {
      if (count > 0) {
        const probability = count / totalCiders;
        entropy -= probability * Math.log2(probability);
      }
    }

    // Normalize to 0-100 scale based on possible styles in user's collection
    const uniqueStyles = Object.keys(styleCounts).length;
    const maxPossibleEntropy = Math.log2(uniqueStyles);

    return maxPossibleEntropy > 0 ? Math.round((entropy / maxPossibleEntropy) * 100) : 0;
  }

  private calculateRegionalDiversity(ciders: CiderMasterRecord[]): number {
    // For MVP, we'll use a simplified region detection from brand names
    // In production, this would use proper geographical data

    const regionKeywords = {
      'southwest': ['somerset', 'devon', 'cornwall', 'dorset'],
      'southeast': ['kent', 'surrey', 'sussex', 'hampshire'],
      'westcountry': ['gloucestershire', 'herefordshire', 'worcestershire'],
      'midlands': ['warwickshire', 'staffordshire', 'shropshire'],
      'north': ['yorkshire', 'lancashire', 'cumbria'],
      'wales': ['wales', 'cymru', 'pembrokeshire', 'monmouthshire'],
      'scotland': ['scotland', 'scottish', 'highlands'],
      'ireland': ['ireland', 'irish', 'cork', 'dublin']
    };

    const detectedRegions = new Set<string>();

    ciders.forEach(cider => {
      const brandLower = cider.brand.toLowerCase();
      const nameLower = cider.name.toLowerCase();

      for (const [region, keywords] of Object.entries(regionKeywords)) {
        if (keywords.some(keyword =>
          brandLower.includes(keyword) || nameLower.includes(keyword)
        )) {
          detectedRegions.add(region);
          break;
        }
      }
    });

    // Score based on regional diversity
    const maxRegions = Object.keys(regionKeywords).length;
    const diversityScore = (detectedRegions.size / maxRegions) * 100;

    return Math.round(diversityScore);
  }

  private calculateCharacteristicDiversity(ciders: CiderMasterRecord[]): number {
    if (ciders.length === 0) return 0;

    let diversityScore = 0;
    let criteria = 0;

    // ABV range diversity
    if (ciders.length > 1) {
      const abvValues = ciders.map(c => c.abv);
      const abvRange = Math.max(...abvValues) - Math.min(...abvValues);
      diversityScore += Math.min(abvRange / 8, 1) * 25; // Max 25 points for 8% range
      criteria++;
    }

    // Sweetness diversity
    const sweetnessValues = ciders
      .filter(c => c.sweetness)
      .map(c => c.sweetness!);
    if (sweetnessValues.length > 0) {
      const uniqueSweetness = new Set(sweetnessValues);
      diversityScore += (uniqueSweetness.size / 5) * 25; // Max 25 points for all 5 levels
      criteria++;
    }

    // Carbonation diversity
    const carbonationValues = ciders
      .filter(c => c.carbonation)
      .map(c => c.carbonation!);
    if (carbonationValues.length > 0) {
      const uniqueCarbonation = new Set(carbonationValues);
      diversityScore += (uniqueCarbonation.size / 4) * 25; // Max 25 points for all 4 levels
      criteria++;
    }

    // Color diversity
    const colorValues = ciders
      .filter(c => c.color)
      .map(c => c.color!);
    if (colorValues.length > 0) {
      const uniqueColors = new Set(colorValues);
      diversityScore += (uniqueColors.size / 7) * 25; // Max 25 points for all 7 colors
      criteria++;
    }

    return criteria > 0 ? Math.round(diversityScore / criteria) : 0;
  }

  private calculateQualityDistribution(ciders: CiderMasterRecord[]): number {
    if (ciders.length === 0) return 0;

    const ratingCounts = ciders.reduce((acc, cider) => {
      acc[cider.overallRating] = (acc[cider.overallRating] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // Ideal distribution is roughly bell curve centered around 6-7
    const idealDistribution = {
      1: 0.01, 2: 0.02, 3: 0.05, 4: 0.10, 5: 0.15,
      6: 0.20, 7: 0.25, 8: 0.15, 9: 0.05, 10: 0.02
    };

    let deviation = 0;
    const total = ciders.length;

    for (let rating = 1; rating <= 10; rating++) {
      const actualRatio = (ratingCounts[rating] || 0) / total;
      const idealRatio = idealDistribution[rating as keyof typeof idealDistribution];
      deviation += Math.abs(actualRatio - idealRatio);
    }

    // Convert deviation to score (lower deviation = higher score)
    const maxDeviation = 2; // Worst possible deviation
    const qualityScore = Math.max(0, (1 - deviation / maxDeviation)) * 100;

    return Math.round(qualityScore);
  }

  private calculateCollectionStats(
    ciders: CiderMasterRecord[],
    experiences: ExperienceLog[]
  ) {
    if (ciders.length === 0) {
      return {
        totalCiders: 0,
        averageRating: 0,
        totalExperiences: 0
      };
    }

    const totalRating = ciders.reduce((sum, cider) => sum + cider.overallRating, 0);

    return {
      totalCiders: ciders.length,
      averageRating: Math.round((totalRating / ciders.length) * 10) / 10,
      totalExperiences: experiences.length
    };
  }

  private calculateValueAnalytics(
    ciders: CiderMasterRecord[],
    experiences: ExperienceLog[]
  ) {
    if (experiences.length === 0) {
      return {
        bestValue: null,
        worstValue: null,
        averagePricePerPint: 0,
        monthlySpending: 0
      };
    }

    // Find best and worst value experiences
    const sortedByValue = [...experiences].sort((a, b) => a.pricePerPint - b.pricePerPint);
    const bestValueExp = sortedByValue[0];
    const worstValueExp = sortedByValue[sortedByValue.length - 1];

    const bestValueCider = ciders.find(c => c.id === bestValueExp?.ciderId);
    const worstValueCider = ciders.find(c => c.id === worstValueExp?.ciderId);

    // Calculate averages
    const totalPricePerPint = experiences.reduce((sum, exp) => sum + exp.pricePerPint, 0);
    const averagePricePerPint = totalPricePerPint / experiences.length;

    // Monthly spending (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthlySpending = experiences
      .filter(exp => exp.date >= thirtyDaysAgo)
      .reduce((sum, exp) => sum + exp.price, 0);

    return {
      bestValue: bestValueCider ? {
        cider: bestValueCider,
        pricePerPint: bestValueExp.pricePerPint,
        venue: bestValueExp.venue.name
      } : null,
      worstValue: worstValueCider ? {
        cider: worstValueCider,
        pricePerPint: worstValueExp.pricePerPint,
        venue: worstValueExp.venue.name
      } : null,
      averagePricePerPint: Math.round(averagePricePerPint * 100) / 100,
      monthlySpending: Math.round(monthlySpending * 100) / 100
    };
  }

  private calculateVenueAnalytics(experiences: ExperienceLog[]) {
    if (experiences.length === 0) {
      return {
        mostVisited: null,
        cheapest: null,
        mostExpensive: null,
        totalVenues: 0
      };
    }

    // Group by venue
    const venueStats = experiences.reduce((acc, exp) => {
      const venueKey = exp.venue.name.toLowerCase();

      if (!acc[venueKey]) {
        acc[venueKey] = {
          venue: exp.venue,
          visits: 0,
          totalSpent: 0,
          totalPricePerPint: 0
        };
      }

      acc[venueKey].visits++;
      acc[venueKey].totalSpent += exp.price;
      acc[venueKey].totalPricePerPint += exp.pricePerPint;

      return acc;
    }, {} as Record<string, any>);

    const venues = Object.values(venueStats);

    // Find most visited
    const mostVisited = venues.reduce((max, venue) =>
      venue.visits > max.visits ? venue : max, venues[0]
    );

    // Find cheapest and most expensive by average price per pint
    const cheapest = venues.reduce((min, venue) => {
      const avgPricePerPint = venue.totalPricePerPint / venue.visits;
      const minAvgPricePerPint = min.totalPricePerPint / min.visits;
      return avgPricePerPint < minAvgPricePerPint ? venue : min;
    }, venues[0]);

    const mostExpensive = venues.reduce((max, venue) => {
      const avgPricePerPint = venue.totalPricePerPint / venue.visits;
      const maxAvgPricePerPint = max.totalPricePerPint / max.visits;
      return avgPricePerPint > maxAvgPricePerPint ? venue : max;
    }, venues[0]);

    return {
      mostVisited: mostVisited ? {
        venue: mostVisited.venue,
        visitCount: mostVisited.visits
      } : null,
      cheapest: cheapest ? {
        venue: cheapest.venue,
        averagePrice: Math.round((cheapest.totalPricePerPint / cheapest.visits) * 100) / 100
      } : null,
      mostExpensive: mostExpensive ? {
        venue: mostExpensive.venue,
        averagePrice: Math.round((mostExpensive.totalPricePerPint / mostExpensive.visits) * 100) / 100
      } : null,
      totalVenues: venues.length
    };
  }

  private calculateTrends(experiences: ExperienceLog[], timeRange: TimeRange) {
    // Monthly trend
    const monthlyData = experiences.reduce((acc, exp) => {
      const monthKey = exp.date.toISOString().substring(0, 7); // YYYY-MM

      if (!acc[monthKey]) {
        acc[monthKey] = { count: 0, spending: 0 };
      }

      acc[monthKey].count++;
      acc[monthKey].spending += exp.price;

      return acc;
    }, {} as Record<string, { count: number; spending: number }>);

    const monthlyTrend = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        count: data.count,
        spending: Math.round(data.spending * 100) / 100
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Rating distribution (from experiences if available, otherwise from ciders)
    const ratingDistribution: { rating: number; count: number }[] = [];
    const ratingCounts = experiences
      .filter(exp => exp.rating)
      .reduce((acc, exp) => {
        acc[exp.rating!] = (acc[exp.rating!] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

    for (let rating = 1; rating <= 10; rating++) {
      ratingDistribution.push({
        rating,
        count: ratingCounts[rating] || 0
      });
    }

    return {
      monthlyTrend,
      ratingDistribution
    };
  }

  private getTimeRangeCutoff(timeRange: TimeRange): Date {
    const now = new Date();
    const cutoff = new Date(now);

    switch (timeRange) {
      case '1M':
        cutoff.setMonth(cutoff.getMonth() - 1);
        break;
      case '3M':
        cutoff.setMonth(cutoff.getMonth() - 3);
        break;
      case '6M':
        cutoff.setMonth(cutoff.getMonth() - 6);
        break;
      case '1Y':
        cutoff.setFullYear(cutoff.getFullYear() - 1);
        break;
      case 'ALL':
        cutoff.setFullYear(2000); // Far in the past
        break;
    }

    return cutoff;
  }
}

export const analyticsService = AnalyticsService.getInstance();
export default AnalyticsService;