export type SelectionAction = 'archive' | 'remove-label' | 'none';

const SYSTEM_LABEL_IDS = new Set([
  'TRASH',
  'SENT',
  'DRAFTS',
  'SPAM',
  'STARRED',
  'IMPORTANT',
  'UNREAD',
]);

export function getSelectionAction(folderId: string): SelectionAction {
  if (folderId === 'INBOX') return 'archive';
  if (folderId.startsWith('CATEGORY_')) return 'none';
  if (SYSTEM_LABEL_IDS.has(folderId)) return 'none';
  return 'remove-label';
}
