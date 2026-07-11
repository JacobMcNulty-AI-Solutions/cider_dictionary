import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { SeasonalStats } from '../../../types/analytics';

interface Props {
  stats: SeasonalStats;
}

const { width: screenWidth } = Dimensions.get('window');

export default function SeasonalChart({ stats }: Props) {
  const totalCount = stats.quarters.reduce((sum, q) => sum + q.count, 0);
  if (totalCount === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Seasonal Patterns</Text>
        <Text style={styles.emptyText}>No experiences yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Seasonal Patterns</Text>
      <BarChart
        data={stats.chartData as any}
        width={screenWidth - 32}
        height={200}
        yAxisLabel=""
        yAxisSuffix=""
        fromZero
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(50, 215, 75, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        }}
        style={styles.chart}
      />
      <View style={styles.legend}>
        {stats.quarters.map(q => (
          <View key={q.quarter} style={styles.legendRow}>
            <Text style={styles.legendLabel}>{q.label}:</Text>
            <Text style={styles.legendValue}>
              {q.count} experience{q.count === 1 ? '' : 's'}, avg{' '}
              {q.count > 0 ? `${q.averageRating}/10` : '—'}
            </Text>
          </View>
        ))}
      </View>
      <Text style={styles.callout}>
        Peak quarter: <Text style={styles.emphasis}>{stats.peakQuarter.label}</Text>
      </Text>
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
    marginBottom: 12,
  },
  chart: {
    borderRadius: 8,
    marginBottom: 12,
  },
  legend: {
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  legendLabel: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  legendValue: {
    fontSize: 13,
    color: '#333',
  },
  callout: {
    fontSize: 13,
    color: '#333',
    marginTop: 4,
  },
  emphasis: {
    fontWeight: '600',
    color: '#32D74B',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
