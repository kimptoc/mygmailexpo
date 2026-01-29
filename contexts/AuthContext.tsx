import { AuthState } from '@/types/gmail';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

// Conditionally import based on platform
// Native platforms use @react-native-google-signin
// Web uses expo-auth-session
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

// Required for web browser to close after auth (web only)
if (Platform.OS === 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

// Google OAuth client IDs
const WEB_CLIENT_ID = '767000337742-8ld4hre5nr02mu27dc5hj3i0r05p2vg4.apps.googleusercontent.com';
const IOS_CLIENT_ID = '767000337742-bfpst90t6dbi14qal5k67la0omjifqgg.apps.googleusercontent.com';
// Web client secret - required for web application OAuth token exchange
const WEB_CLIENT_SECRET = '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';

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

// Web Auth Provider - uses manual OAuth flow for better control
function WebAuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({ status: 'unauthenticated' });
  const AUTH_STORAGE_KEY = '@auth_session';
  const REFRESH_TOKEN_KEY = '@refresh_token';

  // Fixed redirect URI - must match Google Cloud Console exactly
  const redirectUri = (() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return '';
    
    const origin = window.location.origin;

    // Use Expo's helper for local development to get the most compatible URI
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return AuthSession.makeRedirectUri({
        native: undefined,
        preferLocalhost: true,
      });
    }

    // Default for production (GitHub Pages)
    return 'https://kimptoc.github.io/mygmailexpo/';
  })();

  // Google OAuth endpoints
  const discovery = {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
  };

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: WEB_CLIENT_ID,
      iosClientId: IOS_CLIENT_ID,
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
          client_id: WEB_CLIENT_ID,
          client_secret: WEB_CLIENT_SECRET,
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
          client_id: WEB_CLIENT_ID,
          client_secret: WEB_CLIENT_SECRET,
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
