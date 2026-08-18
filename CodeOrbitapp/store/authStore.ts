import { create } from 'zustand';
import { User } from '../types';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { api } from '../services/api';

// --- Auth state machine ---
// AUTH_LOADING  → session being restored from storage (initial boot)
// AUTHENTICATED → valid user + token
// UNAUTHENTICATED → no session, or expired/invalid token

export type AuthStatus = 'AUTH_LOADING' | 'AUTHENTICATED' | 'UNAUTHENTICATED';

interface AuthState {
  user: User | null;
  isGuest: boolean;
  isLoading: boolean;       // Login/signup button spinner
  token: string | null;
  status: AuthStatus;       // Authoritative single auth state
  setUser: (user: User, token?: string) => Promise<void>;
  updateUser: (updatedFields: Partial<User>) => Promise<void>;
  setGuest: (name: string) => void;
  logout: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  restoreSession: () => Promise<boolean>;
}

// Normalise the user object coming from the backend.
// The backend may return camelCase (avatarUrl, authProvider, createdAt)
// while the app types use snake_case (avatar_url, auth_provider, created_at).
// Map BOTH onto the User so every consumer works regardless of shape.
function normaliseUser(raw: any): User {
  if (!raw || typeof raw !== 'object') {
    throw new Error('[AUTH] Received invalid user object from server');
  }

  const user: User = {
    id:            raw.id,
    name:          raw.name          ?? raw.username ?? 'User',
    email:         raw.email,
    username:      raw.username,
    avatar_url:    raw.avatar_url    ?? raw.avatarUrl,
    auth_provider: raw.auth_provider ?? raw.authProvider,
    created_at:    raw.created_at    ?? raw.createdAt ?? new Date().toISOString(),
  };

  if (!user.id) {
    throw new Error('[AUTH] User object missing required id field');
  }

  return user;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isGuest: false,
  isLoading: false,
  token: null,
  status: 'AUTH_LOADING',   // start in loading until restoreSession completes

  // ── setUser ─────────────────────────────────────────────────────────────
  // Called after a successful login / signup.
  // Persists the token + user data, THEN updates Zustand state atomically.
  setUser: async (rawUser, token) => {
    console.log('[AUTH] setUser: persisting session...');
    let normUser: User;
    try {
      normUser = normaliseUser(rawUser);
    } catch (err) {
      console.error('[AUTH] setUser: invalid user payload', err);
      throw err;
    }

    // Persist token first (async write, awaited)
    if (token) {
      try {
        await SecureStore.setItemAsync('auth_token', token);
      } catch (e) {
        console.warn('[AUTH] SecureStore: failed to save token', e);
        // Non-fatal: we can still set in-memory state
      }
    }

    // Persist user data
    try {
      await SecureStore.setItemAsync('user_data', JSON.stringify(normUser));
    } catch (e) {
      console.warn('[AUTH] SecureStore: failed to save user_data', e);
    }

    // Atomic state update: user + status together so no partial state leaks
    set({
      user: normUser,
      isGuest: false,
      token: token ?? get().token,
      status: 'AUTHENTICATED',
    });
    console.log('[AUTH] setUser: session persisted, status → AUTHENTICATED');
  },

  // ── updateUser ───────────────────────────────────────────────────────────
  updateUser: async (updatedFields) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...updatedFields };
    try {
      await SecureStore.setItemAsync('user_data', JSON.stringify(updated));
    } catch (e) {
      console.warn('[AUTH] SecureStore: failed to save updated user_data', e);
    }
    set({ user: updated });
  },

  // ── setGuest ─────────────────────────────────────────────────────────────
  setGuest: (name) => {
    const guestUser: User = {
      id:           Crypto.randomUUID(),
      name,
      auth_provider: 'guest',
      created_at:   new Date().toISOString(),
    };
    set({ user: guestUser, isGuest: true, status: 'AUTHENTICATED' });
  },

  // ── logout ───────────────────────────────────────────────────────────────
  logout: async () => {
    console.log('[AUTH] logout: clearing session...');
    // Clear derived stores before wiping auth state to avoid null-user crashes
    try { require('../services/socket').disconnectSocket(); } catch {}
    try { require('./sessionStore').useSessionStore.getState().resetSession(); } catch {}
    try { require('./sessionHistoryStore').useSessionHistoryStore.getState().clearHistory(); } catch {}
    try { require('./messageStore').useMessageStore.getState().clearAllMessages(); } catch {}
    try { require('./notificationStore').useNotificationStore.getState().clearAllNotifications(); } catch {}

    await SecureStore.deleteItemAsync('auth_token').catch(() => {});
    await SecureStore.deleteItemAsync('user_data').catch(() => {});

    set({ user: null, isGuest: false, token: null, status: 'UNAUTHENTICATED' });
    console.log('[AUTH] logout: done, status → UNAUTHENTICATED');
  },

  // ── setLoading ────────────────────────────────────────────────────────────
  setLoading: (isLoading) => set({ isLoading }),

  // ── restoreSession ────────────────────────────────────────────────────────
  // Called ONCE at app boot from _layout.tsx.
  // Always resolves (never throws) and always transitions out of AUTH_LOADING.
  restoreSession: async () => {
    console.log('[AUTH] restoreSession: starting...');
    try {
      const token       = await SecureStore.getItemAsync('auth_token').catch(() => null);
      const userDataStr = await SecureStore.getItemAsync('user_data').catch(() => null);

      if (!token) {
        console.log('[AUTH] restoreSession: no stored token → UNAUTHENTICATED');
        set({ status: 'UNAUTHENTICATED', isLoading: false });
        return false;
      }

      // Try to hydrate from cached user immediately (fast path)
      let cachedUser: User | null = null;
      if (userDataStr) {
        try {
          const parsed = JSON.parse(userDataStr);
          cachedUser = normaliseUser(parsed);
        } catch {
          console.warn('[AUTH] restoreSession: corrupt user_data cache, ignoring');
        }
      }

      if (cachedUser) {
        // Fast-path: show home screen immediately with cached user
        set({ token, user: cachedUser, isGuest: false, status: 'AUTHENTICATED' });
        console.log('[AUTH] restoreSession: restored from cache → AUTHENTICATED');

        // Background: silently verify token & refresh user
        api.auth.getMe().then((res) => {
          if (res?.user) {
            let fresh: User;
            try { fresh = normaliseUser(res.user); } catch { return; }
            SecureStore.setItemAsync('user_data', JSON.stringify(fresh)).catch(() => {});
            set({ user: fresh });
            console.log('[AUTH] restoreSession: background refresh complete');
          } else {
            console.warn('[AUTH] restoreSession: /me returned no user, logging out');
            get().logout();
          }
        }).catch((err) => {
          // Network failure while refreshing is non-fatal; keep cached session
          console.warn('[AUTH] restoreSession: background /me failed (non-fatal):', err?.message);
        });

        return true;
      }

      // Slow-path: no cache, validate token via /me before showing anything
      console.log('[AUTH] restoreSession: no cache, validating token via /me...');
      set({ token });
      try {
        const res = await api.auth.getMe();
        if (res?.user) {
          const fresh = normaliseUser(res.user);
          await SecureStore.setItemAsync('user_data', JSON.stringify(fresh)).catch(() => {});
          set({ user: fresh, isGuest: false, status: 'AUTHENTICATED' });
          console.log('[AUTH] restoreSession: /me success → AUTHENTICATED');
          return true;
        }
      } catch (err) {
        console.warn('[AUTH] restoreSession: /me failed, treating as unauthenticated:', err);
        await SecureStore.deleteItemAsync('auth_token').catch(() => {});
        await SecureStore.deleteItemAsync('user_data').catch(() => {});
      }

    } catch (error) {
      console.warn('[AUTH] restoreSession: unexpected error:', error);
    }

    set({ status: 'UNAUTHENTICATED', isLoading: false });
    console.log('[AUTH] restoreSession: done → UNAUTHENTICATED');
    return false;
  },
}));
