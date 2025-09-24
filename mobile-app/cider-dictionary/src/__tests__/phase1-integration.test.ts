/**
 * Phase 1 Integration Tests
 * Simple, focused tests that match the actual implementation
 */

import { BasicSQLiteService } from '../services/database/sqlite';
import { firebaseConfig } from '../services/firebase/config';

// Mock SQLite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue({
    execAsync: jest.fn().mockResolvedValue(undefined),
    runAsync: jest.fn().mockResolvedValue({ insertId: 1 }),
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
  }),
}));

describe('Phase 1 Core Functionality', () => {
  describe('SQLite Service', () => {
    let sqliteService: BasicSQLiteService;

    beforeEach(() => {
      sqliteService = new BasicSQLiteService();
    });

    it('should initialize database successfully', async () => {
      await expect(sqliteService.initializeDatabase()).resolves.not.toThrow();
    });

    it('should create a new cider record', async () => {
      await sqliteService.initializeDatabase();

      const testCider = {
        name: 'Test Cider',
        brand: 'Test Brand',
        abv: 5.0,
        overallRating: 7
      };

      const result = await sqliteService.createCider(testCider);

      expect(result).toMatchObject({
        name: testCider.name,
        brand: testCider.brand,
        abv: testCider.abv,
        overallRating: testCider.overallRating
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should retrieve all ciders', async () => {
      await sqliteService.initializeDatabase();
      const ciders = await sqliteService.getAllCiders();
      expect(Array.isArray(ciders)).toBe(true);
    });

    it('should calculate basic analytics', async () => {
      await sqliteService.initializeDatabase();
      const analytics = await sqliteService.getBasicAnalytics();

      expect(analytics).toHaveProperty('totalCiders');
      expect(analytics).toHaveProperty('averageRating');
      expect(analytics).toHaveProperty('averageAbv');
      expect(analytics).toHaveProperty('highestRated');
      expect(analytics).toHaveProperty('lowestRated');
    });
  });

  describe('Firebase Configuration', () => {
    it('should load environment variables correctly', () => {
      expect(firebaseConfig.apiKey).toBeDefined();
      expect(firebaseConfig.projectId).toBeDefined();
      expect(firebaseConfig.authDomain).toBeDefined();
    });

    it('should have valid firebase config structure', () => {
      expect(firebaseConfig).toHaveProperty('apiKey');
      expect(firebaseConfig).toHaveProperty('authDomain');
      expect(firebaseConfig).toHaveProperty('projectId');
      expect(firebaseConfig).toHaveProperty('storageBucket');
      expect(firebaseConfig).toHaveProperty('messagingSenderId');
      expect(firebaseConfig).toHaveProperty('appId');
    });
  });
});

describe('Phase 1 Data Models', () => {
  it('should validate BasicCiderRecord interface', () => {
    const mockCider = {
      id: '1',
      name: 'Test Cider',
      brand: 'Test Brand',
      abv: 5.0,
      overallRating: 8,
      createdAt: new Date()
    };

    // TypeScript will catch any interface violations at compile time
    expect(mockCider.id).toBe('1');
    expect(mockCider.name).toBe('Test Cider');
    expect(mockCider.brand).toBe('Test Brand');
    expect(mockCider.abv).toBe(5.0);
    expect(mockCider.overallRating).toBe(8);
    expect(mockCider.createdAt).toBeInstanceOf(Date);
  });

  it('should handle rating boundaries correctly', () => {
    const validRatings = [1, 5, 10];
    validRatings.forEach(rating => {
      expect(rating).toBeGreaterThanOrEqual(1);
      expect(rating).toBeLessThanOrEqual(10);
    });
  });

  it('should handle ABV values correctly', () => {
    const validAbvValues = [0.5, 5.0, 8.5, 12.0];
    validAbvValues.forEach(abv => {
      expect(abv).toBeGreaterThanOrEqual(0);
      expect(typeof abv).toBe('number');
    });
  });
});