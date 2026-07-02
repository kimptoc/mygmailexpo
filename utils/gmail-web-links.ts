const SYSTEM_LABEL_ANCHORS: Record<string, string> = {
  INBOX: 'inbox',
  SENT: 'sent',
  DRAFT: 'drafts',
  TRASH: 'trash',
  SPAM: 'spam',
  STARRED: 'starred',
  IMPORTANT: 'imp',
  CHAT: 'chats',
};

// Opens the message's thread in Gmail's "All Mail" view, which works
// regardless of which folder/label the thread currently lives in.
export function getGmailMessageUrl(threadId: string): string {
  return `https://mail.google.com/mail/u/0/#all/${threadId}`;
}

export function getGmailFolderUrl(folderId: string, folderName?: string): string {
  const anchor = SYSTEM_LABEL_ANCHORS[folderId];
  if (anchor) {
    return `https://mail.google.com/mail/u/0/#${anchor}`;
  }
  return `https://mail.google.com/mail/u/0/#label/${encodeURIComponent(folderName || folderId)}`;
}
