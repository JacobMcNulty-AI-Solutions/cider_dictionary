// Enhanced Collection Screen with Advanced Search and Filtering
// Phase 2 implementation with comprehensive collection management

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Animated,
  Dimensions,
  Modal,
  ActivityIndicator,
  TextInput
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { RootTabScreenProps } from '../../types/navigation';
import { CiderMasterRecord } from '../../types/cider';
import { useCiderStore } from '../../store/ciderStore';
import SafeAreaContainer from '../../components/common/SafeAreaContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EnhancedCiderCard from '../../components/cards/EnhancedCiderCard';
import SearchBar from '../../components/collection/SearchBar';
import { batchOperationService } from '../../services/batch/BatchOperationService';
import { BatchProgress, BatchOperation, createCancellationToken } from '../../types/batch';

type Props = RootTabScreenProps<'Collection'>;

type ViewMode = 'list' | 'grid';
type SortOption = 'name' | 'brand' | 'rating' | 'abv' | 'dateAdded';

export default function EnhancedCollectionScreen({ navigation }: Props) {
  const {
    ciders,
    filteredCiders,
    isLoading,
    error,
    searchQuery,
    sortOrder,
    sortDirection,
    loadCiders,
    setSearchQuery,
    setSortOrder,
    clearFilters,
    deleteCider
  } = useCiderStore();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedCiders, setSelectedCiders] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Batch operation state
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [undoToken, setUndoToken] = useState<string | null>(null);
  const [undoMessage, setUndoMessage] = useState<string>('');
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fadeAnim = useMemo(() => new Animated.Value(0), []);
  const { width: screenWidth } = Dimensions.get('window');

  // Add Advanced Search button to header
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('AdvancedSearch')}
          style={{ marginRight: 16 }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
            🔍 Advanced
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // Load ciders on screen focus
  useFocusEffect(
    useCallback(() => {
      loadCiders();
    }, [loadCiders])
  );

  // Animate in content
  useEffect(() => {
    if (!isLoading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isLoading, fadeAnim]);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCiders();
    setRefreshing(false);
  }, [loadCiders]);

  const handleCiderPress = useCallback((cider: CiderMasterRecord) => {
    if (isSelectionMode) {
      toggleCiderSelection(cider.id);
    } else {
      // Navigate to cider detail screen
      navigation.navigate('CiderDetail', { ciderId: cider.id });
      console.log('Navigate to cider detail:', cider.id);
    }
  }, [isSelectionMode, navigation]);

  const handleCiderLongPress = useCallback((cider: CiderMasterRecord) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedCiders([cider.id]);
    } else {
      toggleCiderSelection(cider.id);
    }
  }, [isSelectionMode]);

  const toggleCiderSelection = useCallback((ciderId: string) => {
    setSelectedCiders(prev => {
      if (prev.includes(ciderId)) {
        const newSelection = prev.filter(id => id !== ciderId);
        if (newSelection.length === 0) {
          setIsSelectionMode(false);
        }
        return newSelection;
      } else {
        return [...prev, ciderId];
      }
    });
  }, []);

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedCiders([]);
  }, []);

  const handleDeleteSelected = useCallback(() => {
    Alert.alert(
      'Delete Ciders',
      `Are you sure you want to delete ${selectedCiders.length} cider${selectedCiders.length === 1 ? '' : 's'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Execute batch delete operation
              const operation: BatchOperation = {
                type: 'delete',
                targetItems: new Set(selectedCiders),
                confirmationRequired: true,
                undoable: true,
              };

              const cidersMap = new Map(ciders.map(c => [c.id, c]));
              const result = await batchOperationService.executeBatchOperation(
                operation,
                cidersMap,
                setBatchProgress
              );

              // Clear progress modal after showing completion
              setTimeout(() => {
                setBatchProgress(null);
              }, 1500);

              if (result.success) {
                // Delete from store
                for (const ciderId of selectedCiders) {
                  await deleteCider(ciderId);
                }

                // Show undo snackbar
                const count = result.successCount;
                setUndoMessage(`Deleted ${count} cider${count === 1 ? '' : 's'}`);
                setUndoToken(result.undoToken);
                startUndoTimer();
              } else {
                Alert.alert('Error', `Failed to delete some ciders. ${result.errors.length} errors occurred.`);
              }

              exitSelectionMode();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete selected ciders');
              setBatchProgress(null);
            }
          }
        }
      ]
    );
  }, [selectedCiders, deleteCider, exitSelectionMode, ciders]);

  const handleSortPress = useCallback((option: SortOption) => {
    const newDirection = sortOrder === option && sortDirection === 'desc' ? 'asc' : 'desc';
    setSortOrder(option, newDirection);
    setShowSortMenu(false);
  }, [sortOrder, sortDirection, setSortOrder]);

  const handleViewModeToggle = useCallback(() => {
    setViewMode(prev => prev === 'list' ? 'grid' : 'list');
  }, []);

  // =============================================================================
  // BATCH OPERATIONS & UNDO
  // =============================================================================

  const startUndoTimer = useCallback(() => {
    // Clear existing timer
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }

    // Auto-hide undo snackbar after 30 seconds
    undoTimerRef.current = setTimeout(() => {
      setUndoToken(null);
      setUndoMessage('');
    }, 30000);
  }, []);

  const handleUndo = useCallback(async () => {
    if (!undoToken) return;

    try {
      // Get undo data before processing
      const undoStack = batchOperationService.getUndoStack();
      const undoEntry = undoStack.find(entry => entry.undoToken === undoToken);

      if (!undoEntry) {
        Alert.alert('Error', 'Undo data not found or expired');
        setUndoToken(null);
        setUndoMessage('');
        return;
      }

      setBatchProgress({
        operation: `Undoing ${undoEntry.operation}`,
        status: 'processing',
        totalItems: undoEntry.affectedItems.length,
        processedItems: 0,
        failedItems: 0,
        currentItem: null,
        progress: 0,
        estimatedTimeRemaining: 0,
        errors: [],
      });

      // Import services to restore with same ID
      const { sqliteService } = await import('../../services/database/sqlite');
      const { syncManager } = await import('../../services/sync/SyncManager');

      let restored = 0;
      let failed = 0;

      for (const item of undoEntry.affectedItems) {
        try {
          const previousState = item.previousState as CiderMasterRecord;

          // Ensure dates are valid Date objects (they might be strings after serialization)
          let createdAt: Date;
          let updatedAt: Date;

          try {
            createdAt = previousState.createdAt instanceof Date
              ? previousState.createdAt
              : new Date(previousState.createdAt);

            updatedAt = previousState.updatedAt instanceof Date
              ? previousState.updatedAt
              : new Date(previousState.updatedAt);

            // Validate dates are not Invalid Date
            if (isNaN(createdAt.getTime()) || isNaN(updatedAt.getTime())) {
              throw new Error('Invalid date values');
            }
          } catch (dateError) {
            // If dates are invalid, use current timestamp
            console.warn('Invalid dates in undo state, using current timestamp for:', item.id);
            createdAt = new Date();
            updatedAt = new Date();
          }

          const restoredCider: CiderMasterRecord = {
            ...previousState,
            createdAt,
            updatedAt,
            syncStatus: 'pending', // Ensure it syncs after restore
          };

          // Directly insert the cider with its original ID and data
          await sqliteService.createCider(restoredCider);

          // Queue for Firebase sync
          try {
            await syncManager.queueOperation('CREATE_CIDER', restoredCider);
          } catch (syncError) {
            // Log sync error but don't fail the restore
            console.warn('Failed to queue sync for restored cider:', item.id, syncError);
            // The cider is still restored locally, just won't sync immediately
          }

          restored++;

          // Update progress
          setBatchProgress(prev => prev ? {
            ...prev,
            processedItems: restored + failed,
            progress: Math.floor(((restored + failed) / undoEntry.affectedItems.length) * 100),
          } : null);
        } catch (error) {
          console.error('Failed to restore cider:', item.id, error);
          failed++;
        }
      }

      // Clear progress modal after showing completion
      setTimeout(() => {
        setBatchProgress(null);
      }, 1500);

      // Mark undo as used
      const result = await batchOperationService.undoBatchOperation(undoToken);

      // Reload ciders to reflect undo
      await loadCiders();

      if (failed === 0) {
        Alert.alert('Success', `Restored ${restored} cider${restored === 1 ? '' : 's'}`);
      } else {
        Alert.alert('Partial Success', `Restored ${restored} ciders, ${failed} failed`);
      }
    } catch (error) {
      console.error('Undo error:', error);
      Alert.alert('Error', 'Failed to undo operation');
      setBatchProgress(null);
    }

    // Clear undo state
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }
    setUndoToken(null);
    setUndoMessage('');
  }, [undoToken, loadCiders]);

  const dismissUndo = useCallback(() => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }
    setUndoToken(null);
    setUndoMessage('');
  }, []);

  // Cleanup undo timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  // =============================================================================
  // RENDER FUNCTIONS
  // =============================================================================

  const renderCiderItem = useCallback(({ item, index }: { item: CiderMasterRecord; index: number }) => {
    const isSelected = selectedCiders.includes(item.id);

    return (
      <Animated.View
        style={[
          viewMode === 'grid' && styles.gridItem,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
          },
        ]}
      >
        <EnhancedCiderCard
          cider={item}
          onPress={() => handleCiderPress(item)}
          onLongPress={() => handleCiderLongPress(item)}
          selected={isSelected}
          selectionMode={isSelectionMode}
          viewMode={viewMode}
        />
      </Animated.View>
    );
  }, [
    viewMode,
    selectedCiders,
    isSelectionMode,
    fadeAnim,
    handleCiderPress,
    handleCiderLongPress
  ]);

  const renderHeader = useCallback(() => (
    <View style={styles.headerContainer}>
      <SearchBar
        onSearchChange={setSearchQuery}
        showFilters={true}
      />

      <View style={styles.controlsContainer}>
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            {filteredCiders.length} of {ciders.length} ciders
          </Text>
          {searchQuery && (
            <TouchableOpacity
              onPress={() => {
                clearFilters();
                setSearchQuery('');
              }}
            >
              <Text style={styles.clearSearchText}>Clear search</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.viewControls}>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setShowSortMenu(true)}
            testID="sort-button"
          >
            <Text style={styles.sortButtonText} testID="current-sort-indicator">
              Sort: {sortOrder.charAt(0).toUpperCase() + sortOrder.slice(1)} {sortDirection === 'desc' ? '↓' : '↑'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.viewModeButton}
            onPress={handleViewModeToggle}
          >
            <Text style={styles.viewModeText}>
              {viewMode === 'list' ? '⊞' : '☰'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  ), [
    filteredCiders.length,
    ciders.length,
    searchQuery,
    sortOrder,
    sortDirection,
    viewMode,
    setSearchQuery,
    clearFilters,
    handleViewModeToggle
  ]);

  const renderSelectionHeader = useCallback(() => (
    <View style={styles.selectionHeader} testID="selection-header">
      <TouchableOpacity
        style={styles.selectionCancelButton}
        onPress={exitSelectionMode}
        testID="selection-cancel-button"
      >
        <Text style={styles.selectionCancelText}>Cancel</Text>
      </TouchableOpacity>

      <Text style={styles.selectionTitle}>
        {selectedCiders.length} selected
      </Text>

      <TouchableOpacity
        style={styles.selectionDeleteButton}
        onPress={handleDeleteSelected}
        disabled={selectedCiders.length === 0}
      >
        <Text
          style={[
            styles.selectionDeleteText,
            selectedCiders.length === 0 && styles.selectionDeleteTextDisabled
          ]}
        >
          Delete
        </Text>
      </TouchableOpacity>
    </View>
  ), [selectedCiders.length, exitSelectionMode, handleDeleteSelected]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyContainer} testID="empty-collection-state">
      <Text style={styles.emptyIcon}>🍺</Text>
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'No matching ciders found' : 'No Ciders Found'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery
          ? 'Try adjusting your search terms or filters'
          : 'Add your first cider to get started!'
        }
      </Text>
      {!searchQuery && (
        <TouchableOpacity
          style={styles.addFirstButton}
          onPress={() => navigation.navigate('QuickEntry')}
        >
          <Text style={styles.addFirstButtonText}>Add Your First Cider</Text>
        </TouchableOpacity>
      )}
    </View>
  ), [searchQuery, navigation]);

  const renderSortMenu = useCallback(() => {
    if (!showSortMenu) return null;

    const sortOptions: Array<{ key: SortOption; label: string }> = [
      { key: 'dateAdded', label: 'Date Added' },
      { key: 'name', label: 'Name' },
      { key: 'brand', label: 'Brand' },
      { key: 'rating', label: 'Rating' },
      { key: 'abv', label: 'ABV' },
    ];

    return (
      <View style={styles.sortMenuOverlay}>
        <TouchableOpacity
          style={styles.sortMenuBackdrop}
          onPress={() => setShowSortMenu(false)}
        />
        <View style={styles.sortMenu} testID="sort-modal">
          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.sortOption,
                sortOrder === option.key && styles.sortOptionActive
              ]}
              onPress={() => handleSortPress(option.key)}
              testID={`sort-by-${option.key}`}
            >
              <Text
                style={[
                  styles.sortOptionText,
                  sortOrder === option.key && styles.sortOptionTextActive
                ]}
              >
                {option.label}
              </Text>
              {sortOrder === option.key && (
                <Text style={styles.sortDirectionIndicator}>
                  {sortDirection === 'desc' ? '↓' : '↑'}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }, [showSortMenu, sortOrder, sortDirection, handleSortPress]);

  const renderUndoSnackbar = useCallback(() => {
    if (!undoToken || !undoMessage) return null;

    return (
      <View style={styles.undoSnackbar} testID="undo-snackbar">
        <Text style={styles.undoMessage}>{undoMessage}</Text>
        <View style={styles.undoActions}>
          <TouchableOpacity
            style={styles.undoButton}
            onPress={handleUndo}
            testID="undo-button"
          >
            <Text style={styles.undoButtonText}>UNDO</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={dismissUndo}
            testID="dismiss-undo-button"
          >
            <Text style={styles.dismissButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [undoToken, undoMessage, handleUndo, dismissUndo]);

  const renderBatchProgressModal = useCallback(() => {
    if (!batchProgress) return null;

    const canDismiss = batchProgress.status === 'completed' || batchProgress.status === 'error';

    return (
      <Modal
        visible={true}
        transparent={true}
        animationType="fade"
        testID="batch-progress-modal"
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            if (canDismiss) {
              setBatchProgress(null);
            }
          }}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>{batchProgress.operation}</Text>
                {canDismiss && (
                  <TouchableOpacity
                    onPress={() => setBatchProgress(null)}
                    style={styles.closeButton}
                    testID="close-progress-button"
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.progressStatus}>
                {batchProgress.status === 'preparing' && 'Preparing...'}
                {batchProgress.status === 'processing' && 'Processing...'}
                {batchProgress.status === 'completed' && 'Completed!'}
                {batchProgress.status === 'error' && 'Error occurred'}
              </Text>

              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${batchProgress.progress}%` }
                  ]}
                />
              </View>

              <Text style={styles.progressStats}>
                {batchProgress.processedItems} of {batchProgress.totalItems} items
              </Text>

              {batchProgress.estimatedTimeRemaining > 0 && (
                <Text style={styles.progressEta}>
                  ~{batchProgress.estimatedTimeRemaining}s remaining
                </Text>
              )}

              {batchProgress.status === 'processing' && (
                <ActivityIndicator size="large" color="#2196F3" style={{ marginTop: 16 }} />
              )}

              {batchProgress.failedItems > 0 && (
                <Text style={styles.progressErrors}>
                  {batchProgress.failedItems} failed
                </Text>
              )}

              {canDismiss && (
                <TouchableOpacity
                  style={styles.dismissModalButton}
                  onPress={() => setBatchProgress(null)}
                >
                  <Text style={styles.dismissModalButtonText}>Close</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  }, [batchProgress]);

  // =============================================================================
  // RENDER
  // =============================================================================

  if (error) {
    return (
      <SafeAreaContainer>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to load ciders</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaContainer>
    );
  }

  return (
    <SafeAreaContainer testID="enhanced-collection-screen">
      {isSelectionMode ? renderSelectionHeader() : renderHeader()}

      {isLoading ? (
        <LoadingSpinner testID="loading-spinner" />
      ) : (
        <FlatList
          testID="cider-list"
          data={filteredCiders}
          renderItem={renderCiderItem}
          keyExtractor={(item) => item.id}
          numColumns={viewMode === 'grid' ? 2 : 1}
          key={viewMode} // Force re-render on layout change
          contentContainerStyle={[
            styles.listContainer,
            filteredCiders.length === 0 && styles.listContainerEmpty
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#2196F3']}
              tintColor="#2196F3"
            />
          }
          ListEmptyComponent={renderEmptyState}
        />
      )}

      {renderSortMenu()}
      {renderUndoSnackbar()}
      {renderBatchProgressModal()}

      {!isSelectionMode && !searchQuery && filteredCiders.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('QuickEntry')}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </SafeAreaContainer>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#f8f9fa',
    paddingBottom: 8,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statsContainer: {
    flex: 1,
  },
  statsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  clearSearchText: {
    fontSize: 12,
    color: '#2196F3',
    textDecorationLine: 'underline',
  },
  viewControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e3f2fd',
    borderRadius: 16,
    marginRight: 8,
  },
  sortButtonText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '500',
  },
  viewModeButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  viewModeText: {
    fontSize: 16,
    color: '#666',
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderBottomWidth: 1,
    borderBottomColor: '#bbdefb',
  },
  selectionCancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  selectionCancelText: {
    fontSize: 16,
    color: '#1976D2',
  },
  selectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
  },
  selectionDeleteButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  selectionDeleteText: {
    fontSize: 16,
    color: '#F44336',
    fontWeight: '500',
  },
  selectionDeleteTextDisabled: {
    color: '#ccc',
  },
  listContainer: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  listContainerEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  gridItem: {
    flex: 1,
    marginHorizontal: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  addFirstButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F44336',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  sortMenuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  sortMenuBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  sortMenu: {
    position: 'absolute',
    top: 120,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 8,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sortOptionActive: {
    backgroundColor: '#e3f2fd',
  },
  sortOptionText: {
    fontSize: 16,
    color: '#333',
  },
  sortOptionTextActive: {
    color: '#1976D2',
    fontWeight: '500',
  },
  sortDirectionIndicator: {
    fontSize: 14,
    color: '#1976D2',
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '300',
  },
  // Undo Snackbar
  undoSnackbar: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    backgroundColor: '#323232',
    borderRadius: 4,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  undoMessage: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    marginRight: 16,
  },
  undoActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  undoButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  undoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFC107',
  },
  dismissButton: {
    padding: 4,
  },
  dismissButtonText: {
    fontSize: 18,
    color: '#fff',
  },
  // Batch Progress Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 4,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  progressStatus: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 4,
  },
  progressStats: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  progressEta: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  progressErrors: {
    fontSize: 14,
    color: '#F44336',
    textAlign: 'center',
    marginTop: 8,
  },
  dismissModalButton: {
    marginTop: 16,
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  dismissModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});