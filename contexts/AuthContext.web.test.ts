import { refreshAccessTokenWithToken } from './authRefresh.web';

describe('refreshAccessTokenWithToken', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch as any;
    jest.clearAllMocks();
  });

  it('returns new access token on success', async () => {
    const json = jest.fn().mockResolvedValue({ access_token: 'new-token' });
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json,
    } as any);
    global.fetch = fetchMock as any;

    const result = await refreshAccessTokenWithToken('refresh-token', 'client-id', 'client-secret');

    expect(result).toBe('new-token');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/token',
      expect.objectContaining({ method: 'POST' })
    );
    expect(json).toHaveBeenCalled();
  });

  it('returns null on failure', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      text: jest.fn().mockResolvedValue('error'),
    } as any);
    global.fetch = fetchMock as any;

    const result = await refreshAccessTokenWithToken('refresh-token', 'client-id', 'client-secret');

    expect(result).toBeNull();
  });
});
