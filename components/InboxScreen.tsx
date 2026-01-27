import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { GmailApiService } from '@/services/gmailApi';
import { Email, EmailListState } from '@/types/gmail';
import { EmailItem } from '@/components/EmailItem';
import { IconSymbol } from '@/components/ui/icon-symbol';

export function InboxScreen() {
  const { authState, signOut, getAccessToken } = useAuth();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  const [emailState, setEmailState] = useState<EmailListState>({
    emails: [],
    isLoading: true,
    error: undefined,
    nextPageToken: undefined,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const userEmail = authState.status === 'authenticated' ? authState.userEmail : '';

  const loadEmails = useCallback(async (refresh = false) => {
    const accessToken = getAccessToken();
    if (!accessToken) return;

    if (refresh) {
      setIsRefreshing(true);
    } else {
      setEmailState((prev) => ({ ...prev, isLoading: true }));
    }

    try {
      const gmailService = new GmailApiService(accessToken);
      const result = await gmailService.getInboxEmails(20);

      setEmailState({
        emails: result.emails,
        isLoading: false,
        error: undefined,
        nextPageToken: result.nextPageToken,
      });
    } catch (error) {
      setEmailState({
        emails: [],
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load emails',
        nextPageToken: undefined,
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [getAccessToken]);

  const loadMoreEmails = useCallback(async () => {
    const accessToken = getAccessToken();
    if (!accessToken || !emailState.nextPageToken || isLoadingMore) return;

    setIsLoadingMore(true);

    try {
      const gmailService = new GmailApiService(accessToken);
      const result = await gmailService.getInboxEmails(20, emailState.nextPageToken);

      setEmailState((prev) => ({
        emails: [...prev.emails, ...result.emails],
        isLoading: false,
        error: undefined,
        nextPageToken: result.nextPageToken,
      }));
    } catch (error) {
      // Keep existing emails on pagination error
      setEmailState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load more emails',
      }));
    } finally {
      setIsLoadingMore(false);
    }
  }, [getAccessToken, emailState.nextPageToken, isLoadingMore]);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  const handleEmailPress = useCallback((email: Email) => {
    // For now, just log the email ID
    // In the future, this would navigate to email detail screen
    console.log('Email pressed:', email.id, email.subject);
  }, []);

  const handleRefresh = useCallback(() => {
    loadEmails(true);
  }, [loadEmails]);

  const renderEmail = useCallback(
    ({ item }: { item: Email }) => (
      <EmailItem email={item} onPress={() => handleEmailPress(item)} />
    ),
    [handleEmailPress]
  );

  const renderFooter = useCallback(() => {
    if (!emailState.nextPageToken) return null;

    return (
      <View style={styles.footer}>
        {isLoadingMore ? (
          <ActivityIndicator color={tintColor} />
        ) : (
          <Pressable
            style={[styles.loadMoreButton, { borderColor: tintColor }]}
            onPress={loadMoreEmails}
          >
            <Text style={[styles.loadMoreText, { color: tintColor }]}>Load More</Text>
          </Pressable>
        )}
      </View>
    );
  }, [emailState.nextPageToken, isLoadingMore, loadMoreEmails, tintColor]);

  const renderEmpty = useCallback(() => {
    if (emailState.isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <IconSymbol name="tray.fill" size={64} color={textColor + '40'} />
        <Text style={[styles.emptyText, { color: textColor + '80' }]}>
          Your inbox is empty
        </Text>
      </View>
    );
  }, [emailState.isLoading, textColor]);

  if (emailState.isLoading && emailState.emails.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor }]}>
        <ActivityIndicator size="large" color={tintColor} />
        <Text style={[styles.loadingText, { color: textColor }]}>Loading emails...</Text>
      </View>
    );
  }

  if (emailState.error && emailState.emails.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor }]}>
        <IconSymbol name="exclamationmark.triangle.fill" size={48} color="#E53935" />
        <Text style={[styles.errorText, { color: textColor }]}>{emailState.error}</Text>
        <Pressable
          style={[styles.retryButton, { backgroundColor: tintColor }]}
          onPress={() => loadEmails()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: textColor + '20' }]}>
        <View>
          <Text style={[styles.headerTitle, { color: textColor }]}>Inbox</Text>
          <Text style={[styles.headerSubtitle, { color: textColor + '80' }]}>
            {userEmail}
          </Text>
        </View>
        <Pressable
          style={[styles.signOutButton, { borderColor: tintColor }]}
          onPress={signOut}
        >
          <Text style={[styles.signOutText, { color: tintColor }]}>Sign Out</Text>
        </Pressable>
      </View>

      {/* Email List */}
      <FlatList
        data={emailState.emails}
        renderItem={renderEmail}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={tintColor}
          />
        }
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={loadMoreEmails}
        onEndReachedThreshold={0.5}
        contentContainerStyle={emailState.emails.length === 0 ? styles.emptyList : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  signOutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  signOutText: {
    fontSize: 13,
    fontWeight: '500',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyList: {
    flexGrow: 1,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  loadMoreButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  loadMoreText: {
    fontWeight: '500',
  },
});
