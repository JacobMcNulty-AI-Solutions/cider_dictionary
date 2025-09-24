// Enhanced Collection Screen with Advanced Search and Filtering
// Phase 2 implementation with comprehensive collection management

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Animated,
  Dimensions
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { RootTabScreenProps } from '../../types/navigation';
import { CiderMasterRecord } from '../../types/cider';
import { useCiderStore } from '../../store/ciderStore';
import SafeAreaContainer from '../../components/common/SafeAreaContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import CiderCard from '../../components/cards/CiderCard';
import SearchBar from '../../components/collection/SearchBar';

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

  const fadeAnim = useMemo(() => new Animated.Value(0), []);
  const { width: screenWidth } = Dimensions.get('window');

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
      // navigation.navigate('CiderDetail', { ciderId: cider.id });
      console.log('Navigate to cider detail:', cider.id);
    }
  }, [isSelectionMode]);

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
              for (const ciderId of selectedCiders) {
                await deleteCider(ciderId);
              }
              exitSelectionMode();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete selected ciders');
            }
          }
        }
      ]
    );
  }, [selectedCiders, deleteCider, exitSelectionMode]);

  const handleSortPress = useCallback((option: SortOption) => {
    const newDirection = sortOrder === option && sortDirection === 'desc' ? 'asc' : 'desc';
    setSortOrder(option, newDirection);
    setShowSortMenu(false);
  }, [sortOrder, sortDirection, setSortOrder]);

  const handleViewModeToggle = useCallback(() => {
    setViewMode(prev => prev === 'list' ? 'grid' : 'list');
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
        <CiderCard
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
          >
            <Text style={styles.sortButtonText}>
              Sort: {sortOrder} {sortDirection === 'desc' ? '↓' : '↑'}
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
    <View style={styles.selectionHeader}>
      <TouchableOpacity
        style={styles.selectionCancelButton}
        onPress={exitSelectionMode}
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
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🍺</Text>
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'No matching ciders found' : 'No ciders yet'}
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
        <View style={styles.sortMenu}>
          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.sortOption,
                sortOrder === option.key && styles.sortOptionActive
              ]}
              onPress={() => handleSortPress(option.key)}
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
    <SafeAreaContainer>
      {isSelectionMode ? renderSelectionHeader() : renderHeader()}

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
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
});

export default EnhancedCollectionScreen;