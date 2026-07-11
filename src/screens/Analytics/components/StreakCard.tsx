import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StreakResult } from '../../../services/analytics/StreakAnalyzer';

interface Props {
  streaks: StreakResult;
}

export default function StreakCard({ streaks }: Props) {
  if (streaks.longestStreakWeeks === 0 && streaks.currentStreakWeeks === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Streaks</Text>
        <Text style={styles.emptyText}>No logged weeks yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Streaks</Text>
      <View style={styles.row}>
        <View style={styles.cell}>
          {streaks.currentStreakWeeks > 0 ? (
            <Text style={styles.number}>
              {streaks.currentStreakWeeks}
              <Text style={styles.unit}> {streaks.currentStreakWeeks === 1 ? 'wk' : 'wks'}</Text>
            </Text>
          ) : (
            <Text style={styles.mutedNumber}>No active streak</Text>
          )}
          <Text style={styles.label}>Current Streak</Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.number}>
            {streaks.longestStreakWeeks}
            <Text style={styles.unit}> {streaks.longestStreakWeeks === 1 ? 'wk' : 'wks'}</Text>
          </Text>
          <Text style={styles.label}>Longest Streak</Text>
        </View>
      </View>
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
    color: '#32D74B',
  },
  mutedNumber: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
  unit: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
