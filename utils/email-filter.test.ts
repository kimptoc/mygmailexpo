import { matchesEmailSearch, filterEmails, FilterableEmail } from './email-filter';

const makeEmail = (overrides: Partial<FilterableEmail> = {}): FilterableEmail => ({
  subject: 'Quarterly report',
  from: 'Alice <alice@example.com>',
  snippet: 'Please find attached the numbers',
  labelIds: ['INBOX', 'Label_1'],
  ...overrides,
});

describe('matchesEmailSearch', () => {
  it('matches with an empty query', () => {
    expect(matchesEmailSearch(makeEmail(), '')).toBe(true);
    expect(matchesEmailSearch(makeEmail(), '   ')).toBe(true);
  });

  it('matches case-insensitively against the subject', () => {
    expect(matchesEmailSearch(makeEmail(), 'QUARTERLY')).toBe(true);
  });

  it('matches against the sender', () => {
    expect(matchesEmailSearch(makeEmail(), 'alice@example.com')).toBe(true);
  });

  it('matches against the snippet', () => {
    expect(matchesEmailSearch(makeEmail(), 'attached')).toBe(true);
  });

  it('returns false when nothing matches', () => {
    expect(matchesEmailSearch(makeEmail(), 'invoice')).toBe(false);
  });
});

describe('filterEmails', () => {
  const emails = [
    makeEmail({ subject: 'Quarterly report', labelIds: ['INBOX', 'Label_finance'] }),
    makeEmail({ subject: 'Team lunch', from: 'Bob <bob@example.com>', labelIds: ['INBOX', 'Label_social'] }),
    makeEmail({ subject: 'Invoice #42', labelIds: ['INBOX'] }),
  ];

  it('returns all emails when no filters are set', () => {
    expect(filterEmails(emails, {})).toHaveLength(3);
  });

  it('filters by label id', () => {
    const result = filterEmails(emails, { labelId: 'Label_finance' });
    expect(result).toEqual([emails[0]]);
  });

  it('filters by search query', () => {
    const result = filterEmails(emails, { searchQuery: 'invoice' });
    expect(result).toEqual([emails[2]]);
  });

  it('combines label and search filters with AND semantics', () => {
    const result = filterEmails(emails, { labelId: 'INBOX', searchQuery: 'lunch' });
    expect(result).toEqual([emails[1]]);
  });

  it('excludes everything when the label filter matches nothing', () => {
    const result = filterEmails(emails, { labelId: 'Label_does_not_exist' });
    expect(result).toEqual([]);
  });
});
