import { getGmailMessageUrl, getGmailFolderUrl } from './gmail-web-links';

describe('getGmailMessageUrl', () => {
  it('builds an all-mail permalink from the thread id', () => {
    expect(getGmailMessageUrl('18d2f3a4b5c6')).toBe(
      'https://mail.google.com/mail/u/0/#all/18d2f3a4b5c6'
    );
  });

  it('url-encodes the thread id', () => {
    expect(getGmailMessageUrl('abc/def')).toBe(
      'https://mail.google.com/mail/u/0/#all/abc%2Fdef'
    );
  });
});

describe('getGmailFolderUrl', () => {
  it('maps system labels to their Gmail anchors', () => {
    expect(getGmailFolderUrl('INBOX')).toBe('https://mail.google.com/mail/u/0/#inbox');
    expect(getGmailFolderUrl('SENT')).toBe('https://mail.google.com/mail/u/0/#sent');
    expect(getGmailFolderUrl('DRAFT')).toBe('https://mail.google.com/mail/u/0/#drafts');
    expect(getGmailFolderUrl('TRASH')).toBe('https://mail.google.com/mail/u/0/#trash');
    expect(getGmailFolderUrl('SPAM')).toBe('https://mail.google.com/mail/u/0/#spam');
    expect(getGmailFolderUrl('STARRED')).toBe('https://mail.google.com/mail/u/0/#starred');
  });

  it('builds a label permalink for user labels using the folder name', () => {
    expect(getGmailFolderUrl('Label_123', 'Receipts')).toBe(
      'https://mail.google.com/mail/u/0/#label/Receipts'
    );
  });

  it('url-encodes label names with special characters', () => {
    expect(getGmailFolderUrl('Label_456', 'Work/Projects')).toBe(
      'https://mail.google.com/mail/u/0/#label/Work%2FProjects'
    );
  });

  it('falls back to the folder id when no name is given for a user label', () => {
    expect(getGmailFolderUrl('Label_789')).toBe(
      'https://mail.google.com/mail/u/0/#label/Label_789'
    );
  });
});
