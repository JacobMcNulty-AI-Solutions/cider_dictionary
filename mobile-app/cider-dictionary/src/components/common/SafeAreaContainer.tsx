import React from 'react';
import { SafeAreaView, StyleSheet, ViewStyle } from 'react-native';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
}

export default function SafeAreaContainer({ children, style, testID }: Props) {
  return <SafeAreaView style={[styles.container, style]} testID={testID}>{children}</SafeAreaView>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});