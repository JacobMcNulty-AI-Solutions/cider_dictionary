import * as SQLite from 'expo-sqlite';
import { BasicCiderRecord, CiderDatabase } from '../../types/cider';

export class BasicSQLiteService implements CiderDatabase {
  private db: SQLite.SQLiteDatabase | null = null;

  async initializeDatabase(): Promise<void> {
    try {
      // Use a different database name to avoid conflicts with old version
      this.db = await SQLite.openDatabaseAsync('cider_dictionary_v2.db');

      console.log('Database connection established');

      // Create basic ciders table for Phase 1
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS ciders (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          brand TEXT NOT NULL,
          abv REAL NOT NULL,
          overallRating INTEGER NOT NULL,
          createdAt TEXT NOT NULL
        );
      `);

      console.log('SQLite database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);

      // Try with in-memory database as fallback
      try {
        console.log('Attempting fallback to in-memory database...');
        this.db = await SQLite.openDatabaseAsync(':memory:');

        await this.db.execAsync(`
          CREATE TABLE IF NOT EXISTS ciders (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            brand TEXT NOT NULL,
            abv REAL NOT NULL,
            overallRating INTEGER NOT NULL,
            createdAt TEXT NOT NULL
          );
        `);

        console.log('Fallback in-memory database initialized successfully');
      } catch (fallbackError) {
        console.error('Failed to initialize fallback database:', fallbackError);
        throw error; // Throw original error
      }
    }
  }

  async createCider(ciderData: Omit<BasicCiderRecord, 'id' | 'createdAt'>): Promise<BasicCiderRecord> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const id = Date.now().toString();
      const createdAt = new Date();

      const newCider: BasicCiderRecord = {
        id,
        ...ciderData,
        createdAt
      };

      await this.db.runAsync(
        'INSERT INTO ciders (id, name, brand, abv, overallRating, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [id, ciderData.name, ciderData.brand, ciderData.abv, ciderData.overallRating, createdAt.toISOString()]
      );

      console.log('Cider created successfully:', newCider);
      return newCider;
    } catch (error) {
      console.error('Failed to create cider:', error);
      throw error;
    }
  }

  async getAllCiders(): Promise<BasicCiderRecord[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.db.getAllAsync('SELECT * FROM ciders ORDER BY createdAt DESC');

      const ciders: BasicCiderRecord[] = result.map((row: any) => ({
        id: row.id,
        name: row.name,
        brand: row.brand,
        abv: row.abv,
        overallRating: row.overallRating,
        createdAt: new Date(row.createdAt)
      }));

      return ciders;
    } catch (error) {
      console.error('Failed to get all ciders:', error);
      throw error;
    }
  }

  async getCiderById(id: string): Promise<BasicCiderRecord | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.db.getFirstAsync('SELECT * FROM ciders WHERE id = ?', [id]);

      if (!result) {
        return null;
      }

      const row = result as any;
      return {
        id: row.id,
        name: row.name,
        brand: row.brand,
        abv: row.abv,
        overallRating: row.overallRating,
        createdAt: new Date(row.createdAt)
      };
    } catch (error) {
      console.error('Failed to get cider by ID:', error);
      throw error;
    }
  }

  async updateCider(id: string, updates: Partial<Omit<BasicCiderRecord, 'id' | 'createdAt'>>): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);

      await this.db.runAsync(
        `UPDATE ciders SET ${setClause} WHERE id = ?`,
        [...values, id]
      );

      console.log('Cider updated successfully:', id);
    } catch (error) {
      console.error('Failed to update cider:', error);
      throw error;
    }
  }

  async deleteCider(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await this.db.runAsync('DELETE FROM ciders WHERE id = ?', [id]);
      console.log('Cider deleted successfully:', id);
    } catch (error) {
      console.error('Failed to delete cider:', error);
      throw error;
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