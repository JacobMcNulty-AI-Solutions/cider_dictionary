// Phase 4: Advanced Search Screen
// Implements high-performance search with fuzzy matching, complex filtering, and instant results

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useCiderStore } from '../../store/ciderStore';
import { searchService } from '../../services/search/SearchService';
import {
  SearchState,
  SearchResult,
  FilterState,
  DEFAULT_SEARCH_STATE,
  DEFAULT_FILTERS,
  QUICK_FILTERS,
  SortBy,
  SortDirection,
} from '../../types/search';
import SafeAreaContainer from '../../components/common/SafeAreaContainer';
import FilterModal from '../../components/search/FilterModal';
import { RootStackScreenProps } from '../../types/navigation';

type Props = RootStackScreenProps<'AdvancedSearch'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function AdvancedSearchScreen({ navigation }: Props) {
  // =============================================================================
  // STATE
  // =============================================================================

  const { ciders, loadCiders } = useCiderStore();

  const [searchState, setSearchState] = useState<SearchState>(DEFAULT_SEARCH_STATE);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeQuickFilters, setActiveQuickFilters] = useState<Set<string>>(new Set());

  // Debounce timer
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  // Animation values
  const fadeAnim = useMemo(() => new Animated.Value(0), []);
  const filterPillAnim = useMemo(() => new Animated.Value(0), []);

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  useEffect(() => {
    // Load ciders and build search index on mount
    const initialize = async () => {
      await loadCiders();

      if (ciders.length > 0) {
        // Build search index
        searchService.buildSearchIndex(ciders);

        // Perform initial search (empty query = show all)
        performSearch(searchState);
      }
    };

    initialize();
  }, []);

  // Rebuild index when ciders change
  useEffect(() => {
    if (ciders.length > 0) {
      searchService.buildSearchIndex(ciders);
      performSearch(searchState);
    }
  }, [ciders]);

  // Animate in results
  useEffect(() => {
    if (searchResults.length > 0) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [searchResults]);

  // =============================================================================
  // SEARCH LOGIC
  // =============================================================================

  const performSearch = useCallback((state: SearchState) => {
    const startTime = Date.now();
    setIsSearching(true);

    try {
      // Perform search using SearchService
      const results = searchService.performAdvancedSearch(state);

      const searchTime = Date.now() - startTime;

      // Update state with results
      setSearchResults(results);
      setSearchState(prev => ({
        ...prev,
        resultCount: results.length,
        searchTime,
        lastSearchTimestamp: new Date(),
      }));

      console.log(`Search completed in ${searchTime}ms, found ${results.length} results`);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const debouncedSearch = useCallback((state: SearchState) => {
    // Clear existing timer
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    // Set new timer (300ms debounce)
    searchTimerRef.current = setTimeout(() => {
      performSearch(state);
    }, 300);
  }, [performSearch]);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleQueryChange = useCallback((text: string) => {
    const normalizedQuery = text.toLowerCase().trim();
    const tokens = normalizedQuery
      .split(/\s+/)
      .filter(token => token.length >= 2);

    const newState: SearchState = {
      ...searchState,
      query: text,
      normalizedQuery,
      queryTokens: tokens,
    };

    setSearchState(newState);
    debouncedSearch(newState);
  }, [searchState, debouncedSearch]);

  const handleQuickFilterToggle = useCallback((filterId: string) => {
    const quickFilter = QUICK_FILTERS.find(f => f.id === filterId);
    if (!quickFilter) return;

    setActiveQuickFilters(prev => {
      const newSet = new Set(prev);

      if (newSet.has(filterId)) {
        // Remove filter
        newSet.delete(filterId);
      } else {
        // Add filter
        newSet.add(filterId);
      }

      return newSet;
    });

    // Apply or remove filter
    let newFilters = { ...searchState.filters };

    if (activeQuickFilters.has(filterId)) {
      // Remove filter - reset to defaults
      newFilters = DEFAULT_FILTERS;
    } else {
      // Apply filter
      newFilters = quickFilter.applyFilter(newFilters);
    }

    const newState: SearchState = {
      ...searchState,
      filters: newFilters,
    };

    setSearchState(newState);
    performSearch(newState);
  }, [searchState, activeQuickFilters, performSearch]);

  const handleSortChange = useCallback((sortBy: SortBy) => {
    const newDirection: SortDirection =
      searchState.sortBy === sortBy && searchState.sortDirection === 'desc'
        ? 'asc'
        : 'desc';

    const newState: SearchState = {
      ...searchState,
      sortBy,
      sortDirection: newDirection,
    };

    setSearchState(newState);
    performSearch(newState);
  }, [searchState, performSearch]);

  const handleClearSearch = useCallback(() => {
    const newState: SearchState = {
      ...DEFAULT_SEARCH_STATE,
    };

    setSearchState(newState);
    setActiveQuickFilters(new Set());
    performSearch(newState);

    searchInputRef.current?.clear();
  }, [performSearch]);

  const handleResultPress = useCallback((result: SearchResult) => {
    navigation.navigate('CiderDetail', { ciderId: result.cider.id });
  }, [navigation]);

  const handleFilterPress = useCallback(() => {
    setShowFilterModal(true);
  }, []);

  const handleApplyFilters = useCallback((filters: FilterState) => {
    const newState: SearchState = {
      ...searchState,
      filters,
    };

    setSearchState(newState);
    performSearch(newState);
    setShowFilterModal(false);
  }, [searchState, performSearch]);

  // =============================================================================
  // RENDER FUNCTIONS
  // =============================================================================

  const renderSearchHeader = () => (
    <View style={styles.searchHeader}>
      {/* Search Input */}
      <View style={styles.searchInputContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder="Search ciders, brands, styles..."
          placeholderTextColor="#999"
          value={searchState.query}
          onChangeText={handleQueryChange}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {searchState.query.length > 0 && (
          <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.quickFiltersContainer}
        contentContainerStyle={styles.quickFiltersContent}
      >
        {QUICK_FILTERS.map(filter => {
          const isActive = activeQuickFilters.has(filter.id);
          return (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.quickFilterPill,
                isActive && styles.quickFilterPillActive,
              ]}
              onPress={() => handleQuickFilterToggle(filter.id)}
            >
              <Text style={styles.quickFilterIcon}>{filter.icon}</Text>
              <Text style={[
                styles.quickFilterText,
                isActive && styles.quickFilterTextActive,
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Search Stats and Controls */}
      <View style={styles.statsRow}>
        <View style={styles.statsLeft}>
          <Text style={styles.resultCount}>
            {searchResults.length} result{searchResults.length === 1 ? '' : 's'}
          </Text>
          {searchState.searchTime > 0 && (
            <Text style={styles.searchTime}>
              ({searchState.searchTime}ms)
            </Text>
          )}
        </View>

        <View style={styles.controlsRight}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={handleFilterPress}
          >
            <Text style={styles.filterButtonIcon}>⚙️</Text>
            <Text style={styles.filterButtonText}>Filters</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => handleSortChange(searchState.sortBy)}
          >
            <Text style={styles.sortButtonText}>
              {searchState.sortBy} {searchState.sortDirection === 'desc' ? '↓' : '↑'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderSearchResult = useCallback(({ item }: { item: SearchResult }) => {
    const { cider, relevanceScore, matchedFields } = item;

    return (
      <TouchableOpacity
        style={styles.resultCard}
        onPress={() => handleResultPress(item)}
        activeOpacity={0.7}
      >
        {/* Cider Info */}
        <View style={styles.resultHeader}>
          <View style={styles.resultTitleRow}>
            <Text style={styles.resultName} numberOfLines={1}>
              {cider.name}
            </Text>
            {cider.overallRating && (
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>⭐ {cider.overallRating}</Text>
              </View>
            )}
          </View>
          <Text style={styles.resultBrand} numberOfLines={1}>
            {cider.brand}
          </Text>
        </View>

        {/* Cider Details */}
        <View style={styles.resultDetails}>
          {cider.abv && (
            <View style={styles.detailChip}>
              <Text style={styles.detailText}>{cider.abv}% ABV</Text>
            </View>
          )}
          {cider.traditionalStyle && (
            <View style={styles.detailChip}>
              <Text style={styles.detailText}>{cider.traditionalStyle}</Text>
            </View>
          )}
          {cider.sweetness && (
            <View style={styles.detailChip}>
              <Text style={styles.detailText}>{cider.sweetness}</Text>
            </View>
          )}
        </View>

        {/* Matched Fields */}
        {matchedFields.length > 0 && (
          <View style={styles.matchedFieldsContainer}>
            {matchedFields.slice(0, 2).map((match, index) => (
              <View key={index} style={styles.matchBadge}>
                <Text style={styles.matchText}>
                  {match.matchType === 'exact' ? '✓' : '≈'} {match.field}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Relevance Score (dev mode) */}
        {__DEV__ && (
          <Text style={styles.debugScore}>
            Score: {relevanceScore.toFixed(2)}
          </Text>
        )}
      </TouchableOpacity>
    );
  }, [handleResultPress]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🔍</Text>
      <Text style={styles.emptyTitle}>
        {searchState.query.length > 0 ? 'No Results Found' : 'Start Searching'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchState.query.length > 0
          ? 'Try adjusting your search or filters'
          : 'Enter a search query or use quick filters'}
      </Text>
      {searchState.query.length > 0 && (
        <TouchableOpacity
          style={styles.clearFiltersButton}
          onPress={handleClearSearch}
        >
          <Text style={styles.clearFiltersText}>Clear Search</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#D4A574" />
      <Text style={styles.loadingText}>Searching...</Text>
    </View>
  );

  // =============================================================================
  // MAIN RENDER
  // =============================================================================

  return (
    <SafeAreaContainer style={styles.container}>
      {renderSearchHeader()}

      {isSearching ? (
        renderLoadingState()
      ) : searchResults.length === 0 ? (
        renderEmptyState()
      ) : (
        <Animated.View style={[styles.resultsContainer, { opacity: fadeAnim }]}>
          <FlashList
            data={searchResults}
            renderItem={renderSearchResult}
            estimatedItemSize={120}
            keyExtractor={(item) => item.cider.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.resultsList}
          />
        </Animated.View>
      )}

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        currentFilters={searchState.filters}
        onApply={handleApplyFilters}
        onClose={() => setShowFilterModal(false)}
      />
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
  searchHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    fontSize: 20,
    color: '#999',
  },
  quickFiltersContainer: {
    maxHeight: 50,
    marginBottom: 12,
  },
  quickFiltersContent: {
    paddingRight: 16,
  },
  quickFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  quickFilterPillActive: {
    backgroundColor: '#D4A574',
    borderColor: '#D4A574',
  },
  quickFilterIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  quickFilterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  quickFilterTextActive: {
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  searchTime: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  controlsRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  filterButtonIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  filterButtonText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  sortButton: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sortButtonText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  resultsContainer: {
    flex: 1,
  },
  resultsList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  resultHeader: {
    marginBottom: 8,
  },
  resultTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  ratingBadge: {
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F57C00',
  },
  resultBrand: {
    fontSize: 14,
    color: '#666',
  },
  resultDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  detailChip: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
  },
  matchedFieldsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  matchBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  matchText: {
    fontSize: 10,
    color: '#2E7D32',
    fontWeight: '500',
  },
  debugScore: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyState: {
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
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  clearFiltersButton: {
    backgroundColor: '#D4A574',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
});
