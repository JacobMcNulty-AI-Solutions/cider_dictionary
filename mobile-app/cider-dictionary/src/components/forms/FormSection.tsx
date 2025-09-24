// Form Section Component with Collapsible Support
// Used for organizing form fields into logical groups

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager
} from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  required?: boolean;
  completionPercentage?: number;
}

const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  collapsible = false,
  defaultExpanded = true,
  required = false,
  completionPercentage
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => {
    if (!collapsible) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const getStatusColor = () => {
    if (!completionPercentage) return '#666';
    if (completionPercentage === 100) return '#4CAF50';
    if (completionPercentage >= 50) return '#FF9800';
    return '#F44336';
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpanded}
        disabled={!collapsible}
        activeOpacity={collapsible ? 0.7 : 1}
      >
        <View style={styles.titleRow}>
          <Text style={[styles.title, required && styles.requiredTitle]}>
            {title}
            {required && <Text style={styles.asterisk}> *</Text>}
          </Text>

          {completionPercentage !== undefined && (
            <View style={styles.progressContainer}>
              <Text style={[styles.progressText, { color: getStatusColor() }]}>
                {Math.round(completionPercentage)}%
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${completionPercentage}%`,
                      backgroundColor: getStatusColor()
                    }
                  ]}
                />
              </View>
            </View>
          )}

          {collapsible && (
            <Text style={styles.chevron}>
              {isExpanded ? '▼' : '▶'}
            </Text>
          )}
        </View>

        {description && (
          <Text style={styles.description}>{description}</Text>
        )}
      </TouchableOpacity>

      {isExpanded && (
        <Animated.View style={styles.content}>
          {children}
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  requiredTitle: {
    color: '#1976D2',
  },
  asterisk: {
    color: '#F44336',
    fontSize: 18,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
    marginRight: 8,
    minWidth: 30,
    textAlign: 'right',
  },
  progressBar: {
    width: 40,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  chevron: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    lineHeight: 20,
  },
  content: {
    padding: 16,
    paddingTop: 8,
  },
});

export default FormSection;