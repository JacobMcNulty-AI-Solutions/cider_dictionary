// Mock implementation for expo-sqlite
export const createMockDatabase = () => {
  const mockDb = {
    execAsync: jest.fn(),
    runAsync: jest.fn(),
    getAllAsync: jest.fn(),
    getFirstAsync: jest.fn(),
  };

  return mockDb;
};

export const mockSqlite = {
  openDatabaseAsync: jest.fn(),
};

// Mock SQLite service implementation
export class MockSQLiteService {
  private mockDb = createMockDatabase();
  private initialized = false;

  async initializeDatabase(): Promise<void> {
    this.initialized = true;
    return Promise.resolve();
  }

  async createCider(ciderData: any): Promise<any> {
    if (!this.initialized) {
      throw new Error('Database not initialized');
    }

    const newCider = {
      id: Date.now().toString(),
      ...ciderData,
      createdAt: new Date(),
    };

    return Promise.resolve(newCider);
  }

  async getAllCiders(): Promise<any[]> {
    if (!this.initialized) {
      throw new Error('Database not initialized');
    }

    return Promise.resolve([]);
  }

  async getCiderById(id: string): Promise<any | null> {
    if (!this.initialized) {
      throw new Error('Database not initialized');
    }

    return Promise.resolve(null);
  }

  async updateCider(id: string, updates: any): Promise<void> {
    if (!this.initialized) {
      throw new Error('Database not initialized');
    }

    return Promise.resolve();
  }

  async deleteCider(id: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('Database not initialized');
    }

    return Promise.resolve();
  }

  async getBasicAnalytics() {
    if (!this.initialized) {
      throw new Error('Database not initialized');
    }

    return Promise.resolve({
      totalCiders: 0,
      averageRating: 0,
      averageAbv: 0,
      highestRated: null,
      lowestRated: null,
    });
  }
}

// Configure the mock
jest.mock('expo-sqlite', () => mockSqlite);