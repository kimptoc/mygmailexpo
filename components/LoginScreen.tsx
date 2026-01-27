import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColor } from '@/hooks/use-theme-color';
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

  const isLoading = authState.status === 'loading';
  const hasError = authState.status === 'error';

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: tintColor + '20' }]}>
          <IconSymbol name="envelope.fill" size={80} color={tintColor} />
        </View>

        <Text style={[styles.title, { color: textColor }]}>MyGmail</Text>
        <Text style={[styles.subtitle, { color: textColor + 'AA' }]}>
          View your Gmail inbox
        </Text>

        {hasError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
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
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <IconSymbol name="person.fill" size={20} color="#fff" />
              <Text style={styles.signInButtonText}>Sign in with Google</Text>
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
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
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
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    color: '#C62828',
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
    color: '#fff',
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
