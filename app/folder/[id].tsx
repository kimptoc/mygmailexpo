import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useGmailApi } from '@/services/gmailApi';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { EmailItem } from '@/components/EmailItem';
import { useAuth } from '@/contexts/AuthContext';
import { useActionButtonColors } from '@/hooks/use-tint-contrast';

const FolderScreen = () => {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { signIn } = useAuth();
  const { getEmailsByLabel } = useGmailApi();
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const { tintColor, actionButtonBackground, actionButtonText } = useActionButtonColors();

  const errorColor = useThemeColor({}, 'error');

  useEffect(() => {
    if (id) {
      loadEmails();
    }
  }, [id]);

  const loadEmails = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await getEmailsByLabel(id);
      setEmails(result.emails);
    } catch (err: any) {
      console.error('Error loading emails:', err);
      setError(err.message || 'Failed to load emails');
      Alert.alert('Error', err.message || 'Failed to load emails');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEmails();
    setRefreshing(false);
  };

  const handleEmailPress = (email: any) => {
    // Navigate to email detail screen
    router.push(`/email/${email.id}?subject=${encodeURIComponent(email.subject)}&folderId=${id}`);
  };

  const renderEmailItem = ({ item }: { item: any }) => (
    <EmailItem
      email={item}
      onPress={() => handleEmailPress(item)}
    />
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={textColor} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitle}>
          {decodeURIComponent(name || 'Folder')}
        </ThemedText>
        <View style={styles.placeholder} /> {/* Placeholder for alignment */}
      </ThemedView>

      {error ? (
        <ThemedView style={styles.errorContainer}>
          <IconSymbol name="exclamationmark.triangle" size={48} color={errorColor} />
          <ThemedText style={styles.errorText} selectable>
            {error}
          </ThemedText>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: actionButtonBackground }]}
            onPress={loadEmails}
          >
            <ThemedText style={[styles.retryButtonText, { color: actionButtonText }]}>
              Retry
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: tintColor }]}
            onPress={signIn}
          >
            <ThemedText style={[styles.secondaryButtonText, { color: tintColor }]}>
              Sign in again
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      ) : (
        <FlatList
          data={emails}
          renderItem={renderEmailItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            loading ? null : (
              <ThemedView style={styles.emptyContainer}>
                <IconSymbol name="tray" size={48} color={textColor + '40'} />
                <ThemedText style={[styles.emptyText, { color: textColor + '80' }]}>No emails in this folder</ThemedText>
              </ThemedView>
            )
          }
          contentContainerStyle={emails.length === 0 && !loading ? styles.emptyList : {}}
        />
      )}

      {loading && emails.length === 0 && (
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tintColor} />
          <ThemedText style={{ marginLeft: 8 }}>Loading emails...</ThemedText>
        </ThemedView>
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
  },
  placeholder: {
    width: 40, // Same width as backButton for alignment
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyList: {
    flexGrow: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
  },
});

export default FolderScreen;
