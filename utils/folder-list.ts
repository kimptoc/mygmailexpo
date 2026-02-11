import type { GmailLabel } from '@/types/folder';

export type FolderListItem =
  | { type: 'header'; id: 'recent' | 'all'; title: string }
  | { type: 'folder'; id: string; folder: GmailLabel; icon: 'clock' | 'folder' }
  | { type: 'spacer'; id: string };

interface BuildFolderListItemsOptions {
  folders: GmailLabel[];
  recentFolderIds: string[];
  columnCount: number;
  filteredFolders?: GmailLabel[];
  searchQuery?: string;
  recentLimit?: number;
}

export const buildFolderListItems = ({
  folders,
  recentFolderIds,
  columnCount,
  filteredFolders,
  searchQuery,
  recentLimit,
}: BuildFolderListItemsOptions): FolderListItem[] => {
  const baseFolders = filteredFolders ?? folders;
  const filteredSet = new Set(baseFolders.map(folder => folder.id));
  const recentResolved = recentFolderIds
    .map(id => folders.find(folder => folder.id === id))
    .filter((folder): folder is GmailLabel => !!folder);

  const recentVisible = searchQuery
    ? recentResolved.filter(folder => filteredSet.has(folder.id))
    : recentResolved;
  const recentLimited = typeof recentLimit === 'number'
    ? recentVisible.slice(0, recentLimit)
    : recentVisible;

  const recentIds = new Set(recentLimited.map(folder => folder.id));
  const remainingFolders = baseFolders.filter(folder => !recentIds.has(folder.id));

  const items: FolderListItem[] = [];
  let columnIndex = 0;

  const pushHeader = (id: 'recent' | 'all', title: string) => {
    if (columnCount > 1 && columnIndex === 1) {
      items.push({ type: 'spacer', id: `${id}-spacer-pre` });
      columnIndex = 0;
    }
    items.push({ type: 'header', id, title });
    if (columnCount > 1) {
      items.push({ type: 'spacer', id: `${id}-spacer-post` });
    }
    columnIndex = 0;
  };

  if (recentLimited.length > 0) {
    pushHeader('recent', 'Recent Folders');
    recentLimited.forEach(folder => {
      items.push({ type: 'folder', id: folder.id, folder, icon: 'clock' });
      if (columnCount > 1) {
        columnIndex = (columnIndex + 1) % 2;
      }
    });
  }

  if (remainingFolders.length > 0) {
    pushHeader('all', 'All Folders');
    remainingFolders.forEach(folder => {
      items.push({ type: 'folder', id: folder.id, folder, icon: 'folder' });
      if (columnCount > 1) {
        columnIndex = (columnIndex + 1) % 2;
      }
    });
  }

  return items;
};
