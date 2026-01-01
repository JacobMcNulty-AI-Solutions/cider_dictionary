// BackupService.ts - Handles local database backup and restore
// Phase: Download from Cloud feature

import * as FileSystem from 'expo-file-system/legacy';
import { sqliteService } from '../database/sqlite';
import { CiderMasterRecord } from '../../types/cider';
import { ExperienceLog } from '../../types/experience';

export interface BackupMetadata {
  id: string;
  createdAt: string;
  ciderCount: number;
  experienceCount: number;
  reason: 'pre_download' | 'manual' | 'auto';
  filePath: string;
}

export interface BackupData {
  metadata: BackupMetadata;
  ciders: CiderMasterRecord[];
  experiences: ExperienceLog[];
}

class BackupService {
  private static instance: BackupService;
  private backupDir: string;

  constructor() {
    this.backupDir = `${FileSystem.documentDirectory}backups/`;
  }

  /**
   * Safely convert a date to ISO string, handling invalid dates
   */
  private safeToISOString(value: any): string {
    try {
      if (value instanceof Date) {
        if (!isNaN(value.getTime())) {
          return value.toISOString();
        }
        return new Date().toISOString();
      }
      if (typeof value === 'string') {
        const parsed = new Date(value);
        if (!isNaN(parsed.getTime())) {
          return value;
        }
        return new Date().toISOString();
      }
      return new Date().toISOString();
    } catch (error) {
      return new Date().toISOString();
    }
  }

  static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  /**
   * Create a backup of all local data before destructive operations
   */
  async createBackup(reason: BackupMetadata['reason']): Promise<BackupMetadata> {
    // 1. Ensure backup directory exists
    const dirInfo = await FileSystem.getInfoAsync(this.backupDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.backupDir, { intermediates: true });
    }

    // 2. Fetch all local data
    const ciders = await sqliteService.getAllCiders();
    const experiences = await sqliteService.getAllExperiences();

    // 3. Create backup metadata
    const backupId = this.generateBackupId();
    const metadata: BackupMetadata = {
      id: backupId,
      createdAt: new Date().toISOString(),
      ciderCount: ciders.length,
      experienceCount: experiences.length,
      reason,
      filePath: `${this.backupDir}backup_${backupId}.json`
    };

    // 4. Convert dates to ISO strings for serialization (with safe handling)
    const serializableCiders = ciders.map(cider => ({
      ...cider,
      createdAt: this.safeToISOString(cider.createdAt),
      updatedAt: this.safeToISOString(cider.updatedAt),
    }));

    const serializableExperiences = experiences.map(exp => ({
      ...exp,
      date: this.safeToISOString(exp.date),
      createdAt: this.safeToISOString(exp.createdAt),
      updatedAt: this.safeToISOString(exp.updatedAt),
    }));

    // 5. Create backup data object
    const backupData: BackupData = {
      metadata,
      ciders: serializableCiders as CiderMasterRecord[],
      experiences: serializableExperiences as ExperienceLog[]
    };

    // 6. Write to file
    await FileSystem.writeAsStringAsync(
      metadata.filePath,
      JSON.stringify(backupData, null, 2)
    );

    console.log(`Backup created: ${metadata.filePath}`);
    return metadata;
  }

  /**
   * Restore from a backup file
   */
  async restoreFromBackup(backupId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const filePath = `${this.backupDir}backup_${backupId}.json`;
      const fileInfo = await FileSystem.getInfoAsync(filePath);

      if (!fileInfo.exists) {
        return { success: false, error: 'Backup file not found' };
      }

      const content = await FileSystem.readAsStringAsync(filePath);
      const backupData: BackupData = JSON.parse(content);

      // Restore using transaction
      const db = await sqliteService.getConnectionManager().getDatabase();

      await db.execAsync('BEGIN IMMEDIATE TRANSACTION');

      try {
        // Clear existing data
        await db.runAsync('DELETE FROM experiences');
        await db.runAsync('DELETE FROM ciders');

        // Restore ciders
        for (const cider of backupData.ciders) {
          // Convert date strings back to Date objects
          const ciderWithDates: CiderMasterRecord = {
            ...cider,
            createdAt: new Date(cider.createdAt),
            updatedAt: new Date(cider.updatedAt),
          };
          await sqliteService.createCider(ciderWithDates);
        }

        // Restore experiences
        for (const experience of backupData.experiences) {
          // Convert date strings back to Date objects
          const expWithDates: ExperienceLog = {
            ...experience,
            date: new Date(experience.date),
            createdAt: new Date(experience.createdAt),
            updatedAt: new Date(experience.updatedAt),
          };
          await sqliteService.createExperience(expWithDates);
        }

        await db.execAsync('COMMIT');
        console.log('Backup restored successfully');
        return { success: true };
      } catch (error) {
        await db.execAsync('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Failed to restore backup:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get list of available backups
   */
  async listBackups(): Promise<BackupMetadata[]> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.backupDir);
      if (!dirInfo.exists) {
        return [];
      }

      const files = await FileSystem.readDirectoryAsync(this.backupDir);
      const backups: BackupMetadata[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const content = await FileSystem.readAsStringAsync(`${this.backupDir}${file}`);
            const data: BackupData = JSON.parse(content);
            backups.push(data.metadata);
          } catch (parseError) {
            console.warn(`Failed to parse backup file ${file}:`, parseError);
          }
        }
      }

      return backups.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Delete old backups, keeping only the most recent N
   */
  async cleanupOldBackups(keepCount: number = 3): Promise<void> {
    const backups = await this.listBackups();

    if (backups.length <= keepCount) {
      return;
    }

    const toDelete = backups.slice(keepCount);

    for (const backup of toDelete) {
      try {
        await FileSystem.deleteAsync(backup.filePath, { idempotent: true });
        console.log(`Deleted old backup: ${backup.id}`);
      } catch (error) {
        console.warn(`Failed to delete backup ${backup.id}:`, error);
      }
    }
  }

  /**
   * Get the most recent backup
   */
  async getLatestBackup(): Promise<BackupMetadata | null> {
    const backups = await this.listBackups();
    return backups.length > 0 ? backups[0] : null;
  }

  /**
   * Delete a specific backup
   */
  async deleteBackup(backupId: string): Promise<boolean> {
    try {
      const filePath = `${this.backupDir}backup_${backupId}.json`;
      const fileInfo = await FileSystem.getInfoAsync(filePath);

      if (!fileInfo.exists) {
        return false;
      }

      await FileSystem.deleteAsync(filePath, { idempotent: true });
      console.log(`Deleted backup: ${backupId}`);
      return true;
    } catch (error) {
      console.error('Failed to delete backup:', error);
      return false;
    }
  }

  private generateBackupId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const backupService = BackupService.getInstance();
export default BackupService;
