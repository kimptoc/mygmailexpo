import {
  restoreWebSession,
  shouldRequestConsentPrompt,
  shouldRunEventRefresh,
} from './authSession.web';

describe('authSession.web helpers', () => {
  it('throttles rapid event-triggered refresh calls', () => {
    expect(shouldRunEventRefresh(20_000, 0, 15_000)).toBe(true);
    expect(shouldRunEventRefresh(10_000, 0, 15_000)).toBe(false);
  });

  it('requests consent prompt only when refresh token is missing', () => {
    expect(shouldRequestConsentPrompt(true)).toBe(false);
    expect(shouldRequestConsentPrompt(false)).toBe(true);
  });

  it('restores session with refreshed token when available', async () => {
    const result = await restoreWebSession({
      storedSession: { accessToken: 'stale-token', userEmail: 'user@example.com' },
      refreshToken: 'refresh-token',
      refreshAccessToken: jest.fn().mockResolvedValue('fresh-token'),
      validateAccessToken: jest.fn().mockResolvedValue(false),
    });

    expect(result).toEqual({
      kind: 'authenticated',
      accessToken: 'fresh-token',
      userEmail: 'user@example.com',
      persistUpdatedToken: true,
    });
  });

  it('clears session when refresh and validation both fail', async () => {
    const result = await restoreWebSession({
      storedSession: { accessToken: 'expired-token', userEmail: 'user@example.com' },
      refreshToken: 'refresh-token',
      refreshAccessToken: jest.fn().mockResolvedValue(null),
      validateAccessToken: jest.fn().mockResolvedValue(false),
    });

    expect(result).toEqual({
      kind: 'unauthenticated',
      clearStoredSession: true,
    });
  });

  it('keeps session on transient validation network error', async () => {
    const result = await restoreWebSession({
      storedSession: { accessToken: 'cached-token', userEmail: 'user@example.com' },
      refreshToken: null,
      refreshAccessToken: jest.fn(),
      validateAccessToken: jest.fn().mockRejectedValue(new Error('network')),
    });

    expect(result).toEqual({
      kind: 'authenticated',
      accessToken: 'cached-token',
      userEmail: 'user@example.com',
      persistUpdatedToken: false,
    });
  });
});
