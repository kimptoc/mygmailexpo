import { withAuthRetryFactory, GmailApiError } from './gmailApiAuth';

describe('withAuthRetryFactory', () => {
  it('retries once on 401 and succeeds with refreshed token', async () => {
    const ensureToken = jest.fn().mockResolvedValue('token-1');
    const refreshAccessToken = jest.fn().mockResolvedValue('token-2');

    const fn = jest
      .fn()
      .mockRejectedValueOnce(new GmailApiError(401, 'unauthorized'))
      .mockResolvedValueOnce('ok');

    const withAuthRetry = withAuthRetryFactory(ensureToken, refreshAccessToken);
    const result = await withAuthRetry(fn);

    expect(result).toBe('ok');
    expect(fn).toHaveBeenNthCalledWith(1, 'token-1');
    expect(fn).toHaveBeenNthCalledWith(2, 'token-2');
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
  });

  it('throws session expired when refresh fails', async () => {
    const ensureToken = jest.fn().mockResolvedValue('token-1');
    const refreshAccessToken = jest.fn().mockResolvedValue(null);
    const fn = jest.fn().mockRejectedValue(new GmailApiError(401, 'unauthorized'));

    const withAuthRetry = withAuthRetryFactory(ensureToken, refreshAccessToken);

    await expect(withAuthRetry(fn)).rejects.toThrow('Session expired. Please sign in again.');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('propagates non-401 errors without retry', async () => {
    const ensureToken = jest.fn().mockResolvedValue('token-1');
    const refreshAccessToken = jest.fn();
    const error = new GmailApiError(500, 'server');
    const fn = jest.fn().mockRejectedValue(error);

    const withAuthRetry = withAuthRetryFactory(ensureToken, refreshAccessToken);

    await expect(withAuthRetry(fn)).rejects.toBe(error);
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });
});
