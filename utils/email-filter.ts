export interface FilterableEmail {
  subject: string;
  from: string;
  snippet: string;
  labelIds: string[];
}

// Case-insensitive match against subject/sender/snippet.
export function matchesEmailSearch(email: FilterableEmail, searchQuery: string): boolean {
  const normalized = searchQuery.trim().toLowerCase();
  if (!normalized) return true;
  const haystack = `${email.subject} ${email.from} ${email.snippet}`.toLowerCase();
  return haystack.includes(normalized);
}

export function filterEmails<T extends FilterableEmail>(
  emails: T[],
  { labelId, searchQuery }: { labelId?: string | null; searchQuery?: string }
): T[] {
  return emails.filter(email => {
    if (labelId && !email.labelIds.includes(labelId)) return false;
    return matchesEmailSearch(email, searchQuery ?? '');
  });
}
