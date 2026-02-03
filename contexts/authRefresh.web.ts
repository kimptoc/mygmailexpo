export async function refreshAccessTokenWithToken(
  refreshToken: string,
  clientId?: string,
  clientSecret?: string
): Promise<string | null> {
  if (!clientId) {
    console.error('Token refresh failed: missing clientId');
    return null;
  }

  console.log('Attempting to refresh access token...');
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret ?? '',
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token refresh failed:', errorData);
      return null;
    }

    const tokens = await tokenResponse.json();
    if (tokens.access_token) {
      console.log('Access token refreshed successfully');
      return tokens.access_token;
    }
    return null;
  } catch (err) {
    console.error('Token refresh error:', err);
    return null;
  }
}
