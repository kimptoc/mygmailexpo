import React from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface BatchErrorModalProps {
  visible: boolean;
  onClose: () => void;
  succeededCount: number;
  failedItems: { id: string, subject?: string, error: string }[];
  onRetry?: () => void;
}

const BatchErrorModal: React.FC<BatchErrorModalProps> = ({
  visible,
  onClose,
  succeededCount,
  failedItems,
  onRetry,
}) => {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const separatorColor = useThemeColor({}, 'separator');
  const errorColor = useThemeColor({}, 'error');

  const renderErrorItem = ({ item }: { item: { id: string, subject?: string, error: string } }) => (
    <View style={[styles.errorItem, { borderBottomColor: separatorColor }]}>
      <IconSymbol name="exclamationmark.circle" size={20} color={errorColor} style={styles.errorIcon} />
      <View style={styles.errorDetails}>
        <ThemedText style={styles.errorSubject} numberOfLines={1}>
          {item.subject || `ID: ${item.id}`}
        </ThemedText>
        <ThemedText style={[styles.errorMessage, { color: errorColor }]}>
          {item.error}
        </ThemedText>
      </View>
    </View>
  );

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.modalContainer, { backgroundColor }]} onPress={() => {}}>
          <View style={[styles.header, { borderBottomColor: separatorColor }]}>
            <ThemedText type="title" style={styles.title}>Batch Operation Summary</ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={24} color={textColor} />
            </TouchableOpacity>
          </View>

          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <IconSymbol name="checkmark.circle.fill" size={24} color={'#4CAF50'} />
              <ThemedText style={styles.summaryText}>{succeededCount} succeeded</ThemedText>
            </View>
            <View style={styles.summaryRow}>
              <IconSymbol name="xmark.circle.fill" size={24} color={errorColor} />
              <ThemedText style={styles.summaryText}>{failedItems.length} failed</ThemedText>
            </View>
          </View>

          {failedItems.length > 0 && (
            <FlatList
              data={failedItems}
              renderItem={renderErrorItem}
              keyExtractor={(item) => item.id}
              style={styles.errorList}
            />
          )}

          <View style={styles.footer}>
            {onRetry && (
               <TouchableOpacity
                style={[styles.button, { backgroundColor: tintColor }]}
                onPress={onRetry}
              >
                <ThemedText style={styles.buttonText}>Retry Failed</ThemedText>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, styles.closeAction, { borderColor: separatorColor }]}
              onPress={onClose}
            >
              <ThemedText style={styles.buttonText}>Close</ThemedText>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    maxHeight: '80%',
    width: '100%',
    borderRadius: 16,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
  },
  closeButton: {
    padding: 4,
  },
  summaryContainer: {
    marginBottom: 16,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorList: {
    flexGrow: 0,
  },
  errorItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  errorIcon: {
    marginRight: 12,
  },
  errorDetails: {
    flex: 1,
  },
  errorSubject: {
    fontWeight: '500',
    marginBottom: 2,
  },
  errorMessage: {
    fontSize: 13,
  },
  footer: {
    marginTop: 24,
    flexDirection: 'row-reverse',
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  closeAction: {
    borderWidth: 1,
  }
});

export default BatchErrorModal;
