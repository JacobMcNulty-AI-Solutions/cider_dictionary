// AnalyticsService Tests
// Tests for Phase 3 analytics service with personal completeness algorithm

import AnalyticsService from '../AnalyticsService';
import { CiderMasterRecord, TraditionalStyle, Rating } from '../../../types/cider';
import { ExperienceLog } from '../../../types/experience';
import { sqliteService } from '../../database/sqlite';

// Mock SQLite service
jest.mock('../../database/sqlite', () => ({
  sqliteService: {
    getAllCiders: jest.fn(),
    getAllExperiences: jest.fn(),
  }
}));

const mockSqliteService = sqliteService as jest.Mocked<typeof sqliteService>;

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;

  // Define comprehensive mock data
  const mockCiders: CiderMasterRecord[] = [
    {
      id: '1',
      userId: 'user1',
      name: 'Somerset Traditional',
      brand: 'Thatchers',
      abv: 4.8,
      overallRating: 7 as Rating,
      traditionalStyle: 'west_country_traditional',
      sweetness: 'medium',
      carbonation: 'lightly_sparkling',
      clarity: 'clear',
      color: 'golden',
      tasteTags: ['apple', 'crisp'],
      containerType: 'bottle',
      createdAt: new Date('2023-01-15'),
      updatedAt: new Date('2023-01-15')
    },
    {
      id: '2',
      userId: 'user1',
      name: 'French Breton Cidre',
      brand: 'Loic Raison',
      abv: 5.5,
      overallRating: 8 as Rating,
      traditionalStyle: 'french_normandy_brittany',
      sweetness: 'dry',
      carbonation: 'sparkling',
      clarity: 'hazy',
      color: 'pale_straw',
      tasteTags: ['tart', 'funky'],
      containerType: 'bottle',
      createdAt: new Date('2023-02-20'),
      updatedAt: new Date('2023-02-20')
    },
    {
      id: '3',
      userId: 'user1',
      name: 'Hereford Scrumpy',
      brand: 'Gwatkin',
      abv: 6.0,
      overallRating: 9 as Rating,
      traditionalStyle: 'west_country_traditional',
      sweetness: 'bone_dry',
      carbonation: 'still',
      clarity: 'cloudy',
      color: 'amber',
      tasteTags: ['earthy', 'strong'],
      containerType: 'bottle',
      createdAt: new Date('2023-03-10'),
      updatedAt: new Date('2023-03-10')
    },
    {
      id: '4',
      userId: 'user1',
      name: 'Kent Cider',
      brand: 'Biddenden',
      abv: 5.2,
      overallRating: 6 as Rating,
      traditionalStyle: 'eastern_england_traditional',
      sweetness: 'off_dry',
      carbonation: 'lightly_sparkling',
      clarity: 'clear',
      color: 'copper',
      tasteTags: ['fruity', 'balanced'],
      containerType: 'bottle',
      createdAt: new Date('2023-04-05'),
      updatedAt: new Date('2023-04-05')
    }
  ];

  const mockExperiences: ExperienceLog[] = [
    {
      id: 'exp1',
      userId: 'user1',
      ciderId: '1',
      date: new Date('2023-10-15'),
      venue: {
        id: 'venue1',
        name: 'The Crown',
        type: 'pub',
        location: { latitude: 51.5, longitude: -0.1 }
      },
      price: 4.50,
      containerSize: 568, // pint
      containerType: 'draught',
      pricePerPint: 4.50,
      createdAt: new Date('2023-10-15'),
      updatedAt: new Date('2023-10-15'),
      syncStatus: 'synced',
      version: 1
    },
    {
      id: 'exp2',
      userId: 'user1',
      ciderId: '2',
      date: new Date('2023-10-16'),
      venue: {
        id: 'venue2',
        name: 'Expensive Restaurant',
        type: 'restaurant',
        location: { latitude: 51.6, longitude: -0.2 }
      },
      price: 8.00,
      containerSize: 330,
      containerType: 'bottle',
      pricePerPint: 13.77, // 8.00 / 330 * 568
      createdAt: new Date('2023-10-16'),
      updatedAt: new Date('2023-10-16'),
      syncStatus: 'synced',
      version: 1
    },
    {
      id: 'exp3',
      userId: 'user1',
      ciderId: '1',
      date: new Date('2023-10-20'),
      venue: {
        id: 'venue1',
        name: 'The Crown',
        type: 'pub',
        location: { latitude: 51.5, longitude: -0.1 }
      },
      price: 4.75,
      containerSize: 568,
      containerType: 'draught',
      pricePerPint: 4.75,
      createdAt: new Date('2023-10-20'),
      updatedAt: new Date('2023-10-20'),
      syncStatus: 'synced',
      version: 1
    },
    {
      id: 'exp4',
      userId: 'user1',
      ciderId: '3',
      date: new Date('2023-11-01'),
      venue: {
        id: 'venue3',
        name: 'Cider Festival',
        type: 'festival',
        location: { latitude: 51.4, longitude: -0.3 }
      },
      price: 5.50,
      containerSize: 500,
      containerType: 'draught',
      pricePerPint: 6.25, // 5.50 / 500 * 568
      createdAt: new Date('2023-11-01'),
      updatedAt: new Date('2023-11-01'),
      syncStatus: 'synced',
      version: 1
    },
    {
      id: 'exp5',
      userId: 'user1',
      ciderId: '4',
      date: new Date(), // Current date for monthly spending tests
      venue: {
        id: 'venue1',
        name: 'The Crown',
        type: 'pub',
        location: { latitude: 51.5, longitude: -0.1 }
      },
      price: 4.80,
      containerSize: 568,
      containerType: 'draught',
      pricePerPint: 4.80,
      createdAt: new Date(),
      updatedAt: new Date(),
      syncStatus: 'synced',
      version: 1
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    analyticsService = AnalyticsService.getInstance();

    // Setup default mocks
    mockSqliteService.getAllCiders.mockResolvedValue([...mockCiders]);
    mockSqliteService.getAllExperiences.mockResolvedValue([...mockExperiences]);
  });

  describe('Personal Collection Completeness Algorithm', () => {
    it('should calculate personal completeness percentage', async () => {
      const analytics = await analyticsService.calculateAnalytics('ALL');

      expect(analytics.collectionStats.completionPercentage).toBeGreaterThanOrEqual(0);
      expect(analytics.collectionStats.completionPercentage).toBeLessThanOrEqual(100);
    });

    it('should handle empty collection', async () => {
      mockSqliteService.getAllCiders.mockResolvedValue([]);
      mockSqliteService.getAllExperiences.mockResolvedValue([]);

      const analytics = await analyticsService.calculateAnalytics('ALL');

      expect(analytics.collectionStats.completionPercentage).toBe(0);
    });

    it('should calculate completeness based on diverse collection', async () => {
      // Collection with good diversity should score higher
      const analytics = await analyticsService.calculateAnalytics('ALL');

      // With 4 brands, multiple styles, regions, and characteristics
      expect(analytics.collectionStats.completionPercentage).toBeGreaterThan(30);
    });

    it('should penalize single-brand collections', async () => {
      const singleBrandCiders = mockCiders.map(c => ({
        ...c,
        brand: 'Same Brand'
      }));

      mockSqliteService.getAllCiders.mockResolvedValue(singleBrandCiders);

      const analytics = await analyticsService.calculateAnalytics('ALL');

      // Should have lower completeness with no producer diversity
      expect(analytics.collectionStats.completionPercentage).toBeLessThan(50);
    });

    it('should reward style diversity', async () => {
      const diverseStyles = mockCiders.map((c, i) => ({
        ...c,
        traditionalStyle: [
          'west_country_traditional',
          'french_normandy_brittany',
          'eastern_england_traditional',
          'spanish_sidra'
        ][i] as any
      }));

      mockSqliteService.getAllCiders.mockResolvedValue(diverseStyles);

      const analytics = await analyticsService.calculateAnalytics('ALL');

      expect(analytics.collectionStats.completionPercentage).toBeGreaterThan(30);
    });

    it('should detect regional diversity from brand names', async () => {
      const regionalCiders: CiderMasterRecord[] = [
        { ...mockCiders[0], brand: 'Somerset Cider Co', name: 'Somerset Gold' },
        { ...mockCiders[1], brand: 'Kent Orchards', name: 'Kent Special' },
        { ...mockCiders[2], brand: 'Devon Cider', name: 'Devon Reserve' },
        { ...mockCiders[3], brand: 'Yorkshire Cider', name: 'Yorkshire Pride' }
      ];

      mockSqliteService.getAllCiders.mockResolvedValue(regionalCiders);

      const analytics = await analyticsService.calculateAnalytics('ALL');

      // Should detect regions from brand names
      expect(analytics.collectionStats.completionPercentage).toBeGreaterThan(0);
    });
  });

  describe('Collection Statistics', () => {
    it('should calculate total ciders correctly', async () => {
      const analytics = await analyticsService.calculateAnalytics('ALL');

      expect(analytics.collectionStats.totalCiders).toBe(4);
    });

    it('should calculate average rating correctly', async () => {
      const analytics = await analyticsService.calculateAnalytics('ALL');

      // Average of 7, 8, 9, 6 = 7.5
      expect(analytics.collectionStats.averageRating).toBe(7.5);
    });

    it('should count total experiences correctly', async () => {
      const analytics = await analyticsService.calculateAnalytics('ALL');

      expect(analytics.collectionStats.totalExperiences).toBe(5);
    });

    it('should always use all ciders for collection stats regardless of time range', async () => {
      const analytics1M = await analyticsService.calculateAnalytics('1M');
      const analyticsALL = await analyticsService.calculateAnalytics('ALL');

      // Collection stats should be the same regardless of time range
      expect(analytics1M.collectionStats.totalCiders).toBe(analyticsALL.collectionStats.totalCiders);
      expect(analytics1M.collectionStats.averageRating).toBe(analyticsALL.collectionStats.averageRating);
    });
  });

  describe('Value Analytics', () => {
    it('should identify best value cider', async () => {
      const analytics = await analyticsService.calculateAnalytics('ALL');

      expect(analytics.valueAnalytics.bestValue).not.toBeNull();
      expect(analytics.valueAnalytics.bestValue?.cider).toBeDefined();
      expect(analytics.valueAnalytics.bestValue?.pricePerPint).toBeDefined();
      expect(analytics.valueAnalytics.bestValue?.venue).toBeDefined();

      // Best value should be lowest price per pint
      expect(analytics.valueAnalytics.bestValue?.pricePerPint).toBe(4.50);
    });

    it('should identify worst value cider', async () => {
      const analytics = await analyticsService.calculateAnalytics('ALL');

      expect(analytics.valueAnalytics.worstValue).not.toBeNull();
      expect(analytics.valueAnalytics.worstValue?.cider).toBeDefined();
      expect(analytics.valueAnalytics.worstValue?.pricePerPint).toBeDefined();
      expect(analytics.valueAnalytics.worstValue?.venue).toBeDefined();

      // Worst value should be highest price per pint
      expect(analytics.valueAnalytics.worstValue?.pricePerPint).toBe(13.77);
    });

    it('should calculate average price per pint correctly', async () => {
      const analytics = await analyticsService.calculateAnalytics('ALL');

      // Average of: 4.50, 13.77, 4.75, 6.25, 4.80 = 6.81
      expect(analytics.valueAnalytics.averagePricePerPint).toBeCloseTo(6.81, 1);
    });

    it('should calculate monthly spending for last 30 days', async () => {
      const analytics = await analyticsService.calculateAnalytics('ALL');

      // Only exp5 is within 30 days (price: 4.80)
      expect(analytics.valueAnalytics.monthlySpending).toBe(4.80);
    });

    it('should handle no experiences gracefully', async () => {
      mockSqliteService.getAllExperiences.mockResolvedValue([]);

      const analytics = await analyticsService.calculateAnalytics('ALL');

      expect(analytics.valueAnalytics.bestValue).toBeNull();
      expect(analytics.valueAnalytics.worstValue).toBeNull();
      expect(analytics.valueAnalytics.averagePricePerPint).toBe(0);
      expect(analytics.valueAnalytics.monthlySpending).toBe(0);
    });
  });

  describe('Venue Analytics', () => {
    it('should identify most visited venue', async () => {
      const analytics = await analyticsService.calculateAnalytics('ALL');

      expect(analytics.venueAnalytics.mostVisited).not.toBeNull();
      expect(analytics.venueAnalytics.mostVisited?.venue.name).toBe('The Crown');
      expect(analytics.venueAnalytics.mostVisited?.visitCount).toBe(3);
    });

    it('should identify cheapest venue by average price per pint', async () => {
      const analytics = await analyticsService.calculateAnalytics('ALL');

      expect(analytics.venueAnalytics.cheapest).not.toBeNull();
      expect(analytics.venueAnalytics.cheapest?.venue.name).toBe('The Crown');
      // Average of 4.50, 4.75, 4.80 = 4.68
      expect(analytics.venueAnalytics.cheapest?.averagePrice).toBeCloseTo(4.68, 1);
    });

    it('should identify most expensive venue by average price per pint', async () => {
      const analytics = await analyticsService.calculateAnalytics('ALL');

      expect(analytics.venueAnalytics.mostExpensive).not.toBeNull();
      expect(analytics.venueAnalytics.mostExpensive?.venue.name).toBe('Expensive Restaurant');
      expect(analytics.venueAnalytics.mostExpensive?.averagePrice).toBe(13.77);
    });

    it('should count total unique venues', async () => {
      const analytics = await analyticsService.calculateAnalytics('ALL');

      expect(analytics.venueAnalytics.totalVenues).toBe(3);
    });

    it('should handle no experiences gracefully', async () => {
      mockSqliteService.getAllExperiences.mockResolvedValue([]);

      const analytics = await analyticsService.calculateAnalytics('ALL');

      expect(analytics.venueAnalytics.mostVisited).toBeNull();
      expect(analytics.venueAnalytics.cheapest).toBeNull();
      expect(analytics.venueAnalytics.mostExpensive).toBeNull();
      expect(analytics.venueAnalytics.totalVenues).toBe(0);
    });

    it('should return venue objects with full info', async () => {
      const analytics = await analyticsService.calculateAnalytics('ALL');

      expect(analytics.venueAnalytics.mostVisited?.venue).toHaveProperty('id');
      expect(analytics.venueAnalytics.mostVisited?.venue).toHaveProperty('name');
      expect(analytics.venueAnalytics.mostVisited?.venue).toHaveProperty('type');
    });
  });

  describe('Trends Analytics', () => {
    it('should calculate monthly trend data', async () => {
      const analytics = await analyticsService.calculateAnalytics('ALL');

      expect(analytics.trends.monthlyTrend).toBeDefined();
      expect(Array.isArray(analytics.trends.monthlyTrend)).toBe(true);

      // Should have entries for October and November (and possibly current month)
      const octoberData = analytics.trends.monthlyTrend.find(t => t.month.startsWith('2023-10'));
      expect(octoberData).toBeDefined();
      expect(octoberData?.count).toBe(3);
      expect(octoberData?.spending).toBeCloseTo(17.25, 1); // 4.50 + 8.00 + 4.75
    });

    it('should sort monthly trend chronologically', async () => {
      const analytics = await analyticsService.calculateAnalytics('ALL');

      const months = analytics.trends.monthlyTrend.map(t => t.month);

      // Check if sorted
      for (let i = 1; i < months.length; i++) {
        expect(months[i] >= months[i - 1]).toBe(true);
      }
    });

    it('should calculate rating distribution from ciders', async () => {
      const analytics = await analyticsService.calculateAnalytics('ALL');

      expect(analytics.trends.ratingDistribution).toBeDefined();
      expect(Array.isArray(analytics.trends.ratingDistribution)).toBe(true);
      expect(analytics.trends.ratingDistribution).toHaveLength(10); // Ratings 1-10

      // Check specific ratings from mock data
      const rating6 = analytics.trends.ratingDistribution.find(r => r.rating === 6);
      const rating7 = analytics.trends.ratingDistribution.find(r => r.rating === 7);
      const rating8 = analytics.trends.ratingDistribution.find(r => r.rating === 8);
      const rating9 = analytics.trends.ratingDistribution.find(r => r.rating === 9);

      expect(rating6?.count).toBe(1);
      expect(rating7?.count).toBe(1);
      expect(rating8?.count).toBe(1);
      expect(rating9?.count).toBe(1);
    });

    it('should include all rating levels in distribution even if zero', async () => {
      const analytics = await analyticsService.calculateAnalytics('ALL');

      expect(analytics.trends.ratingDistribution).toHaveLength(10);

      // All ratings 1-10 should be present
      for (let i = 1; i <= 10; i++) {
        const ratingEntry = analytics.trends.ratingDistribution.find(r => r.rating === i);
        expect(ratingEntry).toBeDefined();
        expect(ratingEntry?.rating).toBe(i);
      }
    });
  });

  describe('Time Range Filtering', () => {
    it('should filter experiences by 1M time range', async () => {
      const analytics = await analyticsService.calculateAnalytics('1M');

      // totalExperiences shows ALL experiences (not filtered)
      expect(analytics.collectionStats.totalExperiences).toBe(5);
      // But value analytics should only use experiences in range
      expect(analytics.valueAnalytics.monthlySpending).toBe(4.80);
      // And only 1 experience should be used for value analytics
      expect(analytics.valueAnalytics.bestValue?.pricePerPint).toBe(4.80);
      expect(analytics.valueAnalytics.worstValue?.pricePerPint).toBe(4.80);
    });

    it('should filter experiences by 3M time range', async () => {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const recentExperience = {
        ...mockExperiences[0],
        id: 'exp_recent',
        date: new Date(),
        price: 5.00,
        pricePerPint: 5.00
      };

      mockSqliteService.getAllExperiences.mockResolvedValue([
        { ...mockExperiences[0], date: new Date('2023-01-01') }, // Old
        recentExperience // Recent
      ]);

      const analytics = await analyticsService.calculateAnalytics('3M');

      // totalExperiences shows ALL experiences (not filtered)
      expect(analytics.collectionStats.totalExperiences).toBe(2);
      // But value analytics should only use recent experience
      expect(analytics.valueAnalytics.bestValue?.pricePerPint).toBe(5.00);
      expect(analytics.valueAnalytics.worstValue?.pricePerPint).toBe(5.00);
    });

    it('should include all experiences for ALL time range', async () => {
      const analytics = await analyticsService.calculateAnalytics('ALL');

      expect(analytics.collectionStats.totalExperiences).toBe(5);
    });

    it('should always show all ciders in collection stats regardless of time range', async () => {
      const analytics1M = await analyticsService.calculateAnalytics('1M');

      // Even though only 1 experience in 1M, all ciders should be counted
      expect(analytics1M.collectionStats.totalCiders).toBe(4);
      expect(analytics1M.collectionStats.averageRating).toBe(7.5);
    });

    it('should filter value analytics by time range', async () => {
      const analyticsALL = await analyticsService.calculateAnalytics('ALL');
      const analytics1M = await analyticsService.calculateAnalytics('1M');

      // ALL should have more experiences in value calculations
      expect(analyticsALL.valueAnalytics.averagePricePerPint).not.toBe(
        analytics1M.valueAnalytics.averagePricePerPint
      );
    });

    it('should filter venue analytics by time range', async () => {
      const analyticsALL = await analyticsService.calculateAnalytics('ALL');
      const analytics1M = await analyticsService.calculateAnalytics('1M');

      // ALL should have 3 venues, 1M should have 1 venue
      expect(analyticsALL.venueAnalytics.totalVenues).toBe(3);
      expect(analytics1M.venueAnalytics.totalVenues).toBe(1);
    });

    it('should filter trends by time range', async () => {
      const analyticsALL = await analyticsService.calculateAnalytics('ALL');
      const analytics1M = await analyticsService.calculateAnalytics('1M');

      // ALL should have more monthly data points
      expect(analyticsALL.trends.monthlyTrend.length).toBeGreaterThan(
        analytics1M.trends.monthlyTrend.length
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle empty cider collection', async () => {
      mockSqliteService.getAllCiders.mockResolvedValue([]);
      mockSqliteService.getAllExperiences.mockResolvedValue([]);

      const analytics = await analyticsService.calculateAnalytics('ALL');

      expect(analytics.collectionStats.totalCiders).toBe(0);
      expect(analytics.collectionStats.averageRating).toBe(0);
      expect(analytics.collectionStats.completionPercentage).toBe(0);
      expect(analytics.collectionStats.totalExperiences).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      mockSqliteService.getAllCiders.mockRejectedValue(new Error('Database connection failed'));

      await expect(analyticsService.calculateAnalytics('ALL')).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle single cider collection', async () => {
      mockSqliteService.getAllCiders.mockResolvedValue([mockCiders[0]]);
      mockSqliteService.getAllExperiences.mockResolvedValue([mockExperiences[0]]);

      const analytics = await analyticsService.calculateAnalytics('ALL');

      expect(analytics.collectionStats.totalCiders).toBe(1);
      expect(analytics.collectionStats.averageRating).toBe(7);
      expect(analytics.collectionStats.completionPercentage).toBeGreaterThanOrEqual(0);
    });

    it('should handle ciders without experiences', async () => {
      mockSqliteService.getAllExperiences.mockResolvedValue([]);

      const analytics = await analyticsService.calculateAnalytics('ALL');

      expect(analytics.collectionStats.totalCiders).toBe(4);
      expect(analytics.collectionStats.totalExperiences).toBe(0);
      expect(analytics.valueAnalytics.bestValue).toBeNull();
      expect(analytics.venueAnalytics.mostVisited).toBeNull();
    });

    it('should handle experiences for non-existent ciders', async () => {
      const orphanExperience = {
        ...mockExperiences[0],
        ciderId: 'non-existent-id'
      };

      mockSqliteService.getAllExperiences.mockResolvedValue([orphanExperience]);

      const analytics = await analyticsService.calculateAnalytics('ALL');

      // Should not crash, but best/worst value should be null or handle gracefully
      expect(analytics.collectionStats.totalExperiences).toBe(1);
    });
  });

  describe('Performance', () => {
    it('should calculate analytics within 500ms for reasonable collection', async () => {
      const startTime = Date.now();
      await analyticsService.calculateAnalytics('ALL');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500);
    });

    it('should handle large collections efficiently', async () => {
      // Create 100 ciders
      const largeCiderCollection = Array.from({ length: 100 }, (_, i) => ({
        ...mockCiders[0],
        id: `cider_${i}`,
        name: `Cider ${i}`,
        brand: `Brand ${i % 10}`,
        overallRating: ((i % 10) + 1) as Rating
      }));

      // Create 200 experiences
      const largeExperienceCollection = Array.from({ length: 200 }, (_, i) => ({
        ...mockExperiences[0],
        id: `exp_${i}`,
        ciderId: `cider_${i % 100}`,
        date: new Date(2023, i % 12, 1),
        price: 4.50 + (i % 5)
      }));

      mockSqliteService.getAllCiders.mockResolvedValue(largeCiderCollection);
      mockSqliteService.getAllExperiences.mockResolvedValue(largeExperienceCollection);

      const startTime = Date.now();
      const analytics = await analyticsService.calculateAnalytics('ALL');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500);
      expect(analytics.collectionStats.totalCiders).toBe(100);
      expect(analytics.collectionStats.totalExperiences).toBe(200);
    });

    it('should use parallel data fetching', async () => {
      const cidersPromise = new Promise(resolve =>
        setTimeout(() => resolve(mockCiders), 50)
      );
      const experiencesPromise = new Promise(resolve =>
        setTimeout(() => resolve(mockExperiences), 50)
      );

      mockSqliteService.getAllCiders.mockImplementation(() => cidersPromise as any);
      mockSqliteService.getAllExperiences.mockImplementation(() => experiencesPromise as any);

      const startTime = Date.now();
      await analyticsService.calculateAnalytics('ALL');
      const duration = Date.now() - startTime;

      // Should be ~50ms (parallel) not ~100ms (sequential)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle ciders with missing optional fields', async () => {
      const minimalCiders: CiderMasterRecord[] = [
        {
          id: '1',
          userId: 'user1',
          name: 'Basic Cider',
          brand: 'Basic Brand',
          abv: 5.0,
          overallRating: 7 as Rating,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockSqliteService.getAllCiders.mockResolvedValue(minimalCiders);
      mockSqliteService.getAllExperiences.mockResolvedValue([]);

      const analytics = await analyticsService.calculateAnalytics('ALL');

      expect(analytics.collectionStats.totalCiders).toBe(1);
      expect(analytics.collectionStats.completionPercentage).toBeGreaterThanOrEqual(0);
    });

    it('should handle experiences with same venue name different IDs', async () => {
      const duplicateVenueExperiences: ExperienceLog[] = [
        {
          ...mockExperiences[0],
          venue: { id: 'venue1', name: 'The Crown', type: 'pub' }
        },
        {
          ...mockExperiences[1],
          id: 'exp2',
          venue: { id: 'venue2', name: 'The Crown', type: 'pub' }
        }
      ];

      mockSqliteService.getAllExperiences.mockResolvedValue(duplicateVenueExperiences);

      const analytics = await analyticsService.calculateAnalytics('ALL');

      // Should group by venue name (lowercase)
      expect(analytics.venueAnalytics.totalVenues).toBe(1);
      expect(analytics.venueAnalytics.mostVisited?.visitCount).toBe(2);
    });

    it('should handle very high and very low ratings', async () => {
      const extremeRatingCiders: CiderMasterRecord[] = [
        { ...mockCiders[0], overallRating: 1 as Rating },
        { ...mockCiders[1], overallRating: 10 as Rating }
      ];

      mockSqliteService.getAllCiders.mockResolvedValue(extremeRatingCiders);

      const analytics = await analyticsService.calculateAnalytics('ALL');

      expect(analytics.collectionStats.averageRating).toBe(5.5);

      const rating1 = analytics.trends.ratingDistribution.find(r => r.rating === 1);
      const rating10 = analytics.trends.ratingDistribution.find(r => r.rating === 10);

      expect(rating1?.count).toBe(1);
      expect(rating10?.count).toBe(1);
    });

    it('should handle zero price experiences', async () => {
      const freeExperience: ExperienceLog = {
        ...mockExperiences[0],
        price: 0,
        pricePerPint: 0
      };

      mockSqliteService.getAllExperiences.mockResolvedValue([freeExperience]);

      const analytics = await analyticsService.calculateAnalytics('ALL');

      expect(analytics.valueAnalytics.averagePricePerPint).toBe(0);
      expect(analytics.valueAnalytics.bestValue?.pricePerPint).toBe(0);
    });

    it('should round monetary values to 2 decimal places', async () => {
      const analytics = await analyticsService.calculateAnalytics('ALL');

      // Check that all price values are properly rounded
      expect(analytics.valueAnalytics.averagePricePerPint.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
      expect(analytics.valueAnalytics.monthlySpending.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
    });
  });
});
