import { getSelectionAction } from './folder-actions';

describe('getSelectionAction', () => {
  it('returns "archive" for INBOX', () => {
    expect(getSelectionAction('INBOX')).toBe('archive');
  });

  it('returns "remove-label" for a user label id', () => {
    expect(getSelectionAction('Label_123')).toBe('remove-label');
    expect(getSelectionAction('Label_abc')).toBe('remove-label');
  });

  it('returns "none" for Gmail system pseudo-labels', () => {
    for (const id of ['TRASH', 'SENT', 'DRAFTS', 'SPAM', 'STARRED', 'IMPORTANT', 'UNREAD']) {
      expect(getSelectionAction(id)).toBe('none');
    }
  });

  it('returns "none" for CATEGORY_* labels', () => {
    expect(getSelectionAction('CATEGORY_PROMOTIONS')).toBe('none');
    expect(getSelectionAction('CATEGORY_SOCIAL')).toBe('none');
    expect(getSelectionAction('CATEGORY_UPDATES')).toBe('none');
    expect(getSelectionAction('CATEGORY_FORUMS')).toBe('none');
    expect(getSelectionAction('CATEGORY_PERSONAL')).toBe('none');
  });
});
