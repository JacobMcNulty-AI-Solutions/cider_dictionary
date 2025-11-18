// Data Export Types for Phase 4

import { CiderMasterRecord } from './cider';
import { ExperienceLog } from './experience';

export type ExportFormat = 'json' | 'csv';

export type ExportStage = 'gathering' | 'formatting' | 'writing' | 'compressing' | 'complete';

export interface ExportOptions {
  // Format selection
  format: ExportFormat;

  // Data inclusion flags
  includeImages: boolean;
  includeExperiences: boolean;
  includeVenues: boolean;
  includeAnalytics: boolean;

  // Filtering options
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  selectedCiders: string[] | null; // null = all ciders

  // Output options
  compression: boolean;
  prettyPrint: boolean; // JSON only
  delimiter: string;    // CSV only, default ','
  includeHeaders: boolean; // CSV only

  // Metadata
  exportName: string | null; // Custom filename
  includeMetadata: boolean;  // Export timestamp, version, etc.
}

export interface ExportResult {
  success: boolean;
  filePath: string | null;
  fileSize: number; // bytes
  recordCount: {
    ciders: number;
    experiences: number;
    venues: number;
  };
  exportTime: number; // milliseconds
  error: string | null;
}

export interface ExportProgress {
  stage: ExportStage;
  progress: number; // 0-100
  currentItem: number;
  totalItems: number;
  message: string;
  cancellable: boolean;
}

export interface JSONExportData {
  metadata: {
    exportDate: string;
    appVersion: string;
    dataVersion: number;
    exportOptions: ExportOptions;
  };
  ciders: CiderMasterRecord[];
  experiences?: ExperienceLog[];
  venues?: any[];
  analytics?: any;
}

export interface CSVExportData {
  cidersCSV: string;
  experiencesCSV?: string;
  venuesCSV?: string;
  analyticsCSV?: string;
}

// Default export options
export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'json',
  includeImages: false, // Default to false to reduce file size
  includeExperiences: true,
  includeVenues: true,
  includeAnalytics: false,
  dateRange: {
    start: null,
    end: null,
  },
  selectedCiders: null, // null = export all
  compression: false,
  prettyPrint: true, // Make JSON human-readable by default
  delimiter: ',',
  includeHeaders: true,
  exportName: null,
  includeMetadata: true,
};

// Export presets
export interface ExportPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  options: Partial<ExportOptions>;
}

export const EXPORT_PRESETS: ExportPreset[] = [
  {
    id: 'full_backup',
    name: 'Full Backup',
    description: 'Complete backup with all data',
    icon: '💾',
    options: {
      format: 'json',
      includeImages: true,
      includeExperiences: true,
      includeVenues: true,
      includeAnalytics: true,
      compression: true,
      prettyPrint: false, // Compress for smaller file size
    },
  },
  {
    id: 'spreadsheet_export',
    name: 'Spreadsheet',
    description: 'CSV for Excel or Google Sheets',
    icon: '📊',
    options: {
      format: 'csv',
      includeImages: false,
      includeExperiences: true,
      includeVenues: false,
      includeAnalytics: false,
      includeHeaders: true,
      delimiter: ',',
    },
  },
  {
    id: 'collection_only',
    name: 'Collection Only',
    description: 'Just your cider list',
    icon: '📝',
    options: {
      format: 'json',
      includeImages: false,
      includeExperiences: false,
      includeVenues: false,
      includeAnalytics: false,
      prettyPrint: true,
    },
  },
  {
    id: 'share_list',
    name: 'Share List',
    description: 'Lightweight list to share',
    icon: '📤',
    options: {
      format: 'csv',
      includeImages: false,
      includeExperiences: false,
      includeVenues: false,
      includeAnalytics: false,
      includeHeaders: true,
      compression: false,
    },
  },
];
