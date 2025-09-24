import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  rating: number;
  onRatingChange: (rating: number) => void;
  maxRating?: number;
  label?: string;
}

export default function RatingInput({ rating, onRatingChange, maxRating = 10, label }: Props) {
  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= maxRating; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => onRatingChange(i)}
          style={styles.star}
          hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
        >
          <Ionicons
            name={i <= rating ? 'star' : 'star-outline'}
            size={24}
            color={i <= rating ? '#FFD700' : '#DDD'}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.starsContainer}>
        {renderStars()}
        <Text style={styles.ratingText}>{rating}/{maxRating}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  star: {
    marginRight: 4,
  },
  ratingText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});