import { base64UrlEncode } from '@/utils/emailEncoder';
import { GmailApiService } from './gmailApi';
import { withAuthRetryFactory, GmailApiError } from './gmailApiAuth';
import { fetchWithBackoff } from './fetchWithBackoff';

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    getAccessToken: jest.fn(),
    refreshAccessToken: jest.fn(),
  }),
}));

jest.mock('./fetchWithBackoff', () => ({
  fetchWithBackoff: jest.fn(),
}));

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

describe('GmailApiService sendEmail', () => {
  const fetchWithBackoffMock = fetchWithBackoff as jest.MockedFunction<typeof fetchWithBackoff>;

  beforeEach(() => {
    fetchWithBackoffMock.mockReset();
  });

  it('posts base64url raw message via fetchWithBackoff', async () => {
    const raw = base64UrlEncode('From: me@example.com\r\nTo: you@example.com\r\nSubject: Hi\r\n\r\nBody');

    expect(raw).toMatch(/^[A-Za-z0-9_-]+$/);

    fetchWithBackoffMock.mockResolvedValue({ ok: true, status: 200 } as Response);

    await GmailApiService.getInstance().sendEmail('token-123', raw);

    expect(fetchWithBackoffMock).toHaveBeenCalledTimes(1);
    expect(fetchWithBackoffMock).toHaveBeenCalledWith(
      'https://www.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw }),
      }
    );
  });
});

describe('GmailApiService batch progress', () => {
  const fetchWithBackoffMock = fetchWithBackoff as jest.MockedFunction<typeof fetchWithBackoff>;

  beforeEach(() => {
    fetchWithBackoffMock.mockReset();
  });

  it('reports progress for each processed email', async () => {
    fetchWithBackoffMock
      .mockResolvedValueOnce({ ok: true, status: 200 } as Response)
      .mockResolvedValueOnce({ ok: true, status: 200 } as Response)
      .mockResolvedValueOnce({ ok: true, status: 200 } as Response);

    const progressEvents: Array<{ processed: number; total: number; succeeded: number; failed: number }> = [];

    const result = await GmailApiService.getInstance().removeLabelFromEmails(
      'token-123',
      ['email-1', 'email-2', 'email-3'],
      'INBOX',
      (progress) => progressEvents.push(progress)
    );

    expect(result.succeeded).toHaveLength(3);
    expect(result.failed).toHaveLength(0);
    expect(progressEvents).toEqual([
      { processed: 1, total: 3, succeeded: 1, failed: 0 },
      { processed: 2, total: 3, succeeded: 2, failed: 0 },
      { processed: 3, total: 3, succeeded: 3, failed: 0 },
    ]);
  });

  it('includes failures in progress counts', async () => {
    fetchWithBackoffMock
      .mockResolvedValueOnce({ ok: true, status: 200 } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({ error: { message: 'Bad request' } }),
      } as unknown as Response)
      .mockResolvedValueOnce({ ok: true, status: 200 } as Response);

    const progressEvents: Array<{ processed: number; total: number; succeeded: number; failed: number }> = [];

    const result = await GmailApiService.getInstance().moveEmailsToLabel(
      'token-123',
      ['email-1', 'email-2', 'email-3'],
      'TARGET',
      'INBOX',
      (progress) => progressEvents.push(progress)
    );

    expect(result.succeeded).toHaveLength(2);
    expect(result.failed).toEqual([{ id: 'email-2', error: 'Bad request' }]);
    expect(progressEvents).toHaveLength(3);
    expect(progressEvents.every((event) => event.total === 3)).toBe(true);
    expect(progressEvents.map((event) => event.processed)).toEqual([1, 2, 3]);
    expect(progressEvents.some((event) => event.failed >= 1)).toBe(true);
    expect(progressEvents[2]).toEqual({
      processed: 3,
      total: 3,
      succeeded: 2,
      failed: 1,
    });
  });
});
