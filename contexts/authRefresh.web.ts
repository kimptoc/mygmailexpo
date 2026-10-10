export async function refreshAccessTokenWithToken(
  refreshToken: string
): Promise<string | null> {
  if (!refreshToken) {
    console.error('Token refresh failed: missing refreshToken');
    return null;
  }

  console.log('Attempting to refresh access token...');
  try {
    const response = await fetch('/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Token refresh failed:', errorData);
      return null;
    }

    const tokens = await response.json();
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
