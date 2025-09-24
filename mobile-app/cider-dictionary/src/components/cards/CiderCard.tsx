import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BasicCiderRecord } from '../../types/cider';

interface Props {
  cider: BasicCiderRecord;
  onPress?: (cider: BasicCiderRecord) => void;
}

export default function CiderCard({ cider, onPress }: Props) {
  const renderStars = (rating: number, maxRating: number = 10) => {
    const stars = [];
    const filledStars = Math.floor(rating);

    for (let i = 0; i < Math.min(5, maxRating); i++) {
      const starRating = (i + 1) * (maxRating / 5);
      stars.push(
        <Ionicons
          key={i}
          name={rating >= starRating ? 'star' : 'star-outline'}
          size={16}
          color={rating >= starRating ? '#FFD700' : '#DDD'}
        />
      );
    }
    return stars;
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(cider)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>
          {cider.name}
        </Text>
        <Text style={styles.brand} numberOfLines={1}>
          {cider.brand}
        </Text>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>ABV:</Text>
          <Text style={styles.detailValue}>{cider.abv}%</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Rating:</Text>
          <View style={styles.ratingContainer}>
            <View style={styles.stars}>
              {renderStars(cider.overallRating)}
            </View>
            <Text style={styles.ratingText}>
              {cider.overallRating}/10
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.date}>
        Added {cider.createdAt.toLocaleDateString()}
      </Text>
    </TouchableOpacity>
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginBottom: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  brand: {
    fontSize: 16,
    color: '#666',
  },
  details: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
});