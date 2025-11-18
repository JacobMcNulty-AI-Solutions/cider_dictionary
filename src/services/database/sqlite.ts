import * as SQLite from 'expo-sqlite';
import { BasicCiderRecord, CiderMasterRecord, CiderDatabase, Rating } from '../../types/cider';
import { ExperienceLog } from '../../types/experience';
import { SyncOperation, SyncOperationType, SyncStatus } from '../../types/sync';
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

        // Create all tables using the same method as fallback
        await this.createTablesInDatabase(database);

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
        await this.createTablesInDatabase(this.db);
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

  private async createTablesInDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
    // Enable foreign key constraints
    await database.execAsync('PRAGMA foreign_keys = ON;');

    // Check if we need to migrate from pricePerMl to pricePerPint
    await this.migrateExperiencesTable(database);

    // Check if we need to migrate ciders table for comprehensive characteristics
    await this.migrateCidersTable(database);

    // Create ciders table
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

        -- Expert level fields (stored as JSON)
        appleClassification TEXT, -- JSON object
        productionMethods TEXT,   -- JSON object
        detailedRatings TEXT,     -- JSON object
        venue TEXT,               -- JSON object or simple string

        -- Additives & Ingredients (stored as JSON)
        fruitAdditions TEXT,      -- JSON array
        hops TEXT,                -- JSON object
        spicesBotanicals TEXT,    -- JSON array
        woodAging TEXT,           -- JSON object

        -- System fields
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'pending',
        version INTEGER DEFAULT 1
      );
    `);

    // Create experiences table
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS experiences (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        ciderId TEXT NOT NULL,

        -- Experience details
        date TEXT NOT NULL,
        venue TEXT NOT NULL, -- JSON object with venue info

        -- Price and value
        price REAL NOT NULL,
        containerSize INTEGER NOT NULL,
        containerType TEXT NOT NULL,
        containerTypeCustom TEXT,
        pricePerPint REAL NOT NULL,

        -- Optional experience data
        notes TEXT,
        rating INTEGER,
        weatherConditions TEXT,
        companionType TEXT,

        -- System fields
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'pending',
        version INTEGER DEFAULT 1,

        FOREIGN KEY (ciderId) REFERENCES ciders (id) ON DELETE CASCADE
      );
    `);

    // Create sync operations queue table
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_operations (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        data TEXT NOT NULL, -- JSON serialized data
        timestamp TEXT NOT NULL,
        retryCount INTEGER DEFAULT 0,
        maxRetries INTEGER DEFAULT 3,
        status TEXT DEFAULT 'pending',
        errorMessage TEXT
      );
    `);

    // Create sync conflicts table
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_conflicts (
        id TEXT PRIMARY KEY,
        entityId TEXT NOT NULL,
        entityType TEXT NOT NULL,
        localVersion TEXT NOT NULL, -- JSON
        remoteVersion TEXT NOT NULL, -- JSON
        conflictFields TEXT NOT NULL, -- JSON array
        createdAt TEXT NOT NULL,
        resolution TEXT -- JSON object, nullable
      );
    `);

    // Create indexes for better query performance
    await database.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_experiences_cider_id ON experiences(ciderId);
      CREATE INDEX IF NOT EXISTS idx_experiences_date ON experiences(date DESC);
      CREATE INDEX IF NOT EXISTS idx_experiences_price_per_pint ON experiences(pricePerPint);
      CREATE INDEX IF NOT EXISTS idx_sync_operations_status ON sync_operations(status);
      CREATE INDEX IF NOT EXISTS idx_sync_operations_timestamp ON sync_operations(timestamp);
    `);
  }

  private async migrateExperiencesTable(database: SQLite.SQLiteDatabase): Promise<void> {
    try {
      // Check if experiences table exists and has the old pricePerMl column
      const tableInfo = await database.getAllAsync(`PRAGMA table_info(experiences)`);
      const hasOldColumn = tableInfo.some((col: any) => col.name === 'pricePerMl');
      const hasNewColumn = tableInfo.some((col: any) => col.name === 'pricePerPint');
      const hasContainerType = tableInfo.some((col: any) => col.name === 'containerType');

      // Migrate pricePerMl to pricePerPint
      if (hasOldColumn) {
        console.log('Migrating experiences table from pricePerMl to pricePerPint...');

        // SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
        // 1. Create new table with correct schema
        await database.execAsync(`
          CREATE TABLE IF NOT EXISTS experiences_new (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            ciderId TEXT NOT NULL,
            date TEXT NOT NULL,
            venue TEXT NOT NULL,
            price REAL NOT NULL,
            containerSize INTEGER NOT NULL,
            containerType TEXT NOT NULL,
            containerTypeCustom TEXT,
            pricePerPint REAL NOT NULL,
            notes TEXT,
            rating INTEGER,
            weatherConditions TEXT,
            companionType TEXT,
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL,
            syncStatus TEXT DEFAULT 'pending',
            version INTEGER DEFAULT 1,
            FOREIGN KEY (ciderId) REFERENCES ciders (id) ON DELETE CASCADE
          );
        `);

        // 2. Copy data from old table to new table, converting pricePerMl to pricePerPint
        await database.execAsync(`
          INSERT INTO experiences_new (
            id, userId, ciderId, date, venue, price, containerSize, containerType, containerTypeCustom,
            pricePerPint, notes, rating, weatherConditions, companionType,
            createdAt, updatedAt, syncStatus, version
          )
          SELECT
            id, userId, ciderId, date, venue, price, containerSize,
            COALESCE(containerType, 'bottle') as containerType,
            containerTypeCustom,
            COALESCE(pricePerPint, pricePerMl * 568) as pricePerPint,
            notes, rating, weatherConditions, companionType,
            createdAt, updatedAt, syncStatus, version
          FROM experiences;
        `);

        // 3. Drop old table
        await database.execAsync(`DROP TABLE experiences;`);

        // 4. Rename new table to old name
        await database.execAsync(`ALTER TABLE experiences_new RENAME TO experiences;`);

        // 5. Recreate indexes
        await database.execAsync(`
          CREATE INDEX IF NOT EXISTS idx_experiences_cider_id ON experiences(ciderId);
          CREATE INDEX IF NOT EXISTS idx_experiences_date ON experiences(date DESC);
          CREATE INDEX IF NOT EXISTS idx_experiences_price_per_pint ON experiences(pricePerPint);
        `);

        console.log('PricePerPint migration completed successfully');
      } else if (!hasNewColumn && !hasOldColumn) {
        // Table exists but has neither column - add pricePerPint
        console.log('Adding pricePerPint column to experiences table...');
        await database.execAsync(`ALTER TABLE experiences ADD COLUMN pricePerPint REAL NOT NULL DEFAULT 0`);
      }

      // Add containerType to experiences if not present
      if (!hasContainerType) {
        console.log('Adding containerType to experiences table...');
        await database.execAsync(`ALTER TABLE experiences ADD COLUMN containerType TEXT DEFAULT 'bottle'`);
      }

      // Add containerTypeCustom to experiences if not present
      const hasContainerTypeCustom = tableInfo.some((col: any) => col.name === 'containerTypeCustom');
      if (!hasContainerTypeCustom) {
        console.log('Adding containerTypeCustom to experiences table...');
        await database.execAsync(`ALTER TABLE experiences ADD COLUMN containerTypeCustom TEXT`);
        console.log('ContainerTypeCustom column added successfully');
      }
    } catch (error) {
      console.warn('Migration attempt failed, table may not exist yet:', error);
      // This is expected if the table doesn't exist yet
    }
  }

  private async migrateCidersTable(database: SQLite.SQLiteDatabase): Promise<void> {
    try {
      // Check if ciders table exists and has the new comprehensive characteristics columns
      const tableInfo = await database.getAllAsync(`PRAGMA table_info(ciders)`);
      const existingColumns = tableInfo.map((col: any) => col.name);

      // List of new columns that need to be added for comprehensive characteristics
      const newColumns = [
        { name: 'fruitAdditions', type: 'TEXT' },
        { name: 'hops', type: 'TEXT' },
        { name: 'spicesBotanicals', type: 'TEXT' },
        { name: 'woodAging', type: 'TEXT' }
      ];

      // Add missing columns
      let migrationNeeded = false;
      for (const column of newColumns) {
        if (!existingColumns.includes(column.name)) {
          console.log(`Adding ${column.name} column to ciders table...`);
          await database.execAsync(`ALTER TABLE ciders ADD COLUMN ${column.name} ${column.type}`);
          migrationNeeded = true;
        }
      }

      if (migrationNeeded) {
        console.log('Ciders table migration completed successfully');
      }
    } catch (error) {
      console.warn('Ciders migration attempt failed, table may not exist yet:', error);
      // This is expected if the table doesn't exist yet
    }
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
            traditionalStyle, sweetness, carbonation, clarity, color, tasteTags,
            appleClassification, productionMethods, detailedRatings, venue,
            fruitAdditions, hops, spicesBotanicals, woodAging,
            createdAt, updatedAt, syncStatus, version
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

            ciderData.appleClassification ? JSON.stringify(ciderData.appleClassification) : null,
            ciderData.productionMethods ? JSON.stringify(ciderData.productionMethods) : null,
            ciderData.detailedRatings ? JSON.stringify(ciderData.detailedRatings) : null,
            ciderData.venue ? (typeof ciderData.venue === 'string' ? ciderData.venue : JSON.stringify(ciderData.venue)) : null,

            ciderData.fruitAdditions ? JSON.stringify(ciderData.fruitAdditions) : null,
            ciderData.hops ? JSON.stringify(ciderData.hops) : null,
            ciderData.spicesBotanicals ? JSON.stringify(ciderData.spicesBotanicals) : null,
            ciderData.woodAging ? JSON.stringify(ciderData.woodAging) : null,

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

        // Expert level fields
        appleClassification: row.appleClassification ? JSON.parse(row.appleClassification) : undefined,
        productionMethods: row.productionMethods ? JSON.parse(row.productionMethods) : undefined,
        detailedRatings: row.detailedRatings ? JSON.parse(row.detailedRatings) : undefined,
        venue: row.venue ? (row.venue.startsWith('{') ? JSON.parse(row.venue) : row.venue) : undefined,

        // Additives & Ingredients
        fruitAdditions: row.fruitAdditions ? JSON.parse(row.fruitAdditions) : undefined,
        hops: row.hops ? JSON.parse(row.hops) : undefined,
        spicesBotanicals: row.spicesBotanicals ? JSON.parse(row.spicesBotanicals) : undefined,
        woodAging: row.woodAging ? JSON.parse(row.woodAging) : undefined,

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

  // Experience logging methods
  async createExperience(experience: ExperienceLog): Promise<ExperienceLog> {
    try {
      return await withRetry(async () => {
        const db = await this.connectionManager.getDatabase();

        await db.runAsync(
          `INSERT INTO experiences (
            id, userId, ciderId, date, venue, price, containerSize, containerType, containerTypeCustom, pricePerPint,
            notes, rating, weatherConditions, companionType,
            createdAt, updatedAt, syncStatus, version
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            experience.id,
            experience.userId,
            experience.ciderId,
            experience.date.toISOString(),
            JSON.stringify(experience.venue),
            experience.price,
            experience.containerSize,
            experience.containerType,
            experience.containerTypeCustom || null,
            experience.pricePerPint,
            experience.notes || null,
            experience.rating || null,
            experience.weatherConditions || null,
            experience.companionType || null,
            experience.createdAt.toISOString(),
            experience.updatedAt.toISOString(),
            experience.syncStatus,
            experience.version
          ]
        );

        console.log('Experience created successfully:', experience.id);
        return experience;
      }, 2, 1000);
    } catch (error) {
      const dbError = new DatabaseError(
        `Failed to create experience for cider: ${experience.ciderId}`,
        'Failed to save experience. Please check your connection and try again.',
        true,
        error instanceof Error ? error : undefined
      );
      ErrorHandler.log(dbError, 'BasicSQLiteService.createExperience');
      throw dbError;
    }
  }

  async getExperiencesByCiderId(ciderId: string): Promise<ExperienceLog[]> {
    try {
      const db = await this.connectionManager.getDatabase();
      const result = await db.getAllAsync(
        'SELECT * FROM experiences WHERE ciderId = ? ORDER BY date DESC',
        [ciderId]
      );

      return result.map((row: any) => this.mapRowToExperience(row));
    } catch (error) {
      const dbError = new DatabaseError(
        `Failed to get experiences for cider: ${ciderId}`,
        'Unable to load experience history. Please try again.',
        true,
        error instanceof Error ? error : undefined
      );
      ErrorHandler.log(dbError, 'BasicSQLiteService.getExperiencesByCiderId');
      throw dbError;
    }
  }

  async getAllExperiences(): Promise<ExperienceLog[]> {
    try {
      const db = await this.connectionManager.getDatabase();
      const result = await db.getAllAsync('SELECT * FROM experiences ORDER BY date DESC');

      return result.map((row: any) => this.mapRowToExperience(row));
    } catch (error) {
      const dbError = new DatabaseError(
        'Failed to retrieve experiences',
        'Unable to load experiences. Please try again.',
        true,
        error instanceof Error ? error : undefined
      );
      ErrorHandler.log(dbError, 'BasicSQLiteService.getAllExperiences');
      throw dbError;
    }
  }

  async deleteExperience(id: string): Promise<void> {
    try {
      const db = await this.connectionManager.getDatabase();
      await db.runAsync('DELETE FROM experiences WHERE id = ?', [id]);
      console.log('Experience deleted successfully:', id);
    } catch (error) {
      const dbError = new DatabaseError(
        `Failed to delete experience: ${id}`,
        'Unable to delete experience. Please try again.',
        true,
        error instanceof Error ? error : undefined
      );
      ErrorHandler.log(dbError, 'BasicSQLiteService.deleteExperience');
      throw dbError;
    }
  }

  // Sync operations methods
  async insertSyncOperation(operation: SyncOperation): Promise<void> {
    try {
      const db = await this.connectionManager.getDatabase();
      await db.runAsync(
        `INSERT INTO sync_operations (
          id, type, data, timestamp, retryCount, maxRetries, status, errorMessage
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          operation.id,
          operation.type,
          JSON.stringify(operation.data),
          operation.timestamp.toISOString(),
          operation.retryCount,
          operation.maxRetries,
          operation.status,
          operation.errorMessage || null
        ]
      );
    } catch (error) {
      console.error('Failed to insert sync operation:', error);
      throw error;
    }
  }

  async getPendingSyncOperations(): Promise<SyncOperation[]> {
    try {
      const db = await this.connectionManager.getDatabase();
      const result = await db.getAllAsync(
        'SELECT * FROM sync_operations WHERE status = ? ORDER BY timestamp ASC',
        ['pending']
      );

      return result.map((row: any) => ({
        id: row.id,
        type: row.type as SyncOperationType,
        data: JSON.parse(row.data),
        timestamp: new Date(row.timestamp),
        retryCount: row.retryCount,
        maxRetries: row.maxRetries,
        status: row.status as SyncStatus,
        errorMessage: row.errorMessage || undefined
      }));
    } catch (error) {
      console.error('Failed to get pending sync operations:', error);
      throw error;
    }
  }

  async updateSyncOperationStatus(id: string, status: SyncStatus, errorMessage?: string): Promise<void> {
    try {
      const db = await this.connectionManager.getDatabase();
      await db.runAsync(
        'UPDATE sync_operations SET status = ?, errorMessage = ? WHERE id = ?',
        [status, errorMessage || null, id]
      );
    } catch (error) {
      console.error('Failed to update sync operation status:', error);
      throw error;
    }
  }

  async deleteSyncOperation(id: string): Promise<void> {
    try {
      const db = await this.connectionManager.getDatabase();
      await db.runAsync('DELETE FROM sync_operations WHERE id = ?', [id]);
    } catch (error) {
      console.error('Failed to delete sync operation:', error);
      throw error;
    }
  }

  private mapRowToExperience(row: any): ExperienceLog {
    // Handle migration period where both columns might exist
    const pricePerPint = row.pricePerPint || (row.pricePerMl ? row.pricePerMl * 568 : 0);

    return {
      id: row.id,
      userId: row.userId,
      ciderId: row.ciderId,
      date: new Date(row.date),
      venue: JSON.parse(row.venue),
      price: row.price,
      containerSize: row.containerSize,
      containerType: row.containerType || 'bottle', // Default for migration
      containerTypeCustom: row.containerTypeCustom || undefined,
      pricePerPint,
      notes: row.notes || undefined,
      rating: row.rating || undefined,
      weatherConditions: row.weatherConditions || undefined,
      companionType: row.companionType || undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      syncStatus: row.syncStatus,
      version: row.version
    };
  }
}

// Singleton instance
export const sqliteService = new BasicSQLiteService();