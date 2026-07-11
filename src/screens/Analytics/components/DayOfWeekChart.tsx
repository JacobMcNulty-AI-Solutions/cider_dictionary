import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { DayOfWeekStats } from '../../../types/analytics';

interface Props {
  stats: DayOfWeekStats;
}

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const { width: screenWidth } = Dimensions.get('window');

export default function DayOfWeekChart({ stats }: Props) {
  const totalCount = stats.days.reduce((sum, d) => sum + d.count, 0);
  if (totalCount === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Best Drinking Day</Text>
        <Text style={styles.emptyText}>No experiences yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Best Drinking Day</Text>
      <BarChart
        data={{
          labels: SHORT_DAYS,
          datasets: [{ data: stats.days.map(d => d.count) }],
        }}
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
          color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        }}
        style={styles.chart}
      />
      <Text style={styles.callout}>
        Most active: <Text style={styles.emphasis}>{stats.busiestDay.dayName}</Text>{' '}
        ({stats.busiestDay.count} experiences)
      </Text>
      {stats.highestRatedDay ? (
        <Text style={styles.callout}>
          Highest rated: <Text style={styles.emphasis}>{stats.highestRatedDay.dayName}</Text>{' '}
          (avg {stats.highestRatedDay.averageRating}/10)
        </Text>
      ) : (
        <Text style={styles.calloutMuted}>
          Not enough data per day to rank by rating yet (need 3+ logs on a day).
        </Text>
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
    marginBottom: 12,
  },
  chart: {
    borderRadius: 8,
    marginBottom: 8,
  },
  callout: {
    fontSize: 13,
    color: '#333',
    marginTop: 4,
  },
  calloutMuted: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  emphasis: {
    fontWeight: '600',
    color: '#007AFF',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
