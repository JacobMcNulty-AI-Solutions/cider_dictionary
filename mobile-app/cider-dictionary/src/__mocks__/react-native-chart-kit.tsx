/**
 * Mock for react-native-chart-kit
 * Used in tests to avoid dependency on actual chart rendering
 */

import React from 'react';
import { View, Text } from 'react-native';

export const LineChart = ({ data, ...props }: any) => (
  <View testID="line-chart">
    <Text testID="chart-labels">{data.labels?.join(',')}</Text>
    <Text testID="chart-data">{data.datasets?.[0]?.data?.join(',')}</Text>
  </View>
);

export const BarChart = ({ data, ...props }: any) => (
  <View testID="bar-chart">
    <Text testID="chart-labels">{data.labels?.join(',')}</Text>
    <Text testID="chart-data">{data.datasets?.[0]?.data?.join(',')}</Text>
  </View>
);

export const PieChart = ({ data, ...props }: any) => (
  <View testID="pie-chart">
    <Text testID="chart-data">{JSON.stringify(data)}</Text>
  </View>
);

export const ProgressChart = ({ data, ...props }: any) => (
  <View testID="progress-chart">
    <Text testID="chart-data">{JSON.stringify(data)}</Text>
  </View>
);

export const ContributionGraph = ({ values, ...props }: any) => (
  <View testID="contribution-graph">
    <Text testID="chart-data">{JSON.stringify(values)}</Text>
  </View>
);

export const StackedBarChart = ({ data, ...props }: any) => (
  <View testID="stacked-bar-chart">
    <Text testID="chart-labels">{data.labels?.join(',')}</Text>
    <Text testID="chart-data">{data.datasets?.[0]?.data?.join(',')}</Text>
  </View>
);
