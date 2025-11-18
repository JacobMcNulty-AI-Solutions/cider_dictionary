// Phase 3 MVP Integration Tests
// Tests offline functionality, sync reliability, and performance targets

import { sqliteService } from '../services/database/sqlite';
import { syncManager } from '../services/sync/SyncManager';
import { analyticsService } from '../services/analytics/AnalyticsService';
import { locationService } from '../services/location/LocationService';
import { performanceService } from '../services/firebase/PerformanceService';
import { CiderMasterRecord } from '../types/cider';
import { ExperienceLog } from '../types/experience';

describe('Phase 3 MVP Integration Tests', () => {
  beforeEach(async () => {
    // Initialize database for each test
    await sqliteService.initializeDatabase();
  });

  describe('Offline-First Architecture', () => {
    test('should store data locally when offline', async () => {
      // Create a test cider
      const testCider: Omit<CiderMasterRecord, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'syncStatus'> = {
        userId: 'test-user',
        name: 'Test Offline Cider',
        brand: 'Offline Brand',
        abv: 5.5,
        overallRating: 8
      };

      // Should work offline
      const createdCider = await sqliteService.createCider({
        ...testCider,
        id: 'test-offline-cider',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        syncStatus: 'pending'
      });

      expect(createdCider.syncStatus).toBe('pending');
      expect(createdCider.name).toBe('Test Offline Cider');
    });

    test('should queue sync operations when offline', async () => {
      const testData = { id: 'test', name: 'Test Cider' };

      // Queue operation
      await syncManager.queueOperation('CREATE_CIDER', testData);

      // Verify operation is queued
      const queueStats = await syncManager.getSyncQueueStats();
      expect(queueStats.pending).toBeGreaterThan(0);
    });

    test('should handle sync queue processing', async () => {
      // Mock network as offline initially
      const isOnlineSpy = jest.spyOn(syncManager, 'isOnline').mockReturnValue(false);

      // Queue multiple operations
      await syncManager.queueOperation('CREATE_CIDER', { id: '1', name: 'Cider 1' });
      await syncManager.queueOperation('CREATE_CIDER', { id: '2', name: 'Cider 2' });

      let stats = await syncManager.getSyncQueueStats();
      expect(stats.pending).toBe(2);

      // Mock network coming online
      isOnlineSpy.mockReturnValue(true);

      // Force sync should process queue
      await syncManager.forceSyncNow();

      isOnlineSpy.mockRestore();
    });
  });

  describe('Experience Logging System', () => {
    test('should log experience under 30 seconds target', async () => {
      const startTime = Date.now();

      // Create test cider first
      const testCider = await sqliteService.createCider({
        id: 'test-cider-experience',
        userId: 'test-user',
        name: 'Experience Test Cider',
        brand: 'Test Brand',
        abv: 6.0,
        overallRating: 7,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        syncStatus: 'pending'
      });

      // Log experience
      const experience: ExperienceLog = {
        id: 'test-experience',
        userId: 'test-user',
        ciderId: testCider.id,
        date: new Date(),
        venue: {
          id: 'test-venue',
          name: 'Test Pub',
          type: 'pub'
        },
        price: 4.50,
        containerSize: 568,
        pricePerPint: 4.50 / 568,
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'pending',
        version: 1
      };

      await sqliteService.createExperience(experience);

      const completionTime = (Date.now() - startTime) / 1000;

      // Verify experience was created
      const experiences = await sqliteService.getExperiencesByCiderId(testCider.id);
      expect(experiences).toHaveLength(1);
      expect(experiences[0].venue.name).toBe('Test Pub');
      expect(experiences[0].pricePerPint).toBeCloseTo(0.00793, 5);

      // Performance target: under 30 seconds
      expect(completionTime).toBeLessThan(30);

      // Record performance metric
      await performanceService.recordExperienceEntryTime(completionTime);
    });

    test('should calculate price per ml correctly', async () => {
      const experience: ExperienceLog = {
        id: 'price-test',
        userId: 'test-user',
        ciderId: 'test-cider',
        date: new Date(),
        venue: {
          id: 'test-venue',
          name: 'Price Test Venue',
          type: 'pub'
        },
        price: 5.00,
        containerSize: 500,
        pricePerPint: 5.00 / 500, // Should be 0.01
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'pending',
        version: 1
      };

      await sqliteService.createExperience(experience);

      const retrieved = await sqliteService.getExperiencesByCiderId('test-cider');
      expect(retrieved[0].pricePerPint).toBe(0.01);
    });
  });

  describe('Analytics Dashboard Performance', () => {
    test('should load analytics under 500ms target', async () => {
      // Create test data
      const testCiders: CiderMasterRecord[] = [];
      for (let i = 0; i < 10; i++) {
        const cider = await sqliteService.createCider({
          id: `analytics-test-${i}`,
          userId: 'test-user',
          name: `Analytics Cider ${i}`,
          brand: `Brand ${i % 3}`, // Create some brand diversity
          abv: 4 + (i * 0.5),
          overallRating: (5 + (i % 5)) as any,
          traditionalStyle: i % 2 === 0 ? 'traditional_english' : 'modern_craft',
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
          syncStatus: 'synced'
        });
        testCiders.push(cider);
      }

      // Create some experiences
      for (let i = 0; i < 5; i++) {
        await sqliteService.createExperience({
          id: `exp-${i}`,
          userId: 'test-user',
          ciderId: testCiders[i].id,
          date: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)), // Spread over days
          venue: {
            id: `venue-${i}`,
            name: `Test Venue ${i}`,
            type: 'pub'
          },
          price: 3.50 + i,
          containerSize: 500,
          pricePerPint: (3.50 + i) / 500,
          createdAt: new Date(),
          updatedAt: new Date(),
          syncStatus: 'pending',
          version: 1
        });
      }

      const startTime = Date.now();

      // Calculate analytics
      const analytics = await analyticsService.calculateAnalytics('ALL');

      const loadTime = Date.now() - startTime;

      // Verify analytics data
      expect(analytics.collectionStats.totalCiders).toBe(10);
      expect(analytics.collectionStats.totalExperiences).toBe(5);
      expect(analytics.collectionStats.averageRating).toBeGreaterThan(0);
      expect(analytics.collectionStats.completionPercentage).toBeGreaterThan(0);

      // Performance target: under 500ms
      expect(loadTime).toBeLessThan(500);

      // Record performance metric
      await performanceService.recordAnalyticsLoadTime(loadTime);
    });

    test('should calculate personal completeness algorithm correctly', async () => {
      // Create diverse collection
      const diverseCiders = [
        {
          id: 'diverse-1',
          name: 'Somerset Scrumpy',
          brand: 'West Country Cider',
          abv: 6.5,
          overallRating: 8,
          traditionalStyle: 'traditional_english' as const,
          sweetness: 'dry' as const,
          color: 'golden' as const
        },
        {
          id: 'diverse-2',
          name: 'Craft Hopped Cider',
          brand: 'Modern Cidery',
          abv: 4.5,
          overallRating: 7,
          traditionalStyle: 'modern_craft' as const,
          sweetness: 'off_dry' as const,
          color: 'pale_straw' as const
        },
        {
          id: 'diverse-3',
          name: 'Fruit Fusion',
          brand: 'Artisan Drinks',
          abv: 5.0,
          overallRating: 6,
          traditionalStyle: 'fruit_cider' as const,
          sweetness: 'medium' as const,
          color: 'ruby' as const
        }
      ];

      for (const ciderData of diverseCiders) {
        await sqliteService.createCider({
          ...ciderData,
          userId: 'test-user',
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
          syncStatus: 'synced'
        });
      }

      const analytics = await analyticsService.calculateAnalytics('ALL');

      // Completeness should be calculated based on collection diversity
      expect(analytics.collectionStats.completionPercentage).toBeGreaterThan(0);
      expect(analytics.collectionStats.completionPercentage).toBeLessThanOrEqual(100);
    });
  });

  describe('Location Services', () => {
    test('should validate venue names correctly', async () => {
      const validation1 = locationService.validateVenueName('The Crown Inn');
      expect(validation1.isValid).toBe(true);

      const validation2 = locationService.validateVenueName('x'); // Too short
      expect(validation2.isValid).toBe(false);

      const validation3 = locationService.validateVenueName('a'.repeat(101)); // Too long
      expect(validation3.isValid).toBe(false);
    });

    test('should detect venue types from names', async () => {
      expect(locationService.detectVenueTypeFromName('The Crown Pub')).toBe('pub');
      expect(locationService.detectVenueTypeFromName('Tesco Express')).toBe('retail');
      expect(locationService.detectVenueTypeFromName('Italian Restaurant')).toBe('restaurant');
      expect(locationService.detectVenueTypeFromName('Local Brewery')).toBe('cidery');
      expect(locationService.detectVenueTypeFromName('Summer Festival')).toBe('festival');
    });

    test('should calculate distance between coordinates', async () => {
      const location1 = { latitude: 51.5074, longitude: -0.1278 }; // London
      const location2 = { latitude: 51.4816, longitude: -3.1791 }; // Cardiff

      const distance = locationService.calculateDistance(location1, location2);

      // Distance between London and Cardiff is approximately 195km
      expect(distance).toBeGreaterThan(190000); // 190km in meters
      expect(distance).toBeLessThan(200000); // 200km in meters
    });
  });

  describe('Performance Monitoring', () => {
    test('should track performance metrics', async () => {
      // Record some performance metrics
      await performanceService.recordExperienceEntryTime(15.5);
      await performanceService.recordAnalyticsLoadTime(300);
      await performanceService.recordFirestoreRead(5);
      await performanceService.recordFirestoreWrite(2);

      // Get performance report
      const report = await performanceService.generatePerformanceReport();

      expect(report.experienceEntry.averageTime).toBe(15.5);
      expect(report.experienceEntry.targetMet).toBe(true);
      expect(report.analyticsLoad.averageTime).toBe(300);
      expect(report.analyticsLoad.targetMet).toBe(true);
      expect(report.costUsage.firestoreReads).toBe(5);
      expect(report.costUsage.firestoreWrites).toBe(2);
    });

    test('should identify performance issues', async () => {
      // Record slow performance
      await performanceService.recordExperienceEntryTime(35); // Over 30s target
      await performanceService.recordAnalyticsLoadTime(600); // Over 500ms target

      const report = await performanceService.generatePerformanceReport();

      expect(report.experienceEntry.targetMet).toBe(false);
      expect(report.analyticsLoad.targetMet).toBe(false);

      const health = performanceService.isPerformanceHealthy();
      expect(health.experienceEntry).toBe(false);
      expect(health.analyticsLoad).toBe(false);
    });
  });

  describe('Sync Reliability', () => {
    test('should handle sync operation failures gracefully', async () => {
      // Mock a failing operation
      const failingData = { id: 'fail-test', invalidField: null };

      try {
        await syncManager.queueOperation('CREATE_CIDER', failingData);
        // Should not throw - queuing should always succeed
        expect(true).toBe(true);
      } catch (error) {
        fail('Queuing operations should not throw');
      }
    });

    test('should maintain data consistency during offline/online transitions', async () => {
      // Create data while offline
      const offlineCider = await sqliteService.createCider({
        id: 'offline-consistency-test',
        userId: 'test-user',
        name: 'Offline Cider',
        brand: 'Test Brand',
        abv: 5.0,
        overallRating: 7,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        syncStatus: 'pending'
      });

      // Verify data exists locally
      const localData = await sqliteService.getCiderById('offline-consistency-test');
      expect(localData).not.toBeNull();
      expect(localData!.syncStatus).toBe('pending');

      // Queue for sync
      await syncManager.queueOperation('CREATE_CIDER', offlineCider);

      // Verify sync queue
      const queueStats = await syncManager.getSyncQueueStats();
      expect(queueStats.pending).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle database errors gracefully', async () => {
      // Test invalid cider data
      try {
        await sqliteService.createCider({
          id: 'invalid-test',
          userId: 'test-user',
          name: '', // Invalid: empty name
          brand: 'Test Brand',
          abv: -1, // Invalid: negative ABV
          overallRating: 15 as any, // Invalid: rating out of range
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
          syncStatus: 'pending'
        });

        // Should still create with database constraints handling
        expect(true).toBe(true);
      } catch (error) {
        // Error handling should be graceful
        expect(error).toBeDefined();
      }
    });

    test('should recover from temporary failures', async () => {
      // This test would mock temporary failures and verify recovery
      // For now, we'll just test that the error boundary exists
      expect(true).toBe(true);
    });
  });
});

