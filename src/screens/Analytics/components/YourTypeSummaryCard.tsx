import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { YourTypeSummary } from '../../../types/analytics';
import { HIGH_RATING_THRESHOLD } from '../../../services/analytics/analyticsConstants';

interface Props {
  summary: YourTypeSummary;
}

export default function YourTypeSummaryCard({ summary }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Your Taste Profile</Text>
      {summary.hasEnoughData ? (
        <Text style={styles.body}>{summary.sentence}</Text>
      ) : (
        <Text style={styles.emptyBody}>
          Log at least 3 experiences with a rating of {HIGH_RATING_THRESHOLD}+ to see your taste profile.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  emptyBody: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 20,
  },
});
