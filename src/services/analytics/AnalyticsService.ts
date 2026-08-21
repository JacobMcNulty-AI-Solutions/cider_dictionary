// Phase 3: Analytics Service
// Personal Collection Completeness Algorithm and Enhanced Analytics

import { CiderMasterRecord, TraditionalStyle, Rating } from '../../types/cider';
import { ExperienceLog, VenueInfo } from '../../types/experience';
import { sqliteService } from '../database/sqlite';
import { YourTypeSummary, OverdueCider } from '../../types/analytics';
import { HIGH_RATING_THRESHOLD } from './analyticsConstants';

const SWEETNESS_LABELS: Record<string, string> = {
  bone_dry: 'bone dry',
  dry: 'dry',
  off_dry: 'off-dry',
  medium: 'medium',
  sweet: 'sweet',
};

const CARBONATION_LABELS: Record<string, string> = {
  still: 'still',
  lightly_sparkling: 'lightly sparkling',
  sparkling: 'sparkling',
  highly_carbonated: 'highly carbonated',
};

const MS_PER_DAY = 86400000;

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
    giftedCount: number;
    paidCount: number;
    giftedRatio: number;
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

      // Filter experiences by time range (but keep all ciders for collection stats)
      const experiencesInRange = allExperiences.filter(exp =>
        exp.date >= cutoffDate
      );

      // Only filter ciders by time range for trends/value analytics, not collection stats
      const cidersInRange = timeRange === 'ALL'
        ? allCiders
        : allCiders.filter(cider =>
            experiencesInRange.some(exp => exp.ciderId === cider.id)
          );

      // Calculate personal completeness based on user's collection only (NOT global)
      const completionPercentage = await this.calculatePersonalCompleteness(allCiders);

      // Build analytics data
      // NOTE: Collection stats use ALL ciders, not time-filtered ciders
      const analyticsData: AnalyticsData = {
        collectionStats: {
          ...this.calculateCollectionStats(allCiders, allExperiences), // Always show all ciders
          completionPercentage
        },
        valueAnalytics: this.calculateValueAnalytics(cidersInRange, experiencesInRange),
        venueAnalytics: this.calculateVenueAnalytics(experiencesInRange),
        trends: this.calculateTrends(experiencesInRange, timeRange, cidersInRange)
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

    const producers = new Set(ciders.map(c => (c.brand || '').toLowerCase()));
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
      const brandLower = (cider.brand || '').toLowerCase();
      const nameLower = (cider.name || '').toLowerCase();

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
    // Gifted experiences carry no price signal — exclude them from all
    // spend/value math but keep their counts for the ratio tile.
    const paid = experiences.filter(exp => !exp.gifted);
    const giftedCount = experiences.length - paid.length;
    const paidCount = paid.length;
    const giftedRatio = experiences.length === 0
      ? 0
      : Math.round((giftedCount / experiences.length) * 100) / 100;

    if (paid.length === 0) {
      return {
        bestValue: null,
        worstValue: null,
        averagePricePerPint: 0,
        monthlySpending: 0,
        giftedCount,
        paidCount,
        giftedRatio
      };
    }

    // Find best and worst value experiences (paid only)
    const sortedByValue = [...paid].sort((a, b) => a.pricePerPint - b.pricePerPint);
    const bestValueExp = sortedByValue[0];
    const worstValueExp = sortedByValue[sortedByValue.length - 1];

    const bestValueCider = ciders.find(c => c.id === bestValueExp?.ciderId);
    const worstValueCider = ciders.find(c => c.id === worstValueExp?.ciderId);

    // Calculate averages
    const totalPricePerPint = paid.reduce((sum, exp) => sum + exp.pricePerPint, 0);
    const averagePricePerPint = totalPricePerPint / paid.length;

    // Monthly spending (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthlySpending = paid
      .filter(exp => exp.date >= thirtyDaysAgo)
      .reduce((sum, exp) => sum + exp.price, 0);

    return {
      bestValue: bestValueCider ? {
        cider: bestValueCider,
        pricePerPint: bestValueExp.pricePerPint,
        venue: bestValueExp.venue?.name ?? 'Unknown venue'
      } : null,
      worstValue: worstValueCider ? {
        cider: worstValueCider,
        pricePerPint: worstValueExp.pricePerPint,
        venue: worstValueExp.venue?.name ?? 'Unknown venue'
      } : null,
      averagePricePerPint: Math.round(averagePricePerPint * 100) / 100,
      monthlySpending: Math.round(monthlySpending * 100) / 100,
      giftedCount,
      paidCount,
      giftedRatio
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

    // Group by venue — visits count every experience (including gifted),
    // but paid totals only accumulate for non-gifted ones so cheapest /
    // most-expensive don't get pulled toward zero by free drinks.
    const venueStats = experiences.reduce((acc, exp) => {
      if (!exp.venue?.name) return acc;
      const venueKey = exp.venue.name.toLowerCase();

      if (!acc[venueKey]) {
        acc[venueKey] = {
          venue: exp.venue,
          visits: 0,
          paidVisits: 0,
          totalSpent: 0,
          totalPricePerPint: 0
        };
      }

      acc[venueKey].visits++;
      if (!exp.gifted) {
        acc[venueKey].paidVisits++;
        acc[venueKey].totalSpent += exp.price;
        acc[venueKey].totalPricePerPint += exp.pricePerPint;
      }

      return acc;
    }, {} as Record<string, any>);

    const venues = Object.values(venueStats);

    // Find most visited (any experience counts, gifted or not)
    const mostVisited = venues.reduce((max, venue) =>
      venue.visits > max.visits ? venue : max, venues[0]
    );

    // Cheapest / most expensive only meaningful for venues with paid visits.
    const paidVenues = venues.filter(v => v.paidVisits > 0);
    const cheapest = paidVenues.length > 0
      ? paidVenues.reduce((min, venue) => {
          const avg = venue.totalPricePerPint / venue.paidVisits;
          const minAvg = min.totalPricePerPint / min.paidVisits;
          return avg < minAvg ? venue : min;
        }, paidVenues[0])
      : null;

    const mostExpensive = paidVenues.length > 0
      ? paidVenues.reduce((max, venue) => {
          const avg = venue.totalPricePerPint / venue.paidVisits;
          const maxAvg = max.totalPricePerPint / max.paidVisits;
          return avg > maxAvg ? venue : max;
        }, paidVenues[0])
      : null;

    return {
      mostVisited: mostVisited ? {
        venue: mostVisited.venue,
        visitCount: mostVisited.visits
      } : null,
      cheapest: cheapest ? {
        venue: cheapest.venue,
        averagePrice: Math.round((cheapest.totalPricePerPint / cheapest.paidVisits) * 100) / 100
      } : null,
      mostExpensive: mostExpensive ? {
        venue: mostExpensive.venue,
        averagePrice: Math.round((mostExpensive.totalPricePerPint / mostExpensive.paidVisits) * 100) / 100
      } : null,
      totalVenues: venues.length
    };
  }

  private calculateTrends(experiences: ExperienceLog[], timeRange: TimeRange, ciders: CiderMasterRecord[] = []) {
    // Monthly trend
    const monthlyData = experiences.reduce((acc, exp) => {
      const monthKey = exp.date.toISOString().substring(0, 7); // YYYY-MM

      if (!acc[monthKey]) {
        acc[monthKey] = { count: 0, spending: 0 };
      }

      acc[monthKey].count++;
      if (!exp.gifted) {
        acc[monthKey].spending += exp.price;
      }

      return acc;
    }, {} as Record<string, { count: number; spending: number }>);

    const monthlyTrend = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        count: data.count,
        spending: Math.round(data.spending * 100) / 100
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Rating distribution from ciders (not experiences - ciders have ratings, experiences don't)
    const ratingDistribution: { rating: number; count: number }[] = [];
    const ratingCounts = ciders.reduce((acc, cider) => {
      acc[cider.overallRating] = (acc[cider.overallRating] || 0) + 1;
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

  // ==========================================================================
  // Analytics Enhancement — Feature 2: "Your Type" Summary
  // ==========================================================================

  public generateYourTypeSummary(
    ciders: CiderMasterRecord[],
    experiences: ExperienceLog[]
  ): YourTypeSummary {
    const noData: YourTypeSummary = {
      sentence: '',
      topSweetness: null,
      topCarbonation: null,
      topBrands: [],
      hasEnoughData: false,
    };

    const highlyRated = experiences.filter(
      exp => typeof exp.rating === 'number' && exp.rating >= HIGH_RATING_THRESHOLD
    );
    if (highlyRated.length < 3) return noData;

    const cidersById = new Map<string, CiderMasterRecord>();
    for (const cider of ciders) cidersById.set(cider.id, cider);

    const sweetnessCounts = new Map<string, number>();
    const carbonationCounts = new Map<string, number>();
    const brandCounts = new Map<string, number>();

    for (const exp of highlyRated) {
      const cider = cidersById.get(exp.ciderId);
      if (!cider) continue;
      if (cider.sweetness) {
        sweetnessCounts.set(cider.sweetness, (sweetnessCounts.get(cider.sweetness) || 0) + 1);
      }
      if (cider.carbonation) {
        carbonationCounts.set(cider.carbonation, (carbonationCounts.get(cider.carbonation) || 0) + 1);
      }
      const brand = cider.brand?.trim();
      if (brand) {
        brandCounts.set(brand, (brandCounts.get(brand) || 0) + 1);
      }
    }

    const pickMode = (counts: Map<string, number>): string | null => {
      if (counts.size === 0) return null;
      const entries = Array.from(counts.entries());
      entries.sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      });
      return entries[0][0];
    };

    const topSweetnessKey = pickMode(sweetnessCounts);
    const topCarbonationKey = pickMode(carbonationCounts);
    const topSweetness = topSweetnessKey ? SWEETNESS_LABELS[topSweetnessKey] || null : null;
    const topCarbonation = topCarbonationKey ? CARBONATION_LABELS[topCarbonationKey] || null : null;

    const brandEntries = Array.from(brandCounts.entries()).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    });
    const topBrands = brandEntries.slice(0, 2).map(([b]) => b);

    // Degenerate fast-path: no meaningful signal to describe.
    if (!topSweetness && !topCarbonation && topBrands.length === 0) return noData;

    let sentence = 'You tend to prefer ';
    if (topSweetness) sentence += `${topSweetness}, `;
    sentence += topCarbonation ? `${topCarbonation} ciders` : 'ciders';
    if (topBrands.length === 1) sentence += ` from ${topBrands[0]}`;
    else if (topBrands.length === 2) sentence += ` from ${topBrands[0]} and ${topBrands[1]}`;
    sentence += `, rated ${HIGH_RATING_THRESHOLD}+.`;

    return {
      sentence,
      topSweetness,
      topCarbonation,
      topBrands,
      hasEnoughData: true,
    };
  }

  // ==========================================================================
  // Analytics Enhancement — Feature 6: Haven't Had in a While
  // ==========================================================================

  public computeOverdueCiders(
    ciders: CiderMasterRecord[],
    experiences: ExperienceLog[],
    monthsThreshold: number = 3
  ): OverdueCider[] {
    const now = Date.now();
    const thresholdDate = new Date();
    thresholdDate.setMonth(thresholdDate.getMonth() - monthsThreshold);

    const groupedByCider = new Map<string, ExperienceLog[]>();
    for (const exp of experiences) {
      const list = groupedByCider.get(exp.ciderId) || [];
      list.push(exp);
      groupedByCider.set(exp.ciderId, list);
    }

    const result: OverdueCider[] = [];
    for (const cider of ciders) {
      const group = groupedByCider.get(cider.id);
      if (!group || group.length === 0) continue;

      const validRatings = group
        .map(e => e.rating)
        .filter((r): r is number => typeof r === 'number');
      if (validRatings.length === 0) continue;

      const avgRating = validRatings.reduce((a, b) => a + b, 0) / validRatings.length;
      const roundedAvg = Math.round(avgRating * 10) / 10;
      const experienceCount = validRatings.length;

      if (roundedAvg < HIGH_RATING_THRESHOLD) continue;
      if (experienceCount < 2) continue;

      let lastExperienceDate = new Date(group[0].date);
      for (const exp of group) {
        const d = new Date(exp.date);
        if (d > lastExperienceDate) lastExperienceDate = d;
      }
      if (lastExperienceDate >= thresholdDate) continue;

      const daysSinceLastTried = Math.floor((now - lastExperienceDate.getTime()) / MS_PER_DAY);
      const monthsSinceLastTried = Math.floor(daysSinceLastTried / 30);

      result.push({
        cider,
        lastExperienceDate,
        avgRating: roundedAvg,
        experienceCount,
        daysSinceLastTried,
        monthsSinceLastTried,
      });
    }

    result.sort((a, b) => {
      if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
      return b.daysSinceLastTried - a.daysSinceLastTried;
    });

    return result;
  }
}

export const analyticsService = AnalyticsService.getInstance();
export default AnalyticsService;