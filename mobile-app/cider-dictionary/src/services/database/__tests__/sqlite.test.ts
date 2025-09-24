import { BasicSQLiteService } from '../sqlite';
import { mockCiderRecord, createMockCider } from '../../../__tests__/fixtures/ciderData';

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

// Mock the error utils to prevent complex error logging during tests
jest.mock('../../../utils/errors', () => ({
  DatabaseError: class DatabaseError extends Error {
    constructor(message: string) { super(message); }
  },
  ErrorHandler: {
    log: jest.fn(),
    fromUnknown: jest.fn((error) => error),
  },
  withRetry: jest.fn((fn) => fn()),
}));

describe('BasicSQLiteService', () => {
  let service: BasicSQLiteService;
  let consoleMocks: {
    log: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    consoleMocks = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
    };

    service = new BasicSQLiteService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Phase 1 Core Functionality', () => {
    it('should initialize database successfully', async () => {
      const mockOpenDatabaseAsync = require('expo-sqlite').openDatabaseAsync;
      mockOpenDatabaseAsync.mockResolvedValueOnce(mockDb);

      await expect(service.initializeDatabase()).resolves.not.toThrow();
      expect(consoleMocks.log).toHaveBeenCalledWith('SQLite database initialized successfully');
    });

    it('should create a new cider record', async () => {
      const ciderData = {
        name: 'Test Cider',
        brand: 'Test Brand',
        abv: 5.5,
        overallRating: 7,
      };

      const mockOpenDatabaseAsync = require('expo-sqlite').openDatabaseAsync;
      mockOpenDatabaseAsync.mockResolvedValueOnce(mockDb);
      mockDb.runAsync.mockResolvedValueOnce(undefined);

      const result = await service.createCider(ciderData);

      expect(result).toEqual(expect.objectContaining({
        id: expect.any(String),
        name: ciderData.name,
        brand: ciderData.brand,
        abv: ciderData.abv,
        overallRating: ciderData.overallRating,
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

    it('should retrieve all ciders successfully', async () => {
      const mockCiders = [mockCiderRecord];
      const mockOpenDatabaseAsync = require('expo-sqlite').openDatabaseAsync;
      mockOpenDatabaseAsync.mockResolvedValueOnce(mockDb);
      mockDb.getAllAsync.mockResolvedValueOnce(mockCiders);

      const result = await service.getAllCiders();

      expect(Array.isArray(result)).toBe(true);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith('SELECT * FROM ciders ORDER BY createdAt DESC');
    });

    it('should retrieve empty array when no ciders exist', async () => {
      const mockOpenDatabaseAsync = require('expo-sqlite').openDatabaseAsync;
      mockOpenDatabaseAsync.mockResolvedValueOnce(mockDb);
      mockDb.getAllAsync.mockResolvedValueOnce([]);

      const result = await service.getAllCiders();

      expect(result).toEqual([]);
    });

    it('should get cider by ID successfully', async () => {
      const mockOpenDatabaseAsync = require('expo-sqlite').openDatabaseAsync;
      mockOpenDatabaseAsync.mockResolvedValueOnce(mockDb);
      mockDb.getFirstAsync.mockResolvedValueOnce(mockCiderRecord);

      const result = await service.getCiderById('1');

      expect(result).toEqual(expect.objectContaining({
        id: mockCiderRecord.id,
        name: mockCiderRecord.name,
      }));
      expect(mockDb.getFirstAsync).toHaveBeenCalledWith('SELECT * FROM ciders WHERE id = ?', ['1']);
    });

    it('should return null when cider not found', async () => {
      const mockOpenDatabaseAsync = require('expo-sqlite').openDatabaseAsync;
      mockOpenDatabaseAsync.mockResolvedValueOnce(mockDb);
      mockDb.getFirstAsync.mockResolvedValueOnce(null);

      const result = await service.getCiderById('999');

      expect(result).toBeNull();
    });

    it('should update cider successfully', async () => {
      const mockOpenDatabaseAsync = require('expo-sqlite').openDatabaseAsync;
      mockOpenDatabaseAsync.mockResolvedValueOnce(mockDb);
      mockDb.runAsync.mockResolvedValueOnce(undefined);

      await service.updateCider('1', { name: 'Updated Cider' });

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE ciders SET'),
        expect.arrayContaining(['Updated Cider', '1'])
      );
    });

    it('should delete cider successfully', async () => {
      const mockOpenDatabaseAsync = require('expo-sqlite').openDatabaseAsync;
      mockOpenDatabaseAsync.mockResolvedValueOnce(mockDb);
      mockDb.runAsync.mockResolvedValueOnce(undefined);

      await service.deleteCider('1');

      expect(mockDb.runAsync).toHaveBeenCalledWith('DELETE FROM ciders WHERE id = ?', ['1']);
    });

    it('should calculate basic analytics', async () => {
      const mockOpenDatabaseAsync = require('expo-sqlite').openDatabaseAsync;
      mockOpenDatabaseAsync.mockResolvedValueOnce(mockDb);

      // Mock getAllAsync for the analytics method (it calls getAllCiders internally)
      mockDb.getAllAsync.mockResolvedValueOnce([mockCiderRecord]);

      const result = await service.getBasicAnalytics();

      expect(result).toEqual(expect.objectContaining({
        totalCiders: expect.any(Number),
        averageRating: expect.any(Number),
        averageAbv: expect.any(Number),
      }));
    });
  });

  describe('Error Handling', () => {
    it('should handle database creation errors gracefully', async () => {
      const error = new Error('Database error');
      const mockOpenDatabaseAsync = require('expo-sqlite').openDatabaseAsync;
      mockOpenDatabaseAsync.mockResolvedValueOnce(mockDb);
      mockDb.runAsync.mockRejectedValueOnce(error);

      await expect(service.createCider({
        name: 'Test Cider',
        brand: 'Test Brand',
        abv: 5.5,
        overallRating: 7,
      })).rejects.toThrow();
    });

    it('should handle database retrieval errors gracefully', async () => {
      const error = new Error('Database error');
      const mockOpenDatabaseAsync = require('expo-sqlite').openDatabaseAsync;
      mockOpenDatabaseAsync.mockResolvedValueOnce(mockDb);
      mockDb.getAllAsync.mockRejectedValueOnce(error);

      await expect(service.getAllCiders()).rejects.toThrow();
    });
  });
});