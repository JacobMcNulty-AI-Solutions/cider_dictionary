import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RatingConsistencyResult } from '../../../types/analytics';

interface Props {
  result: RatingConsistencyResult;
}

const MAX_ROWS = 10;

export default function RatingConsistencyList({ result }: Props) {
  if (result.rows.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Rating Consistency</Text>
        <Text style={styles.subtitle}>Ciders you've tried more than once</Text>
        <Text style={styles.emptyText}>
          Try the same cider more than once to see consistency scores.
        </Text>
      </View>
    );
  }

  const displayed = result.rows.slice(0, MAX_ROWS);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rating Consistency</Text>
      <Text style={styles.subtitle}>Ciders you've tried more than once</Text>
      <Text style={styles.summary}>
        {result.highVarianceCount} cider{result.highVarianceCount === 1 ? '' : 's'} show inconsistent
        ratings (std dev ≥ 2)
      </Text>
      {displayed.map(row => (
        <View key={row.cider.id} style={styles.row}>
          <View style={styles.rowMain}>
            <Text style={styles.rowName} numberOfLines={1}>
              {row.cider.name}
            </Text>
            <Text style={styles.rowBrand}>{row.cider.brand}</Text>
          </View>
          <View style={styles.rowStats}>
            <Text style={styles.rowMeta}>
              {row.experienceCount} tries · avg {row.avgRating.toFixed(1)} · σ {row.ratingStdDev.toFixed(1)}
            </Text>
            {row.isHighVariance && (
              <Ionicons name="warning" size={14} color="#FF9500" style={styles.warnIcon} />
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  subtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    marginBottom: 8,
  },
  summary: {
    fontSize: 13,
    color: '#555',
    marginBottom: 12,
  },
  row: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  rowMain: {
    marginBottom: 4,
  },
  rowName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  rowBrand: {
    fontSize: 12,
    color: '#666',
    marginTop: 1,
  },
  rowStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowMeta: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  warnIcon: {
    marginLeft: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
});
