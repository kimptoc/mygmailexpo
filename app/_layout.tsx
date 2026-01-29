import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';
import { useFonts } from 'expo-font';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AppContent() {
  const { authState } = useAuth();
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    ...MaterialIcons.font,
  });

  // Show loading screen while checking auth or loading fonts
  if (authState.status === 'loading' || !fontsLoaded) {
    return (
      <View style={[styles.loadingContainer, colorScheme === 'dark' ? styles.darkBg : styles.lightBg]}>
        <ActivityIndicator size="large" color={colorScheme === 'dark' ? '#fff' : '#0a7ea4'} />
      </View>
    );
  }

  // Show different stack depending on authentication status
  if (authState.status !== 'authenticated') {
    return (
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="info" options={{ headerShown: true, title: 'Info' }} />
      </Stack>
    );
  }

  // Show stack navigator when authenticated
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="email/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="folder/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="folders" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      <Stack.Screen name="info" options={{ headerShown: true, title: 'Info' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ToastProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AppContent />
          <StatusBar style="auto" />
        </ThemeProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightBg: {
    backgroundColor: '#fff',
  },
  darkBg: {
    backgroundColor: '#151718',
  },
});