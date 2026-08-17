import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
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

export default function RootLayout() {
  const { user, restoreSession } = useAuthStore();
  const { initializeSocket } = useSessionSocket();
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepareInitialRender() {
      try {
        // Parallelize critical asset preloading & auth session restoration
        // Prevents render-blocking resource delays on First Contentful Paint (FCP)
        await Promise.all([
          // 1. Preload icon fonts to prevent FOIT (Flash of Invisible Text)
          Font.loadAsync(Ionicons.font),
          // 2. Preload LCP hero image asset so auth screens render instantly
          Image.prefetch(Image.resolveAssetSource(HERO_IMAGE).uri).catch(() => {}),
          // 3. Restore cached auth session asynchronously before mounting screens
          restoreSession(),
        ]);
      } catch (error) {
        console.warn('Initialization error:', error);
      } finally {
        setAppIsReady(true);
        // Hide splash screen once initial paint resources are ready
        await SplashScreen.hideAsync().catch(() => {});
      }
    }

    prepareInitialRender();
  }, []);

  useEffect(() => {
    if (user && appIsReady) {
      const cleanup = initializeSocket();
      return cleanup;
    }
  }, [user, appIsReady, initializeSocket]);

  if (!appIsReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#17181A' }} />
    );
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
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
