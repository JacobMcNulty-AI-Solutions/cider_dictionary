/**
 * Prediction Badge Component
 *
 * Small badge component showing trend direction and confidence.
 * Used for quick trend insights without full chart visualization.
 *
 * Features:
 * - Direction icon (up/down/stable)
 * - Color coding based on direction
 * - Confidence percentage display
 * - Multiple size variants
 * - Optional label
 *
 * @module PredictionBadge
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Props for PredictionBadge component
 */
export interface PredictionBadgeProps {
  /** Trend direction */
  direction: 'increasing' | 'decreasing' | 'stable';
  /** Confidence level (0-1) */
  confidence: number;
  /** Optional label text */
  label?: string;
  /** Badge size variant */
  size?: 'small' | 'medium' | 'large';
  /** Optional custom style */
  style?: ViewStyle;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get icon name for trend direction
 */
function getDirectionIcon(
  direction: 'increasing' | 'decreasing' | 'stable'
): keyof typeof Ionicons.glyphMap {
  switch (direction) {
    case 'increasing':
      return 'trending-up';
    case 'decreasing':
      return 'trending-down';
    case 'stable':
      return 'remove';
  }
}

/**
 * Get color for trend direction
 */
function getDirectionColor(direction: 'increasing' | 'decreasing' | 'stable'): string {
  switch (direction) {
    case 'increasing':
      return '#10b981'; // Green
    case 'decreasing':
      return '#ef4444'; // Red
    case 'stable':
      return '#6b7280'; // Gray
  }
}

/**
 * Get readable direction label
 */
function getDirectionLabel(direction: 'increasing' | 'decreasing' | 'stable'): string {
  switch (direction) {
    case 'increasing':
      return 'Trending Up';
    case 'decreasing':
      return 'Trending Down';
    case 'stable':
      return 'Stable';
  }
}

/**
 * Get confidence quality label
 */
function getConfidenceQuality(confidence: number): string {
  if (confidence >= 0.9) return 'Excellent';
  if (confidence >= 0.7) return 'Good';
  if (confidence >= 0.5) return 'Fair';
  return 'Low';
}

/**
 * Get size-specific dimensions
 */
function getSizeDimensions(size: 'small' | 'medium' | 'large') {
  switch (size) {
    case 'small':
      return {
        iconSize: 16,
        fontSize: 11,
        badgeFontSize: 10,
        padding: 6,
        gap: 4,
      };
    case 'large':
      return {
        iconSize: 24,
        fontSize: 16,
        badgeFontSize: 14,
        padding: 12,
        gap: 8,
      };
    case 'medium':
    default:
      return {
        iconSize: 20,
        fontSize: 14,
        badgeFontSize: 12,
        padding: 8,
        gap: 6,
      };
  }
}

// ============================================================================
// PredictionBadge Component
// ============================================================================

/**
 * PredictionBadge component for displaying trend info
 *
 * @example
 * <PredictionBadge
 *   direction="increasing"
 *   confidence={0.85}
 *   label="Collection Growth"
 *   size="medium"
 * />
 */
export function PredictionBadge({
  direction,
  confidence,
  label,
  size = 'medium',
  style,
}: PredictionBadgeProps) {
  const color = getDirectionColor(direction);
  const icon = getDirectionIcon(direction);
  const directionLabel = getDirectionLabel(direction);
  const confidencePercent = Math.round(confidence * 100);
  const confidenceQuality = getConfidenceQuality(confidence);
  const dims = getSizeDimensions(size);

  return (
    <View style={[styles.container, style]}>
      {/* Label */}
      {label && (
        <Text style={[styles.label, { fontSize: dims.fontSize }]}>{label}</Text>
      )}

      {/* Badge */}
      <View
        style={[
          styles.badge,
          {
            backgroundColor: `${color}15`,
            padding: dims.padding,
            gap: dims.gap,
          },
        ]}
      >
        {/* Direction Icon & Text */}
        <View style={styles.directionRow}>
          <Ionicons name={icon} size={dims.iconSize} color={color} />
          <Text
            style={[
              styles.directionText,
              { color, fontSize: dims.fontSize, fontWeight: '600' },
            ]}
          >
            {directionLabel}
          </Text>
        </View>

        {/* Confidence */}
        <View style={styles.confidenceRow}>
          <View style={styles.confidenceInfo}>
            <Text style={[styles.confidencePercent, { fontSize: dims.badgeFontSize }]}>
              {confidencePercent}%
            </Text>
            <Text style={[styles.confidenceQuality, { fontSize: dims.badgeFontSize - 2 }]}>
              {confidenceQuality}
            </Text>
          </View>

          {/* Confidence Bar */}
          <View style={styles.confidenceBarSmall}>
            <View
              style={[
                styles.confidenceBarFillSmall,
                {
                  width: `${confidencePercent}%`,
                  backgroundColor:
                    confidence >= 0.7
                      ? '#10b981'
                      : confidence >= 0.4
                      ? '#f59e0b'
                      : '#ef4444',
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Subtitle */}
      {size !== 'small' && (
        <Text style={[styles.subtitle, { fontSize: dims.badgeFontSize }]}>
          {confidence >= 0.7
            ? 'High reliability trend'
            : confidence >= 0.4
            ? 'Moderate reliability trend'
            : 'Low reliability trend'}
        </Text>
      )}
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  label: {
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  badge: {
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  directionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  directionText: {
    fontWeight: '600',
  },
  confidenceRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  confidenceInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  confidencePercent: {
    fontWeight: '700',
    color: '#374151',
  },
  confidenceQuality: {
    color: '#6b7280',
    fontWeight: '500',
  },
  confidenceBarSmall: {
    flex: 1,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
  },
  confidenceBarFillSmall: {
    height: '100%',
    borderRadius: 2,
  },
  subtitle: {
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default PredictionBadge;
