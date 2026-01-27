import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useGmailApi } from '@/services/gmailApi';
import { GmailLabel } from '@/types/folder';
import { Email, EmailListState } from '@/types/gmail';
import { EmailItem } from '@/components/EmailItem';
import { IconSymbol } from '@/components/ui/icon-symbol';
import FolderSelectionModal from '@/components/FolderSelectionModal';

export function InboxScreen() {
  const { authState, signOut, getAccessToken } = useAuth();
  const { getEmailsByLabel, getLabels } = useGmailApi();
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
  const [currentFolder, setCurrentFolder] = useState<GmailLabel | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);

  const userEmail = authState.status === 'authenticated' ? authState.userEmail : '';

  const loadEmails = useCallback(async (folderId?: string, refresh = false) => {
    const accessToken = getAccessToken();
    if (!accessToken) return;

    if (refresh) {
      setIsRefreshing(true);
    } else {
      setEmailState((prev) => ({ ...prev, isLoading: true }));
    }

    try {
      // If no folder is selected, default to INBOX
      const targetFolderId = folderId || 'INBOX';
      
      const result = await getEmailsByLabel(targetFolderId, 20);

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
  }, [getAccessToken, getEmailsByLabel]);

  const loadMoreEmails = useCallback(async () => {
    // Pagination implementation would go here
    // For now, we'll just reload the current folder
    const folderId = currentFolder?.id || 'INBOX';
    loadEmails(folderId);
  }, [currentFolder, loadEmails]);

  useEffect(() => {
    // Load the default INBOX folder
    loadEmails('INBOX');
  }, [loadEmails]);

  const handleEmailPress = useCallback((email: Email) => {
    // Navigate to email detail screen
    router.push(`/email/${email.id}?subject=${encodeURIComponent(email.subject)}`);
  }, []);

  const handleRefresh = useCallback(() => {
    const folderId = currentFolder?.id || 'INBOX';
    loadEmails(folderId, true);
  }, [currentFolder, loadEmails]);

  const handleSelectFolder = useCallback((folder: GmailLabel) => {
    setCurrentFolder(folder);
    loadEmails(folder.id);
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
          {currentFolder ? `No emails in ${currentFolder.name}` : 'Your inbox is empty'}
        </Text>
      </View>
    );
  }, [emailState.isLoading, currentFolder, textColor]);

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
          onPress={() => loadEmails(currentFolder?.id || 'INBOX')}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Folder Selection Modal - Rendered at the top level to avoid conditional hooks */}
      <FolderSelectionModal
        visible={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        onSelectFolder={handleSelectFolder}
        currentFolderId={currentFolder?.id}
      />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: textColor + '20' }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => setShowFolderModal(true)}>
            <View style={styles.folderSelector}>
              <IconSymbol name="folder" size={20} color={tintColor} />
              <Text style={[styles.headerTitle, { color: textColor }]}>
                {currentFolder ? currentFolder.name : 'Inbox'}
              </Text>
              <IconSymbol name="chevron.down" size={16} color={textColor + '80'} />
            </View>
          </TouchableOpacity>
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
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flex: 1,
  },
  folderSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginLeft: 8,
    marginRight: 6,
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
    alignSelf: 'flex-start',
    marginTop: 8,
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