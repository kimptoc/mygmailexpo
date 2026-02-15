import { AuthState } from '@/types/gmail';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { refreshAccessTokenWithToken } from './authRefresh.web';
import {
  EVENT_REFRESH_GUARD_MS,
  restoreWebSession,
  shouldRequestConsentPrompt,
  shouldRunEventRefresh,
} from './authSession.web';

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
  refreshAccessToken: () => Promise<string | null>;
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
  const REFRESH_INTERVAL_MS = 45 * 60 * 1000;
  const authStateRef = useRef<AuthState>(authState);
  const refreshInFlightRef = useRef<Promise<string | null> | null>(null);
  const lastRefreshAttemptMsRef = useRef(0);

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

  const hasStoredRefreshToken = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return !!window.localStorage.getItem(REFRESH_TOKEN_KEY);
  }, [REFRESH_TOKEN_KEY]);

  const shouldPromptConsent = shouldRequestConsentPrompt(hasStoredRefreshToken);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: webClientId,
      scopes: SCOPES,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      extraParams: {
        access_type: 'offline',
        include_granted_scopes: 'true',
        ...(shouldPromptConsent ? { prompt: 'consent' } : {}),
      },
    },
    discovery
  );

  useEffect(() => {
    authStateRef.current = authState;
  }, [authState]);

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
      if (!stored) return;

      setAuthState({ status: 'loading' });
      const parsedStoredSession = JSON.parse(stored);
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);

      const result = await restoreWebSession({
        storedSession: parsedStoredSession,
        refreshToken,
        refreshAccessToken: (token) =>
          refreshAccessTokenWithToken(token, webClientId, webClientSecret),
        validateAccessToken: async (accessToken) => {
          const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          return res.ok;
        },
      });

      if (result.kind === 'authenticated') {
        setAuthState({
          status: 'authenticated',
          userEmail: result.userEmail,
          accessToken: result.accessToken,
        });
        if (result.persistUpdatedToken) {
          await AsyncStorage.setItem(
            AUTH_STORAGE_KEY,
            JSON.stringify({
              accessToken: result.accessToken,
              userEmail: result.userEmail,
            })
          );
        }
      } else {
        setAuthState({ status: 'unauthenticated' });
        if (result.clearStoredSession) {
          await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
          await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
        }
      }
    } catch (error) {
      console.error('Failed to load session', error);
      setAuthState({ status: 'unauthenticated' });
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

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const currentState = authStateRef.current;
    if (currentState.status !== 'authenticated') return null;

    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    refreshInFlightRef.current = (async () => {
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) return null;

      const newAccessToken = await refreshAccessTokenWithToken(refreshToken, webClientId, webClientSecret);
      if (newAccessToken) {
        setAuthState((prev) => {
          if (prev.status !== 'authenticated') return prev;
          return { ...prev, accessToken: newAccessToken };
        });
        await AsyncStorage.setItem(
          AUTH_STORAGE_KEY,
          JSON.stringify({
            accessToken: newAccessToken,
            userEmail: currentState.userEmail,
          })
        );
      }
      return newAccessToken;
    })();

    try {
      return await refreshInFlightRef.current;
    } finally {
      refreshInFlightRef.current = null;
    }
  }, [AUTH_STORAGE_KEY, REFRESH_TOKEN_KEY]);

  useEffect(() => {
    if (authState.status !== 'authenticated') return;

    const refreshNow = (trigger: 'event' | 'interval') => {
      if (trigger === 'event') {
        const now = Date.now();
        if (!shouldRunEventRefresh(now, lastRefreshAttemptMsRef.current, EVENT_REFRESH_GUARD_MS)) {
          return;
        }
        lastRefreshAttemptMsRef.current = now;
      }

      refreshAccessToken().catch((error) => {
        console.warn('Proactive token refresh failed:', error);
      });
    };

    const intervalId = setInterval(() => refreshNow('interval'), REFRESH_INTERVAL_MS);

    const onWindowFocus = () => refreshNow('event');
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshNow('event');
    };

    window.addEventListener('focus', onWindowFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', onWindowFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [authState.status, refreshAccessToken]);

  return (
    <AuthContext.Provider value={{ authState, signIn, signOut, getAccessToken, refreshAccessToken }}>
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
