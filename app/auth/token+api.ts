const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const WEB_CLIENT_ID = '767000337742-euq0beh1mfet700i6barl2bumskrdh3v.apps.googleusercontent.com';

const ALLOWED_REDIRECT_URIS = new Set([
  'https://mygmailexpo.expo.app/',
  'http://localhost:8081',
  'http://localhost:8081/',
  'http://localhost:19006',
  'http://localhost:19006/',
]);

function getClientSecret(): string {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) {
    throw new Error('GOOGLE_CLIENT_SECRET is not configured');
  }
  return secret;
}

function reject(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request): Promise<Response> {
  try {
    // EAS Hosting rewrites the Origin header to the deployment's own origin, so
    // an origin allowlist is not a meaningful boundary here. The app and this
    // route are served same-origin. We accept requests and rely on the PKCE
    // code_verifier (auth code exchange) and Google's refresh token (refresh)
    // to gate token issuance, plus the redirect_uri allowlist below.
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

    const params = new URLSearchParams({
      client_id: WEB_CLIENT_ID,
      client_secret: getClientSecret(),
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

    const tokenResponse = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!tokenResponse.ok) {
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
    const message = err instanceof Error ? err.message : 'Token exchange failed';
    return reject(message, 500);
  }
}
