import { BasicSQLiteService } from '../sqlite';
import { mockCiderRecord, mockCiderRecords, createMockCider } from '../../../__tests__/fixtures/ciderData';
import { mockConsole } from '../../../__tests__/utils/testUtils';

// Mock expo-sqlite
const mockDb = {
  execAsync: jest.fn(),
  runAsync: jest.fn(),
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn(),
};

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() => Promise.resolve(mockDb)),
}));

describe('BasicSQLiteService', () => {
  let service: BasicSQLiteService;
  let consoleMocks: ReturnType<typeof mockConsole>;

  beforeEach(() => {
    service = new BasicSQLiteService();
    consoleMocks = mockConsole();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initializeDatabase', () => {
    it('should initialize database successfully', async () => {
      await service.initializeDatabase();

      expect(mockDb.execAsync).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS ciders')
      );
      expect(consoleMocks.log).toHaveBeenCalledWith('Database connection established');
      expect(consoleMocks.log).toHaveBeenCalledWith('SQLite database initialized successfully');
    });

    it('should handle database initialization failure with fallback', async () => {
      const mockOpenDatabaseAsync = require('expo-sqlite').openDatabaseAsync;
      mockOpenDatabaseAsync
        .mockRejectedValueOnce(new Error('Primary database failed'))
        .mockResolvedValueOnce(mockDb);

      await service.initializeDatabase();

      expect(mockOpenDatabaseAsync).toHaveBeenCalledTimes(2);
      expect(mockOpenDatabaseAsync).toHaveBeenNthCalledWith(1, 'cider_dictionary_v2.db');
      expect(mockOpenDatabaseAsync).toHaveBeenNthCalledWith(2, ':memory:');
      expect(consoleMocks.log).toHaveBeenCalledWith('Attempting fallback to in-memory database...');
      expect(consoleMocks.log).toHaveBeenCalledWith('Fallback in-memory database initialized successfully');
    });

    it('should throw error if both primary and fallback initialization fail', async () => {
      const mockOpenDatabaseAsync = require('expo-sqlite').openDatabaseAsync;
      const primaryError = new Error('Primary database failed');
      const fallbackError = new Error('Fallback database failed');

      mockOpenDatabaseAsync
        .mockRejectedValueOnce(primaryError)
        .mockRejectedValueOnce(fallbackError);

      await expect(service.initializeDatabase()).rejects.toThrow('Primary database failed');
    });
  });

  describe('createCider', () => {
    beforeEach(async () => {
      await service.initializeDatabase();
    });

    it('should create a new cider successfully', async () => {
      const ciderData = {
        name: 'Test Cider',
        brand: 'Test Brand',
        abv: 5.5,
        overallRating: 7,
      };

      mockDb.runAsync.mockResolvedValueOnce(undefined);

      const result = await service.createCider(ciderData);

      expect(result).toEqual(expect.objectContaining({
        id: expect.any(String),
        ...ciderData,
        createdAt: expect.any(Date),
      }));

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'INSERT INTO ciders (id, name, brand, abv, overallRating, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        expect.arrayContaining([
          expect.any(String),
          ciderData.name,
          ciderData.brand,
          ciderData.abv,
          ciderData.overallRating,
          expect.any(String),
        ])
      );
    });

    it('should throw error if database is not initialized', async () => {
      const uninitializedService = new BasicSQLiteService();
      const ciderData = {
        name: 'Test Cider',
        brand: 'Test Brand',
        abv: 5.5,
        overallRating: 7,
      };

      await expect(uninitializedService.createCider(ciderData)).rejects.toThrow(
        'Database not initialized'
      );
    });

    it('should handle database errors during creation', async () => {
      const ciderData = {
        name: 'Test Cider',
        brand: 'Test Brand',
        abv: 5.5,
        overallRating: 7,
      };

      const dbError = new Error('Database insert failed');
      mockDb.runAsync.mockRejectedValueOnce(dbError);

      await expect(service.createCider(ciderData)).rejects.toThrow('Database insert failed');
      expect(consoleMocks.error).toHaveBeenCalledWith('Failed to create cider:', dbError);
    });
  });

  describe('getAllCiders', () => {
    beforeEach(async () => {
      await service.initializeDatabase();
    });

    it('should return all ciders successfully', async () => {
      const mockDbRows = mockCiderRecords.map(cider => ({
        ...cider,
        createdAt: cider.createdAt.toISOString(),
      }));

      mockDb.getAllAsync.mockResolvedValueOnce(mockDbRows);

      const result = await service.getAllCiders();

      expect(result).toHaveLength(mockCiderRecords.length);
      expect(result[0]).toEqual(expect.objectContaining({
        id: mockCiderRecords[0].id,
        name: mockCiderRecords[0].name,
        brand: mockCiderRecords[0].brand,
        abv: mockCiderRecords[0].abv,
        overallRating: mockCiderRecords[0].overallRating,
        createdAt: expect.any(Date),
      }));

      expect(mockDb.getAllAsync).toHaveBeenCalledWith('SELECT * FROM ciders ORDER BY createdAt DESC');
    });

    it('should return empty array when no ciders exist', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);

      const result = await service.getAllCiders();

      expect(result).toEqual([]);
    });

    it('should throw error if database is not initialized', async () => {
      const uninitializedService = new BasicSQLiteService();

      await expect(uninitializedService.getAllCiders()).rejects.toThrow(
        'Database not initialized'
      );
    });

    it('should handle database errors during retrieval', async () => {
      const dbError = new Error('Database select failed');
      mockDb.getAllAsync.mockRejectedValueOnce(dbError);

      await expect(service.getAllCiders()).rejects.toThrow('Database select failed');
      expect(consoleMocks.error).toHaveBeenCalledWith('Failed to get all ciders:', dbError);
    });
  });

  describe('getCiderById', () => {
    beforeEach(async () => {
      await service.initializeDatabase();
    });

    it('should return cider by ID successfully', async () => {
      const mockDbRow = {
        ...mockCiderRecord,
        createdAt: mockCiderRecord.createdAt.toISOString(),
      };

      mockDb.getFirstAsync.mockResolvedValueOnce(mockDbRow);

      const result = await service.getCiderById('1');

      expect(result).toEqual(expect.objectContaining({
        id: mockCiderRecord.id,
        name: mockCiderRecord.name,
        brand: mockCiderRecord.brand,
        abv: mockCiderRecord.abv,
        overallRating: mockCiderRecord.overallRating,
        createdAt: expect.any(Date),
      }));

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith('SELECT * FROM ciders WHERE id = ?', ['1']);
    });

    it('should return null when cider is not found', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce(null);

      const result = await service.getCiderById('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw error if database is not initialized', async () => {
      const uninitializedService = new BasicSQLiteService();

      await expect(uninitializedService.getCiderById('1')).rejects.toThrow(
        'Database not initialized'
      );
    });

    it('should handle database errors during retrieval', async () => {
      const dbError = new Error('Database select failed');
      mockDb.getFirstAsync.mockRejectedValueOnce(dbError);

      await expect(service.getCiderById('1')).rejects.toThrow('Database select failed');
      expect(consoleMocks.error).toHaveBeenCalledWith('Failed to get cider by ID:', dbError);
    });
  });

  describe('updateCider', () => {
    beforeEach(async () => {
      await service.initializeDatabase();
    });

    it('should update cider successfully', async () => {
      const updates = {
        name: 'Updated Name',
        overallRating: 9,
      };

      mockDb.runAsync.mockResolvedValueOnce(undefined);

      await service.updateCider('1', updates);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'UPDATE ciders SET name = ?, overallRating = ? WHERE id = ?',
        ['Updated Name', 9, '1']
      );
      expect(consoleMocks.log).toHaveBeenCalledWith('Cider updated successfully:', '1');
    });

    it('should handle single field updates', async () => {
      const updates = { abv: 6.5 };

      mockDb.runAsync.mockResolvedValueOnce(undefined);

      await service.updateCider('1', updates);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'UPDATE ciders SET abv = ? WHERE id = ?',
        [6.5, '1']
      );
    });

    it('should throw error if database is not initialized', async () => {
      const uninitializedService = new BasicSQLiteService();

      await expect(uninitializedService.updateCider('1', { name: 'Updated' })).rejects.toThrow(
        'Database not initialized'
      );
    });

    it('should handle database errors during update', async () => {
      const dbError = new Error('Database update failed');
      mockDb.runAsync.mockRejectedValueOnce(dbError);

      await expect(service.updateCider('1', { name: 'Updated' })).rejects.toThrow('Database update failed');
      expect(consoleMocks.error).toHaveBeenCalledWith('Failed to update cider:', dbError);
    });
  });

  describe('deleteCider', () => {
    beforeEach(async () => {
      await service.initializeDatabase();
    });

    it('should delete cider successfully', async () => {
      mockDb.runAsync.mockResolvedValueOnce(undefined);

      await service.deleteCider('1');

      expect(mockDb.runAsync).toHaveBeenCalledWith('DELETE FROM ciders WHERE id = ?', ['1']);
      expect(consoleMocks.log).toHaveBeenCalledWith('Cider deleted successfully:', '1');
    });

    it('should throw error if database is not initialized', async () => {
      const uninitializedService = new BasicSQLiteService();

      await expect(uninitializedService.deleteCider('1')).rejects.toThrow(
        'Database not initialized'
      );
    });

    it('should handle database errors during deletion', async () => {
      const dbError = new Error('Database delete failed');
      mockDb.runAsync.mockRejectedValueOnce(dbError);

      await expect(service.deleteCider('1')).rejects.toThrow('Database delete failed');
      expect(consoleMocks.error).toHaveBeenCalledWith('Failed to delete cider:', dbError);
    });
  });

  describe('getBasicAnalytics', () => {
    beforeEach(async () => {
      await service.initializeDatabase();
    });

    it('should return analytics for empty dataset', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);

      const result = await service.getBasicAnalytics();

      expect(result).toEqual({
        totalCiders: 0,
        averageRating: 0,
        averageAbv: 0,
        highestRated: null,
        lowestRated: null,
      });
    });

    it('should calculate analytics correctly for multiple ciders', async () => {
      const mockDbRows = mockCiderRecords.map(cider => ({
        ...cider,
        createdAt: cider.createdAt.toISOString(),
      }));

      mockDb.getAllAsync.mockResolvedValueOnce(mockDbRows);

      const result = await service.getBasicAnalytics();

      expect(result.totalCiders).toBe(5);
      expect(result.averageRating).toBe(7.0); // (7+6+8+5+9)/5 = 7
      expect(result.averageAbv).toBe(4.7); // (6+5+4+4.5+4)/5 = 4.7
      expect(result.highestRated?.name).toBe('Rekorderlig Strawberry & Lime');
      expect(result.lowestRated?.name).toBe('Magners Original');
    });

    it('should handle single cider analytics', async () => {
      const singleCider = [{
        ...mockCiderRecord,
        createdAt: mockCiderRecord.createdAt.toISOString(),
      }];

      mockDb.getAllAsync.mockResolvedValueOnce(singleCider);

      const result = await service.getBasicAnalytics();

      expect(result.totalCiders).toBe(1);
      expect(result.averageRating).toBe(7);
      expect(result.averageAbv).toBe(5.5);
      expect(result.highestRated?.name).toBe('Test Cider');
      expect(result.lowestRated?.name).toBe('Test Cider');
    });

    it('should round averages to one decimal place', async () => {
      const testCiders = [
        createMockCider({ id: '1', overallRating: 7, abv: 5.33 }),
        createMockCider({ id: '2', overallRating: 8, abv: 4.66 }),
        createMockCider({ id: '3', overallRating: 6, abv: 6.01 }),
      ].map(cider => ({
        ...cider,
        createdAt: cider.createdAt.toISOString(),
      }));

      mockDb.getAllAsync.mockResolvedValueOnce(testCiders);

      const result = await service.getBasicAnalytics();

      expect(result.averageRating).toBe(7.0); // (7+8+6)/3 = 7.0
      expect(result.averageAbv).toBe(5.3); // (5.33+4.66+6.01)/3 = 5.33... rounded to 5.3
    });
  });
});