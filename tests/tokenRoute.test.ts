import { POST } from '@/app/auth/token+api';

function makeRequest(body: unknown, raw?: string): Request {
  return new Request('https://mygmailexpo.expo.app/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: raw ?? JSON.stringify(body),
  });
}

describe('POST /auth/token', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
  });

  afterEach(() => {
    global.fetch = originalFetch as any;
    jest.clearAllMocks();
  });

  it('returns a generic 500 without leaking config state when the secret is missing', async () => {
    delete process.env.GOOGLE_CLIENT_SECRET;
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await POST(makeRequest({ refresh_token: 'r' }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain('GOOGLE_CLIENT_SECRET');
    expect(JSON.stringify(body)).not.toContain('not set');
    errorSpy.mockRestore();
  });

  it('rejects an invalid JSON body', async () => {
    const res = await POST(makeRequest(null, 'not-json'));
    expect(res.status).toBe(400);
  });

  it('requires either code+verifier or refresh_token', async () => {
    const res = await POST(makeRequest({}));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/refresh_token/);
  });

  it('rejects a code without a code_verifier', async () => {
    const res = await POST(
      makeRequest({ code: 'abc', redirect_uri: 'https://mygmailexpo.expo.app/' })
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Missing code_verifier');
  });

  it('rejects an unrecognized redirect_uri', async () => {
    const res = await POST(
      makeRequest({ code: 'abc', code_verifier: 'v', redirect_uri: 'https://evil.example/' })
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Unrecognized redirect_uri');
  });

  it('exchanges an authorization code and returns tokens', async () => {
    const json = jest.fn().mockResolvedValue({
      access_token: 'access-1',
      expires_in: 3600,
      refresh_token: 'refresh-1',
    });
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json } as any);
    global.fetch = fetchMock as any;

    const res = await POST(
      makeRequest({
        code: 'auth-code',
        code_verifier: 'verifier',
        redirect_uri: 'https://mygmailexpo.expo.app/',
      })
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      access_token: 'access-1',
      expires_in: 3600,
      refresh_token: 'refresh-1',
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://oauth2.googleapis.com/token');
    const params = new URLSearchParams(init.body);
    expect(params.get('grant_type')).toBe('authorization_code');
    expect(params.get('code')).toBe('auth-code');
    expect(params.get('code_verifier')).toBe('verifier');
    expect(params.get('redirect_uri')).toBe('https://mygmailexpo.expo.app/');
    expect(params.get('client_secret')).toBe('test-secret');
  });

  it('refreshes a token and does not fabricate a refresh_token', async () => {
    const json = jest.fn().mockResolvedValue({ access_token: 'access-2', expires_in: 3600 });
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json } as any);
    global.fetch = fetchMock as any;

    const res = await POST(makeRequest({ refresh_token: 'refresh-1' }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ access_token: 'access-2', expires_in: 3600 });

    const params = new URLSearchParams(fetchMock.mock.calls[0][1].body);
    expect(params.get('grant_type')).toBe('refresh_token');
    expect(params.get('refresh_token')).toBe('refresh-1');
  });

  it('passes through upstream OAuth errors', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: jest.fn().mockResolvedValue('invalid_grant'),
    } as any) as any;

    const res = await POST(makeRequest({ refresh_token: 'bad' }));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('invalid_grant');
  });
});
