import React, { useEffect } from 'react';
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
import { GmailLabel, RecentFolder } from '@/types/folder';
import { IconSymbol } from '@/components/ui/icon-symbol';

const MIN_COLUMN_WIDTH = 240;
const COLUMN_GAP = 12;

const FolderSelectionScreen = () => {
  const { folders, recentFolders, loading, error, loadFolders, addToRecentFolders } = useFolders();
  const { width } = useWindowDimensions();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const errorColor = useThemeColor({}, 'error');
  const [refreshing, setRefreshing] = React.useState(false);

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

  const renderFolderItem = ({ item }: { item: GmailLabel }) => (
    <TouchableOpacity
      style={[
        styles.folderItem,
        columnCount > 1 && styles.folderItemColumn,
        columnCount > 1 && { width: columnWidth },
        { backgroundColor },
      ]}
      onPress={() => handleSelectFolder(item)}
    >
      <View style={styles.folderIcon}>
        <IconSymbol name="folder" size={24} color={tintColor} />
      </View>
      <ThemedText style={styles.folderName}>{item.name}</ThemedText>
      <IconSymbol name="chevron.forward" size={20} color={textColor + '80'} />
    </TouchableOpacity>
  );

  const renderRecentFolderItem = ({ item }: { item: RecentFolder }) => {
    const folder = folders.find(f => f.id === item.id);
    if (!folder) return null;

    return (
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
          <IconSymbol name="clock" size={24} color={tintColor} />
        </View>
        <ThemedText style={styles.folderName}>{folder.name}</ThemedText>
        <IconSymbol name="chevron.forward" size={20} color={textColor + '80'} />
      </TouchableOpacity>
    );
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
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: tintColor }]}
            onPress={loadFolders}
          >
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      ) : (
        <>
          {recentFolders.length > 0 && (
            <View style={styles.sectionContainer}>
              <ThemedText style={styles.sectionTitle}>Recent Folders</ThemedText>
              <FlatList
                data={recentFolders}
                renderItem={renderRecentFolderItem}
                keyExtractor={(item) => item.id}
                key={`recent-${columnCount}`}
                numColumns={columnCount}
                columnWrapperStyle={columnCount > 1 ? styles.columnWrapper : undefined}
                scrollEnabled={false}
              />
            </View>
          )}

          <View style={styles.sectionContainer}>
            <ThemedText style={styles.sectionTitle}>All Folders</ThemedText>
            {loading && folders.length === 0 ? (
              <ThemedView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={tintColor} />
                <ThemedText style={{ marginLeft: 8 }}>Loading folders...</ThemedText>
              </ThemedView>
            ) : (
              <FlatList
                data={folders}
                renderItem={renderFolderItem}
                keyExtractor={(item) => item.id}
                key={`all-${columnCount}`}
                numColumns={columnCount}
                columnWrapperStyle={columnCount > 1 ? styles.columnWrapper : undefined}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
              />
            )}
          </View>
        </>
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
  sectionContainer: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
});

export default FolderSelectionScreen;
