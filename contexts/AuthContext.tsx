import { AuthState } from '@/types/gmail';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';

// Google OAuth client IDs from app.json
const googleConfig =
  Constants.expoConfig?.extra?.google ??
  (Constants.manifest as any)?.extra?.google ??
  (Constants.manifest2 as any)?.extra?.google ??
  {};
const webClientId = googleConfig.webClientId;
const iosClientId = googleConfig.iosClientId;

if (!webClientId || !iosClientId) {
  console.warn(
    'Google OAuth client IDs are missing. Please ensure they are set in app.json under extra.google'
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

// Native (iOS/Android) Auth Provider
export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({ status: 'unauthenticated' });

  useEffect(() => {
    console.log('[Debug] Platform:', Platform.OS);
    console.log('[Debug] Constants keys:', Object.keys(Constants));
    console.log('[Debug] expoConfig keys:', Object.keys(Constants.expoConfig || {}));
    console.log('[Debug] manifest keys:', Object.keys(Constants.manifest || {}));
    console.log('[Debug] manifest2 keys:', Object.keys(Constants.manifest2 || {}));
    console.log('[Debug] extra:', Constants.expoConfig?.extra || (Constants.manifest as any)?.extra || (Constants.manifest2 as any)?.extra);
    
    console.log('[Debug] Resolved webClientId:', webClientId);
    console.log('[Debug] Resolved iosClientId:', iosClientId);

    if (!iosClientId) {
      console.error('[Debug] CRITICAL: iosClientId is missing! Skipping GoogleSignin.configure to prevent crash.');
      return;
    }

    try {
      GoogleSignin.configure({
        webClientId: webClientId,
        iosClientId: iosClientId,
        scopes: SCOPES,
        offlineAccess: true,
      });
      console.log('[Debug] GoogleSignin.configure called successfully');
    } catch (e) {
      console.error('[Debug] GoogleSignin.configure failed:', e);
    }
    
    checkCurrentUser();
  }, []);


  const checkCurrentUser = async () => {
    try {
      const response: any = await GoogleSignin.signInSilently();
      if (isSuccessResponse(response)) {
        await fetchAccessTokenAndSetState(response.data.user.email);
      }
    } catch {
      // No existing session
    }
  };

  const fetchAccessTokenAndSetState = async (email: string) => {
    try {
      const tokens = await GoogleSignin.getTokens();
      if (tokens.accessToken) {
        setAuthState({
          status: 'authenticated',
          userEmail: email,
          accessToken: tokens.accessToken,
        });
      } else {
        throw new Error('No access token received');
      }
    } catch {
      setAuthState({
        status: 'error',
        message: 'Failed to get access token',
      });
    }
  };

  const signIn = useCallback(async () => {
    setAuthState({ status: 'loading' });

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      if (isSuccessResponse(response)) {
        await fetchAccessTokenAndSetState(response.data.user.email);
      } else if ((response as any).type === 'success' && (response as any).data?.user?.email) {
        await fetchAccessTokenAndSetState((response as any).data.user.email);
      } else {
        setAuthState({ status: 'unauthenticated' });
      }
    } catch (error) {
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            setAuthState({ status: 'unauthenticated' });
            break;
          case statusCodes.IN_PROGRESS:
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            setAuthState({
              status: 'error',
              message: 'Google Play Services not available',
            });
            break;
          default:
            setAuthState({
              status: 'error',
              message: error.message || 'Sign in failed',
            });
        }
      } else {
        setAuthState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Sign in failed',
        });
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await GoogleSignin.signOut();
    } catch {
      // Ignore sign out errors
    }
    setAuthState({ status: 'unauthenticated' });
  }, []);

  const getAccessToken = useCallback(() => {
    if (authState.status === 'authenticated') {
      return authState.accessToken;
    }
    return null;
  }, [authState]);

  const refreshAccessToken = useCallback(async () => {
    if (authState.status !== 'authenticated') return null;

    try {
      if (Platform.OS === 'android') {
        await GoogleSignin.clearCachedAccessToken(authState.accessToken);
      }
      const tokens = await GoogleSignin.getTokens();
      if (tokens.accessToken) {
        setAuthState((prev) => {
          if (prev.status !== 'authenticated') return prev;
          return { ...prev, accessToken: tokens.accessToken };
        });
        return tokens.accessToken;
      }
    } catch (error) {
      console.error('Failed to refresh access token:', error);
    }
    return null;
  }, [authState]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refreshAccessToken();
      }
    });

    return () => subscription.remove();
  }, [refreshAccessToken]);

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
