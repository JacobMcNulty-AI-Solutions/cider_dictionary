import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NewVsRepeatStats } from '../../../types/analytics';

interface Props {
  stats: NewVsRepeatStats;
}

const MIN_TOTAL_FOR_SCORE = 15;

export default function NewVsRepeatCard({ stats }: Props) {
  if (stats.totalCount === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>New vs Revisit</Text>
        <Text style={styles.emptyText}>Log some tastings to see your explorer score.</Text>
      </View>
    );
  }

  const showScore = stats.totalCount >= MIN_TOTAL_FOR_SCORE;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>New vs Revisit</Text>
      <View style={styles.row}>
        <View style={styles.cell}>
          <Text style={styles.number}>{stats.newCount}</Text>
          <Text style={styles.label}>New Discoveries</Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.number}>{stats.repeatCount}</Text>
          <Text style={styles.label}>Revisits</Text>
        </View>
      </View>
      {showScore ? (
        <Text style={styles.callout}>
          {stats.explorerPercentage}% of your logs are first-times for that cider
        </Text>
      ) : (
        <Text style={styles.callout}>
          Log more experiences to see your explorer score
          ({stats.totalCount}/{MIN_TOTAL_FOR_SCORE})
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  cell: {
    alignItems: 'center',
  },
  number: {
    fontSize: 28,
    fontWeight: '700',
    color: '#007AFF',
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  callout: {
    fontSize: 13,
    color: '#555',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
