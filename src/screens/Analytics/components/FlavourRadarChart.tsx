import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import RadarChart from './RadarChart';
import { FlavourRadarData } from '../../../types/analytics';
import {
  SWEETNESS_SCALE,
  CARBONATION_SCALE,
  CLARITY_SCALE,
} from '../../../services/analytics/analyticsConstants';

interface Props {
  data: FlavourRadarData;
}

const { width: screenWidth } = Dimensions.get('window');

function nearestLabel(scale: Record<string, number>, avg: number): string {
  let bestLabel = '';
  let bestDist = Infinity;
  for (const [label, val] of Object.entries(scale)) {
    const dist = Math.abs(val - avg);
    if (dist < bestDist) {
      bestDist = dist;
      bestLabel = label;
    }
  }
  return bestLabel.replace(/_/g, ' ');
}

export default function FlavourRadarChart({ data }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Flavour Radar</Text>
      {data.hasEnoughData ? (
        <>
          <RadarChart
            labels={data.chartLabels}
            values={data.chartValues}
            maxValue={10}
            size={Math.min(screenWidth - 64, 260)}
            fillColor="rgba(175, 82, 222, 0.25)"
            strokeColor="rgba(175, 82, 222, 0.9)"
          />
          <View style={styles.legend}>
            <Text style={styles.legendRow}>
              Sweetness:{' '}
              <Text style={styles.legendLabel}>
                {nearestLabel(SWEETNESS_SCALE, data.sweetnessAvg)}
              </Text>{' '}
              ({data.chartValues[0].toFixed(1)} / 10 · higher = sweeter)
            </Text>
            <Text style={styles.legendRow}>
              Carbonation:{' '}
              <Text style={styles.legendLabel}>
                {nearestLabel(CARBONATION_SCALE, data.carbonationAvg)}
              </Text>{' '}
              ({data.chartValues[1].toFixed(1)} / 10 · higher = fizzier)
            </Text>
            <Text style={styles.legendRow}>
              Clarity:{' '}
              <Text style={styles.legendLabel}>
                {nearestLabel(CLARITY_SCALE, data.clarityAvg)}
              </Text>{' '}
              ({data.chartValues[2].toFixed(1)} / 10 · higher = clearer)
            </Text>
          </View>
          <Text style={styles.caption}>
            Based on {data.sampleCount} cider{data.sampleCount === 1 ? '' : 's'} with sweetness,
            carbonation, and clarity set.
          </Text>
        </>
      ) : (
        <Text style={styles.emptyText}>
          Add sweetness, carbonation, and clarity to at least 3 ciders to see your flavour radar.
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
    fontSize: 12,
    color: '#555',
    paddingVertical: 3,
    lineHeight: 18,
  },
  legendLabel: {
    fontWeight: '600',
    color: '#AF52DE',
    textTransform: 'capitalize',
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
