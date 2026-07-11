import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BrandLoyaltyRow } from '../../../types/analytics';

interface Props {
  rows: BrandLoyaltyRow[];
}

export default function BrandLoyaltyList({ rows }: Props) {
  if (rows.length < 2) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Brand Re-trial Rate</Text>
        <Text style={styles.subtitle}>
          How often you return to the same cider from each producer
        </Text>
        <Text style={styles.emptyText}>
          Log more experiences per brand (at least 5) to see re-trial patterns.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Brand Re-trial Rate</Text>
      <Text style={styles.subtitle}>
        How often you return to the same cider from each producer
      </Text>
      {rows.map((row, idx) => (
        <View key={row.brand} style={styles.row}>
          <Text style={styles.rank}>{idx + 1}</Text>
          <View style={styles.rowBody}>
            <View style={styles.rowTop}>
              <Text style={styles.brand} numberOfLines={1}>
                {row.brand}
              </Text>
              <Text style={styles.percent}>{row.loyaltyScore}%</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${row.loyaltyScore}%` }]} />
            </View>
            <Text style={styles.meta}>
              {row.totalExperiences} tastings · {row.uniqueCiders} distinct ciders
            </Text>
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
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  rank: {
    fontSize: 13,
    color: '#999',
    fontWeight: '600',
    width: 24,
    paddingTop: 2,
  },
  rowBody: {
    flex: 1,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  brand: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  percent: {
    fontSize: 14,
    fontWeight: '700',
    color: '#AF52DE',
    marginLeft: 8,
  },
  barTrack: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  barFill: {
    height: '100%',
    backgroundColor: '#AF52DE',
    borderRadius: 4,
  },
  meta: {
    fontSize: 12,
    color: '#888',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
});
