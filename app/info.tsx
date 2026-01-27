import React from 'react';
import { StyleSheet, View, ScrollView, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import buildInfo from '@/constants/build-info.json';

export default function InfoScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  const formattedDate = new Date(buildInfo.buildDate).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <IconSymbol name="info.circle" size={48} color={textColor} style={{ marginBottom: 16 }} />
        <ThemedText type="title">About MyGmail</ThemedText>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <ThemedText style={styles.label}>App Name</ThemedText>
            <ThemedText style={styles.value}>MyGmail Expo</ThemedText>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <ThemedText style={styles.label}>Version</ThemedText>
            <ThemedText style={styles.value}>{buildInfo.version}</ThemedText>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <ThemedText style={styles.label}>Build Date</ThemedText>
            <ThemedText style={styles.value}>{formattedDate}</ThemedText>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <ThemedText style={styles.label}>Platform</ThemedText>
            <ThemedText style={styles.value}>{Platform.OS.charAt(0).toUpperCase() + Platform.OS.slice(1)}</ThemedText>
          </View>
        </View>

        <ThemedText style={styles.footer}>
          Developed with Expo & React Native
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.7,
  },
  value: {
    fontSize: 16,
    fontWeight: '400',
  },
  divider: {
    height: 1,
    backgroundColor: '#ccc',
    opacity: 0.2,
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    opacity: 0.5,
  },
});