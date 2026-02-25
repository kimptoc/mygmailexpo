import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useIsTintWhite } from '@/hooks/use-tint-contrast';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export function LoginScreen() {
  const router = useRouter();
  const { authState, signIn } = useAuth();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const errorColor = useThemeColor({}, 'error');
  const errorBackgroundColor = useThemeColor({}, 'errorBackground');
  const isTintWhite = useIsTintWhite();

  // For the sign-in button text: if tint is white (dark mode), use background color for text
  // Otherwise use white text
  const buttonTextColor = isTintWhite ? backgroundColor : '#FFFFFF';

  const isLoading = authState.status === 'loading';
  const hasError = authState.status === 'error';

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.content}>
        {/* Outer decorative ring */}
        <View style={[styles.iconRing, { borderColor: tintColor + '35' }]}>
          {/* Inner icon container */}
          <View style={[styles.iconContainer, { backgroundColor: tintColor + '28', borderColor: tintColor + '70', borderWidth: 2 }]}>
            <IconSymbol name="envelope.fill" size={80} color={tintColor} />
          </View>
        </View>

        <Text style={[styles.title, { color: textColor }]}>MyGmail</Text>
        <Text style={[styles.subtitle, { color: textColor + 'AA' }]}>
          View your Gmail inbox
        </Text>

        {hasError && (
          <View style={[styles.errorContainer, { backgroundColor: errorBackgroundColor }]}>
            <Text 
              style={[styles.errorText, { color: errorColor }]}
              selectable={true}
            >
              {authState.status === 'error' ? authState.message : ''}
            </Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.signInButton,
            { backgroundColor: tintColor, opacity: pressed ? 0.8 : 1 },
            isLoading && styles.disabledButton,
          ]}
          onPress={signIn}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={buttonTextColor} />
          ) : (
            <>
              <IconSymbol name="person.fill" size={20} color={buttonTextColor} />
              <Text style={[styles.signInButtonText, { color: buttonTextColor }]}>Sign in with Google</Text>
            </>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.infoLink,
            { opacity: pressed ? 0.6 : 1 },
          ]}
          onPress={() => router.push('/info')}
        >
          <IconSymbol name="info.circle" size={20} color={tintColor} />
          <Text style={[styles.infoLinkText, { color: tintColor }]}>App Info</Text>
        </Pressable>

        <Text style={[styles.disclaimer, { color: textColor + '80' }]}>
          This app requires access to your Gmail account to display your inbox.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  iconRing: {
    width: 162,
    height: 162,
    borderRadius: 81,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    textAlign: 'center',
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    gap: 12,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  disclaimer: {
    marginTop: 24,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  infoLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
    gap: 8,
  },
  infoLinkText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
