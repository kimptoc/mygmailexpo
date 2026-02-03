export class GmailApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const withAuthRetryFactory = (
  ensureToken: () => Promise<string>,
  refreshAccessToken: () => Promise<string | null>
) => {
  return async <T>(fn: (token: string) => Promise<T>): Promise<T> => {
    const token = await ensureToken();
    try {
      return await fn(token);
    } catch (error) {
      if (error instanceof GmailApiError && error.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          return await fn(refreshed);
        }
        throw new Error('Session expired. Please sign in again.');
      }
      throw error;
    }
  };
};
