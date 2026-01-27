import React, { useState, useCallback } from 'react';
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
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useToast } from '@/contexts/ToastContext';
import { useGmailApi } from '@/services/gmailApi';
import { GmailLabel } from '@/types/folder';
import { Email, EmailListState } from '@/types/gmail';
import { EmailItem } from '@/components/EmailItem';
import { IconSymbol } from '@/components/ui/icon-symbol';
import FolderSelectionModal from '@/components/FolderSelectionModal';

import { useEmailSelection } from '@/hooks/useEmailSelection';

import { EmailItemSkeleton } from '@/components/EmailItemSkeleton';

export function InboxScreen() {
  const { authState, signOut, getAccessToken } = useAuth();
  const { 
    getEmailsByLabel, 
    getLabels, 
    moveEmailsToLabel,
    removeLabelFromEmails
  } = useGmailApi();
  const { showToast } = useToast();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  const {
    selectedIds,
    isSelectionMode,
    toggleSelection,
    clearSelection,
    enterSelectionMode,
    selectionCount,
    selectAll,
  } = useEmailSelection();

  const [emailState, setEmailState] = useState<EmailListState>({
    emails: [],
    isLoading: true,
    error: undefined,
    nextPageToken: undefined,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<GmailLabel | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [labelsMap, setLabelsMap] = useState<Record<string, GmailLabel>>({});

  const userEmail = authState.status === 'authenticated' ? authState.userEmail : '';

  const loadLabels = useCallback(async () => {
    try {
      const labels = await getLabels();
      const map: Record<string, GmailLabel> = {};
      labels.forEach(label => {
        map[label.id] = label;
      });
      setLabelsMap(map);
    } catch (error) {
      console.error('Error loading labels map:', error);
    }
  }, [getLabels]);

  const loadEmails = useCallback(async (folderId?: string, refresh = false) => {
    const accessToken = getAccessToken();
    if (!accessToken) return;

    if (refresh) {
      setIsRefreshing(true);
    } else {
      setEmailState((prev) => ({ ...prev, isLoading: true }));
    }

    try {
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
    if (isLoadingMore || !emailState.nextPageToken) return;

    const accessToken = getAccessToken();
    if (!accessToken) return;

    setIsLoadingMore(true);
    try {
      const folderId = currentFolder?.id || 'INBOX';
      const result = await getEmailsByLabel(folderId, 20, emailState.nextPageToken);

      setEmailState((prev) => ({
        ...prev,
        emails: [...prev.emails, ...result.emails],
        nextPageToken: result.nextPageToken,
      }));
    } catch (error) {
      console.error('Error loading more emails:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [getAccessToken, getEmailsByLabel, currentFolder, emailState.nextPageToken, isLoadingMore]);

  useFocusEffect(
    useCallback(() => {
      loadLabels();
      loadEmails(currentFolder?.id || 'INBOX');
    }, [loadLabels, loadEmails, currentFolder])
  );

  const handleEmailPress = useCallback((email: Email) => {
    if (isSelectionMode) {
      toggleSelection(email.id);
    } else {
      const folderId = currentFolder?.id || 'INBOX';
      router.push(`/email/${email.id}?subject=${encodeURIComponent(email.subject)}&folderId=${encodeURIComponent(folderId)}`);
    }
  }, [isSelectionMode, toggleSelection, currentFolder]);

  const handleEmailLongPress = useCallback((email: Email) => {
    if (!isSelectionMode) {
      enterSelectionMode(email.id);
    }
  }, [isSelectionMode, enterSelectionMode]);

  const handleRefresh = useCallback(() => {
    const folderId = currentFolder?.id || 'INBOX';
    loadEmails(folderId, true);
    loadLabels();
  }, [currentFolder, loadEmails, loadLabels]);

  const handleSelectAll = useCallback(() => {
    const allIds = emailState.emails.map(e => e.id);
    selectAll(allIds);
  }, [emailState.emails, selectAll]);

  const handleRemoveLabelBatch = useCallback(async () => {
    if (!currentFolder) return;
    setActionLoading(true);
    const ids = Array.from(selectedIds);
    const count = ids.length;
    try {
      await removeLabelFromEmails(ids, currentFolder.id);
      showToast(`${count} email${count !== 1 ? 's' : ''} removed`, 'success');
      clearSelection();
      handleRefresh();
    } catch (error: any) {
      console.error('Error removing labels:', error);
      showToast(error.message || 'Failed to remove labels', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [selectedIds, currentFolder, removeLabelFromEmails, clearSelection, handleRefresh, showToast]);

  const handleMoveToFolder = useCallback(async (targetLabelId: string) => {
    setActionLoading(true);
    const ids = Array.from(selectedIds);
    const count = ids.length;
    try {
      await moveEmailsToLabel(ids, targetLabelId, currentFolder?.id || 'INBOX');
      showToast(`${count} email${count !== 1 ? 's' : ''} moved`, 'success');
      clearSelection();
      handleRefresh();
    } catch (error: any) {
      console.error('Error moving emails:', error);
      showToast(error.message || 'Failed to move emails', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [selectedIds, moveEmailsToLabel, currentFolder, clearSelection, handleRefresh, showToast]);

  const handleSelectFolder = useCallback((folder: GmailLabel) => {
    if (isSelectionMode) {
      // Move selected emails to this folder
      handleMoveToFolder(folder.id);
      setShowFolderModal(false);
    } else {
      setCurrentFolder(folder);
      loadEmails(folder.id);
    }
  }, [isSelectionMode, loadEmails, handleMoveToFolder]);

  const showRemoveLabel = !!currentFolder && 
    currentFolder.id !== 'INBOX' && 
    !currentFolder.id.startsWith('CATEGORY_') && 
    !['TRASH', 'SENT', 'DRAFTS', 'SPAM', 'STARRED', 'IMPORTANT', 'UNREAD'].includes(currentFolder.id);

  const renderEmail = useCallback(
    ({ item }: { item: Email }) => (
      <EmailItem 
        email={item} 
        onPress={() => handleEmailPress(item)} 
        onLongPress={() => handleEmailLongPress(item)}
        onAvatarPress={() => toggleSelection(item.id)}
        isSelected={selectedIds.has(item.id)}
        isSelectionMode={isSelectionMode}
        labels={labelsMap}
        currentFolderId={currentFolder?.id || 'INBOX'}
      />
    ),
    [handleEmailPress, handleEmailLongPress, toggleSelection, selectedIds, isSelectionMode, labelsMap, currentFolder]
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
      <View style={[styles.container, { backgroundColor }]}>
        <View style={[styles.header, { borderBottomColor: textColor + '20' }]}>
          <View style={styles.headerLeft}>
            <View style={styles.folderSelector}>
              <IconSymbol name="folder" size={20} color={tintColor} />
              <Text style={[styles.headerTitle, { color: textColor }]}>
                {currentFolder ? currentFolder.name : 'Inbox'}
              </Text>
            </View>
          </View>
        </View>
        <FlatList
          data={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
          renderItem={() => <EmailItemSkeleton />}
          keyExtractor={(item) => item.toString()}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <FolderSelectionModal
        visible={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        onSelectFolder={handleSelectFolder}
        currentFolderId={currentFolder?.id}
      />

      {/* Header */}
      {isSelectionMode ? (
        <View style={[styles.header, styles.selectionHeader, { backgroundColor: tintColor }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={clearSelection} style={styles.selectionActionButton}>
              <IconSymbol name="xmark" size={24} color={backgroundColor} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: backgroundColor, fontSize: 20 }]}>
              {selectionCount}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {actionLoading ? (
              <ActivityIndicator color={backgroundColor} style={{ marginRight: 16 }} />
            ) : (
              <>
                <TouchableOpacity onPress={handleSelectAll} style={styles.selectionActionButton}>
                  <IconSymbol name="checkmark.circle" size={22} color={backgroundColor} />
                </TouchableOpacity>
                {showRemoveLabel && (
                  <TouchableOpacity onPress={handleRemoveLabelBatch} style={styles.selectionActionButton}>
                    <IconSymbol name="tag.slash" size={22} color={backgroundColor} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowFolderModal(true)} style={styles.selectionActionButton}>
                  <IconSymbol name="folder" size={22} color={backgroundColor} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      ) : (
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
      )}

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
  selectionHeader: {
    alignItems: 'center',
    paddingTop: 54,
    paddingBottom: 12,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectionActionButton: {
    padding: 10,
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