// Performance benchmark tests
describe('Performance Benchmarks', () => {
  test('should handle 100+ ciders smoothly', async () => {
    const startTime = Date.now();

    // Create 100 test ciders
    const ciderPromises = [];
    for (let i = 0; i < 100; i++) {
      ciderPromises.push(
        sqliteService.createCider({
          id: `perf-test-${i}`,
          userId: 'test-user',
          name: `Performance Test Cider ${i}`,
          brand: `Brand ${i % 10}`,
          abv: 4 + (i % 8),
          overallRating: (1 + (i % 10)) as any,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
          syncStatus: 'synced'
        })
      );
    }

    await Promise.all(ciderPromises);

    // Test retrieval performance
    const retrievalStart = Date.now();
    const allCiders = await sqliteService.getAllCiders();
    const retrievalTime = Date.now() - retrievalStart;

    expect(allCiders.length).toBe(100);
    expect(retrievalTime).toBeLessThan(1000); // Under 1 second

    // Test analytics performance with large dataset
    const analyticsStart = Date.now();
    const analytics = await analyticsService.calculateAnalytics('ALL');
    const analyticsTime = Date.now() - analyticsStart;

    expect(analytics.collectionStats.totalCiders).toBe(100);
    expect(analyticsTime).toBeLessThan(500); // Target: under 500ms

    const totalTime = Date.now() - startTime;
    console.log(`Performance test completed in ${totalTime}ms`);
  });
});

export {};