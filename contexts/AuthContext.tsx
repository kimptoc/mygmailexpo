import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { AuthState } from '@/types/gmail';

// Required for web browser to close after auth
WebBrowser.maybeCompleteAuthSession();

// Google OAuth client IDs
const WEB_CLIENT_ID = '767000337742-8ld4hre5nr02mu27dc5hj3i0r05p2vg4.apps.googleusercontent.com';

// Gmail API scopes
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
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

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({ status: 'unauthenticated' });

  // Use Google provider with proper configuration
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: WEB_CLIENT_ID,
    iosClientId: WEB_CLIENT_ID,
    webClientId: WEB_CLIENT_ID,
    expoClientId: WEB_CLIENT_ID,
    scopes: SCOPES,
  });

  useEffect(() => {
    console.log('Google Auth Request:', request?.url);
  }, [request]);

  // Handle auth response
  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      console.log('Auth success, token:', authentication?.accessToken ? 'received' : 'missing');

      if (authentication?.accessToken) {
        fetchUserInfo(authentication.accessToken);
      } else {
        setAuthState({
          status: 'error',
          message: 'No access token received',
        });
      }
    } else if (response?.type === 'error') {
      console.log('Auth error:', response.error);
      setAuthState({
        status: 'error',
        message: response.error?.message || 'Authentication failed',
      });
    } else if (response?.type === 'dismiss' || response?.type === 'cancel') {
      setAuthState({ status: 'unauthenticated' });
    }
  }, [response]);

  const fetchUserInfo = async (accessToken: string) => {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userInfo = await res.json();

      setAuthState({
        status: 'authenticated',
        userEmail: userInfo.email,
        accessToken: accessToken,
      });
    } catch (error) {
      console.log('Failed to fetch user info:', error);
      setAuthState({
        status: 'error',
        message: 'Failed to fetch user info',
      });
    }
  };

  const signIn = useCallback(async () => {
    if (!request) {
      console.log('Auth request not ready');
      return;
    }

    setAuthState({ status: 'loading' });
    try {
      console.log('Starting auth with redirect URI:', request.redirectUri);
      // Use proxy for native platforms to go through auth.expo.io
      const options = Platform.OS !== 'web' ? { useProxy: true } : undefined;
      await promptAsync(options);
    } catch (error) {
      console.log('Sign in error:', error);
      setAuthState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Sign in failed',
      });
    }
  }, [request, promptAsync]);

  const signOut = useCallback(() => {
    setAuthState({ status: 'unauthenticated' });
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
