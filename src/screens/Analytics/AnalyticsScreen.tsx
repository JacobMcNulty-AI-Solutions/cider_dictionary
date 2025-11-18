/**
 * Analytics Screen - Main tabbed interface
 *
 * Features 4 tabs:
 * 1. Overview - Collection stats, value analysis, venue highlights
 * 2. Trends - Collection growth, rating trends, spending trends, ABV preferences
 * 3. Distributions - Rating, ABV, style, brand, tag, price, venue distributions
 * 4. Venues - Heat map, venue insights, top venues
 *
 * Features:
 * - Tabbed navigation with smooth transitions
 * - Shared time range selector across Overview, Trends, and Distributions
 * - Lazy loading of tab content
 * - Pull-to-refresh on each tab
 * - Proper empty states
 * - Accessibility labels
 *
 * @module AnalyticsScreen
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootTabScreenProps } from '../../types/navigation';
import SafeAreaContainer from '../../components/common/SafeAreaContainer';
import OverviewTab from './OverviewTab';
import TrendsTab from './TrendsTab';
import DistributionsTab from './DistributionsTab';
import VenuesTab from './VenuesTab';
import { TimeRange } from '../../services/analytics/AnalyticsService';
import { sqliteService } from '../../services/database/sqlite';
import { CiderMasterRecord } from '../../types/cider';
import { ExperienceLog } from '../../types/experience';

// ============================================================================
// Type Definitions
// ============================================================================

type Props = RootTabScreenProps<'Analytics'>;
type TabType = 'overview' | 'trends' | 'distributions' | 'venues';

interface TimeRangeOption {
  value: TimeRange;
  label: string;
}

interface TabConfig {
  id: TabType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
}

// ============================================================================
// Constants
// ============================================================================

const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
  { value: '6M', label: '6M' },
  { value: '1Y', label: '1Y' },
  { value: 'ALL', label: 'All' },
];

const TABS: TabConfig[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'analytics-outline',
    accessibilityLabel: 'Overview tab',
  },
  {
    id: 'trends',
    label: 'Trends',
    icon: 'trending-up',
    accessibilityLabel: 'Trends tab',
  },
  {
    id: 'distributions',
    label: 'Distributions',
    icon: 'bar-chart',
    accessibilityLabel: 'Distributions tab',
  },
  {
    id: 'venues',
    label: 'Venues',
    icon: 'map',
    accessibilityLabel: 'Venues tab',
  },
];

// ============================================================================
// Components
// ============================================================================

/**
 * Time Range Selector Component
 */
interface TimeRangeSelectorProps {
  selected: TimeRange;
  onSelect: (range: TimeRange) => void;
}

function TimeRangeSelector({ selected, onSelect }: TimeRangeSelectorProps) {
  return (
    <View style={styles.timeRangeContainer}>
      {TIME_RANGE_OPTIONS.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.timeRangeButton,
            selected === option.value && styles.timeRangeButtonActive,
          ]}
          onPress={() => onSelect(option.value)}
          accessibilityLabel={`Time range: ${option.label}`}
          accessibilityRole="button"
          accessibilityState={{ selected: selected === option.value }}
        >
          <Text
            style={[
              styles.timeRangeText,
              selected === option.value && styles.timeRangeTextActive,
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/**
 * Tab Button Component
 */
interface TabButtonProps {
  tab: TabConfig;
  isActive: boolean;
  onPress: () => void;
}

function TabButton({ tab, isActive, onPress }: TabButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.tabButtonActive]}
      onPress={onPress}
      accessibilityLabel={tab.accessibilityLabel}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
    >
      <Ionicons
        name={tab.icon}
        size={24}
        color={isActive ? '#007AFF' : '#666'}
      />
      <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
        {tab.label}
      </Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * AnalyticsScreen - Main screen with tabbed interface
 */
export default function AnalyticsScreen({ navigation }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('3M');
  const [ciders, setCiders] = useState<CiderMasterRecord[]>([]);
  const [experiences, setExperiences] = useState<ExperienceLog[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  /**
   * Load ciders and experiences from database
   */
  const loadData = useCallback(async () => {
    try {
      setIsLoadingData(true);
      const [cidersData, experiencesData] = await Promise.all([
        sqliteService.getAllCiders(),
        sqliteService.getAllExperiences(),
      ]);
      setCiders(cidersData);
      setExperiences(experiencesData);
      console.log(
        `[AnalyticsScreen] Loaded ${cidersData.length} ciders and ${experiencesData.length} experiences`
      );
    } catch (error) {
      console.error('[AnalyticsScreen] Failed to load data:', error);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  /**
   * Load data when screen comes into focus
   */
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  /**
   * Handle tab change
   */
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, []);

  /**
   * Handle time range change
   */
  const handleTimeRangeChange = useCallback((range: TimeRange) => {
    setSelectedTimeRange(range);
  }, []);

  /**
   * Render active tab content
   */
  const renderTabContent = () => {
    // For Trends and Distributions tabs, pass ciders and experiences
    // For Overview tab, it will fetch its own data via AnalyticsService
    // For Venues tab, only pass experiences
    switch (activeTab) {
      case 'overview':
        return <OverviewTab timeRange={selectedTimeRange} />;

      case 'trends':
        return (
          <TrendsTab
            ciders={ciders}
            experiences={experiences}
            timeRange={selectedTimeRange}
          />
        );

      case 'distributions':
        return (
          <DistributionsTab
            ciders={ciders}
            experiences={experiences}
            timeRange={selectedTimeRange}
          />
        );

      case 'venues':
        return <VenuesTab experiences={experiences} />;

      default:
        return null;
    }
  };

  return (
    <SafeAreaContainer>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onPress={() => handleTabChange(tab.id)}
          />
        ))}
      </View>

      {/* Time Range Selector (show for overview, trends, distributions only) */}
      {activeTab !== 'venues' && (
        <View style={styles.timeRangeWrapper}>
          <TimeRangeSelector
            selected={selectedTimeRange}
            onSelect={handleTimeRangeChange}
          />
        </View>
      )}

      {/* Tab Content */}
      <View style={styles.tabContent}>{renderTabContent()}</View>
    </SafeAreaContainer>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#007AFF',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  timeRangeWrapper: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 4,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: '#007AFF',
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  timeRangeTextActive: {
    color: '#fff',
  },
  tabContent: {
    flex: 1,
  },
});
