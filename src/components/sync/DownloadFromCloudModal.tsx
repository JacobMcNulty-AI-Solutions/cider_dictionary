import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  BackHandler
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  syncManager,
  DownloadProgress,
  DownloadConflictStrategy,
  CloudDataStats
} from '../../services/sync/SyncManager';
import { sqliteService } from '../../services/database/sqlite';
import { backupService } from '../../services/backup/BackupService';
import Button from '../common/Button';

interface Props {
  visible: boolean;
  onClose: () => void;
  onDownloadComplete: () => void;
}

type ModalStep = 'loading' | 'preview' | 'confirm_replace' | 'downloading' | 'success' | 'error';

export default function DownloadFromCloudModal({ visible, onClose, onDownloadComplete }: Props) {
  const [step, setStep] = useState<ModalStep>('loading');
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [cloudStats, setCloudStats] = useState<CloudDataStats | null>(null);
  const [localStats, setLocalStats] = useState<{ ciderCount: number; experienceCount: number } | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    cidersDownloaded: number;
    experiencesDownloaded: number;
    imagesDownloaded: number;
    skippedOrphans: number;
    backupId?: string;
    error?: string;
  } | null>(null);

  // Handle back button during download
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 'downloading') {
        Alert.alert(
          'Cancel Download?',
          'Are you sure you want to cancel the download? Progress will be lost.',
          [
            { text: 'Continue Download', style: 'cancel' },
            {
              text: 'Cancel',
              style: 'destructive',
              onPress: () => {
                syncManager.abortDownload();
              }
            }
          ]
        );
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [step]);

  // Fetch stats when modal opens
  useEffect(() => {
    if (visible) {
      fetchStats();
    } else {
      // Reset state when modal closes
      setStep('loading');
      setProgress(null);
      setResult(null);
      setCloudStats(null);
      setLocalStats(null);
    }
  }, [visible]);

  const fetchStats = async () => {
    setStep('loading');
    try {
      // Fetch in parallel
      const [cloud, ciderCount, experienceCount] = await Promise.all([
        syncManager.getCloudDataStats(),
        sqliteService.getCiderCount(),
        sqliteService.getExperienceCount()
      ]);

      setCloudStats(cloud);
      setLocalStats({ ciderCount, experienceCount });
      setStep('preview');
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setStep('error');
      setResult({
        success: false,
        cidersDownloaded: 0,
        experiencesDownloaded: 0,
        skippedOrphans: 0,
        error: 'Failed to connect to cloud. Please check your internet connection.'
      });
    }
  };

  const handleDownload = async (strategy: DownloadConflictStrategy) => {
    // Show confirmation for replace_all if local data exists
    if (strategy === 'replace_all' && localStats && (localStats.ciderCount > 0 || localStats.experienceCount > 0)) {
      Alert.alert(
        'Replace All Local Data?',
        `This will delete ${localStats.ciderCount} ciders and ${localStats.experienceCount} experiences from this device.\n\nA backup will be created automatically before deletion.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace All',
            style: 'destructive',
            onPress: () => executeDownload(strategy)
          }
        ]
      );
      return;
    }

    executeDownload(strategy);
  };

  const executeDownload = async (strategy: DownloadConflictStrategy) => {
    setStep('downloading');

    const downloadResult = await syncManager.downloadFromCloud(strategy, (prog) => {
      setProgress(prog);
    });

    setResult(downloadResult);
    setStep(downloadResult.success ? 'success' : 'error');
  };

  const handleRestoreBackup = async () => {
    if (!result?.backupId) return;

    Alert.alert(
      'Restore Backup?',
      'This will restore your data to the state before the download attempt.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: async () => {
            const restoreResult = await backupService.restoreFromBackup(result.backupId!);
            if (restoreResult.success) {
              Alert.alert('Restored', 'Your data has been restored from backup.');
              onClose();
            } else {
              Alert.alert('Error', restoreResult.error || 'Failed to restore backup');
            }
          }
        }
      ]
    );
  };

  const handleClose = () => {
    if (step === 'downloading') {
      Alert.alert(
        'Cancel Download?',
        'Are you sure you want to cancel?',
        [
          { text: 'Continue', style: 'cancel' },
          {
            text: 'Cancel Download',
            style: 'destructive',
            onPress: () => {
              syncManager.abortDownload();
              onClose();
            }
          }
        ]
      );
      return;
    }

    if (step === 'success') {
      onDownloadComplete();
    }
    onClose();
  };

  const getPhaseText = (phase: DownloadProgress['phase']): string => {
    switch (phase) {
      case 'preparing': return 'Preparing download...';
      case 'backing_up': return 'Creating backup...';
      case 'fetching_ciders': return 'Fetching ciders from cloud...';
      case 'fetching_experiences': return 'Fetching experiences from cloud...';
      case 'validating': return 'Validating data...';
      case 'inserting': return 'Saving to device...';
      case 'downloading_images': return 'Downloading images...';
      case 'complete': return 'Download complete!';
      case 'rolled_back': return 'Download failed - changes rolled back';
      case 'error': return 'Download failed';
      default: return 'Processing...';
    }
  };

  // Render functions for each step
  const renderLoading = () => (
    <View style={styles.content}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>Checking cloud data...</Text>
    </View>
  );

  const renderPreview = () => (
    <View style={styles.content}>
      <Ionicons name="cloud-download-outline" size={64} color="#007AFF" style={styles.icon} />
      <Text style={styles.title}>Download from Cloud</Text>

      {cloudStats ? (
        <>
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Cloud</Text>
              <Text style={styles.statValue}>{cloudStats.ciderCount} ciders</Text>
              <Text style={styles.statValue}>{cloudStats.experienceCount} experiences</Text>
              {cloudStats.lastUpdated && (
                <Text style={styles.statDate}>
                  Last updated: {cloudStats.lastUpdated.toLocaleDateString()}
                </Text>
              )}
            </View>

            {localStats && (localStats.ciderCount > 0 || localStats.experienceCount > 0) && (
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>This Device</Text>
                <Text style={styles.statValue}>{localStats.ciderCount} ciders</Text>
                <Text style={styles.statValue}>{localStats.experienceCount} experiences</Text>
              </View>
            )}
          </View>

          {localStats && (localStats.ciderCount > 0 || localStats.experienceCount > 0) ? (
            // Show conflict options
            <View style={styles.optionsContainer}>
              <Text style={styles.optionsTitle}>Choose how to handle existing data:</Text>

              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => handleDownload('replace_all')}
              >
                <Ionicons name="cloud-download" size={24} color="#FF3B30" />
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>Replace All</Text>
                  <Text style={styles.optionDescription}>
                    Delete local data and download everything from cloud (backup created first)
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => handleDownload('merge_by_date')}
              >
                <Ionicons name="git-merge" size={24} color="#34C759" />
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>Smart Merge</Text>
                  <Text style={styles.optionDescription}>
                    Keep the newer version of each item based on last modified date
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionButton, styles.optionButtonSecondary]}
                onPress={onClose}
              >
                <Ionicons name="phone-portrait" size={24} color="#8E8E93" />
                <View style={styles.optionText}>
                  <Text style={[styles.optionTitle, styles.optionTitleSecondary]}>Keep Local Only</Text>
                  <Text style={styles.optionDescription}>
                    Cancel and keep only the data on this device
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            // No local data - simple download
            <View style={styles.buttonContainer}>
              <Button
                title="Download All"
                onPress={() => handleDownload('replace_all')}
                style={styles.primaryButton}
              />
              <Button
                title="Cancel"
                onPress={onClose}
                variant="secondary"
                style={styles.secondaryButton}
              />
            </View>
          )}
        </>
      ) : (
        // Could not fetch cloud stats
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Unable to connect to cloud. Please check your internet connection.
          </Text>
          <Button title="Retry" onPress={fetchStats} style={styles.primaryButton} />
          <Button title="Cancel" onPress={onClose} variant="secondary" style={styles.secondaryButton} />
        </View>
      )}
    </View>
  );

  const renderDownloading = () => (
    <View style={styles.content}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.title}>{progress ? getPhaseText(progress.phase) : 'Downloading...'}</Text>

      {progress && (
        <View style={styles.progressContainer}>
          {progress.backupId && progress.phase !== 'backing_up' && (
            <Text style={styles.backupNote}>Backup created: {progress.backupId.substring(0, 8)}...</Text>
          )}

          {progress.totalCiders > 0 && (
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Ciders:</Text>
              <Text style={styles.progressValue}>
                {progress.downloadedCiders} / {progress.totalCiders}
              </Text>
            </View>
          )}

          {progress.totalExperiences > 0 && (
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Experiences:</Text>
              <Text style={styles.progressValue}>
                {progress.downloadedExperiences} / {progress.totalExperiences}
              </Text>
            </View>
          )}

          {progress.totalImages > 0 && (
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Images:</Text>
              <Text style={styles.progressValue}>
                {progress.downloadedImages} / {progress.totalImages}
              </Text>
            </View>
          )}

          {progress.currentItem && (
            <Text style={styles.currentItem}>Current: {progress.currentItem}</Text>
          )}
        </View>
      )}

      <TouchableOpacity
        style={styles.cancelDownloadButton}
        onPress={() => {
          Alert.alert(
            'Cancel Download?',
            'Progress will be lost. Are you sure?',
            [
              { text: 'Continue', style: 'cancel' },
              { text: 'Cancel Download', style: 'destructive', onPress: () => syncManager.abortDownload() }
            ]
          );
        }}
      >
        <Text style={styles.cancelDownloadText}>Cancel Download</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.content}>
      <Ionicons name="checkmark-circle" size={64} color="#34C759" style={styles.icon} />
      <Text style={styles.title}>Download Complete!</Text>

      {result && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>
            {result.cidersDownloaded} ciders downloaded
          </Text>
          <Text style={styles.resultText}>
            {result.experiencesDownloaded} experiences downloaded
          </Text>
          {result.imagesDownloaded > 0 && (
            <Text style={styles.resultText}>
              {result.imagesDownloaded} images downloaded
            </Text>
          )}
          {result.skippedOrphans > 0 && (
            <Text style={styles.resultNote}>
              {result.skippedOrphans} orphaned experiences skipped
            </Text>
          )}
        </View>
      )}

      <Button
        title="Done"
        onPress={handleClose}
        style={styles.primaryButton}
      />
    </View>
  );

  const renderError = () => (
    <View style={styles.content}>
      <Ionicons name="close-circle" size={64} color="#FF3B30" style={styles.icon} />
      <Text style={styles.title}>Download Failed</Text>

      <Text style={styles.errorText}>
        {result?.error || progress?.errorMessage || 'An unknown error occurred'}
      </Text>

      {result?.backupId && (
        <TouchableOpacity style={styles.restoreButton} onPress={handleRestoreBackup}>
          <Ionicons name="refresh" size={20} color="#007AFF" />
          <Text style={styles.restoreButtonText}>Restore from backup</Text>
        </TouchableOpacity>
      )}

      <View style={styles.buttonContainer}>
        <Button
          title="Try Again"
          onPress={fetchStats}
          style={styles.primaryButton}
        />
        <Button
          title="Close"
          onPress={onClose}
          variant="secondary"
          style={styles.secondaryButton}
        />
      </View>
    </View>
  );

  const renderContent = () => {
    switch (step) {
      case 'loading': return renderLoading();
      case 'preview': return renderPreview();
      case 'downloading': return renderDownloading();
      case 'success': return renderSuccess();
      case 'error': return renderError();
      default: return renderLoading();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {step !== 'downloading' && (
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={28} color="#666" />
          </TouchableOpacity>
        )}
        {renderContent()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    padding: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
    padding: 8,
  },
  content: {
    alignItems: 'center',
    padding: 20,
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 24,
  },
  statBox: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  statDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  optionsContainer: {
    width: '100%',
    gap: 12,
  },
  optionsTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionButtonSecondary: {
    backgroundColor: '#F0F0F0',
    shadowOpacity: 0,
    elevation: 0,
  },
  optionText: {
    marginLeft: 16,
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  optionTitleSecondary: {
    color: '#666',
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    width: '100%',
  },
  secondaryButton: {
    width: '100%',
  },
  progressContainer: {
    marginTop: 24,
    alignItems: 'center',
    width: '100%',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '60%',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 16,
    color: '#666',
  },
  progressValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  currentItem: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 12,
  },
  backupNote: {
    fontSize: 12,
    color: '#34C759',
    marginBottom: 16,
  },
  cancelDownloadButton: {
    marginTop: 32,
    padding: 12,
  },
  cancelDownloadText: {
    color: '#FF3B30',
    fontSize: 16,
  },
  resultContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  resultText: {
    fontSize: 18,
    color: '#333',
    marginBottom: 8,
  },
  resultNote: {
    fontSize: 14,
    color: '#FF9500',
    marginTop: 8,
  },
  errorContainer: {
    alignItems: 'center',
    width: '100%',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 16,
  },
  restoreButtonText: {
    color: '#007AFF',
    fontSize: 16,
    marginLeft: 8,
  },
});
