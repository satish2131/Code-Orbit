import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Ionicons } from '@expo/vector-icons';
import { Image, View } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useSessionSocket } from '../hooks/useSessionSocket';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Keep native splash screen visible while loading critical initial assets & restoring auth session
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore error if already hidden or on web */
});

const HERO_IMAGE = require('../assets/images/auth_hero_banner.png');

// AuthGate: the single, authoritative source of navigation decisions.
// This component runs INSIDE the Stack navigator (so expo-router is ready),
// and handles the redirect when auth status changes.
function AuthGate() {
  const { status } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (status === 'AUTH_LOADING') return; // Don't navigate while hydrating

    const inMainGroup = segments[0] === '(main)';
    const inAuthGroup = segments[0] === '(auth)';
    const atIndex     = !segments[0] || segments[0] === 'index';

    if (status === 'AUTHENTICATED') {
      // Only redirect to home if currently on auth/index screens
      if (inAuthGroup || atIndex) {
        console.log('[AUTH] AuthGate: authenticated → /(main)/home');
        router.replace('/(main)/home');
      }
    } else {
      // UNAUTHENTICATED: redirect away from protected screens
      if (inMainGroup) {
        console.log('[AUTH] AuthGate: unauthenticated → /(auth)/welcome');
        router.replace('/(auth)/welcome');
      }
    }
  }, [status, segments]);

  return null;
}

export default function RootLayout() {
  const { restoreSession, status, user } = useAuthStore();
  const { initializeSocket } = useSessionSocket();
  const [appIsReady, setAppIsReady] = useState(false);

  // Phase 1: preload assets + restore session (run once)
  useEffect(() => {
    async function prepareInitialRender() {
      console.log('[AUTH] App starting — preloading assets and restoring session...');
      try {
        await Promise.all([
          Font.loadAsync(Ionicons.font),
          Image.prefetch(Image.resolveAssetSource(HERO_IMAGE).uri).catch(() => {}),
          restoreSession(),
        ]);
      } catch (error) {
        console.warn('[AUTH] Initialization error:', error);
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync().catch(() => {});
        console.log('[AUTH] App ready, status =', useAuthStore.getState().status);
      }
    }
    prepareInitialRender();
  }, []);

  // Phase 2: connect socket when user becomes available
  useEffect(() => {
    if (user?.id && appIsReady) {
      try {
        const cleanup = initializeSocket();
        return cleanup;
      } catch (err) {
        console.warn('[AUTH] Socket initialization error:', err);
      }
    }
  }, [user?.id, appIsReady]);

  // Show blank screen while preparing (SplashScreen is still visible)
  if (!appIsReady) {
    return <View style={{ flex: 1, backgroundColor: '#17181A' }} />;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#17181A' },
            headerTintColor: '#fff',
            contentStyle: { backgroundColor: '#17181A' },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(main)" options={{ headerShown: false }} />
          <Stack.Screen name="session/[code]" options={{ headerShown: false }} />
        </Stack>

        {/* AuthGate lives inside Stack so expo-router navigation APIs are ready */}
        <AuthGate />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
