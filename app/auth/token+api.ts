import { GOOGLE_WEB_CLIENT_ID } from '@/constants/google';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

const ALLOWED_REDIRECT_URIS = new Set([
  'https://mygmailexpo.expo.app/',
  'http://localhost:8081',
  'http://localhost:8081/',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:8081/',
  'http://localhost:19006',
  'http://localhost:19006/',
  'http://127.0.0.1:19006',
  'http://127.0.0.1:19006/',
]);

function reject(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request): Promise<Response> {
  // EAS Hosting rewrites the Origin header to the deployment's own origin, so
  // an origin allowlist is not a meaningful boundary here. The app and this
  // route are served same-origin, so we rely on the PKCE code_verifier (auth
  // code exchange) and Google's refresh token (refresh) to gate token issuance,
  // plus the redirect_uri allowlist below.
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return reject('Invalid JSON body');
  }

  const code = typeof body.code === 'string' ? body.code : '';
  const codeVerifier = typeof body.code_verifier === 'string' ? body.code_verifier : '';
  const refreshToken = typeof body.refresh_token === 'string' ? body.refresh_token : '';
  const redirectUri = typeof body.redirect_uri === 'string' ? body.redirect_uri : '';

  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientSecret) {
    // Log server-side only; never surface internal config state to the client.
    console.error('Token route misconfigured: GOOGLE_CLIENT_SECRET is not set');
    return reject('Token exchange failed', 500);
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_WEB_CLIENT_ID,
    client_secret: clientSecret,
  });

  if (code) {
    if (!codeVerifier) return reject('Missing code_verifier');
    if (!ALLOWED_REDIRECT_URIS.has(redirectUri)) return reject('Unrecognized redirect_uri');
    params.set('grant_type', 'authorization_code');
    params.set('code', code);
    params.set('code_verifier', codeVerifier);
    params.set('redirect_uri', redirectUri);
  } else if (refreshToken) {
    params.set('grant_type', 'refresh_token');
    params.set('refresh_token', refreshToken);
  } else {
    return reject('Provide either code + code_verifier or refresh_token');
  }

  try {
    const tokenResponse = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!tokenResponse.ok) {
      // Pass through the OAuth error (invalid_grant, invalid_client, ...).
      const errorText = await tokenResponse.text();
      return reject(errorText, tokenResponse.status);
    }

    const tokens = await tokenResponse.json();

    return Response.json({
      access_token: tokens.access_token,
      expires_in: tokens.expires_in,
      ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
    });
  } catch (err) {
    console.error('Token route error:', err);
    return reject('Token exchange failed', 500);
  }
}
