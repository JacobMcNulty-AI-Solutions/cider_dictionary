import * as SQLite from 'expo-sqlite';
import { BasicCiderRecord, CiderMasterRecord, CiderDatabase, Rating } from '../../types/cider';
import { ExperienceLog } from '../../types/experience';
import { Venue, VenueRow, VenueFormData } from '../../types/venue';
import { SyncOperation, SyncOperationType, SyncStatus } from '../../types/sync';
import { DatabaseError, ErrorHandler, withRetry } from '../../utils/errors';
import { getCurrentUserId } from '../../utils/auth';

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

    // Run venues migration (creates table and extracts from experiences)
    await this.migrateVenuesTable(database);

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

    // Create venues table
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS venues (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        address TEXT,
        visitCount INTEGER DEFAULT 0,
        lastVisited TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'pending',
        version INTEGER DEFAULT 1
      );
    `);

    // Create migrations tracking table
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS migrations (
        name TEXT PRIMARY KEY,
        version INTEGER,
        applied_at TEXT
      );
    `);

    // Create indexes for better query performance
    await database.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_experiences_cider_id ON experiences(ciderId);
      CREATE INDEX IF NOT EXISTS idx_experiences_date ON experiences(date DESC);
      CREATE INDEX IF NOT EXISTS idx_experiences_price_per_pint ON experiences(pricePerPint);
      CREATE INDEX IF NOT EXISTS idx_experiences_venue_id ON experiences(venueId);
      CREATE INDEX IF NOT EXISTS idx_sync_operations_status ON sync_operations(status);
      CREATE INDEX IF NOT EXISTS idx_sync_operations_timestamp ON sync_operations(timestamp);
      CREATE INDEX IF NOT EXISTS idx_venues_user_id ON venues(userId);
      CREATE INDEX IF NOT EXISTS idx_venues_name ON venues(name);
      CREATE INDEX IF NOT EXISTS idx_venues_visit_count ON venues(visitCount DESC);
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

  // Migration version tracking helpers
  private async getMigrationVersion(database: SQLite.SQLiteDatabase, name: string): Promise<number> {
    try {
      const result = await database.getFirstAsync<{ version: number }>(
        "SELECT version FROM migrations WHERE name = ?",
        [name]
      );
      return result?.version || 0;
    } catch {
      // migrations table doesn't exist yet
      return 0;
    }
  }

  private async setMigrationVersion(database: SQLite.SQLiteDatabase, name: string, version: number): Promise<void> {
    await database.runAsync(
      `INSERT OR REPLACE INTO migrations (name, version, applied_at) VALUES (?, ?, ?)`,
      [name, version, new Date().toISOString()]
    );
  }

  private async migrateVenuesTable(database: SQLite.SQLiteDatabase): Promise<void> {
    const currentVersion = await this.getMigrationVersion(database, 'venues');

    // Skip if already migrated
    if (currentVersion >= 1) {
      console.log('Venues migration already applied (version', currentVersion, ')');
      return;
    }

    console.log('Starting venues migration...');

    try {
      // TRANSACTION: All or nothing
      await database.execAsync('BEGIN TRANSACTION');

      // 1. Check if experiences table exists and has data
      let hasExperiences = false;
      try {
        const expCount = await database.getFirstAsync<{ count: number }>(
          'SELECT COUNT(*) as count FROM experiences'
        );
        hasExperiences = (expCount?.count || 0) > 0;
      } catch {
        // experiences table doesn't exist yet
      }

      // 2. Add venueId column to experiences if not exists
      try {
        const columns = await database.getAllAsync(`PRAGMA table_info(experiences)`);
        const hasVenueId = (columns as any[]).some(col => col.name === 'venueId');
        if (!hasVenueId) {
          console.log('Adding venueId column to experiences table...');
          await database.execAsync('ALTER TABLE experiences ADD COLUMN venueId TEXT');
        }
      } catch {
        // experiences table doesn't exist yet
      }

      // 3. Extract unique venues from experiences (if any exist)
      if (hasExperiences) {
        await this.extractVenuesFromExperiences(database);
        await this.linkExperiencesToVenues(database);
      }

      // 4. Record migration version
      await this.setMigrationVersion(database, 'venues', 1);

      // COMMIT: All succeeded
      await database.execAsync('COMMIT');
      console.log('Venues migration completed successfully');

    } catch (error) {
      // ROLLBACK: Something failed
      console.error('Venues migration failed, rolling back:', error);
      try {
        await database.execAsync('ROLLBACK');
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
      // Don't throw - allow app to continue without migration
      console.warn('Continuing without venues migration - will retry on next launch');
    }
  }

  private async extractVenuesFromExperiences(database: SQLite.SQLiteDatabase): Promise<void> {
    console.log('Extracting venues from experiences...');

    const experiences = await database.getAllAsync('SELECT * FROM experiences');
    const venueMap = new Map<string, any>(); // key: name+type (dedup)

    for (const exp of experiences as any[]) {
      try {
        const venue = JSON.parse(exp.venue);
        if (!venue?.name) continue; // Skip invalid venues

        const key = `${venue.name.toLowerCase().trim()}_${venue.type || 'other'}`;

        if (!venueMap.has(key)) {
          venueMap.set(key, {
            id: venue.id || `venue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: exp.userId,
            name: venue.name.trim(),
            type: venue.type || 'other',
            latitude: venue.location?.latitude || null,
            longitude: venue.location?.longitude || null,
            address: venue.address || null,
            visitCount: 1,
            lastVisited: exp.date,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            syncStatus: 'pending',
            version: 1
          });
        } else {
          const existing = venueMap.get(key);
          existing.visitCount++;
          // Update lastVisited if this experience is more recent
          if (exp.date > existing.lastVisited) {
            existing.lastVisited = exp.date;
          }
          // Update location if missing
          if (!existing.latitude && venue.location?.latitude) {
            existing.latitude = venue.location.latitude;
            existing.longitude = venue.location.longitude;
          }
        }
      } catch (e) {
        console.warn('Failed to parse venue from experience:', exp.id);
      }
    }

    // Insert all unique venues
    console.log(`Inserting ${venueMap.size} unique venues...`);
    for (const venue of venueMap.values()) {
      await database.runAsync(
        `INSERT OR IGNORE INTO venues (
          id, userId, name, type, latitude, longitude, address,
          visitCount, lastVisited, createdAt, updatedAt, syncStatus, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          venue.id, venue.userId, venue.name, venue.type,
          venue.latitude, venue.longitude, venue.address,
          venue.visitCount, venue.lastVisited,
          venue.createdAt, venue.updatedAt, venue.syncStatus, venue.version
        ]
      );
    }
  }

  private async linkExperiencesToVenues(database: SQLite.SQLiteDatabase): Promise<void> {
    console.log('Linking experiences to venues...');

    const experiences = await database.getAllAsync('SELECT id, venue FROM experiences WHERE venueId IS NULL');
    let linked = 0;

    for (const exp of experiences as any[]) {
      try {
        const venueData = JSON.parse(exp.venue);
        if (!venueData?.name) continue;

        // Find matching venue by name (case-insensitive)
        const venue = await database.getFirstAsync<{ id: string }>(
          'SELECT id FROM venues WHERE LOWER(name) = LOWER(?)',
          [venueData.name.trim()]
        );

        if (venue) {
          await database.runAsync(
            'UPDATE experiences SET venueId = ? WHERE id = ?',
            [venue.id, exp.id]
          );
          linked++;
        }
      } catch (e) {
        // Skip malformed
      }
    }

    console.log(`Linked ${linked} experiences to venues`);
  }

  async isInitialized(): Promise<boolean> {
    return this.initialized;
  }
}

export class BasicSQLiteService implements CiderDatabase {
  private connectionManager = DatabaseConnectionManager.getInstance();

  /**
   * Get database connection manager (for advanced operations like transactions)
   */
  getConnectionManager(): DatabaseConnectionManager {
    return this.connectionManager;
  }

  /**
   * Get count of local ciders
   */
  async getCiderCount(): Promise<number> {
    try {
      const db = await this.connectionManager.getDatabase();
      const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM ciders');
      return result?.count || 0;
    } catch (error) {
      console.error('Failed to get cider count:', error);
      return 0;
    }
  }

  /**
   * Get count of local experiences
   */
  async getExperienceCount(): Promise<number> {
    try {
      const db = await this.connectionManager.getDatabase();
      const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM experiences');
      return result?.count || 0;
    } catch (error) {
      console.error('Failed to get experience count:', error);
      return 0;
    }
  }

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

  async updateCider(id: string, updates: Partial<Omit<CiderMasterRecord, 'id' | 'createdAt'>>): Promise<void> {
    try {
      const db = await this.connectionManager.getDatabase();

      // ALL fields that need JSON serialization (complete list from cider.ts)
      const jsonFields = [
        'tasteTags',           // string[]
        'appleClassification', // object with categories, varieties, longAshtonClassification
        'productionMethods',   // object with fermentation, specialProcesses
        'detailedRatings',     // object with appearance, aroma, taste, mouthfeel
        'venue',               // object with id, name, type, location
        'fruitAdditions',      // string[]
        'hops',                // object with varieties, character
        'spicesBotanicals',    // string[]
        'woodAging'            // object with woodType, barrelHistory
      ];

      const processedUpdates: Record<string, any> = {};

      for (const [key, value] of Object.entries(updates)) {
        if (jsonFields.includes(key)) {
          // Serialize objects and arrays to JSON strings
          processedUpdates[key] = value !== null && value !== undefined
            ? JSON.stringify(value)
            : null;
        } else if (key === 'updatedAt' && value instanceof Date) {
          processedUpdates[key] = value.toISOString();
        } else if (key === 'createdAt' && value instanceof Date) {
          processedUpdates[key] = value.toISOString();
        } else {
          processedUpdates[key] = value;
        }
      }

      // Always update the updatedAt timestamp
      if (!processedUpdates.updatedAt) {
        processedUpdates.updatedAt = new Date().toISOString();
      }

      // Increment version for sync conflict detection
      if (!processedUpdates.version) {
        // Get current version and increment
        const current = await db.getFirstAsync<{ version: number }>(
          'SELECT version FROM ciders WHERE id = ?',
          [id]
        );
        processedUpdates.version = (current?.version || 0) + 1;
      }

      // Mark as pending sync
      if (!processedUpdates.syncStatus) {
        processedUpdates.syncStatus = 'pending';
      }

      const setClause = Object.keys(processedUpdates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(processedUpdates);

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

        // Use venueId from experience, or fall back to venue.id
        const venueId = experience.venueId || experience.venue?.id || null;

        await db.runAsync(
          `INSERT INTO experiences (
            id, userId, ciderId, date, venue, venueId, price, containerSize, containerType, containerTypeCustom, pricePerPint,
            notes, rating, weatherConditions, companionType,
            createdAt, updatedAt, syncStatus, version
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            experience.id,
            experience.userId,
            experience.ciderId,
            experience.date.toISOString(),
            JSON.stringify(experience.venue),
            venueId,
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
      venueId: row.venueId || undefined,
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

  // =========================================================================
  // VENUE CRUD OPERATIONS
  // =========================================================================

  async createVenue(venue: Venue): Promise<Venue> {
    try {
      const db = await this.connectionManager.getDatabase();

      await db.runAsync(
        `INSERT INTO venues (
          id, userId, name, type, latitude, longitude, address,
          visitCount, lastVisited, createdAt, updatedAt, syncStatus, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          venue.id,
          venue.userId,
          venue.name,
          venue.type,
          venue.location?.latitude || null,
          venue.location?.longitude || null,
          venue.address || null,
          venue.visitCount,
          venue.lastVisited?.toISOString() || null,
          venue.createdAt.toISOString(),
          venue.updatedAt.toISOString(),
          venue.syncStatus,
          venue.version
        ]
      );

      console.log('Venue created successfully:', venue.name);
      return venue;
    } catch (error) {
      const dbError = new DatabaseError(
        `Failed to create venue: ${venue.name}`,
        'Failed to save venue. Please try again.',
        true,
        error instanceof Error ? error : undefined
      );
      ErrorHandler.log(dbError, 'BasicSQLiteService.createVenue');
      throw dbError;
    }
  }

  async getAllVenues(): Promise<Venue[]> {
    try {
      const db = await this.connectionManager.getDatabase();
      const userId = getCurrentUserId();

      const result = await db.getAllAsync(
        'SELECT * FROM venues WHERE userId = ? ORDER BY visitCount DESC',
        [userId]
      );

      return result.map((row: any) => this.mapRowToVenue(row));
    } catch (error) {
      const dbError = new DatabaseError(
        'Failed to retrieve venues',
        'Unable to load venues. Please try again.',
        true,
        error instanceof Error ? error : undefined
      );
      ErrorHandler.log(dbError, 'BasicSQLiteService.getAllVenues');
      throw dbError;
    }
  }

  async getVenueById(id: string): Promise<Venue | null> {
    try {
      const db = await this.connectionManager.getDatabase();
      const userId = getCurrentUserId();

      const result = await db.getFirstAsync(
        'SELECT * FROM venues WHERE id = ? AND userId = ?',
        [id, userId]
      );

      if (!result) {
        return null;
      }

      return this.mapRowToVenue(result as any);
    } catch (error) {
      const dbError = new DatabaseError(
        `Failed to get venue by ID: ${id}`,
        'Unable to load venue details. Please try again.',
        true,
        error instanceof Error ? error : undefined
      );
      ErrorHandler.log(dbError, 'BasicSQLiteService.getVenueById');
      throw dbError;
    }
  }

  async getVenueByName(name: string): Promise<Venue | null> {
    try {
      const db = await this.connectionManager.getDatabase();
      const userId = getCurrentUserId();

      const result = await db.getFirstAsync(
        'SELECT * FROM venues WHERE LOWER(name) = LOWER(?) AND userId = ?',
        [name.trim(), userId]
      );

      if (!result) {
        return null;
      }

      return this.mapRowToVenue(result as any);
    } catch (error) {
      console.error('Failed to get venue by name:', error);
      return null;
    }
  }

  async updateVenue(id: string, updates: Partial<Venue>): Promise<void> {
    try {
      const db = await this.connectionManager.getDatabase();

      const processedUpdates: Record<string, any> = {};

      for (const [key, value] of Object.entries(updates)) {
        if (key === 'location' && value) {
          processedUpdates['latitude'] = (value as any).latitude || null;
          processedUpdates['longitude'] = (value as any).longitude || null;
        } else if (key === 'updatedAt' && value instanceof Date) {
          processedUpdates[key] = value.toISOString();
        } else if (key === 'lastVisited' && value instanceof Date) {
          processedUpdates[key] = value.toISOString();
        } else if (key === 'createdAt' && value instanceof Date) {
          processedUpdates[key] = value.toISOString();
        } else if (key !== 'location') {
          processedUpdates[key] = value;
        }
      }

      // Always update the updatedAt timestamp
      if (!processedUpdates.updatedAt) {
        processedUpdates.updatedAt = new Date().toISOString();
      }

      // Increment version for sync conflict detection
      if (!processedUpdates.version) {
        const current = await db.getFirstAsync<{ version: number }>(
          'SELECT version FROM venues WHERE id = ?',
          [id]
        );
        processedUpdates.version = (current?.version || 0) + 1;
      }

      // Mark as pending sync
      if (!processedUpdates.syncStatus) {
        processedUpdates.syncStatus = 'pending';
      }

      const setClause = Object.keys(processedUpdates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(processedUpdates);

      await db.runAsync(
        `UPDATE venues SET ${setClause} WHERE id = ?`,
        [...values, id]
      );

      console.log('Venue updated successfully:', id);
    } catch (error) {
      const dbError = new DatabaseError(
        `Failed to update venue: ${id}`,
        'Unable to update venue. Please try again.',
        true,
        error instanceof Error ? error : undefined
      );
      ErrorHandler.log(dbError, 'BasicSQLiteService.updateVenue');
      throw dbError;
    }
  }

  async deleteVenue(id: string): Promise<void> {
    try {
      const db = await this.connectionManager.getDatabase();
      await db.runAsync('DELETE FROM venues WHERE id = ?', [id]);
      console.log('Venue deleted successfully:', id);
    } catch (error) {
      const dbError = new DatabaseError(
        `Failed to delete venue: ${id}`,
        'Unable to delete venue. Please try again.',
        true,
        error instanceof Error ? error : undefined
      );
      ErrorHandler.log(dbError, 'BasicSQLiteService.deleteVenue');
      throw dbError;
    }
  }

  async searchVenues(query: string, limit: number = 10): Promise<Venue[]> {
    try {
      const db = await this.connectionManager.getDatabase();
      const userId = getCurrentUserId();

      const result = await db.getAllAsync(
        `SELECT * FROM venues
         WHERE userId = ? AND name LIKE ?
         ORDER BY visitCount DESC
         LIMIT ?`,
        [userId, `%${query}%`, limit]
      );

      return result.map((row: any) => this.mapRowToVenue(row));
    } catch (error) {
      console.error('Failed to search venues:', error);
      return [];
    }
  }

  async incrementVenueVisitCount(venueId: string): Promise<void> {
    try {
      const db = await this.connectionManager.getDatabase();

      await db.runAsync(
        `UPDATE venues SET
          visitCount = visitCount + 1,
          lastVisited = ?,
          updatedAt = ?,
          syncStatus = 'pending'
         WHERE id = ?`,
        [new Date().toISOString(), new Date().toISOString(), venueId]
      );

      console.log('Venue visit count incremented:', venueId);
    } catch (error) {
      console.error('Failed to increment venue visit count:', error);
    }
  }

  async getVenueCount(): Promise<number> {
    try {
      const db = await this.connectionManager.getDatabase();
      const userId = getCurrentUserId();

      const result = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM venues WHERE userId = ?',
        [userId]
      );

      return result?.count || 0;
    } catch (error) {
      console.error('Failed to get venue count:', error);
      return 0;
    }
  }

  async getRecentVenues(limit: number = 5): Promise<Venue[]> {
    try {
      const db = await this.connectionManager.getDatabase();
      const userId = getCurrentUserId();

      const result = await db.getAllAsync(
        `SELECT * FROM venues
         WHERE userId = ? AND lastVisited IS NOT NULL
         ORDER BY lastVisited DESC
         LIMIT ?`,
        [userId, limit]
      );

      return result.map((row: any) => this.mapRowToVenue(row));
    } catch (error) {
      console.error('Failed to get recent venues:', error);
      return [];
    }
  }

  async getMostVisitedVenues(limit: number = 5): Promise<Venue[]> {
    try {
      const db = await this.connectionManager.getDatabase();
      const userId = getCurrentUserId();

      const result = await db.getAllAsync(
        `SELECT * FROM venues
         WHERE userId = ?
         ORDER BY visitCount DESC
         LIMIT ?`,
        [userId, limit]
      );

      return result.map((row: any) => this.mapRowToVenue(row));
    } catch (error) {
      console.error('Failed to get most visited venues:', error);
      return [];
    }
  }

  /**
   * Update venue data embedded in experiences when a venue is modified
   * This ensures consistency between venues table and experience records
   * @param venueId - The venue ID
   * @param venueUpdates - The updates to apply
   * @param oldVenueName - The venue name BEFORE the update (for matching experiences)
   */
  async cascadeVenueUpdateToExperiences(venueId: string, venueUpdates: Partial<Venue>, oldVenueName?: string): Promise<number> {
    try {
      const db = await this.connectionManager.getDatabase();

      // Use the old venue name for searching (passed from caller before update)
      const searchName = oldVenueName;

      console.log('[CASCADE] Starting cascade update for venueId:', venueId, 'oldName:', searchName, 'updates:', venueUpdates);

      // First, let's see ALL experiences to debug
      const allExperiences = await db.getAllAsync(
        `SELECT id, venue, venueId FROM experiences`
      );
      console.log('[CASCADE] Total experiences in DB:', allExperiences.length);

      // Log first few experiences for debugging
      for (const exp of (allExperiences as any[]).slice(0, 3)) {
        console.log('[CASCADE] Sample experience:', {
          id: exp.id,
          venueId: exp.venueId,
          venueJson: exp.venue?.substring(0, 100)
        });
      }

      // Find all experiences linked to this venue by:
      // 1. venueId column (if set)
      // 2. venue.id in JSON (the venue ID is embedded in the venue JSON)
      const experiences = await db.getAllAsync(
        `SELECT id, venue, venueId FROM experiences
         WHERE venueId = ?
         OR venue LIKE ?`,
        [
          venueId,
          `%"id":"${venueId}"%`  // Match venue ID in the JSON
        ]
      );

      console.log('[CASCADE] Found experiences matching venueId column or venue.id in JSON:', experiences.length);

      if (experiences.length === 0) {
        console.log('[CASCADE] No experiences to update for venue:', venueId, 'name:', searchName);
        return 0;
      }

      console.log(`[CASCADE] Found ${experiences.length} experiences to update for venue:`, venueId);

      let updatedCount = 0;

      for (const exp of experiences as any[]) {
        try {
          // Parse existing venue JSON
          const venueData = JSON.parse(exp.venue);
          console.log('[CASCADE] Processing experience:', exp.id, 'current venue name:', venueData.name);

          // Apply updates to venue data
          const updatedVenueData = {
            ...venueData,
            ...(venueUpdates.name && { name: venueUpdates.name }),
            ...(venueUpdates.type && { type: venueUpdates.type }),
            ...(venueUpdates.address !== undefined && { address: venueUpdates.address }),
            ...(venueUpdates.location && { location: venueUpdates.location }),
          };

          console.log('[CASCADE] Updating experience', exp.id, 'venue from', venueData.name, 'to', updatedVenueData.name);

          // Update the experience with new venue JSON and set venueId if not set
          await db.runAsync(
            `UPDATE experiences SET venue = ?, venueId = COALESCE(venueId, ?), updatedAt = ?, syncStatus = 'pending' WHERE id = ?`,
            [JSON.stringify(updatedVenueData), venueId, new Date().toISOString(), exp.id]
          );

          console.log('[CASCADE] Successfully updated experience:', exp.id);
          updatedCount++;
        } catch (e) {
          console.warn('[CASCADE] Failed to update venue in experience:', exp.id, e);
        }
      }

      console.log(`[CASCADE] Cascaded venue update to ${updatedCount} experiences`);
      return updatedCount;
    } catch (error) {
      console.error('Failed to cascade venue update to experiences:', error);
      return 0;
    }
  }

  private mapRowToVenue(row: VenueRow): Venue {
    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      type: row.type as any,
      location: row.latitude && row.longitude ? {
        latitude: row.latitude,
        longitude: row.longitude
      } : undefined,
      address: row.address || undefined,
      visitCount: row.visitCount,
      lastVisited: row.lastVisited ? new Date(row.lastVisited) : undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      syncStatus: row.syncStatus as any,
      version: row.version
    };
  }
}

// Singleton instance
export const sqliteService = new BasicSQLiteService();