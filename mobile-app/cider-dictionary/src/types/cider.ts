// Phase 1 Simplified Data Model - Basic fields only
export interface BasicCiderRecord {
  id: string;
  name: string;
  brand: string;
  abv: number;
  overallRating: number; // 1-10 scale
  createdAt: Date;
}

// Form data structure for the QuickEntry screen
export interface QuickEntryForm {
  name: string;
  brand: string;
  abv: number;
  overallRating: number;
}

// Database operations interface
export interface CiderDatabase {
  initializeDatabase(): Promise<void>;
  createCider(cider: Omit<BasicCiderRecord, 'id' | 'createdAt'>): Promise<BasicCiderRecord>;
  getAllCiders(): Promise<BasicCiderRecord[]>;
  getCiderById(id: string): Promise<BasicCiderRecord | null>;
  updateCider(id: string, updates: Partial<Omit<BasicCiderRecord, 'id' | 'createdAt'>>): Promise<void>;
  deleteCider(id: string): Promise<void>;
}

// Basic analytics data
export interface BasicAnalytics {
  totalCiders: number;
  averageRating: number;
  averageAbv: number;
  highestRated: BasicCiderRecord | null;
  lowestRated: BasicCiderRecord | null;
}