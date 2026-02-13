export interface GmailLabel {
  id: string;
  name: string;
  messageListVisibility?: string;
  labelListVisibility?: string;
  type?: string;
  // Flattened color fields used throughout the app.
  backgroundColor?: string;
  textColor?: string;
  color?: {
    textColor: string;
    backgroundColor: string;
  };
}

export interface Folder {
  id: string;
  name: string;
  unreadCount?: number;
  parentId?: string;
  children?: Folder[];
  color?: string;
  icon?: string;
}

export interface FolderHierarchy {
  [id: string]: Folder;
}

export interface RecentFolder {
  id: string;
  name: string;
  accessedAt: number;
}
