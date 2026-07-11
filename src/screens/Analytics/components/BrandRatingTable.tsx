import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BrandRatingRow } from '../../../types/analytics';

interface Props {
  rows: BrandRatingRow[];
}

const INITIAL_LIMIT = 20;

function truncate(str: string, max: number): string {
  return str.length > max ? `${str.slice(0, max - 1)}…` : str;
}

export default function BrandRatingTable({ rows }: Props) {
  const [showAll, setShowAll] = useState(false);

  if (rows.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Brand Rating</Text>
        <Text style={styles.emptyText}>
          No brand ratings yet — log some tastings to rank your producers.
        </Text>
      </View>
    );
  }

  const displayed = showAll ? rows : rows.slice(0, INITIAL_LIMIT);
  const canExpand = rows.length > INITIAL_LIMIT;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Brand Rating</Text>
      <Text style={styles.subtitle}>Producers ranked by your average rating.</Text>

      <View style={styles.header}>
        <Text style={[styles.headerCell, styles.rankCol]}>#</Text>
        <Text style={[styles.headerCell, styles.brandCol]}>Brand</Text>
        <Text style={[styles.headerCell, styles.ratingCol]}>Avg</Text>
        <Text style={[styles.headerCell, styles.numCol]}>Ciders</Text>
        <Text style={[styles.headerCell, styles.numCol]}>Tastings</Text>
      </View>

      {displayed.map((row, idx) => (
        <View
          key={row.brand}
          style={[styles.row, idx % 2 === 1 && styles.rowAlt]}
        >
          <Text style={[styles.cell, styles.rankCol]}>{idx + 1}</Text>
          <Text style={[styles.cell, styles.brandCol]} numberOfLines={1}>
            {truncate(row.brand, 20)}
          </Text>
          <Text style={[styles.cell, styles.ratingCol, styles.ratingText]}>
            {row.avgRating.toFixed(1)}
          </Text>
          <Text style={[styles.cell, styles.numCol]}>{row.ciderCount}</Text>
          <Text style={[styles.cell, styles.numCol]}>{row.experienceCount}</Text>
        </View>
      ))}

      {canExpand && (
        <TouchableOpacity
          style={styles.toggle}
          onPress={() => setShowAll(v => !v)}
        >
          <Text style={styles.toggleText}>
            {showAll ? 'Show top 20' : `Show all (${rows.length})`}
          </Text>
        </TouchableOpacity>
      )}
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
  header: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerCell: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  rowAlt: {
    backgroundColor: '#FAFAFA',
  },
  cell: {
    fontSize: 13,
    color: '#333',
  },
  rankCol: {
    width: 28,
  },
  brandCol: {
    flex: 1,
    paddingRight: 8,
  },
  ratingCol: {
    width: 44,
    textAlign: 'right',
  },
  numCol: {
    width: 60,
    textAlign: 'right',
  },
  ratingText: {
    fontWeight: '600',
    color: '#007AFF',
  },
  toggle: {
    marginTop: 12,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
  },
});
