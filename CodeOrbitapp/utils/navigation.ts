import { Router } from 'expo-router';

/**
 * Safely navigates back if there is a screen to go back to in the navigation stack.
 * If router.canGoBack() returns false or back action cannot be handled, falls back to replacing
 * current screen with the specified fallback route.
 *
 * @param router Expo router instance from useRouter()
 * @param fallbackRoute Fallback path when back navigation is unavailable
 */
export function safeGoBack(router: Router, fallbackRoute: string = '/(main)/home') {
  try {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackRoute as any);
    }
  } catch (error) {
    console.warn('[Navigation] safeGoBack fallback triggered:', error);
    try {
      router.replace(fallbackRoute as any);
    } catch (e) {
      // Suppress navigation error
    }
  }
}
