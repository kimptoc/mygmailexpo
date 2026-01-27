import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useFolders } from '@/hooks/useFolders';
import { GmailLabel, RecentFolder } from '@/types/folder';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface FolderSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectFolder: (folder: GmailLabel) => void;
  currentFolderId?: string;
}

const FolderSelectionModal: React.FC<FolderSelectionModalProps> = ({
  visible,
  onClose,
  onSelectFolder,
  currentFolderId,
}) => {
  const { folders, recentFolders, loading, error, loadFolders, addToRecentFolders } = useFolders();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFolders, setFilteredFolders] = useState<GmailLabel[]>([]);
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'icon');
  const selectedBackgroundColor = useThemeColor({}, 'tabIconSelected');
  const tintColor = useThemeColor({}, 'tint');

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

  const handleSelectFolder = (folder: GmailLabel) => {
    addToRecentFolders(folder);
    onSelectFolder(folder);
    onClose();
  };

  const renderFolderItem = ({ item }: { item: GmailLabel }) => {
    const isSelected = currentFolderId === item.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.folderItem,
          { backgroundColor: isSelected ? selectedBackgroundColor : backgroundColor },
        ]}
        onPress={() => handleSelectFolder(item)}
      >
        <View style={styles.folderIcon}>
          <IconSymbol name="folder" size={20} color={textColor} />
        </View>
        <ThemedText style={styles.folderName}>{item.name}</ThemedText>
        {isSelected && (
          <IconSymbol name="checkmark" size={20} color={tintColor} />
        )}
      </TouchableOpacity>
    );
  };

  const renderRecentFolderItem = ({ item }: { item: RecentFolder }) => {
    const folder = folders.find(f => f.id === item.id);
    if (!folder) return null;

    const isSelected = currentFolderId === folder.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.folderItem,
          { backgroundColor: isSelected ? selectedBackgroundColor : backgroundColor },
        ]}
        onPress={() => handleSelectFolder(folder)}
      >
        <View style={styles.folderIcon}>
          <IconSymbol name="clock" size={20} color={textColor} />
        </View>
        <ThemedText style={styles.folderName}>{folder.name}</ThemedText>
        {isSelected && (
          <IconSymbol name="checkmark" size={20} color={tintColor} />
        )}
      </TouchableOpacity>
    );
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
          <ThemedView style={styles.header}>
            <ThemedText type="title" style={styles.title}>Select Folder</ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={24} color={textColor} />
            </TouchableOpacity>
          </ThemedView>

          <View style={styles.searchContainer}>
            <IconSymbol name="magnifyingglass" size={20} color={textColor + '80'} style={styles.searchIcon} />
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor,
                  color: textColor,
                  borderColor: borderColor,
                },
              ]}
              placeholder="Search folders..."
              placeholderTextColor={textColor + '80'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {error ? (
            <ThemedView style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </ThemedView>
          ) : loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={tintColor} />
              <ThemedText>Loading folders...</ThemedText>
            </View>
          ) : (
            <>
              {recentFolders.length > 0 && (
                <View style={styles.sectionContainer}>
                  <ThemedText style={styles.sectionTitle}>Recent Folders</ThemedText>
                  <FlatList
                    data={recentFolders}
                    renderItem={renderRecentFolderItem}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                  />
                </View>
              )}

              <View style={[styles.sectionContainer, styles.allFoldersSection]}>
                <ThemedText style={styles.sectionTitle}>All Folders</ThemedText>
                <FlatList
                  data={filteredFolders}
                  renderItem={renderFolderItem}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  style={styles.folderList}
                />
              </View>
            </>
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
    borderBottomColor: '#E0E0E0',
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
  sectionContainer: {
    marginBottom: 24,
  },
  allFoldersSection: {
    flex: 1,
    minHeight: 0,
  },
  folderList: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    paddingLeft: 8,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
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
    backgroundColor: '#ffebee',
    marginBottom: 16,
  },
  errorText: {
    color: '#c62828',
    textAlign: 'center',
  },
});

export default FolderSelectionModal;
