// Single source of truth for Google OAuth client IDs.
// Client IDs are not secrets (they appear in every OAuth request URL), but we
// keep them in one place so the web API route and the auth contexts agree.
export const GOOGLE_WEB_CLIENT_ID =
  '767000337742-euq0beh1mfet700i6barl2bumskrdh3v.apps.googleusercontent.com';

export const GOOGLE_IOS_CLIENT_ID =
  '767000337742-bfpst90t6dbi14qal5k67la0omjifqgg.apps.googleusercontent.com';
