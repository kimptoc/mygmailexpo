import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GmailLabel, RecentFolder } from '@/types/folder';
import { useGmailApi } from '@/services/gmailApi';

const RECENT_FOLDERS_KEY = '@recent_folders';

export const useFolders = () => {
  const { getLabels } = useGmailApi();
  const [folders, setFolders] = useState<GmailLabel[]>([]);
  const [recentFolders, setRecentFolders] = useState<RecentFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load recent folders from AsyncStorage
  useEffect(() => {
    loadRecentFolders();
  }, []);

  const loadRecentFolders = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_FOLDERS_KEY);
      if (stored) {
        setRecentFolders(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Error loading recent folders:', err);
    }
  };

  const loadFolders = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const labels = await getLabels();
      const hiddenSystemLabelPattern = /_(STAR|CIRCLE)$/;
      const visibleLabels = labels.filter((label) => {
        const id = label.id ?? '';
        return !id.startsWith('CATEGORY_') && !hiddenSystemLabelPattern.test(id);
      });
      const sortedLabels = [...visibleLabels].sort((a, b) => {
        const typeA = (a.type ?? 'user').toLowerCase();
        const typeB = (b.type ?? 'user').toLowerCase();
        if (typeA !== typeB) {
          return typeA === 'system' ? -1 : 1;
        }
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });
      setFolders(sortedLabels);
    } catch (err: any) {
      setError(err.message || 'Failed to load folders');
      console.error('Error loading folders:', err);
    } finally {
      setLoading(false);
    }
  };

  const addToRecentFolders = async (folder: GmailLabel) => {
    const newRecentFolder: RecentFolder = {
      id: folder.id,
      name: folder.name,
      accessedAt: Date.now(),
    };

    // Get current recent folders
    let updatedRecentFolders = [...recentFolders];
    
    // Remove if already exists
    updatedRecentFolders = updatedRecentFolders.filter(f => f.id !== folder.id);
    
    // Add to the beginning
    updatedRecentFolders.unshift(newRecentFolder);
    
    // Keep only the 5 most recent
    updatedRecentFolders = updatedRecentFolders.slice(0, 5);
    
    setRecentFolders(updatedRecentFolders);
    
    // Save to AsyncStorage
    try {
      await AsyncStorage.setItem(RECENT_FOLDERS_KEY, JSON.stringify(updatedRecentFolders));
    } catch (err) {
      console.error('Error saving recent folders:', err);
    }
  };

  const removeFromRecentFolders = async (folderId: string) => {
    const updatedRecentFolders = recentFolders.filter(folder => folder.id !== folderId);
    setRecentFolders(updatedRecentFolders);
    
    try {
      await AsyncStorage.setItem(RECENT_FOLDERS_KEY, JSON.stringify(updatedRecentFolders));
    } catch (err) {
      console.error('Error removing from recent folders:', err);
    }
  };

  const clearRecentFolders = async () => {
    setRecentFolders([]);
    try {
      await AsyncStorage.removeItem(RECENT_FOLDERS_KEY);
    } catch (err) {
      console.error('Error clearing recent folders:', err);
    }
  };

  return {
    folders,
    recentFolders,
    loading,
    error,
    loadFolders,
    addToRecentFolders,
    removeFromRecentFolders,
    clearRecentFolders,
  };
};
