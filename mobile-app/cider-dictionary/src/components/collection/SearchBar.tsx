// Enhanced Search Bar Component
// Advanced search functionality with filters and suggestions

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { useCiderStore } from '../../store/ciderStore';

interface SearchBarProps {
  placeholder?: string;
  onSearchChange?: (query: string) => void;
  showFilters?: boolean;
  onFiltersPress?: () => void;
  autoFocus?: boolean;
}

interface SearchFilters {
  abvMin?: number;
  abvMax?: number;
  ratingMin?: number;
  ratingMax?: number;
  brands?: string[];
  styles?: string[];
  venues?: string[];
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search your collection...',
  onSearchChange,
  showFilters = true,
  onFiltersPress,
  autoFocus = false
}) => {
  const { searchQuery, setSearchQuery } = useCiderStore();
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Debounced search
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setShowSuggestions(true);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [fadeAnim]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);

    // Delay hiding suggestions to allow for tap events
    setTimeout(() => setShowSuggestions(false), 150);

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [fadeAnim]);

  const handleSearchChange = useCallback((text: string) => {
    setLocalQuery(text);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(text);
      onSearchChange?.(text);
    }, 300);
  }, [setSearchQuery, onSearchChange]);

  const handleClear = useCallback(() => {
    setLocalQuery('');
    setSearchQuery('');
    onSearchChange?.('');
    inputRef.current?.blur();
  }, [setSearchQuery, onSearchChange]);

  const handleSuggestionPress = useCallback((suggestion: string) => {
    setLocalQuery(suggestion);
    setSearchQuery(suggestion);
    onSearchChange?.(suggestion);
    setShowSuggestions(false);
    inputRef.current?.blur();
  }, [setSearchQuery, onSearchChange]);

  const handleFiltersPress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setShowFiltersModal(true);
    onFiltersPress?.();
  }, [scaleAnim, onFiltersPress]);

  // Mock suggestions - in real app, these would come from store
  const suggestions = [
    'Angry Orchard',
    'Strongbow',
    'Traditional English',
    'Perry',
    'High ABV (>8%)',
    'Recent additions'
  ];

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <>
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.searchContainer,
            {
              borderColor: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['#e0e0e0', '#2196F3'],
              }),
            },
          ]}
        >
          <View style={styles.searchIconContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
          </View>

          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={localQuery}
            onChangeText={handleSearchChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            placeholderTextColor="#999"
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus={autoFocus}
          />

          {localQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClear}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}

          {showFilters && (
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <TouchableOpacity
                style={[
                  styles.filtersButton,
                  hasActiveFilters && styles.filtersButtonActive
                ]}
                onPress={handleFiltersPress}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text
                  style={[
                    styles.filtersIcon,
                    hasActiveFilters && styles.filtersIconActive
                  ]}
                >
                  ⚙️
                </Text>
                {hasActiveFilters && <View style={styles.filterBadge} />}
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>

        {/* Search Suggestions */}
        {showSuggestions && isFocused && localQuery.length >= 2 && (
          <Animated.View
            style={[
              styles.suggestionsContainer,
              { opacity: fadeAnim }
            ]}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {suggestions
                .filter(suggestion =>
                  suggestion.toLowerCase().includes(localQuery.toLowerCase())
                )
                .slice(0, 5)
                .map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionItem}
                    onPress={() => handleSuggestionPress(suggestion)}
                  >
                    <Text style={styles.suggestionIcon}>🔍</Text>
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))
              }
            </ScrollView>
          </Animated.View>
        )}
      </View>

      {/* Filters Modal */}
      <Modal
        visible={showFiltersModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFiltersModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowFiltersModal(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Search Filters</Text>

            <TouchableOpacity
              style={styles.modalApplyButton}
              onPress={() => setShowFiltersModal(false)}
            >
              <Text style={styles.modalApplyText}>Apply</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* ABV Range */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>ABV Range</Text>
              <View style={styles.rangeContainer}>
                <TextInput
                  style={styles.rangeInput}
                  placeholder="Min"
                  keyboardType="decimal-pad"
                  value={filters.abvMin?.toString() || ''}
                  onChangeText={(text) => {
                    const value = parseFloat(text) || undefined;
                    setFilters(prev => ({ ...prev, abvMin: value }));
                  }}
                />
                <Text style={styles.rangeSeparator}>to</Text>
                <TextInput
                  style={styles.rangeInput}
                  placeholder="Max"
                  keyboardType="decimal-pad"
                  value={filters.abvMax?.toString() || ''}
                  onChangeText={(text) => {
                    const value = parseFloat(text) || undefined;
                    setFilters(prev => ({ ...prev, abvMax: value }));
                  }}
                />
              </View>
            </View>

            {/* Rating Range */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Rating Range</Text>
              <View style={styles.rangeContainer}>
                <TextInput
                  style={styles.rangeInput}
                  placeholder="Min"
                  keyboardType="number-pad"
                  value={filters.ratingMin?.toString() || ''}
                  onChangeText={(text) => {
                    const value = parseInt(text) || undefined;
                    setFilters(prev => ({ ...prev, ratingMin: value }));
                  }}
                />
                <Text style={styles.rangeSeparator}>to</Text>
                <TextInput
                  style={styles.rangeInput}
                  placeholder="Max"
                  keyboardType="number-pad"
                  value={filters.ratingMax?.toString() || ''}
                  onChangeText={(text) => {
                    const value = parseInt(text) || undefined;
                    setFilters(prev => ({ ...prev, ratingMax: value }));
                  }}
                />
              </View>
            </View>

            {/* Quick Filters */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Quick Filters</Text>
              <View style={styles.quickFilters}>
                {[
                  { label: 'High Rated (8+)', action: () => setFilters(prev => ({ ...prev, ratingMin: 8 })) },
                  { label: 'Strong (>7% ABV)', action: () => setFilters(prev => ({ ...prev, abvMin: 7 })) },
                  { label: 'Recent', action: () => {/* TODO: Implement recent filter */} },
                  { label: 'Favorites', action: () => {/* TODO: Implement favorites filter */} },
                ].map((filter, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.quickFilterButton}
                    onPress={filter.action}
                  >
                    <Text style={styles.quickFilterText}>{filter.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Clear Filters */}
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={() => setFilters({})}
            >
              <Text style={styles.clearFiltersText}>Clear All Filters</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchIconContainer: {
    paddingRight: 8,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearIcon: {
    fontSize: 14,
    color: '#666',
  },
  filtersButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 6,
    position: 'relative',
  },
  filtersButtonActive: {
    backgroundColor: '#e3f2fd',
  },
  filtersIcon: {
    fontSize: 16,
  },
  filtersIconActive: {
    color: '#1976D2',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F44336',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
    maxHeight: 200,
    zIndex: 1001,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionIcon: {
    fontSize: 14,
    marginRight: 12,
    opacity: 0.6,
  },
  suggestionText: {
    fontSize: 15,
    color: '#333',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalCancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modalButtonText: {
    fontSize: 16,
    color: '#666',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalApplyButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modalApplyText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  filterSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  rangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rangeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  rangeSeparator: {
    marginHorizontal: 12,
    fontSize: 16,
    color: '#666',
  },
  quickFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickFilterButton: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  quickFilterText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
  },
  clearFiltersButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  clearFiltersText: {
    fontSize: 16,
    color: '#F44336',
    fontWeight: '500',
  },
});

export default SearchBar;