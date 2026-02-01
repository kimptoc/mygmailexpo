import { AuthState } from '@/types/gmail';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

// Required for web browser to close after auth
WebBrowser.maybeCompleteAuthSession();

// Google OAuth client IDs and secret from app.json
const googleConfig = Constants.expoConfig?.extra?.google ?? {};
const webClientId = googleConfig.webClientId;
const webClientSecret = googleConfig.webClientSecret;

if (!webClientId) {
  console.warn(
    'Google OAuth web client ID is missing. Please ensure it is set in app.json under extra.google'
  );
}

// Gmail API scopes
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

interface AuthContextType {
  authState: AuthState;
  signIn: () => Promise<void>;
  signOut: () => void;
  getAccessToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Web Auth Provider - uses manual OAuth flow for better control
export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({ status: 'unauthenticated' });
  const AUTH_STORAGE_KEY = '@auth_session';
  const REFRESH_TOKEN_KEY = '@refresh_token';

  // Fixed redirect URI - must match Google Cloud Console exactly
  const redirectUri = (() => {
    if (typeof window === 'undefined') return '';

    const origin = window.location.origin;

    // For localhost development - must match Google Cloud Console exactly
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return origin;
    }

    // For production (GitHub Pages)
    return 'https://kimptoc.github.io/mygmailexpo/';
  })();

  // Google OAuth endpoints
  const discovery = {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
  };

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: webClientId,
      scopes: SCOPES,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    },
    discovery
  );

  useEffect(() => {
    if (request) {
      console.log('Auth Request initialized with Redirect URI:', request.redirectUri);
      console.log('Code Verifier present:', !!request.codeVerifier);
    } else {
      console.log('Auth Request is null');
    }
  }, [request]);

  useEffect(() => {
    checkStoredSession();
  }, []);

  const checkStoredSession = async () => {
    try {
      const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const { accessToken, userEmail } = JSON.parse(stored);

        // Validate token by attempting to fetch user info
        try {
          const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (res.ok) {
            setAuthState({
              status: 'authenticated',
              userEmail,
              accessToken,
            });
          } else {
            // Token expired or invalid - try to refresh
            console.log('Access token invalid, attempting refresh...');
            const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);

            if (refreshToken) {
              const newAccessToken = await refreshAccessToken(refreshToken);
              if (newAccessToken) {
                // Update stored session with new access token
                await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
                  accessToken: newAccessToken,
                  userEmail,
                }));
                setAuthState({
                  status: 'authenticated',
                  userEmail,
                  accessToken: newAccessToken,
                });
                return;
              }
            }

            // Refresh failed or no refresh token - clear session
            await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
            await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
            setAuthState({ status: 'unauthenticated' });
          }
        } catch {
          // Network error or failed to validate
          // For safety, clear session if we can't validate
          await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
          await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
          setAuthState({ status: 'unauthenticated' });
        }
      }
    } catch (error) {
      console.error('Failed to load session', error);
    }
  };

  useEffect(() => {
    if (response?.type === 'success') {
      console.log('Auth response success, code:', !!response.params?.code);
      // Validate all required parameters before token exchange
      if (response.params?.code && request?.codeVerifier && redirectUri) {
        exchangeCodeForToken(response.params.code, request.codeVerifier);
      } else {
        console.error('Missing required auth parameters', {
          hasCode: !!response.params?.code,
          hasVerifier: !!request?.codeVerifier,
          hasRedirectUri: !!redirectUri
        });
        setAuthState({
          status: 'error',
          message: 'Missing authorization code, verifier, or redirect URI',
        });
      }
    } else if (response?.type === 'error') {
      console.error('Auth response error:', response.error);
      setAuthState({
        status: 'error',
        message: response.error?.message || 'Authentication failed',
      });
    }
  }, [response, request, redirectUri]);

  const exchangeCodeForToken = async (code: string, codeVerifier: string) => {
    console.log('Exchanging code for token...');
    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: webClientId,
          client_secret: webClientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          code_verifier: codeVerifier,
        }).toString(),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error('Token exchange failed:', errorData);
        throw new Error(`Token exchange failed: ${errorData}`);
      }

      const tokens = await tokenResponse.json();
      console.log('Token exchange successful');

      // Store refresh token if available
      if (tokens.refresh_token) {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
        console.log('Refresh token stored');
      }

      if (tokens.access_token) {
        fetchUserInfo(tokens.access_token);
      } else {
        throw new Error('No access_token in token response');
      }
    } catch (err: any) {
      console.error('Code exchange error:', err);
      setAuthState({
        status: 'error',
        message: err.message || 'Failed to exchange authorization code',
      });
    }
  };

  const refreshAccessToken = async (refreshToken: string): Promise<string | null> => {
    console.log('Attempting to refresh access token...');
    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: webClientId,
          client_secret: webClientSecret,
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
  };

  const fetchUserInfo = async (accessToken: string) => {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userInfo = await res.json();

      const newState: AuthState = {
        status: 'authenticated',
        userEmail: userInfo.email,
        accessToken: accessToken,
      };

      setAuthState(newState);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
        accessToken,
        userEmail: userInfo.email,
      }));
    } catch {
      setAuthState({
        status: 'error',
        message: 'Failed to fetch user info',
      });
    }
  };

  const signIn = useCallback(async () => {
    console.log('Sign in pressed');
    if (!request) {
      console.error('Sign in aborted: Request is null');
      // Handle case where request is null (e.g., due to CORS issues in web deployment)
      setAuthState({
        status: 'error',
        message: 'Authentication configuration error. Check console for details.'
      });
      return;
    }
    console.log('Prompting async auth...');
    setAuthState({ status: 'loading' });
    try {
      await promptAsync();
    } catch (e) {
      console.error('Prompt async error:', e);
      setAuthState({ status: 'unauthenticated' });
    }
  }, [request, promptAsync]);

  const signOut = useCallback(async () => {
    setAuthState({ status: 'unauthenticated' });
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
  }, []);

  const getAccessToken = useCallback(() => {
    if (authState.status === 'authenticated') {
      return authState.accessToken;
    }
    return null;
  }, [authState]);

  return (
    <AuthContext.Provider value={{ authState, signIn, signOut, getAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
