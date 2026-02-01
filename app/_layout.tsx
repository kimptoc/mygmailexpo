import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View, Text, Button, SafeAreaView } from 'react-native';
import 'react-native-reanimated';
import { useFonts } from 'expo-font';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useState } from 'react';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AppContent() {
  const { authState } = useAuth();
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    ...MaterialIcons.font,
  });

  console.log('AppContent state:', {
    authStatus: authState.status,
    fontsLoaded,
    fontError: fontError?.message || null,
  });

  // Show loading screen while checking auth or loading fonts
  if (authState.status === 'loading' || !fontsLoaded) {
    return (
      <View style={[styles.loadingContainer, colorScheme === 'dark' ? styles.darkBg : styles.lightBg]}>
        <ActivityIndicator size="large" color={colorScheme === 'dark' ? '#fff' : '#0a7ea4'} />
        <Text style={{ marginTop: 20, color: colorScheme === 'dark' ? '#fff' : '#000' }}>
          Auth: {authState.status} | Fonts: {fontsLoaded ? 'loaded' : 'loading'}
          {fontError ? ` | Error: ${fontError.message}` : ''}
        </Text>
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
  console.log('RootLayout rendering...');
  const colorScheme = useColorScheme();
  const [appStarted, setAppStarted] = useState(false);

  if (!appStarted) {
    return (
      <SafeAreaView style={styles.startContainer}>
        <View style={styles.startContent}>
          <Text style={styles.startTitle}>Debug Start Gate</Text>
          <Text style={styles.startText}>Bundle loaded successfully.</Text>
          <Text style={styles.startSubtext}>Press the button below to initialize native providers.</Text>
          <Button title="Start App" onPress={() => setAppStarted(true)} />
        </View>
      </SafeAreaView>
    );
  }

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
  startContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  startContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  startTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  startText: {
    fontSize: 18,
    marginBottom: 5,
    color: 'green',
  },
  startSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
});