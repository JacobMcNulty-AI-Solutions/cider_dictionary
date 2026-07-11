import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { TagRatingHeatmapData, TagRatingHeatmapRow } from '../../../types/analytics';
import { HIGH_RATING_THRESHOLD } from '../../../services/analytics/analyticsConstants';

interface Props {
  data: TagRatingHeatmapData;
}

const SENTIMENT_DOT: Record<TagRatingHeatmapRow['sentiment'], string> = {
  positive: '#4CAF50',
  negative: '#E53935',
  neutral: '#B0B0B0',
};

function cellColor(count: number, maxCount: number, base: 'high' | 'low'): string {
  const opacity = maxCount > 0 ? Math.max(0.1, count / maxCount) : 0.1;
  return base === 'high'
    ? `rgba(0, 180, 0, ${opacity})`
    : `rgba(220, 0, 0, ${opacity})`;
}

export default function TagHeatmapGrid({ data }: Props) {
  if (!data.hasEnoughData) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Tag Sentiment Heatmap</Text>
        <Text style={styles.emptyText}>
          Add taste tags to your ciders to see which flavours you associate with quality.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tag Sentiment Heatmap</Text>
      <Text style={styles.subtitle}>
        {data.rows.length} tags analysed · Liked = experience rated {HIGH_RATING_THRESHOLD}+
      </Text>
      <ScrollView style={styles.scroll}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerCell, styles.tagCol]}>Tag</Text>
          <Text style={[styles.headerCell, styles.numCol]}>Liked</Text>
          <Text style={[styles.headerCell, styles.numCol]}>Disliked</Text>
        </View>
        {data.rows.map(row => (
          <View key={row.tag} style={styles.row}>
            <View style={[styles.tagCol, styles.tagCell]}>
              <View style={[styles.dot, { backgroundColor: SENTIMENT_DOT[row.sentiment] }]} />
              <Text style={styles.tagText} numberOfLines={1}>
                {row.tag}
              </Text>
            </View>
            <View
              style={[
                styles.numCol,
                styles.countCell,
                { backgroundColor: cellColor(row.highRatedCount, data.maxCount, 'high') },
              ]}
            >
              <Text style={styles.countText}>{row.highRatedCount}</Text>
            </View>
            <View
              style={[
                styles.numCol,
                styles.countCell,
                { backgroundColor: cellColor(row.lowRatedCount, data.maxCount, 'low') },
              ]}
            >
              <Text style={styles.countText}>{row.lowRatedCount}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
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
  scroll: {
    maxHeight: 400,
  },
  headerRow: {
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
    paddingVertical: 4,
    alignItems: 'center',
  },
  tagCol: {
    flex: 1,
    paddingRight: 8,
  },
  numCol: {
    width: 70,
    marginLeft: 4,
  },
  tagCell: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  tagText: {
    fontSize: 13,
    color: '#333',
    textTransform: 'capitalize',
    flex: 1,
  },
  countCell: {
    paddingVertical: 6,
    borderRadius: 4,
    alignItems: 'center',
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
});
