// Phase 4: Data Export Screen
// UI for exporting cider data to JSON/CSV with share functionality

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useCiderStore } from '../../store/ciderStore';
import { exportService } from '../../services/export/ExportService';
import {
  ExportOptions,
  ExportResult,
  ExportProgress,
  EXPORT_PRESETS,
  DEFAULT_EXPORT_OPTIONS,
} from '../../types/export';
import SafeAreaContainer from '../../components/common/SafeAreaContainer';
import { RootStackScreenProps } from '../../types/navigation';

type Props = RootStackScreenProps<'DataExport'>;

export default function DataExportScreen({ navigation }: Props) {
  // =============================================================================
  // STATE
  // =============================================================================

  const { ciders, loadCiders } = useCiderStore();
  const [exportOptions, setExportOptions] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [lastExport, setLastExport] = useState<ExportResult | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [exportedFiles, setExportedFiles] = useState<Array<{
    name: string;
    path: string;
    size: number;
    date: Date;
  }>>([]);

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  useEffect(() => {
    loadCiders();
    loadExportedFiles();
  }, []);

  const loadExportedFiles = async () => {
    const files = await exportService.getExportedFiles();
    setExportedFiles(files);
  };

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handlePresetSelect = useCallback((presetId: string) => {
    const preset = EXPORT_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setExportOptions(prev => ({
        ...prev,
        ...preset.options,
      }));
    }
  }, []);

  const handleOptionChange = useCallback((key: keyof ExportOptions, value: any) => {
    setExportOptions(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const handleExport = useCallback(async () => {
    if (ciders.length === 0) {
      Alert.alert('No Data', 'You don\'t have any ciders to export yet.');
      return;
    }

    setIsExporting(true);
    setExportProgress({
      stage: 'gathering',
      progress: 0,
      currentItem: 0,
      totalItems: ciders.length,
      message: 'Starting export...',
      cancellable: true,
    });

    try {
      const result = await exportService.exportData(
        ciders,
        [], // TODO: Load experiences from store
        exportOptions,
        (progress) => {
          setExportProgress(progress);
        }
      );

      setLastExport(result);
      setIsExporting(false);
      setExportProgress(null);

      if (result.success) {
        Alert.alert(
          'Export Successful',
          `Exported ${result.recordCount.ciders} cider${result.recordCount.ciders === 1 ? '' : 's'}\n` +
          `File size: ${exportService.formatBytes(result.fileSize)}\n` +
          `Time: ${(result.exportTime / 1000).toFixed(1)}s`,
          [
            { text: 'OK', style: 'default' },
            {
              text: 'Share',
              onPress: () => handleShareExport(result.filePath!),
            },
          ]
        );

        // Reload file list
        await loadExportedFiles();
      } else {
        Alert.alert('Export Failed', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Export error:', error);
      setIsExporting(false);
      setExportProgress(null);
      Alert.alert('Export Failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }, [ciders, exportOptions]);

  const handleShareExport = useCallback(async (filePath: string) => {
    const success = await exportService.shareExportFile(filePath);
    if (!success) {
      Alert.alert('Share Failed', 'Unable to share the export file');
    }
  }, []);

  const handleDeleteFile = useCallback(async (filePath: string, filename: string) => {
    Alert.alert(
      'Delete Export',
      `Delete ${filename}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await exportService.deleteExportFile(filePath);
            if (success) {
              await loadExportedFiles();
            } else {
              Alert.alert('Delete Failed', 'Unable to delete the file');
            }
          },
        },
      ]
    );
  }, []);

  // =============================================================================
  // RENDER HELPERS
  // =============================================================================

  const renderPresets = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Export Presets</Text>
      <View style={styles.presetsContainer}>
        {EXPORT_PRESETS.map(preset => (
          <TouchableOpacity
            key={preset.id}
            style={styles.presetCard}
            onPress={() => handlePresetSelect(preset.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.presetIcon}>{preset.icon}</Text>
            <Text style={styles.presetName}>{preset.name}</Text>
            <Text style={styles.presetDescription}>{preset.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderAdvancedOptions = () => (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.advancedToggle}
        onPress={() => setShowAdvancedOptions(!showAdvancedOptions)}
      >
        <Text style={styles.sectionTitle}>Advanced Options</Text>
        <Text style={styles.toggleIcon}>{showAdvancedOptions ? '▼' : '▶'}</Text>
      </TouchableOpacity>

      {showAdvancedOptions && (
        <View style={styles.advancedOptions}>
          {/* Format Selection */}
          <View style={styles.option}>
            <Text style={styles.optionLabel}>Format</Text>
            <View style={styles.formatButtons}>
              <TouchableOpacity
                style={[
                  styles.formatButton,
                  exportOptions.format === 'json' && styles.formatButtonActive,
                ]}
                onPress={() => handleOptionChange('format', 'json')}
              >
                <Text style={[
                  styles.formatButtonText,
                  exportOptions.format === 'json' && styles.formatButtonTextActive,
                ]}>
                  JSON
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.formatButton,
                  exportOptions.format === 'csv' && styles.formatButtonActive,
                ]}
                onPress={() => handleOptionChange('format', 'csv')}
              >
                <Text style={[
                  styles.formatButtonText,
                  exportOptions.format === 'csv' && styles.formatButtonTextActive,
                ]}>
                  CSV
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Include Options */}
          <View style={styles.option}>
            <Text style={styles.optionLabel}>Include Experiences</Text>
            <Switch
              value={exportOptions.includeExperiences}
              onValueChange={(value) => handleOptionChange('includeExperiences', value)}
              trackColor={{ false: '#E0E0E0', true: '#D4A574' }}
              thumbColor={exportOptions.includeExperiences ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>

          <View style={styles.option}>
            <Text style={styles.optionLabel}>Include Venues</Text>
            <Switch
              value={exportOptions.includeVenues}
              onValueChange={(value) => handleOptionChange('includeVenues', value)}
              trackColor={{ false: '#E0E0E0', true: '#D4A574' }}
              thumbColor={exportOptions.includeVenues ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>

          <View style={styles.option}>
            <Text style={styles.optionLabel}>Include Analytics</Text>
            <Switch
              value={exportOptions.includeAnalytics}
              onValueChange={(value) => handleOptionChange('includeAnalytics', value)}
              trackColor={{ false: '#E0E0E0', true: '#D4A574' }}
              thumbColor={exportOptions.includeAnalytics ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>

          <View style={styles.option}>
            <Text style={styles.optionLabel}>Include Images</Text>
            <Switch
              value={exportOptions.includeImages}
              onValueChange={(value) => handleOptionChange('includeImages', value)}
              trackColor={{ false: '#E0E0E0', true: '#D4A574' }}
              thumbColor={exportOptions.includeImages ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>

          {/* JSON-specific options */}
          {exportOptions.format === 'json' && (
            <View style={styles.option}>
              <Text style={styles.optionLabel}>Pretty Print (Human-Readable)</Text>
              <Switch
                value={exportOptions.prettyPrint}
                onValueChange={(value) => handleOptionChange('prettyPrint', value)}
                trackColor={{ false: '#E0E0E0', true: '#D4A574' }}
                thumbColor={exportOptions.prettyPrint ? '#FFFFFF' : '#F4F3F4'}
              />
            </View>
          )}
        </View>
      )}
    </View>
  );

  const renderExportButton = () => (
    <View style={styles.exportButtonContainer}>
      <TouchableOpacity
        style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
        onPress={handleExport}
        disabled={isExporting}
        activeOpacity={0.7}
      >
        {isExporting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.exportButtonText}>
            📤 Export {ciders.length} Cider{ciders.length === 1 ? '' : 's'}
          </Text>
        )}
      </TouchableOpacity>

      {exportProgress && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>{exportProgress.message}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${exportProgress.progress}%` }]} />
          </View>
          <Text style={styles.progressPercent}>{exportProgress.progress.toFixed(0)}%</Text>
        </View>
      )}
    </View>
  );

  const renderExportedFiles = () => {
    if (exportedFiles.length === 0) {
      return null;
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Previous Exports</Text>
        {exportedFiles.slice(0, 5).map((file, index) => (
          <View key={index} style={styles.fileCard}>
            <View style={styles.fileInfo}>
              <Text style={styles.fileName}>{file.name}</Text>
              <Text style={styles.fileDetails}>
                {exportService.formatBytes(file.size)} • {file.date.toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.fileActions}>
              <TouchableOpacity
                style={styles.fileActionButton}
                onPress={() => handleShareExport(file.path)}
              >
                <Text style={styles.fileActionIcon}>📤</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.fileActionButton}
                onPress={() => handleDeleteFile(file.path, file.name)}
              >
                <Text style={styles.fileActionIcon}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  // =============================================================================
  // MAIN RENDER
  // =============================================================================

  return (
    <SafeAreaContainer style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Export Your Data</Text>
          <Text style={styles.subtitle}>
            Download your cider collection in JSON or CSV format
          </Text>
        </View>

        {/* Presets */}
        {renderPresets()}

        {/* Advanced Options */}
        {renderAdvancedOptions()}

        {/* Export Button */}
        {renderExportButton()}

        {/* Previous Exports */}
        {renderExportedFiles()}

        {/* Bottom Padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaContainer>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  presetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  presetCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: '1%',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  presetIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  presetName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  presetDescription: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  advancedToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleIcon: {
    fontSize: 16,
    color: '#666',
  },
  advancedOptions: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  optionLabel: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  formatButtons: {
    flexDirection: 'row',
  },
  formatButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginLeft: 8,
    borderRadius: 8,
  },
  formatButtonActive: {
    backgroundColor: '#D4A574',
    borderColor: '#D4A574',
  },
  formatButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  formatButtonTextActive: {
    color: '#FFFFFF',
  },
  exportButtonContainer: {
    marginBottom: 24,
  },
  exportButton: {
    backgroundColor: '#D4A574',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progressContainer: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#D4A574',
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  fileCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  fileDetails: {
    fontSize: 12,
    color: '#666',
  },
  fileActions: {
    flexDirection: 'row',
  },
  fileActionButton: {
    padding: 8,
    marginLeft: 4,
  },
  fileActionIcon: {
    fontSize: 20,
  },
});
