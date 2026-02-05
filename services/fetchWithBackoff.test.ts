import { fetchWithBackoff } from './fetchWithBackoff';

describe('fetchWithBackoff', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch as any;
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('returns immediately on success', async () => {
    const res = { ok: true, status: 200 } as Response;
    const fetchMock = jest.fn().mockResolvedValue(res);
    global.fetch = fetchMock as any;

    const result = await fetchWithBackoff('https://example.com', { method: 'GET' });

    expect(result).toBe(res);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries once on 429 with exponential delay then succeeds', async () => {
    jest.useFakeTimers();
    const timeoutSpy = jest.spyOn(global, 'setTimeout');
    const first = { ok: false, status: 429, statusText: 'Too Many Requests' } as Response;
    const second = { ok: true, status: 200 } as Response;
    const fetchMock = jest.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    global.fetch = fetchMock as any;

    const promise = fetchWithBackoff('https://example.com', { method: 'GET' });

    // Let first fetch resolve, then advance timers for backoff.
    await Promise.resolve();
    jest.advanceTimersByTime(400);
    const result = await promise;

    expect(result).toBe(second);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 400);
  });

  it('does not retry on non-retryable error', async () => {
    const res = { ok: false, status: 404, statusText: 'Not Found' } as Response;
    const fetchMock = jest.fn().mockResolvedValue(res);
    global.fetch = fetchMock as any;

    const result = await fetchWithBackoff('https://example.com', { method: 'GET' });

    expect(result).toBe(res);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
