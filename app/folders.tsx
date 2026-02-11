import React, { useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useFolders } from '@/hooks/useFolders';
import { GmailLabel } from '@/types/folder';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { buildFolderListItems, FolderListItem } from '@/utils/folder-list';
import { useActionButtonColors } from '@/hooks/use-tint-contrast';

const MIN_COLUMN_WIDTH = 240;
const COLUMN_GAP = 12;

const FolderSelectionScreen = () => {
  const { signIn } = useAuth();
  const { folders, recentFolders, loading, error, loadFolders, addToRecentFolders } = useFolders();
  const { width } = useWindowDimensions();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const errorColor = useThemeColor({}, 'error');
  const [refreshing, setRefreshing] = React.useState(false);
  const { tintColor, actionButtonBackground, actionButtonText } = useActionButtonColors();

  const availableWidth = width - 32;
  const columnCount = availableWidth >= MIN_COLUMN_WIDTH * 2 + COLUMN_GAP ? 2 : 1;
  const columnWidth = columnCount === 2
    ? (availableWidth - COLUMN_GAP) / 2
    : availableWidth;

  useEffect(() => {
    loadFolders();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadFolders().then(() => {
      setRefreshing(false);
    });
  }, [loadFolders]);

  const handleSelectFolder = (folder: GmailLabel) => {
    // Add to recent folders
    addToRecentFolders(folder);
    
    // Navigate to the folder view with the folder ID
    router.push(`/folder/${folder.id}?name=${encodeURIComponent(folder.name)}`);
  };

  const listItems = useMemo(() => (
    buildFolderListItems({
      folders,
      recentFolderIds: recentFolders.map(folder => folder.id),
      columnCount,
      recentLimit: 10,
    })
  ), [folders, recentFolders, columnCount]);

  const renderFolderItem = (folder: GmailLabel, iconName: 'clock' | 'folder') => (
    <TouchableOpacity
      style={[
        styles.folderItem,
        columnCount > 1 && styles.folderItemColumn,
        columnCount > 1 && { width: columnWidth },
        { backgroundColor },
      ]}
      onPress={() => handleSelectFolder(folder)}
    >
      <View style={styles.folderIcon}>
        <IconSymbol name={iconName} size={24} color={tintColor} />
      </View>
      <ThemedText style={styles.folderName}>{folder.name}</ThemedText>
      <IconSymbol name="chevron.forward" size={20} color={textColor + '80'} />
    </TouchableOpacity>
  );

  const renderListItem = ({ item }: { item: FolderListItem }) => {
    if (item.type === 'header') {
      return (
        <View
          style={[
            styles.sectionHeaderRow,
            { width: availableWidth },
            columnCount > 1 && styles.sectionHeaderFull,
          ]}
        >
          <ThemedText style={styles.sectionTitle}>{item.title}</ThemedText>
        </View>
      );
    }

    if (item.type === 'spacer') {
      return <View style={[styles.spacerItem, columnCount > 1 && { width: columnWidth }]} />;
    }

    return renderFolderItem(item.folder, item.icon);
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={textColor} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitle}>Folders</ThemedText>
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
            onPress={loadFolders}
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
      ) : loading && folders.length === 0 ? (
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tintColor} />
          <ThemedText style={{ marginLeft: 8 }}>Loading folders...</ThemedText>
        </ThemedView>
      ) : (
        <FlatList
          data={listItems}
          renderItem={renderListItem}
          keyExtractor={(item) =>
            item.type === 'header'
              ? `header-${item.id}`
              : item.type === 'spacer'
                ? `spacer-${item.id}`
                : `folder-${item.id}`
          }
          key={`folders-${columnCount}`}
          numColumns={columnCount}
          columnWrapperStyle={columnCount > 1 ? styles.columnWrapper : undefined}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
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
  columnWrapper: {
    justifyContent: 'space-between',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionHeaderRow: {
    marginTop: 4,
    marginBottom: 12,
  },
  sectionHeaderFull: {
    flexBasis: '100%',
    alignSelf: 'flex-start',
  },
  spacerItem: {
    height: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  folderItemColumn: {
    marginBottom: 12,
  },
  folderIcon: {
    marginRight: 16,
  },
  folderName: {
    flex: 1,
    fontSize: 16,
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
    alignSelf: 'center',
  },
  secondaryButtonText: {
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
});

export default FolderSelectionScreen;
