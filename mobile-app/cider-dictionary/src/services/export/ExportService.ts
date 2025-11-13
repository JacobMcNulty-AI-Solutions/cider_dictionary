// Phase 4: Data Export Service
// Implements JSON and CSV export with metadata, compression, and share functionality

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  ExportOptions,
  ExportResult,
  ExportProgress,
  JSONExportData,
  CSVExportData,
  DEFAULT_EXPORT_OPTIONS,
} from '../../types/export';
import { CiderMasterRecord } from '../../types/cider';
import { ExperienceLog } from '../../types/experience';

export class ExportService {
  private static instance: ExportService;

  static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  // =============================================================================
  // MAIN EXPORT FUNCTION
  // =============================================================================

  async exportData(
    ciders: CiderMasterRecord[],
    experiences: ExperienceLog[],
    options: Partial<ExportOptions>,
    progressCallback?: (progress: ExportProgress) => void
  ): Promise<ExportResult> {
    const startTime = Date.now();
    const fullOptions: ExportOptions = { ...DEFAULT_EXPORT_OPTIONS, ...options };

    const result: ExportResult = {
      success: false,
      filePath: null,
      fileSize: 0,
      recordCount: {
        ciders: 0,
        experiences: 0,
        venues: 0,
      },
      exportTime: 0,
      error: null,
    };

    try {
      console.log('Starting export with options:', fullOptions);

      // STAGE 1: Data Gathering
      progressCallback?.({
        stage: 'gathering',
        progress: 0,
        currentItem: 0,
        totalItems: 0,
        message: 'Gathering data...',
        cancellable: true,
      });

      const exportData = await this.gatherExportData(
        ciders,
        experiences,
        fullOptions,
        progressCallback
      );

      // STAGE 2: Format Conversion
      progressCallback?.({
        stage: 'formatting',
        progress: 40,
        currentItem: 0,
        totalItems: 0,
        message: `Converting to ${fullOptions.format.toUpperCase()}...`,
        cancellable: true,
      });

      let formattedData: string;
      if (fullOptions.format === 'json') {
        formattedData = await this.convertToJSON(exportData, fullOptions);
      } else if (fullOptions.format === 'csv') {
        formattedData = await this.convertToCSV(exportData, fullOptions);
      } else {
        throw new Error(`Unsupported export format: ${fullOptions.format}`);
      }

      // STAGE 3: File Writing
      progressCallback?.({
        stage: 'writing',
        progress: 85,
        currentItem: 0,
        totalItems: 0,
        message: 'Writing file...',
        cancellable: false,
      });

      const filePath = await this.writeToFile(formattedData, fullOptions);

      // STAGE 4: Complete
      progressCallback?.({
        stage: 'complete',
        progress: 100,
        currentItem: 0,
        totalItems: 0,
        message: 'Export complete!',
        cancellable: false,
      });

      const fileInfo = await FileSystem.getInfoAsync(filePath);
      result.success = true;
      result.filePath = filePath;
      result.fileSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;
      result.recordCount = {
        ciders: exportData.ciders.length,
        experiences: exportData.experiences?.length || 0,
        venues: exportData.venues?.length || 0,
      };
      result.exportTime = Date.now() - startTime;

      console.log('Export completed successfully:', result);

      return result;
    } catch (error) {
      result.success = false;
      result.error = error instanceof Error ? error.message : 'Unknown export error';
      console.error('Export failed:', error);
      return result;
    }
  }

  // =============================================================================
  // DATA GATHERING
  // =============================================================================

