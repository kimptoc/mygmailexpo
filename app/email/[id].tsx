import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useGmailApi } from '@/services/gmailApi';
import { IconSymbol } from '@/components/ui/icon-symbol';

const EmailDetailScreen = () => {
  const { id, subject } = useLocalSearchParams<{ id: string; subject: string }>();
  const { getEmailDetail } = useGmailApi();
  const [email, setEmail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  useEffect(() => {
    if (id) {
      loadEmailDetail();
    }
  }, [id]);

  const loadEmailDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      const emailDetail = await getEmailDetail(id);
      setEmail(emailDetail);
    } catch (err: any) {
      console.error('Error loading email:', err);
      setError(err.message || 'Failed to load email');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUrl = (url: string) => {
    Linking.openURL(url).catch(err => console.error('Failed to open URL:', err));
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor, justifyContent: 'center', alignItems: 'center' }]}>
        <IconSymbol name="arrow.clockwise" size={24} color={useThemeColor({}, 'tint')} />
        <ThemedText>Loading email...</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={[styles.container, { backgroundColor, justifyContent: 'center', alignItems: 'center' }]}>
        <IconSymbol name="exclamationmark.triangle" size={48} color="#f44336" />
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadEmailDetail}
        >
          <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={useThemeColor({}, 'text')} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitle}>
          Email Detail
        </ThemedText>
        <View style={styles.placeholder} /> {/* Placeholder for alignment */}
      </ThemedView>

      {email && (
        <ScrollView style={styles.emailContainer}>
          <ThemedView style={[styles.emailCard, { backgroundColor: useThemeColor({}, 'background') }]}>
            <ThemedText style={styles.subject}>{email.subject}</ThemedText>
            
            <View style={styles.metadata}>
              <ThemedText style={styles.from}>From: {email.from}</ThemedText>
              <ThemedText style={styles.date}>{email.date}</ThemedText>
            </View>
            
            <View style={styles.divider} />
            
            <ThemedText style={styles.body}>{email.body}</ThemedText>
          </ThemedView>
        </ScrollView>
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
  emailContainer: {
    flex: 1,
    padding: 16,
  },
  emailCard: {
    borderRadius: 8,
    padding: 16,
  },
  subject: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  metadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  from: {
    fontSize: 14,
    flex: 1,
  },
  date: {
    fontSize: 14,
    color: '#888',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: '#1e88e5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default EmailDetailScreen;