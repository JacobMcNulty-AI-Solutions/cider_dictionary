import React from 'react';
import { View, ScrollView, StyleSheet, Text, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RootTabScreenProps } from '../../types/navigation';
import SafeAreaContainer from '../../components/common/SafeAreaContainer';
import Button from '../../components/common/Button';

type Props = RootTabScreenProps<'Settings'>;

interface SettingItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress?: () => void;
}

function SettingItem({ icon, title, subtitle, onPress }: SettingItemProps) {
  const content = (
    <View style={styles.settingContent}>
      <Ionicons name={icon} size={24} color="#007AFF" style={styles.settingIcon} />
      <View style={styles.settingText}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
      {onPress && (
        <Ionicons name="chevron-forward" size={20} color="#CCC" />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.settingItem} onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.settingItem}>{content}</View>;
}

export default function SettingsScreen({ navigation }: Props) {
  const handleAbout = () => {
    Alert.alert(
      'About Cider Dictionary',
      'Phase 2 Enhanced\nVersion 2.0.0\n\nA comprehensive cider tracking and discovery platform with advanced features including progressive forms, intelligent duplicate detection, venue consolidation, and enhanced analytics.\n\nBuilt with React Native and Expo.',
      [{ text: 'OK' }]
    );
  };

  const handleHelp = () => {
    Alert.alert(
      'Help',
      'Getting Started:\n\n1. Tap "Add Cider" to record a new cider with our 3-level progressive form\n2. Fill in basic, enthusiast, or expert level details\n3. Rate the cider from 1-10 with comprehensive taste profiles\n4. View your enhanced collection with smart filtering and sorting\n5. Explore detailed analytics and insights\n\nEnjoy the full Phase 2 feature set!',
      [{ text: 'OK' }]
    );
  };

  const handleFeedback = () => {
    Alert.alert(
      'Feedback',
      'This is the Phase 2 enhanced version with comprehensive cider tracking features!\n\nYour feedback helps us improve the advanced functionality including progressive forms, duplicate detection, venue consolidation, and analytics.',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaContainer>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>

          <SettingItem
            icon="information-circle-outline"
            title="About"
            subtitle="App version and information"
            onPress={handleAbout}
          />

          <SettingItem
            icon="help-circle-outline"
            title="Help"
            subtitle="Getting started guide"
            onPress={handleHelp}
          />

          <SettingItem
            icon="chatbubble-outline"
            title="Feedback"
            subtitle="Share your thoughts on the prototype"
            onPress={handleFeedback}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Sync</Text>

          <SettingItem
            icon="cloud-outline"
            title="Data Sync"
            subtitle="Automatic backup and multi-device sync"
          />

          <SettingItem
            icon="cloud-download-outline"
            title="Export Data"
            subtitle="Download your collection as JSON or CSV"
            onPress={() => navigation.navigate('DataExport')}
          />

          <SettingItem
            icon="cloud-upload-outline"
            title="Import Data"
            subtitle="Restore from backup file"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>

          <SettingItem
            icon="person-outline"
            title="User Account"
            subtitle="Firebase authentication and sync"
          />

          <SettingItem
            icon="settings-outline"
            title="Preferences"
            subtitle="Rating scales, units, and display options"
          />

          <SettingItem
            icon="images-outline"
            title="Photo Storage"
            subtitle="Take and store cider photos"
          />

          <SettingItem
            icon="location-outline"
            title="Location Services"
            subtitle="Track where you tried each cider"
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Cider Dictionary</Text>
          <Text style={styles.footerSubtext}>Phase 2 Enhanced</Text>
        </View>

      </ScrollView>
    </SafeAreaContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  settingItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingIcon: {
    marginRight: 16,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  footerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#999',
  },
});