import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthState } from '@/types/gmail';

// Conditionally import based on platform
// Native platforms use @react-native-google-signin
// Web uses expo-auth-session
import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

// Required for web browser to close after auth (web only)
if (Platform.OS === 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

// Google OAuth client IDs
const WEB_CLIENT_ID = '767000337742-8ld4hre5nr02mu27dc5hj3i0r05p2vg4.apps.googleusercontent.com';
const IOS_CLIENT_ID = '767000337742-bfpst90t6dbi14qal5k67la0omjifqgg.apps.googleusercontent.com';

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

// Native (iOS/Android) Auth Provider
function NativeAuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({ status: 'unauthenticated' });

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      iosClientId: IOS_CLIENT_ID,
      scopes: SCOPES,
      offlineAccess: true,
    });
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

  return (
    <AuthContext.Provider value={{ authState, signIn, signOut, getAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}

// Web Auth Provider
function WebAuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({ status: 'unauthenticated' });
  const AUTH_STORAGE_KEY = '@auth_session';

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: WEB_CLIENT_ID,
    scopes: SCOPES,
  });

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
            // Token expired or invalid
            await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
            setAuthState({ status: 'unauthenticated' });
          }
        } catch {
          // Network error or failed to validate
          // For safety, clear session if we can't validate
          await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
          setAuthState({ status: 'unauthenticated' });
        }
      }
    } catch (error) {
      console.error('Failed to load session', error);
    }
  };

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        fetchUserInfo(authentication.accessToken);
      } else {
        setAuthState({
          status: 'error',
          message: 'No access token received',
        });
      }
    } else if (response?.type === 'error') {
      setAuthState({
        status: 'error',
        message: response.error?.message || 'Authentication failed',
      });
    }
  }, [response]);

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
    if (!request) {
      return;
    }
    setAuthState({ status: 'loading' });
    await promptAsync();
  }, [request, promptAsync]);

  const signOut = useCallback(async () => {
    setAuthState({ status: 'unauthenticated' });
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
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

// Main Auth Provider that selects the right implementation
export function AuthProvider({ children }: AuthProviderProps) {
  if (Platform.OS === 'web') {
    return <WebAuthProvider>{children}</WebAuthProvider>;
  }
  return <NativeAuthProvider>{children}</NativeAuthProvider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
