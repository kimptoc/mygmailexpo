import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
  Animated,
  Easing,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useToast } from '@/contexts/ToastContext';
import { useGmailApi, BatchProgress } from '@/services/gmailApi';
import { GmailLabel } from '@/types/folder';
import { Email, EmailListState } from '@/types/gmail';
import { EmailItem } from '@/components/EmailItem';
import { IconSymbol } from '@/components/ui/icon-symbol';
import FolderSelectionModal from '@/components/FolderSelectionModal';
import BatchErrorModal from '@/components/BatchErrorModal';
import ComposeEmailModal from '@/components/ComposeEmailModal';
import { useActionButtonColors } from '@/hooks/use-tint-contrast';

import { useEmailSelection } from '@/hooks/useEmailSelection';
import { getSelectionAction } from '@/utils/folder-actions';
import { filterEmails } from '@/utils/email-filter';

import { EmailItemSkeleton } from '@/components/EmailItemSkeleton';

export function InboxScreen() {
  const { authState, signIn, signOut, getAccessToken } = useAuth();
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 600;
  const iconSize = isLargeScreen ? 28 : 22;
  const { 
    getEmailsByLabel, 
    getLabels, 
    moveEmailsToLabel,
    removeLabelFromEmails,
    addLabelsToEmails
  } = useGmailApi();
  const { showToast, showUndoToast, triggerRefresh, onRefresh } = useToast();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const separatorColor = useThemeColor({}, 'separator');
  const { tintColor, actionButtonBackground, actionButtonText, isTintWhite } = useActionButtonColors();
  const selectionHeaderBackground = isTintWhite ? separatorColor : tintColor;
  const selectionHeaderText = isTintWhite ? textColor : backgroundColor;

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
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [batchErrorDetails, setBatchErrorDetails] = useState<{
    succeededCount: number;
    failedItems: { id: string, subject?: string, error: string }[];
    action: 'remove' | 'move';
    targetLabelId?: string;
  } | null>(null);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [labelsMap, setLabelsMap] = useState<Record<string, GmailLabel>>({});
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLabel, setFilterLabel] = useState<GmailLabel | null>(null);
  const [showLabelFilterModal, setShowLabelFilterModal] = useState(false);
  const progressAnimation = useRef(new Animated.Value(0)).current;

  const userEmail = authState.status === 'authenticated' ? authState.userEmail : '';
  const visibleEmails = useMemo(
    () => filterEmails(emailState.emails, { labelId: filterLabel?.id, searchQuery }),
    [emailState.emails, filterLabel?.id, searchQuery]
  );
  const isFilterActive = !!filterLabel || searchQuery.trim().length > 0;
  const progressRatio =
    actionLoading && batchProgress && batchProgress.total > 0
      ? batchProgress.processed / batchProgress.total
      : 0;

  useEffect(() => {
    Animated.timing(progressAnimation, {
      toValue: progressRatio,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progressAnimation, progressRatio]);

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

  useEffect(() => {
    return onRefresh(handleRefresh);
  }, [handleRefresh]);

  const handleSelectAll = useCallback(() => {
    const allIds = visibleEmails.map(e => e.id);
    const allSelected = selectedIds.size === visibleEmails.length && visibleEmails.length > 0;
    if (allSelected) {
      clearSelection();
    } else {
      selectAll(allIds);
    }
  }, [visibleEmails, selectedIds.size, selectAll, clearSelection]);

  const handleRemoveLabelBatch = useCallback(async (idsToProcess?: string[]) => {
    setActionLoading(true);
    const ids = Array.isArray(idsToProcess) ? idsToProcess : Array.from(selectedIds);
    const sourceFolderId = currentFolder?.id ?? 'INBOX';
    setBatchProgress({
      processed: 0,
      total: ids.length,
      succeeded: 0,
      failed: 0,
    });
    try {
      const result = await removeLabelFromEmails(ids, sourceFolderId, (progress) => {
        setBatchProgress(progress);
      });
      if (result.failed.length > 0) {
        setBatchErrorDetails({
          succeededCount: result.succeeded.length,
          failedItems: result.failed.map(f => ({
            ...f,
            subject: emailState.emails.find(e => e.id === f.id)?.subject,
          })),
          action: 'remove',
        });
        setShowErrorModal(true);
      } else {
        const count = result.succeeded.length;
        const message = sourceFolderId === 'INBOX'
          ? `${count} email(s) archived`
          : `${count} email(s) removed`;
        showUndoToast(
          message,
          {
            id: `remove-label-batch-${Date.now()}`,
            label: 'Undo',
            undo: async () => {
              try {
                await addLabelsToEmails(ids, [sourceFolderId]);
              } catch (err) {
                console.error('Error undoing label removal:', err);
                throw err;
              }
            }
          }
        );
      }
      
      clearSelection();
      handleRefresh();

    } catch (error: any) {
      console.error('Error removing labels:', error);
      showToast(error.message || 'Failed to remove labels', 'error');
    } finally {
      setActionLoading(false);
      setBatchProgress(null);
    }
  }, [selectedIds, currentFolder, removeLabelFromEmails, addLabelsToEmails, moveEmailsToLabel, clearSelection, handleRefresh, showToast, showUndoToast, emailState.emails]);

  const handleMoveToFolder = useCallback(async (targetLabelId: string, idsToProcess?: string[]) => {
    setActionLoading(true);
    const ids = Array.isArray(idsToProcess) ? idsToProcess : Array.from(selectedIds);
    const sourceFolderId = currentFolder?.id || 'INBOX';
    setBatchProgress({
      processed: 0,
      total: ids.length,
      succeeded: 0,
      failed: 0,
    });
    try {
      const result = await moveEmailsToLabel(ids, targetLabelId, sourceFolderId, (progress) => {
        setBatchProgress(progress);
      });

      if (result.failed.length > 0) {
        setBatchErrorDetails({
          succeededCount: result.succeeded.length,
          failedItems: result.failed.map(f => ({
            ...f,
            subject: emailState.emails.find(e => e.id === f.id)?.subject,
          })),
          action: 'move',
          targetLabelId: targetLabelId,
        });
        setShowErrorModal(true);
      } else {
        const count = result.succeeded.length;
        showUndoToast(
          `${count} email(s) moved`,
          {
            id: `move-batch-${Date.now()}`,
            label: 'Undo',
            undo: async () => {
              try {
                await moveEmailsToLabel(ids, sourceFolderId, targetLabelId);
              } catch (err) {
                console.error('Error undoing email move:', err);
                throw err;
              }
            }
          }
        );
      }
      
      clearSelection();
      handleRefresh();

    } catch (error: any) {
      console.error('Error moving emails:', error);
      showToast(error.message || 'Failed to move emails', 'error');
    } finally {
      setActionLoading(false);
      setBatchProgress(null);
    }
  }, [selectedIds, moveEmailsToLabel, currentFolder, clearSelection, handleRefresh, showToast, showUndoToast, emailState.emails]);

  const handleRetryBatch = () => {
    if (!batchErrorDetails) return;
    
    const failedIds = batchErrorDetails.failedItems.map(item => item.id);
    setShowErrorModal(false);
    
    if (batchErrorDetails.action === 'remove') {
      // Pass the failed IDs to the same handler
      handleRemoveLabelBatch(failedIds);
    } else if (batchErrorDetails.action === 'move' && batchErrorDetails.targetLabelId) {
      handleMoveToFolder(batchErrorDetails.targetLabelId, failedIds);
    }
    // Still clear the original selection after retrying
    clearSelection();
    setBatchErrorDetails(null);
  };

  const handleSelectFolder = useCallback((folder: GmailLabel) => {
    if (isSelectionMode) {
      // Move selected emails to this folder
      handleMoveToFolder(folder.id);
      setShowFolderModal(false);
    } else {
      setCurrentFolder(folder);
      setFilterLabel(null);
      setSearchQuery('');
      setShowFilterBar(false);
      loadEmails(folder.id);
    }
  }, [isSelectionMode, loadEmails, handleMoveToFolder]);

  const handleSelectFilterLabel = useCallback((label: GmailLabel) => {
    setFilterLabel(label);
    setShowLabelFilterModal(false);
  }, []);

  const handleClearFilterLabel = useCallback(() => {
    setFilterLabel(null);
  }, []);

  const selectionAction = getSelectionAction(currentFolder?.id ?? 'INBOX');

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

    if (isFilterActive && emailState.emails.length > 0) {
      return (
        <View style={styles.emptyContainer}>
          <IconSymbol name="magnifyingglass" size={64} color={textColor + '40'} />
          <Text style={[styles.emptyText, { color: textColor + '80' }]}>
            No emails match your filter
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <IconSymbol name="tray.fill" size={64} color={textColor + '40'} />
        <Text style={[styles.emptyText, { color: textColor + '80' }]}>
          {currentFolder ? `No emails in ${currentFolder.name}` : 'Your inbox is empty'}
        </Text>
      </View>
    );
  }, [emailState.isLoading, emailState.emails.length, isFilterActive, currentFolder, textColor]);

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
      <FolderSelectionModal
        visible={showLabelFilterModal}
        onClose={() => setShowLabelFilterModal(false)}
        onSelectFolder={handleSelectFilterLabel}
        currentFolderId={filterLabel?.id}
        title="Filter by Label"
      />
      <ComposeEmailModal
        visible={showComposeModal}
        onClose={() => setShowComposeModal(false)}
        fromEmail={userEmail}
      />
      {batchErrorDetails && (
        <BatchErrorModal
          visible={showErrorModal}
          onClose={() => setShowErrorModal(false)}
          succeededCount={batchErrorDetails.succeededCount}
          failedItems={batchErrorDetails.failedItems}
          onRetry={handleRetryBatch}
        />
      )}

      {/* Header */}
      {isSelectionMode ? (
        <>
          <View style={[styles.header, styles.selectionHeader, { backgroundColor: selectionHeaderBackground }]}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={clearSelection} style={styles.selectionActionButton}>
                <IconSymbol name="xmark" size={iconSize} color={selectionHeaderText} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: selectionHeaderText, fontSize: 20 }]}>
                {selectionCount}
              </Text>
            </View>
            <View style={styles.headerActions}>
              {actionLoading ? (
                <ActivityIndicator color={selectionHeaderText} style={{ marginRight: 16 }} />
              ) : (
                <>
                  {selectionAction === 'archive' && (
                    <TouchableOpacity
                      onPress={() => handleRemoveLabelBatch()}
                      style={styles.selectionActionButton}
                      accessibilityLabel="Archive"
                    >
                      <IconSymbol name="archivebox" size={iconSize} color={selectionHeaderText} />
                    </TouchableOpacity>
                  )}
                  {selectionAction === 'remove-label' && (
                    <TouchableOpacity
                      onPress={() => handleRemoveLabelBatch()}
                      style={styles.selectionActionButton}
                      accessibilityLabel="Remove label"
                    >
                      <IconSymbol name="tag.slash" size={iconSize} color={selectionHeaderText} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => setShowFolderModal(true)}
                    style={styles.selectionActionButton}
                    accessibilityLabel="Move to folder"
                  >
                    <IconSymbol name="folder" size={iconSize} color={selectionHeaderText} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
          <View style={styles.selectionBar}>
            <Pressable onPress={handleSelectAll} style={styles.selectionBarButton}>
              <IconSymbol
                name={
                  selectedIds.size === visibleEmails.length && visibleEmails.length > 0
                    ? 'checkmark.circle'
                    : 'circle'
                }
                size={iconSize}
                color={tintColor}
              />
              <Text style={[styles.selectionBarText, { color: tintColor }]}>
                Select All
              </Text>
            </Pressable>
          </View>
          {actionLoading && batchProgress && batchProgress.total > 0 && (
            <View style={styles.progressContainer}>
              <Text style={[styles.progressText, { color: textColor + 'CC' }]}>
                Processing {batchProgress.processed}/{batchProgress.total}
              </Text>
              <View style={[styles.progressTrack, { backgroundColor: separatorColor }]}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width: progressAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                      backgroundColor: tintColor,
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </>
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
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => setShowFilterBar(prev => !prev)}
              style={styles.filterToggleButton}
              accessibilityLabel="Filter emails"
            >
              <IconSymbol
                name="magnifyingglass"
                size={22}
                color={showFilterBar || isFilterActive ? tintColor : textColor}
              />
            </TouchableOpacity>
            <Pressable
              style={[styles.signOutButton, { borderColor: tintColor }]}
              onPress={signOut}
            >
              <Text style={[styles.signOutText, { color: tintColor }]}>Sign Out</Text>
            </Pressable>
          </View>
        </View>
      )}

      {!isSelectionMode && showFilterBar && (
        <View style={[styles.filterBar, { borderBottomColor: textColor + '20' }]}>
          <View style={[styles.searchInputContainer, { borderColor: textColor + '30' }]}>
            <IconSymbol name="magnifyingglass" size={16} color={textColor + '80'} />
            <TextInput
              style={[styles.searchInput, { color: textColor }]}
              placeholder="Search subject, sender, or snippet"
              placeholderTextColor={textColor + '80'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityLabel="Clear search">
                <IconSymbol name="xmark.circle.fill" size={16} color={textColor + '60'} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.labelFilterChip,
              { borderColor: filterLabel ? tintColor : textColor + '30' },
            ]}
            onPress={() => setShowLabelFilterModal(true)}
          >
            <IconSymbol name="tag" size={16} color={filterLabel ? tintColor : textColor + '80'} />
            <Text
              style={[styles.labelFilterText, { color: filterLabel ? tintColor : textColor + '80' }]}
              numberOfLines={1}
            >
              {filterLabel ? filterLabel.name : 'Label'}
            </Text>
            {filterLabel && (
              <Pressable onPress={handleClearFilterLabel} hitSlop={8} accessibilityLabel="Clear label filter">
                <IconSymbol name="xmark" size={14} color={tintColor} />
              </Pressable>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Email List */}
      {emailState.error ? (
        <View style={[styles.centered, { flex: 1 }]}>
          <IconSymbol name="exclamationmark.triangle" size={48} color={textColor} />
          <ThemedText style={styles.errorText} selectable>
            {emailState.error}
          </ThemedText>
          <Pressable
            style={[styles.retryButton, { backgroundColor: actionButtonBackground }]}
            onPress={handleRefresh}
          >
            <ThemedText style={[styles.retryButtonText, { color: actionButtonText }]}>
              Retry
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.secondaryButton, { borderColor: tintColor }]}
            onPress={signIn}
          >
            <ThemedText style={[styles.secondaryButtonText, { color: tintColor }]}>
              Sign in again
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={visibleEmails}
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
          contentContainerStyle={visibleEmails.length === 0 ? styles.emptyList : undefined}
        />
      )}
      {!isSelectionMode && (
        <Pressable
          style={[styles.fab, { backgroundColor: tintColor }]}
          onPress={() => setShowComposeModal(true)}
        >
          <IconSymbol name="paperplane.fill" size={24} color={backgroundColor} />
        </Pressable>
      )}
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterToggleButton: {
    padding: 8,
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  labelFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 130,
    gap: 4,
  },
  labelFilterText: {
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 1,
  },
  selectionActionButton: {
    padding: 12,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
  secondaryButton: {
    marginTop: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontWeight: '600',
  },
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  selectionBarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.04)',
    minHeight: 44,
  },
  selectionBarText: {
    marginLeft: 8,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
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
