import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { AuthState } from '@/types/gmail';

// Google OAuth client IDs
const WEB_CLIENT_ID = '767000337742-8ld4hre5nr02mu27dc5hj3i0r05p2vg4.apps.googleusercontent.com';
// Android client ID - created with package name and SHA-1 fingerprint
const ANDROID_CLIENT_ID = '767000337742-s5gvjb3andab3c3gbfr7m13sl1eq9o2n.apps.googleusercontent.com';

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
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Configure Google Sign-In on mount
  useEffect(() => {
    console.log('=== CONFIGURING GOOGLE SIGN-IN ===');
    console.log('Platform:', Platform.OS);
    console.log('Web Client ID:', WEB_CLIENT_ID);
    console.log('Scopes:', SCOPES.join(', '));

    GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      scopes: SCOPES,
      offlineAccess: true, // Required to get access token for API calls
    });

    console.log('Google Sign-In configured');
    console.log('==================================');

    // Check if user is already signed in
    checkCurrentUser();
  }, []);

  const checkCurrentUser = async () => {
    try {
      const response = await GoogleSignin.signInSilently();
      console.log('Silent sign-in response:', response);

      if (isSuccessResponse(response)) {
        console.log('User already signed in:', response.data.user.email);
        await fetchAccessTokenAndSetState(response.data.user.email);
      }
    } catch (error) {
      console.log('No existing session or silent sign-in failed:', error);
      // User is not signed in, that's fine
    }
  };

  const fetchAccessTokenAndSetState = async (email: string) => {
    try {
      console.log('=== FETCHING ACCESS TOKEN ===');
      const tokens = await GoogleSignin.getTokens();
      console.log('Access token received:', tokens.accessToken ? 'yes' : 'no');

      if (tokens.accessToken) {
        setAccessToken(tokens.accessToken);
        setAuthState({
          status: 'authenticated',
          userEmail: email,
          accessToken: tokens.accessToken,
        });
        console.log('Auth state set to authenticated for:', email);
      } else {
        throw new Error('No access token received');
      }
      console.log('=============================');
    } catch (error) {
      console.log('Error fetching access token:', error);
      setAuthState({
        status: 'error',
        message: 'Failed to get access token',
      });
    }
  };

  const signIn = useCallback(async () => {
    console.log('=== SIGN IN INITIATED ===');
    setAuthState({ status: 'loading' });

    try {
      // Check if Play Services are available (Android only)
      console.log('Checking Play Services...');
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      console.log('Play Services available');

      // Perform sign-in
      console.log('Starting Google Sign-In...');
      const response = await GoogleSignin.signIn();
      console.log('Sign-in response type:', response.type);
      console.log('Full response:', JSON.stringify(response, null, 2));

      if (isSuccessResponse(response)) {
        const { user } = response.data;
        console.log('Sign-in successful for:', user.email);
        console.log('User info:', JSON.stringify(user, null, 2));

        await fetchAccessTokenAndSetState(user.email);
      } else {
        // User cancelled
        console.log('Sign-in was cancelled');
        setAuthState({ status: 'unauthenticated' });
      }
    } catch (error) {
      console.log('=== SIGN IN ERROR ===');
      console.log('Error:', error);

      if (isErrorWithCode(error)) {
        console.log('Error code:', error.code);
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            console.log('User cancelled sign-in');
            setAuthState({ status: 'unauthenticated' });
            break;
          case statusCodes.IN_PROGRESS:
            console.log('Sign-in already in progress');
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            console.log('Play Services not available');
            setAuthState({
              status: 'error',
              message: 'Google Play Services not available',
            });
            break;
          default:
            console.log('Unknown error code:', error.code);
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
      console.log('=====================');
    }
    console.log('=========================');
  }, []);

  const signOut = useCallback(async () => {
    console.log('=== SIGN OUT ===');
    try {
      await GoogleSignin.signOut();
      console.log('Signed out successfully');
    } catch (error) {
      console.log('Error signing out:', error);
    }
    setAccessToken(null);
    setAuthState({ status: 'unauthenticated' });
    console.log('================');
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
