// Phase 3 Basic Integration Tests
// Tests core functionality without external dependencies

import { sqliteService } from '../services/database/sqlite';
import { CiderMasterRecord } from '../types/cider';
import { ExperienceLog } from '../types/experience';

describe('Phase 3 Basic Integration Tests', () => {
  beforeEach(async () => {
    // Initialize database for each test
    await sqliteService.initializeDatabase();
  });

  describe('Database Extensions', () => {
    test('should create experiences table', async () => {
      // Verify experiences table was created by trying to insert
      const experience: ExperienceLog = {
        id: 'test-exp-1',
        userId: 'test-user',
        ciderId: 'test-cider-1',
        date: new Date(),
        venue: {
          id: 'venue-1',
          name: 'Test Pub',
          type: 'pub'
        },
        price: 4.50,
        containerSize: 568,
        pricePerMl: 4.50 / 568,
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'pending',
        version: 1
      };

      const created = await sqliteService.createExperience(experience);
      expect(created.id).toBe('test-exp-1');
      expect(created.venue.name).toBe('Test Pub');
      expect(created.pricePerMl).toBeCloseTo(0.00793, 5);
    });

    test('should retrieve experiences by cider ID', async () => {
      // Create test cider first
      const cider = await sqliteService.createCider({
        id: 'test-cider-exp',
        userId: 'test-user',
        name: 'Experience Test Cider',
        brand: 'Test Brand',
        abv: 5.0,
        overallRating: 8,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        syncStatus: 'pending'
      });

      // Create experiences
      await sqliteService.createExperience({
        id: 'exp-1',
        userId: 'test-user',
        ciderId: cider.id,
        date: new Date(),
        venue: { id: 'v1', name: 'Venue 1', type: 'pub' },
        price: 4.00,
        containerSize: 500,
        pricePerMl: 0.008,
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'pending',
        version: 1
      });

      await sqliteService.createExperience({
        id: 'exp-2',
        userId: 'test-user',
        ciderId: cider.id,
        date: new Date(),
        venue: { id: 'v2', name: 'Venue 2', type: 'restaurant' },
        price: 5.50,
        containerSize: 568,
        pricePerMl: 0.0097,
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'pending',
        version: 1
      });

      // Retrieve experiences
      const experiences = await sqliteService.getExperiencesByCiderId(cider.id);
      expect(experiences).toHaveLength(2);
      expect(experiences[0].venue.name).toBeDefined();
      expect(experiences[1].venue.name).toBeDefined();
    });

    test('should handle sync operations table', async () => {
      // Insert a sync operation (testing internal method)
      const operation = {
        id: 'test-sync-op',
        type: 'CREATE_CIDER' as const,
        data: { id: 'test', name: 'Test Cider' },
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
        status: 'pending' as const
      };

      await sqliteService.insertSyncOperation(operation);

      // Get pending operations
      const pending = await sqliteService.getPendingSyncOperations();
      expect(pending.length).toBeGreaterThan(0);

      const found = pending.find(op => op.id === 'test-sync-op');
      expect(found).toBeDefined();
      expect(found!.type).toBe('CREATE_CIDER');
      expect(found!.data.name).toBe('Test Cider');
    });
  });

  describe('Performance Targets', () => {
    test('should handle large dataset efficiently', async () => {
      const startTime = Date.now();

      // Create 50 test ciders (smaller than full test for CI)
      const ciderPromises = [];
      for (let i = 0; i < 50; i++) {
        ciderPromises.push(
          sqliteService.createCider({
            id: `perf-test-${i}`,
            userId: 'test-user',
            name: `Performance Cider ${i}`,
            brand: `Brand ${i % 5}`,
            abv: 4 + (i % 6),
            overallRating: (1 + (i % 10)) as any,
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 1,
            syncStatus: 'synced'
          })
        );
      }

      await Promise.all(ciderPromises);

      // Test retrieval
      const allCiders = await sqliteService.getAllCiders();
      expect(allCiders.length).toBe(50);

      // Test basic analytics performance
      const analyticsStart = Date.now();
      const basicAnalytics = await sqliteService.getBasicAnalytics();
      const analyticsTime = Date.now() - analyticsStart;

      expect(basicAnalytics.totalCiders).toBe(50);
      expect(analyticsTime).toBeLessThan(1000); // Should be much faster than 1s

      const totalTime = Date.now() - startTime;
      console.log(`Performance test with 50 ciders completed in ${totalTime}ms`);
    });

    test('should calculate price per ml accurately', async () => {
      const testCases = [
        { price: 4.50, size: 568, expected: 0.007924 },
        { price: 3.00, size: 330, expected: 0.009091 },
        { price: 5.50, size: 500, expected: 0.011 },
        { price: 2.50, size: 440, expected: 0.005682 }
      ];

      for (const testCase of testCases) {
        const experience: ExperienceLog = {
          id: `price-test-${testCase.size}`,
          userId: 'test-user',
          ciderId: 'price-test-cider',
          date: new Date(),
          venue: { id: 'test-venue', name: 'Test Venue', type: 'pub' },
          price: testCase.price,
          containerSize: testCase.size,
          pricePerMl: testCase.price / testCase.size,
          createdAt: new Date(),
          updatedAt: new Date(),
          syncStatus: 'pending',
          version: 1
        };

        await sqliteService.createExperience(experience);

        const retrieved = await sqliteService.getExperiencesByCiderId('price-test-cider');
        const found = retrieved.find(exp => exp.containerSize === testCase.size);

        expect(found).toBeDefined();
        expect(found!.pricePerMl).toBeCloseTo(testCase.expected, 6);
      }
    });
  });

  describe('Data Integrity', () => {
    test('should maintain referential integrity', async () => {
      // Create cider
      const cider = await sqliteService.createCider({
        id: 'integrity-test-cider',
        userId: 'test-user',
        name: 'Integrity Test',
        brand: 'Test Brand',
        abv: 5.0,
        overallRating: 7,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        syncStatus: 'synced'
      });

      // Create experience
      const experience: ExperienceLog = {
        id: 'integrity-exp',
        userId: 'test-user',
        ciderId: cider.id,
        date: new Date(),
        venue: { id: 'test-venue', name: 'Integrity Venue', type: 'pub' },
        price: 4.00,
        containerSize: 500,
        pricePerMl: 0.008,
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'pending',
        version: 1
      };

      await sqliteService.createExperience(experience);

      // Verify both exist
      const retrievedCider = await sqliteService.getCiderById(cider.id);
      const retrievedExperiences = await sqliteService.getExperiencesByCiderId(cider.id);

      expect(retrievedCider).not.toBeNull();
      expect(retrievedExperiences).toHaveLength(1);
      expect(retrievedExperiences[0].ciderId).toBe(cider.id);
    });

    test('should handle JSON serialization correctly', async () => {
      // Test complex venue data
      const complexVenue = {
        id: 'complex-venue',
        name: 'Complex Test Venue',
        type: 'pub' as const,
        location: {
          latitude: 51.5074,
          longitude: -0.1278
        }
      };

      const experience: ExperienceLog = {
        id: 'json-test-exp',
        userId: 'test-user',
        ciderId: 'json-test-cider',
        date: new Date(),
        venue: complexVenue,
        price: 4.75,
        containerSize: 568,
        pricePerMl: 4.75 / 568,
        notes: 'Test notes with special characters: áéíóú & symbols!',
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'pending',
        version: 1
      };

      await sqliteService.createExperience(experience);

      const retrieved = await sqliteService.getExperiencesByCiderId('json-test-cider');
      expect(retrieved).toHaveLength(1);

      const retrievedExp = retrieved[0];
      expect(retrievedExp.venue.name).toBe('Complex Test Venue');
      expect(retrievedExp.venue.location).toBeDefined();
      expect(retrievedExp.venue.location!.latitude).toBe(51.5074);
      expect(retrievedExp.venue.location!.longitude).toBe(-0.1278);
      expect(retrievedExp.notes).toBe('Test notes with special characters: áéíóú & symbols!');
    });
  });
});

export {};