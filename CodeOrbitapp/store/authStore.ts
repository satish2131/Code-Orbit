import { create } from 'zustand';
import { User } from '../types';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { api } from '../services/api';

interface AuthState {
  user: User | null;
  isGuest: boolean;
  isLoading: boolean;
  token: string | null;
  isInitialized: boolean;
  setUser: (user: User, token?: string) => void;
  updateUser: (updatedFields: Partial<User>) => void;
  setGuest: (name: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  restoreSession: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isGuest: false,
  isLoading: false,
  token: null,
  isInitialized: false,
  setUser: async (user, token) => {
    try {
      if (token) {
        await SecureStore.setItemAsync('auth_token', token);
      }
      await SecureStore.setItemAsync('user_data', JSON.stringify(user));
    } catch (e) {
      console.warn('SecureStore save error:', e);
    }
    set({ user, isGuest: false, token: token || get().token });
  },
  updateUser: async (updatedFields) => {
    const current = get().user;
    if (current) {
      const updated = { ...current, ...updatedFields };
      await SecureStore.setItemAsync('user_data', JSON.stringify(updated));
      set({ user: updated });
    }
  },
  setGuest: (name) => {
    const guestUser: User = {
      id: Crypto.randomUUID(),
      name,
      auth_provider: 'guest',
      created_at: new Date().toISOString(),
    };
    set({ user: guestUser, isGuest: true });
  },
  logout: async () => {
    try {
      const { disconnectSocket } = require('../services/socket');
      disconnectSocket();
    } catch {}
    try {
      const { useSessionStore } = require('./sessionStore');
      useSessionStore.getState().resetSession();
    } catch {}
    try {
      const { useSessionHistoryStore } = require('./sessionHistoryStore');
      useSessionHistoryStore.getState().clearHistory();
    } catch {}
    try {
      const { useMessageStore } = require('./messageStore');
      useMessageStore.getState().clearAllMessages();
    } catch {}
    try {
      const { useNotificationStore } = require('./notificationStore');
      useNotificationStore.getState().clearAllNotifications();
    } catch {}
    await SecureStore.deleteItemAsync('auth_token').catch(() => {});
    await SecureStore.deleteItemAsync('user_data').catch(() => {});
    set({ user: null, isGuest: false, token: null });
  },
  setLoading: (isLoading) => set({ isLoading }),
  restoreSession: async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const userDataStr = await SecureStore.getItemAsync('user_data');
      
      let cachedUser: User | null = null;
      if (userDataStr) {
        try { cachedUser = JSON.parse(userDataStr); } catch {}
      }

      if (token && cachedUser) {
        set({ token, user: cachedUser, isGuest: false, isInitialized: true });
        // Background token verification - clear stale cache if user deleted or token expired
        api.auth.getMe().then((res) => {
          if (res?.user) {
            set({ user: res.user });
            SecureStore.setItemAsync('user_data', JSON.stringify(res.user)).catch(() => {});
          } else {
            get().logout();
          }
        }).catch(() => {
          get().logout();
        });
        return true;
      } else if (token) {
        set({ token });
        try {
          const res = await api.auth.getMe();
          if (res?.user) {
            await SecureStore.setItemAsync('user_data', JSON.stringify(res.user)).catch(() => {});
            set({ user: res.user, isGuest: false, isInitialized: true });
            return true;
          }
        } catch {
          await get().logout();
        }
      }
    } catch (error) {
      console.warn('Failed to restore auth session:', error);
    }
    set({ isInitialized: true });
    return false;
  },
}));