  private async gatherExportData(
    ciders: CiderMasterRecord[],
    experiences: ExperienceLog[],
    options: ExportOptions,
    progressCallback?: (progress: ExportProgress) => void
  ): Promise<{
    ciders: CiderMasterRecord[];
    experiences?: ExperienceLog[];
    venues?: any[];
    analytics?: any;
  }> {
    let filteredCiders = ciders;
    let filteredExperiences = experiences;

    // Filter by selected ciders if specified
    if (options.selectedCiders && options.selectedCiders.length > 0) {
      const selectedIds = new Set(options.selectedCiders);
      filteredCiders = ciders.filter(c => selectedIds.has(c.id));
    }

    // Apply date range filter to ciders
    if (options.dateRange.start || options.dateRange.end) {
      filteredCiders = this.filterByDateRange(
        filteredCiders,
        options.dateRange.start,
        options.dateRange.end
      );
    }

    progressCallback?.({
      stage: 'gathering',
      progress: 15,
      currentItem: filteredCiders.length,
      totalItems: filteredCiders.length,
      message: `Gathered ${filteredCiders.length} ciders`,
      cancellable: true,
    });

    const exportData: any = {
      ciders: filteredCiders,
    };

    // Gather experiences
    if (options.includeExperiences) {
      const ciderIds = new Set(filteredCiders.map(c => c.id));
      filteredExperiences = experiences.filter(e => ciderIds.has(e.ciderId));

      // Apply date range to experiences
      if (options.dateRange.start || options.dateRange.end) {
        filteredExperiences = this.filterExperiencesByDateRange(
          filteredExperiences,
          options.dateRange.start,
          options.dateRange.end
        );
      }

      exportData.experiences = filteredExperiences;

      progressCallback?.({
        stage: 'gathering',
        progress: 25,
        currentItem: 0,
        totalItems: 0,
        message: `Gathered ${filteredExperiences.length} experiences`,
        cancellable: true,
      });
    }

    // Gather venues
    if (options.includeVenues && exportData.experiences) {
      const venueIds = new Set<string>();
      exportData.experiences.forEach((exp: ExperienceLog) => {
        if (exp.venue?.id) {
          venueIds.add(exp.venue.id);
        }
      });

      exportData.venues = Array.from(venueIds).map(id => ({
        id,
        // Note: In a real implementation, fetch venue details from database
        name: 'Venue',
      }));

      progressCallback?.({
        stage: 'gathering',
        progress: 35,
        currentItem: 0,
        totalItems: 0,
        message: `Gathered ${exportData.venues.length} venues`,
        cancellable: true,
      });
    }

    // Calculate analytics
    if (options.includeAnalytics) {
      exportData.analytics = this.calculateAnalyticsSummary(
        exportData.ciders,
        exportData.experiences
      );

      progressCallback?.({
        stage: 'gathering',
        progress: 40,
        currentItem: 0,
        totalItems: 0,
        message: 'Calculated analytics',
        cancellable: true,
      });
    }

    return exportData;
  }

  private filterByDateRange(
    ciders: CiderMasterRecord[],
    startDate: Date | null,
    endDate: Date | null
  ): CiderMasterRecord[] {
    if (!startDate && !endDate) {
      return ciders;
    }

    return ciders.filter(cider => {
      const ciderDate = new Date(cider.createdAt);

      if (startDate && ciderDate < startDate) {
        return false;
      }

      if (endDate && ciderDate > endDate) {
        return false;
      }

      return true;
    });
  }

  private filterExperiencesByDateRange(
    experiences: ExperienceLog[],
    startDate: Date | null,
    endDate: Date | null
  ): ExperienceLog[] {
    if (!startDate && !endDate) {
      return experiences;
    }

    return experiences.filter(exp => {
      const expDate = new Date(exp.date);

      if (startDate && expDate < startDate) {
        return false;
      }

      if (endDate && expDate > endDate) {
        return false;
      }

      return true;
    });
  }

  private calculateAnalyticsSummary(
    ciders: CiderMasterRecord[],
    experiences?: ExperienceLog[]
  ): any {
    const totalCiders = ciders.length;
    const avgRating =
      ciders.reduce((sum, c) => sum + (c.overallRating || 0), 0) / totalCiders || 0;
    const avgAbv = ciders.reduce((sum, c) => sum + (c.abv || 0), 0) / totalCiders || 0;

    const topRated = [...ciders]
      .filter(c => c.overallRating)
      .sort((a, b) => (b.overallRating || 0) - (a.overallRating || 0))
      .slice(0, 5)
      .map(c => ({ name: c.name, brand: c.brand, rating: c.overallRating }));

    return {
      totalCiders,
      totalExperiences: experiences?.length || 0,
      averageRating: avgRating.toFixed(1),
      averageABV: avgAbv.toFixed(1),
      topRatedCiders: topRated,
    };
  }

