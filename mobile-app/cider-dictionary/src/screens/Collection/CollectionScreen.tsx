import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, FlatList, StyleSheet, Text, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { RootTabScreenProps } from '../../types/navigation';
import { BasicCiderRecord } from '../../types/cider';
import { AppError, ErrorHandler } from '../../utils/errors';
import SafeAreaContainer from '../../components/common/SafeAreaContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import CiderCard from '../../components/cards/CiderCard';
import { sqliteService } from '../../services/database/sqlite';

type Props = RootTabScreenProps<'Collection'>;

export default function CollectionScreen({ navigation }: Props) {
  const [ciders, setCiders] = useState<BasicCiderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadCiders = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }

      // Initialize database if needed
      await sqliteService.initializeDatabase();

      // Load all ciders
      const cidersData = await sqliteService.getAllCiders();
      setCiders(cidersData);

      console.log('Loaded ciders:', cidersData.length);
    } catch (error) {
      const appError = ErrorHandler.fromUnknown(error, 'CollectionScreen.loadCiders');
      ErrorHandler.log(appError, 'CollectionScreen.loadCiders');

      // Show user-friendly error if needed - for now just log
      console.error('Failed to load ciders:', appError.getUserMessage());
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Load ciders when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadCiders();
    }, [])
  );

  // Initial load
  useEffect(() => {
    loadCiders();
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadCiders(false);
  }, [loadCiders]);

  const handleCiderPress = useCallback((cider: BasicCiderRecord) => {
    console.log('Cider pressed:', cider.name);
    // TODO: Navigate to cider details screen in Phase 2
  }, []);

  const renderCiderCard = useCallback(({ item }: { item: BasicCiderRecord }) => (
    <CiderCard cider={item} onPress={handleCiderPress} />
  ), [handleCiderPress]);

  // Memoize empty state and header components
  const emptyStateComponent = useMemo(() => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No ciders yet!</Text>
      <Text style={styles.emptySubtitle}>
        Start building your cider collection by tapping the "Add Cider" tab.
      </Text>
      <Text style={styles.emptyHint}>
        Track your favorites and discover new ones!
      </Text>
    </View>
  ), []);

  const headerComponent = useMemo(() => {
    if (ciders.length === 0) return null;

    return (
      <View style={styles.header}>
        <Text style={styles.headerText}>
          {ciders.length} cider{ciders.length !== 1 ? 's' : ''} in your collection
        </Text>
      </View>
    );
  }, [ciders.length]);

  // Key extractor for FlatList performance
  const keyExtractor = useCallback((item: BasicCiderRecord) => item.id, []);

  if (isLoading) {
    return (
      <SafeAreaContainer>
        <LoadingSpinner message="Loading your cider collection..." />
      </SafeAreaContainer>
    );
  }

  return (
    <SafeAreaContainer>
      <FlatList
        data={ciders}
        keyExtractor={keyExtractor}
        renderItem={renderCiderCard}
        ListEmptyComponent={emptyStateComponent}
        ListHeaderComponent={headerComponent}
        contentContainerStyle={ciders.length === 0 ? styles.emptyContainer : styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
            colors={['#007AFF']}
          />
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={8}
        getItemLayout={undefined} // Let FlatList optimize automatically
      />
    </SafeAreaContainer>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  emptyHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});