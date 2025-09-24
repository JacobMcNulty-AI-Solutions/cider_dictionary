// Progress Header Component
// Shows completion progress and elapsed time for form entry

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions
} from 'react-native';
import { DisclosureLevel, DISCLOSURE_CONFIGS } from '../../types/cider';

interface ProgressHeaderProps {
  level: DisclosureLevel;
  elapsedTime: number;
  completionPercentage: number;
  canSubmit: boolean;
  onLevelExpand?: (newLevel: DisclosureLevel) => void;
}

const ProgressHeader: React.FC<ProgressHeaderProps> = ({
  level,
  elapsedTime,
  completionPercentage,
  canSubmit,
  onLevelExpand
}) => {
  const [progressAnim] = useState(new Animated.Value(0));
  const targetTime = DISCLOSURE_CONFIGS[level].targetTime;
  const isOnTrack = elapsedTime <= targetTime;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: completionPercentage,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [completionPercentage]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  const getTimeColor = () => {
    const ratio = elapsedTime / targetTime;
    if (ratio <= 0.8) return '#4CAF50';
    if (ratio <= 1.0) return '#FF9800';
    return '#F44336';
  };

  const getProgressColor = () => {
    if (completionPercentage === 100) return '#4CAF50';
    if (completionPercentage >= 50) return '#2196F3';
    return '#FF9800';
  };

  const getLevelDescription = () => {
    switch (level) {
      case 'casual':
        return 'Quick 30-second entry';
      case 'enthusiast':
        return 'Detailed 2-minute entry';
      case 'expert':
        return 'Complete 5-minute entry';
      default:
        return '';
    }
  };

  const canExpandToNext = () => {
    return (level === 'casual' && completionPercentage >= 75) ||
           (level === 'enthusiast' && completionPercentage >= 75);
  };

  const getNextLevel = (): DisclosureLevel | null => {
    if (level === 'casual') return 'enthusiast';
    if (level === 'enthusiast') return 'expert';
    return null;
  };

  const screenWidth = Dimensions.get('window').width;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.levelInfo}>
          <Text style={styles.levelTitle}>
            {level.charAt(0).toUpperCase() + level.slice(1)} Entry
          </Text>
          <Text style={styles.levelDescription}>{getLevelDescription()}</Text>
        </View>

        <View style={styles.timeInfo}>
          <Text style={[styles.timeText, { color: getTimeColor() }]}>
            {formatTime(elapsedTime)}
          </Text>
          <Text style={styles.targetTime}>
            / {formatTime(targetTime)}
          </Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBarBackground}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
                backgroundColor: getProgressColor(),
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {Math.round(completionPercentage)}% Complete
        </Text>
      </View>

      {canSubmit && (
        <View style={styles.statusRow}>
          <View style={styles.readyIndicator} />
          <Text style={styles.readyText}>Ready to submit</Text>
        </View>
      )}

      {canExpandToNext() && !canSubmit && onLevelExpand && (
        <View style={styles.expandRow}>
          <Text style={styles.expandText}>
            Want to add more details?
          </Text>
          <Text
            style={styles.expandButton}
            onPress={() => {
              const nextLevel = getNextLevel();
              if (nextLevel) onLevelExpand(nextLevel);
            }}
          >
            Expand to {getNextLevel()}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  levelDescription: {
    fontSize: 14,
    color: '#666',
  },
  timeInfo: {
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  targetTime: {
    fontSize: 12,
    color: '#999',
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  readyIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  readyText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  expandText: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  expandButton: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});

export default ProgressHeader;