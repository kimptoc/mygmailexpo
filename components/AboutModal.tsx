import React from 'react';
import { Modal, StyleSheet, View, TouchableOpacity, ScrollView } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import buildInfo from '@/constants/build-info.json';

interface AboutModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AboutModal({ visible, onClose }: AboutModalProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  const formattedDate = new Date(buildInfo.buildDate).toLocaleString();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <ThemedView style={[styles.modalContainer, { backgroundColor }]}>
          <View style={styles.header}>
            <ThemedText type="subtitle">About</ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="xmark.circle.fill" size={24} color={textColor} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.infoRow}>
              <ThemedText style={styles.label}>App Name:</ThemedText>
              <ThemedText style={styles.value}>MyGmail Expo</ThemedText>
            </View>
            
            <View style={styles.infoRow}>
              <ThemedText style={styles.label}>Version:</ThemedText>
              <ThemedText style={styles.value}>{buildInfo.version}</ThemedText>
            </View>

            <View style={styles.infoRow}>
              <ThemedText style={styles.label}>Build Date:</ThemedText>
              <ThemedText style={styles.value}>{formattedDate}</ThemedText>
            </View>
            
            <View style={styles.divider} />
            
            <ThemedText style={styles.footer}>
              Developed with Expo & React Native
            </ThemedText>
          </ScrollView>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    maxHeight: 400,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontWeight: '600',
    opacity: 0.7,
  },
  value: {
    fontWeight: '400',
  },
  divider: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 16,
    opacity: 0.3,
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    opacity: 0.5,
  },
});
