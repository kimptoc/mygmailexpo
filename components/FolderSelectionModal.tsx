import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useFolders } from '@/hooks/useFolders';
import { GmailLabel } from '@/types/folder';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { buildFolderListItems, FolderListItem } from '@/utils/folder-list';
import { useActionButtonColors } from '@/hooks/use-tint-contrast';

interface FolderSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectFolder: (folder: GmailLabel) => void;
  currentFolderId?: string;
  title?: string;
  recordRecent?: boolean;
}

const MIN_COLUMN_WIDTH = 240;
const COLUMN_GAP = 12;

const FolderSelectionModal: React.FC<FolderSelectionModalProps> = ({
  visible,
  onClose,
  onSelectFolder,
  currentFolderId,
  title = 'Select Folder',
  recordRecent = true,
}) => {
  const { folders, recentFolders, loading, error, loadFolders, addToRecentFolders } = useFolders();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFolders, setFilteredFolders] = useState<GmailLabel[]>([]);
  const { width } = useWindowDimensions();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const separatorColor = useThemeColor({}, 'separator');
  const errorColor = useThemeColor({}, 'error');
  const errorBackgroundColor = useThemeColor({}, 'errorBackground');
  const selectionColor = useThemeColor({}, 'selection');
  const { tintColor, actionButtonBackground, actionButtonText } = useActionButtonColors();

  const availableWidth = width - 32;
  const columnCount = availableWidth >= MIN_COLUMN_WIDTH * 2 + COLUMN_GAP ? 2 : 1;
  const columnWidth = columnCount === 2
    ? (availableWidth - COLUMN_GAP) / 2
    : availableWidth;

  useEffect(() => {
    if (visible) {
      loadFolders();
    }
  }, [visible]);

  useEffect(() => {
    // Filter folders based on search query
    let result = [...folders];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(folder => 
        folder.name.toLowerCase().includes(query)
      );
    }
    
    setFilteredFolders(result);
  }, [folders, searchQuery]);

  const listItems = useMemo(() => (
    buildFolderListItems({
      folders,
      recentFolderIds: recentFolders.map(folder => folder.id),
      filteredFolders,
      searchQuery,
      columnCount,
      recentLimit: 10,
    })
  ), [filteredFolders, folders, recentFolders, searchQuery, columnCount]);

  const handleSelectFolder = (folder: GmailLabel) => {
    if (recordRecent) {
      addToRecentFolders(folder);
    }
    onSelectFolder(folder);
    onClose();
  };

  const renderFolderItem = (folder: GmailLabel, iconName: 'clock' | 'folder') => {
    const isSelected = currentFolderId === folder.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.folderItem,
          columnCount > 1 && styles.folderItemColumn,
          columnCount > 1 && { width: columnWidth },
          { backgroundColor: isSelected ? selectionColor : backgroundColor },
        ]}
        onPress={() => handleSelectFolder(folder)}
      >
        <View style={styles.folderIcon}>
          <IconSymbol name={iconName} size={20} color={textColor} />
        </View>
        <ThemedText style={styles.folderName}>{folder.name}</ThemedText>
        {isSelected && (
          <IconSymbol name="checkmark" size={20} color={tintColor} />
        )}
      </TouchableOpacity>
    );
  };

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
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.modalContainer, { backgroundColor }]} onPress={() => {}}>
          <ThemedView style={[styles.header, { borderBottomColor: separatorColor }]}>
            <ThemedText type="title" style={styles.title}>{title}</ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={24} color={textColor} />
            </TouchableOpacity>
          </ThemedView>

          <View style={[styles.searchContainer, { borderColor: separatorColor }]}>
            <IconSymbol name="magnifyingglass" size={20} color={textColor + '80'} style={styles.searchIcon} />
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor,
                  color: textColor,
                },
              ]}
              placeholder="Search folders..."
              placeholderTextColor={textColor + '80'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {error ? (
            <ThemedView style={[styles.errorContainer, { backgroundColor: errorBackgroundColor }]}>
              <ThemedText style={[styles.errorText, { color: errorColor }]} selectable>
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
            </ThemedView>
          ) : loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={tintColor} />
              <ThemedText>Loading folders...</ThemedText>
            </View>
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
              showsVerticalScrollIndicator={false}
              style={styles.folderList}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 1,
    maxHeight: '80%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  folderList: {
    flex: 1,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  sectionHeaderRow: {
    marginTop: 4,
    marginBottom: 8,
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
    paddingLeft: 8,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  folderItemColumn: {
    marginBottom: 8,
  },
  folderIcon: {
    marginRight: 12,
  },
  folderName: {
    flex: 1,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  errorContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default FolderSelectionModal;
