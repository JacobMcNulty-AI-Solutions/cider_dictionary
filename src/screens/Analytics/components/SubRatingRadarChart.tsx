import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import RadarChart from './RadarChart';
import { SubRatingAverages } from '../../../types/analytics';

interface Props {
  averages: SubRatingAverages;
}

const { width: screenWidth } = Dimensions.get('window');

export default function SubRatingRadarChart({ averages }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sub-rating Averages</Text>
      {averages.hasEnoughData ? (
        <>
          <RadarChart
            labels={['Appearance', 'Aroma', 'Taste', 'Mouthfeel']}
            values={[averages.appearance, averages.aroma, averages.taste, averages.mouthfeel]}
            maxValue={10}
            size={Math.min(screenWidth - 64, 260)}
          />
          <View style={styles.legend}>
            <Text style={styles.legendRow}>
              Appearance: <Text style={styles.legendValue}>{averages.appearance.toFixed(1)}/10</Text>
            </Text>
            <Text style={styles.legendRow}>
              Aroma: <Text style={styles.legendValue}>{averages.aroma.toFixed(1)}/10</Text>
            </Text>
            <Text style={styles.legendRow}>
              Taste: <Text style={styles.legendValue}>{averages.taste.toFixed(1)}/10</Text>
            </Text>
            <Text style={styles.legendRow}>
              Mouthfeel: <Text style={styles.legendValue}>{averages.mouthfeel.toFixed(1)}/10</Text>
            </Text>
          </View>
          <Text style={styles.caption}>
            Based on {averages.sampleCount} experience
            {averages.sampleCount === 1 ? '' : 's'} with all 4 sub-ratings.
          </Text>
        </>
      ) : (
        <Text style={styles.emptyText}>
          Add appearance, aroma, taste, and mouthfeel to at least 3 experiences to see this chart.
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
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  legend: {
    alignSelf: 'stretch',
    marginTop: 12,
  },
  legendRow: {
    fontSize: 13,
    color: '#555',
    paddingVertical: 3,
  },
  legendValue: {
    fontWeight: '600',
    color: '#007AFF',
  },
  caption: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
