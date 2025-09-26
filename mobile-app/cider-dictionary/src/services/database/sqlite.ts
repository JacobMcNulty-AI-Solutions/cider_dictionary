import * as SQLite from 'expo-sqlite';
import { BasicCiderRecord, CiderMasterRecord, CiderDatabase, Rating } from '../../types/cider';
import { DatabaseError, ErrorHandler, withRetry } from '../../utils/errors';

// Database connection pool for better performance
class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager;
  private db: SQLite.SQLiteDatabase | null = null;
  private initialized = false;

  static getInstance(): DatabaseConnectionManager {
    if (!DatabaseConnectionManager.instance) {
      DatabaseConnectionManager.instance = new DatabaseConnectionManager();
    }
    return DatabaseConnectionManager.instance;
  }

  async getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (!this.initialized) {
      await this.initialize();
    }
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  private async initialize(): Promise<void> {
    try {
      this.db = await withRetry(async () => {
        const database = await SQLite.openDatabaseAsync('cider_dictionary_v3.db');

        await database.execAsync(`
          CREATE TABLE IF NOT EXISTS ciders (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            name TEXT NOT NULL,
            brand TEXT NOT NULL,
            abv REAL NOT NULL,
            overallRating INTEGER NOT NULL,

            -- Optional basic fields
            photo TEXT,
            notes TEXT,

            -- Enthusiast level fields
            traditionalStyle TEXT,
            sweetness TEXT,
            carbonation TEXT,
            clarity TEXT,
            color TEXT,
            tasteTags TEXT, -- JSON array
            containerType TEXT,

            -- Expert level fields (stored as JSON)
            appleClassification TEXT, -- JSON object
            productionMethods TEXT,   -- JSON object
            detailedRatings TEXT,     -- JSON object
            venue TEXT,               -- JSON object or simple string

            -- System fields
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL,
            syncStatus TEXT DEFAULT 'pending',
            version INTEGER DEFAULT 1
          );
        `);

        // Create indexes for better query performance
        await database.execAsync(`
          CREATE INDEX IF NOT EXISTS idx_ciders_created_at ON ciders(createdAt DESC);
          CREATE INDEX IF NOT EXISTS idx_ciders_rating ON ciders(overallRating);
          CREATE INDEX IF NOT EXISTS idx_ciders_brand ON ciders(brand);
        `);

        return database;
      }, 3, 500);

      this.initialized = true;
      console.log('Database connection established');
    } catch (error) {
      const dbError = ErrorHandler.fromUnknown(error, 'Database initialization');
      ErrorHandler.log(dbError, 'DatabaseConnectionManager.initialize');

      // Fallback to in-memory database
      try {
        console.log('Attempting fallback to in-memory database...');
        this.db = await SQLite.openDatabaseAsync(':memory:');
        await this.createTables();
        this.initialized = true;
        console.log('Fallback in-memory database initialized');
      } catch (fallbackError) {
        const fallbackDbError = new DatabaseError(
          'Failed to initialize both persistent and in-memory databases',
          'Unable to initialize database. Please restart the application.',
          false,
          fallbackError instanceof Error ? fallbackError : undefined
        );
        ErrorHandler.log(fallbackDbError, 'DatabaseConnectionManager.initialize.fallback');
        throw fallbackDbError;
      }
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) return;

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS ciders (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        name TEXT NOT NULL,
        brand TEXT NOT NULL,
        abv REAL NOT NULL,
        overallRating INTEGER NOT NULL,

        -- Optional basic fields
        photo TEXT,
        notes TEXT,

        -- Enthusiast level fields
        traditionalStyle TEXT,
        sweetness TEXT,
        carbonation TEXT,
        clarity TEXT,
        color TEXT,
        tasteTags TEXT, -- JSON array
        containerType TEXT,

        -- Expert level fields (stored as JSON)
        appleClassification TEXT, -- JSON object
        productionMethods TEXT,   -- JSON object
        detailedRatings TEXT,     -- JSON object
        venue TEXT,               -- JSON object or simple string

        -- System fields
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'pending',
        version INTEGER DEFAULT 1
      );
    `);
  }

  async isInitialized(): Promise<boolean> {
    return this.initialized;
  }
}

export class BasicSQLiteService implements CiderDatabase {
  private connectionManager = DatabaseConnectionManager.getInstance();

  async initializeDatabase(): Promise<void> {
    // Use the connection manager - it handles initialization internally
    await this.connectionManager.getDatabase();
    console.log('SQLite database initialized successfully');
  }

  async createCider(ciderData: CiderMasterRecord): Promise<CiderMasterRecord> {
    try {
      return await withRetry(async () => {
        const db = await this.connectionManager.getDatabase();

        // Use prepared statement for better performance
        await db.runAsync(
          `INSERT INTO ciders (
            id, userId, name, brand, abv, overallRating,
            photo, notes,
            traditionalStyle, sweetness, carbonation, clarity, color, tasteTags, containerType,
            appleClassification, productionMethods, detailedRatings, venue,
            createdAt, updatedAt, syncStatus, version
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ciderData.id,
            ciderData.userId,
            ciderData.name,
            ciderData.brand,
            ciderData.abv,
            ciderData.overallRating,

            ciderData.photo || null,
            ciderData.notes || null,

            ciderData.traditionalStyle || null,
            ciderData.sweetness || null,
            ciderData.carbonation || null,
            ciderData.clarity || null,
            ciderData.color || null,
            ciderData.tasteTags ? JSON.stringify(ciderData.tasteTags) : null,
            ciderData.containerType || null,

            ciderData.appleClassification ? JSON.stringify(ciderData.appleClassification) : null,
            ciderData.productionMethods ? JSON.stringify(ciderData.productionMethods) : null,
            ciderData.detailedRatings ? JSON.stringify(ciderData.detailedRatings) : null,
            ciderData.venue ? (typeof ciderData.venue === 'string' ? ciderData.venue : JSON.stringify(ciderData.venue)) : null,

            ciderData.createdAt.toISOString(),
            ciderData.updatedAt.toISOString(),
            ciderData.syncStatus,
            ciderData.version
          ]
        );

        console.log('Cider created successfully:', ciderData);
        return ciderData;
      }, 2, 1000);
    } catch (error) {
      const dbError = new DatabaseError(
        `Failed to create cider: ${ciderData.name}`,
        'Failed to save cider. Please check your connection and try again.',
        true,
        error instanceof Error ? error : undefined
      );
      ErrorHandler.log(dbError, 'BasicSQLiteService.createCider');
      throw dbError;
    }
  }

  async getAllCiders(): Promise<CiderMasterRecord[]> {
    try {
      const db = await this.connectionManager.getDatabase();
      const result = await db.getAllAsync('SELECT * FROM ciders ORDER BY createdAt DESC');

      const ciders: CiderMasterRecord[] = result.map((row: any) => ({
        id: row.id,
        userId: row.userId,
        name: row.name,
        brand: row.brand,
        abv: row.abv,
        overallRating: row.overallRating,

        // Optional basic fields
        photo: row.photo || undefined,
        notes: row.notes || undefined,

        // Enthusiast level fields
        traditionalStyle: row.traditionalStyle || undefined,
        sweetness: row.sweetness || undefined,
        carbonation: row.carbonation || undefined,
        clarity: row.clarity || undefined,
        color: row.color || undefined,
        tasteTags: row.tasteTags ? JSON.parse(row.tasteTags) : undefined,
        containerType: row.containerType || undefined,

        // Expert level fields
        appleClassification: row.appleClassification ? JSON.parse(row.appleClassification) : undefined,
        productionMethods: row.productionMethods ? JSON.parse(row.productionMethods) : undefined,
        detailedRatings: row.detailedRatings ? JSON.parse(row.detailedRatings) : undefined,
        venue: row.venue ? (row.venue.startsWith('{') ? JSON.parse(row.venue) : row.venue) : undefined,

        // System fields
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
        syncStatus: row.syncStatus,
        version: row.version
      }));

      return ciders;
    } catch (error) {
      const dbError = new DatabaseError(
        'Failed to retrieve ciders',
        'Unable to load ciders. Please try again.',
        true,
        error instanceof Error ? error : undefined
      );
      ErrorHandler.log(dbError, 'BasicSQLiteService.getAllCiders');
      throw dbError;
    }
  }

  async getCiderById(id: string): Promise<CiderMasterRecord | null> {
    try {
      const db = await this.connectionManager.getDatabase();
      const result = await db.getFirstAsync('SELECT * FROM ciders WHERE id = ?', [id]);

      if (!result) {
        return null;
      }

      const row = result as any;
      return {
        id: row.id,
        userId: row.userId,
        name: row.name,
        brand: row.brand,
        abv: row.abv,
        overallRating: row.overallRating,

        // Optional basic fields
        photo: row.photo || undefined,
        notes: row.notes || undefined,

        // Enthusiast level fields
        traditionalStyle: row.traditionalStyle || undefined,
        sweetness: row.sweetness || undefined,
        carbonation: row.carbonation || undefined,
        clarity: row.clarity || undefined,
        color: row.color || undefined,
        tasteTags: row.tasteTags ? JSON.parse(row.tasteTags) : undefined,
        containerType: row.containerType || undefined,

        // Expert level fields
        appleClassification: row.appleClassification ? JSON.parse(row.appleClassification) : undefined,
        productionMethods: row.productionMethods ? JSON.parse(row.productionMethods) : undefined,
        detailedRatings: row.detailedRatings ? JSON.parse(row.detailedRatings) : undefined,
        venue: row.venue ? (row.venue.startsWith('{') ? JSON.parse(row.venue) : row.venue) : undefined,

        // System fields
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
        syncStatus: row.syncStatus,
        version: row.version
      };
    } catch (error) {
      const dbError = new DatabaseError(
        `Failed to get cider by ID: ${id}`,
        'Unable to load cider details. Please try again.',
        true,
        error instanceof Error ? error : undefined
      );
      ErrorHandler.log(dbError, 'BasicSQLiteService.getCiderById');
      throw dbError;
    }
  }

  async updateCider(id: string, updates: Partial<Omit<BasicCiderRecord, 'id' | 'createdAt'>>): Promise<void> {
    try {
      const db = await this.connectionManager.getDatabase();
      const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);

      await db.runAsync(
        `UPDATE ciders SET ${setClause} WHERE id = ?`,
        [...values, id]
      );

      console.log('Cider updated successfully:', id);
    } catch (error) {
      const dbError = new DatabaseError(
        `Failed to update cider: ${id}`,
        'Unable to update cider. Please try again.',
        true,
        error instanceof Error ? error : undefined
      );
      ErrorHandler.log(dbError, 'BasicSQLiteService.updateCider');
      throw dbError;
    }
  }

  async deleteCider(id: string): Promise<void> {
    try {
      const db = await this.connectionManager.getDatabase();
      await db.runAsync('DELETE FROM ciders WHERE id = ?', [id]);
      console.log('Cider deleted successfully:', id);
    } catch (error) {
      const dbError = new DatabaseError(
        `Failed to delete cider: ${id}`,
        'Unable to delete cider. Please try again.',
        true,
        error instanceof Error ? error : undefined
      );
      ErrorHandler.log(dbError, 'BasicSQLiteService.deleteCider');
      throw dbError;
    }
  }

  // Basic analytics helper method
  async getBasicAnalytics() {
    const ciders = await this.getAllCiders();

    if (ciders.length === 0) {
      return {
        totalCiders: 0,
        averageRating: 0,
        averageAbv: 0,
        highestRated: null,
        lowestRated: null
      };
    }

    const totalRating = ciders.reduce((sum, cider) => sum + cider.overallRating, 0);
    const totalAbv = ciders.reduce((sum, cider) => sum + cider.abv, 0);

    const sortedByRating = [...ciders].sort((a, b) => b.overallRating - a.overallRating);

    return {
      totalCiders: ciders.length,
      averageRating: Math.round((totalRating / ciders.length) * 10) / 10,
      averageAbv: Math.round((totalAbv / ciders.length) * 10) / 10,
      highestRated: sortedByRating[0],
      lowestRated: sortedByRating[sortedByRating.length - 1]
    };
  }
}

// Singleton instance
export const sqliteService = new BasicSQLiteService();