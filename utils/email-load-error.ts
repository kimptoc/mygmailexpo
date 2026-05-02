export function emailLoadErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && (err as { status?: unknown }).status === 404) {
    return 'Email not found — it may have been deleted';
  }
  if (err && typeof err === 'object') {
    const message = (err as { message?: unknown }).message;
    if (typeof message === 'string' && message.length > 0) return message;
  }
  return 'Failed to load email';
}