  // =============================================================================
  // JSON EXPORT
  // =============================================================================

  private async convertToJSON(
    exportData: any,
    options: ExportOptions
  ): Promise<string> {
    const jsonData: JSONExportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        appVersion: '1.0.0', // TODO: Get from app config
        dataVersion: 1,
        exportOptions: options,
      },
      ciders: exportData.ciders.map((c: CiderMasterRecord) =>
        this.serializeCiderForJSON(c, options)
      ),
    };

    if (exportData.experiences) {
      jsonData.experiences = exportData.experiences.map((e: ExperienceLog) =>
        this.serializeExperienceForJSON(e)
      );
    }

    if (exportData.venues) {
      jsonData.venues = exportData.venues;
    }

    if (exportData.analytics) {
      jsonData.analytics = exportData.analytics;
    }

    if (options.prettyPrint) {
      return JSON.stringify(jsonData, null, 2);
    } else {
      return JSON.stringify(jsonData);
    }
  }

  private serializeCiderForJSON(
    cider: CiderMasterRecord,
    options: ExportOptions
  ): any {
    const serialized: any = {
      id: cider.id,
      name: cider.name,
      brand: cider.brand,
      abv: cider.abv,
      overallRating: cider.overallRating,
      createdAt: new Date(cider.createdAt).toISOString(),
      updatedAt: new Date(cider.updatedAt).toISOString(),
    };

    // Include photo path (not base64 to reduce file size)
    if (options.includeImages && cider.photo) {
      serialized.photo = cider.photo;
    }

    // Include optional fields
    if (cider.notes) serialized.notes = cider.notes;
    if (cider.traditionalStyle) serialized.traditionalStyle = cider.traditionalStyle;
    if (cider.style) serialized.style = cider.style;
    if (cider.sweetness) serialized.sweetness = cider.sweetness;
    if (cider.carbonation) serialized.carbonation = cider.carbonation;
    if (cider.clarity) serialized.clarity = cider.clarity;
    if (cider.color) serialized.color = cider.color;
    if (cider.tasteTags) serialized.tasteTags = cider.tasteTags;

    return serialized;
  }

  private serializeExperienceForJSON(experience: ExperienceLog): any {
    const serialized: any = {
      id: experience.id,
      ciderId: experience.ciderId,
      date: new Date(experience.date).toISOString(),
      venue: {
        id: experience.venue.id,
        name: experience.venue.name,
        type: experience.venue.type,
      },
      price: experience.price,
      containerSize: experience.containerSize,
      containerType: experience.containerType,
      pricePerPint: experience.pricePerPint,
      createdAt: new Date(experience.createdAt).toISOString(),
      updatedAt: new Date(experience.updatedAt).toISOString(),
    };

    if (experience.notes) serialized.notes = experience.notes;
    if (experience.rating) serialized.rating = experience.rating;

    return serialized;
  }

  // =============================================================================
  // CSV EXPORT
  // =============================================================================

  private async convertToCSV(
    exportData: any,
    options: ExportOptions
  ): Promise<string> {
    const csvSections: string[] = [];

    // Add metadata header
    if (options.includeMetadata) {
      csvSections.push(`# Exported from Cider Dictionary on ${new Date().toLocaleDateString()}`);
      csvSections.push('');
    }

    // Convert ciders to CSV
    const cidersCSV = this.convertCidersToCSV(exportData.ciders, options);
    csvSections.push('# CIDERS');
    csvSections.push(cidersCSV);

    // Convert experiences to CSV
    if (exportData.experiences && exportData.experiences.length > 0) {
      csvSections.push('');
      csvSections.push('# EXPERIENCES');
      const experiencesCSV = this.convertExperiencesToCSV(exportData.experiences, options);
      csvSections.push(experiencesCSV);
    }

    return csvSections.join('\n');
  }

  private convertCidersToCSV(ciders: CiderMasterRecord[], options: ExportOptions): string {
    const headers = [
      'ID',
      'Name',
      'Brand',
      'ABV',
      'Overall Rating',
      'Traditional Style',
      'Sweetness',
      'Carbonation',
      'Clarity',
      'Color',
      'Taste Tags',
      'Notes',
      'Has Photo',
      'Created At',
      'Updated At',
    ];

    const rows: string[] = [];

    if (options.includeHeaders) {
      rows.push(headers.map(h => this.escapeCSVField(h, options.delimiter)).join(options.delimiter));
    }

    for (const cider of ciders) {
      const row = [
        this.escapeCSVField(cider.id, options.delimiter),
        this.escapeCSVField(cider.name, options.delimiter),
        this.escapeCSVField(cider.brand, options.delimiter),
        cider.abv?.toString() || '',
        cider.overallRating?.toString() || '',
        this.escapeCSVField(cider.traditionalStyle || '', options.delimiter),
        this.escapeCSVField(cider.sweetness || '', options.delimiter),
        this.escapeCSVField(cider.carbonation || '', options.delimiter),
        this.escapeCSVField(cider.clarity || '', options.delimiter),
        this.escapeCSVField(cider.color || '', options.delimiter),
        this.escapeCSVField(cider.tasteTags?.join(';') || '', options.delimiter),
        this.escapeCSVField(cider.notes || '', options.delimiter),
        cider.photo ? 'Yes' : 'No',
        this.escapeCSVField(new Date(cider.createdAt).toISOString(), options.delimiter),
        this.escapeCSVField(new Date(cider.updatedAt).toISOString(), options.delimiter),
      ];

      rows.push(row.join(options.delimiter));
    }

    return rows.join('\n');
  }

  private convertExperiencesToCSV(experiences: ExperienceLog[], options: ExportOptions): string {
    const headers = [
      'ID',
      'Cider ID',
      'Date',
      'Venue Name',
      'Venue Type',
      'Price',
      'Container Size (ml)',
      'Container Type',
      'Price Per Pint',
      'Rating',
      'Notes',
      'Created At',
    ];

    const rows: string[] = [];

    if (options.includeHeaders) {
      rows.push(headers.map(h => this.escapeCSVField(h, options.delimiter)).join(options.delimiter));
    }

    for (const exp of experiences) {
      const row = [
        this.escapeCSVField(exp.id, options.delimiter),
        this.escapeCSVField(exp.ciderId, options.delimiter),
        this.escapeCSVField(new Date(exp.date).toISOString(), options.delimiter),
        this.escapeCSVField(exp.venue.name, options.delimiter),
        this.escapeCSVField(exp.venue.type, options.delimiter),
        exp.price.toFixed(2),
        exp.containerSize.toString(),
        this.escapeCSVField(exp.containerType, options.delimiter),
        exp.pricePerPint.toFixed(2),
        this.escapeCSVField(exp.rating?.toString() || '', options.delimiter),
        this.escapeCSVField(exp.notes || '', options.delimiter),
        this.escapeCSVField(new Date(exp.createdAt).toISOString(), options.delimiter),
      ];

      rows.push(row.join(options.delimiter));
    }

    return rows.join('\n');
  }

  private escapeCSVField(field: string, delimiter: string): string {
    if (!field) {
      return '';
    }

    const fieldStr = field.toString();

    // Check if escaping is needed
    const needsEscape =
      fieldStr.includes(delimiter) ||
      fieldStr.includes('"') ||
      fieldStr.includes('\n') ||
      fieldStr.includes('\r');

    if (needsEscape) {
      // Escape double quotes by doubling them
      const escaped = fieldStr.replace(/"/g, '""');
      // Wrap in double quotes
      return `"${escaped}"`;
    } else {
      return fieldStr;
    }
  }

  // =============================================================================
  // FILE OPERATIONS
  // =============================================================================

  private async writeToFile(data: string, options: ExportOptions): Promise<string> {
    const filename = this.generateFilename(options);
    const exportDir = FileSystem.documentDirectory + 'Exports/';

    // Ensure export directory exists
    const dirInfo = await FileSystem.getInfoAsync(exportDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(exportDir, { intermediates: true });
    }

    const filePath = exportDir + filename;

    // Write file
    await FileSystem.writeAsStringAsync(filePath, data, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    console.log('Export written to:', filePath);

    return filePath;
  }

  private generateFilename(options: ExportOptions): string {
    let basename: string;

    if (options.exportName) {
      basename = this.sanitizeFilename(options.exportName);
    } else {
      const timestamp = new Date().toISOString().split('T')[0];
      basename = `cider_dictionary_${timestamp}`;
    }

    const extension = options.format;
    return `${basename}.${extension}`;
  }

  private sanitizeFilename(filename: string): string {
    // Remove invalid characters
    let sanitized = filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_');

    // Limit length
    if (sanitized.length > 100) {
      sanitized = sanitized.substring(0, 100);
    }

    // Remove leading/trailing dots or underscores
    sanitized = sanitized.replace(/^[\._]+|[\._]+$/g, '');

    // Ensure not empty
    if (sanitized.length === 0) {
      sanitized = 'export';
    }

    return sanitized;
  }

  // =============================================================================
  // SHARE FUNCTIONALITY
  // =============================================================================

  async shareExportFile(filePath: string): Promise<boolean> {
    try {
      const isAvailable = await Sharing.isAvailableAsync();

      if (!isAvailable) {
        console.error('Sharing is not available on this device');
        return false;
      }

      await Sharing.shareAsync(filePath, {
        mimeType: this.getMimeType(filePath),
        dialogTitle: 'Export Cider Dictionary Data',
        UTI: 'public.data',
      });

      return true;
    } catch (error) {
      console.error('Share failed:', error);
      return false;
    }
  }

  private getMimeType(filePath: string): string {
    if (filePath.endsWith('.json')) {
      return 'application/json';
    } else if (filePath.endsWith('.csv')) {
      return 'text/csv';
    } else {
      return 'application/octet-stream';
    }
  }

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  formatBytes(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1048576) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    } else {
      return `${(bytes / 1048576).toFixed(2)} MB`;
    }
  }

  async getExportedFiles(): Promise<Array<{ name: string; path: string; size: number; date: Date }>> {
    try {
      const exportDir = FileSystem.documentDirectory + 'Exports/';
      const dirInfo = await FileSystem.getInfoAsync(exportDir);

      if (!dirInfo.exists) {
        return [];
      }

      const files = await FileSystem.readDirectoryAsync(exportDir);
      const fileInfos = await Promise.all(
        files.map(async (filename) => {
          const filePath = exportDir + filename;
          const fileInfo = await FileSystem.getInfoAsync(filePath, { size: true });

          return {
            name: filename,
            path: filePath,
            size: fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0,
            date: fileInfo.exists && 'modificationTime' in fileInfo
              ? new Date(fileInfo.modificationTime * 1000)
              : new Date(),
          };
        })
      );

      return fileInfos.sort((a, b) => b.date.getTime() - a.date.getTime());
    } catch (error) {
      console.error('Failed to get exported files:', error);
      return [];
    }
  }

  async deleteExportFile(filePath: string): Promise<boolean> {
    try {
      await FileSystem.deleteAsync(filePath, { idempotent: true });
      console.log('Deleted export file:', filePath);
      return true;
    } catch (error) {
      console.error('Failed to delete export file:', error);
      return false;
    }
  }
}

// Singleton instance
export const exportService = ExportService.getInstance();
