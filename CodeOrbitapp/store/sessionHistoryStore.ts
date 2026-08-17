import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { api } from '../services/api';

export interface HistorySessionItem {
  id: string;
  code: string;
  languagePreset: string;
  approvalMode: string;
  maxParticipants: number;
  status: 'waiting' | 'active' | 'ended';
  createdAt: string;
  endedAt?: string | null;
  hostName: string;
  hostId?: string;
  participantCount: number;
  isHost: boolean;
}

const sanitizeKey = (k: string) => k.replace(/[^a-zA-Z0-9_.-]/g, '_');

const getStorageKey = () => {
  try {
    const { useAuthStore } = require('./authStore');
    const currentUser = useAuthStore.getState().user;
    const key = currentUser?.id
      ? `codeorbit_session_history_${currentUser.id}`
      : 'codeorbit_session_history_guest';
    return sanitizeKey(key);
  } catch (e) {
    return 'codeorbit_session_history_guest';
  }
};

const saveToSecureStore = (key: string, sessions: HistorySessionItem[]) => {
  try {
    // Keep only the most recent 10 sessions to prevent exceeding SecureStore 2048-byte limit
    const compact = sessions.slice(0, 10).map((s) => ({
      id: s.id,
      code: s.code,
      languagePreset: s.languagePreset,
      approvalMode: s.approvalMode,
      maxParticipants: s.maxParticipants,
      status: s.status,
      createdAt: s.createdAt,
      endedAt: s.endedAt,
      hostName: s.hostName,
      participantCount: s.participantCount,
      isHost: s.isHost,
    }));
    const payload = JSON.stringify(compact);
    if (payload.length < 1900) {
      SecureStore.setItemAsync(key, payload).catch(() => {});
    } else {
      SecureStore.setItemAsync(key, JSON.stringify(compact.slice(0, 5))).catch(() => {});
    }
  } catch (e) {
    // Ignore cache failure
  }
};

export const DEFAULT_HISTORY_SESSIONS: HistorySessionItem[] = [];

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error';

interface SessionHistoryState {
  historySessions: HistorySessionItem[];
  isLoading: boolean;
  isInitialized: boolean;
  lastSyncedAt?: number;
  syncStatus: SyncStatus;
  loadHistory: () => Promise<void>;
  addHistoryEntry: (entry: Partial<HistorySessionItem> & { code: string; languagePreset: string }) => void;
  updateSessionStatus: (code: string, status: 'waiting' | 'active' | 'ended', endedAt?: string) => void;
  removeHistoryEntry: (idOrCode: string) => void;
  clearHistory: () => void;
}

export const useSessionHistoryStore = create<SessionHistoryState>((set, get) => ({
  historySessions: [],
  isLoading: false,
  isInitialized: false,
  lastSyncedAt: undefined,
  syncStatus: 'idle',

  loadHistory: async () => {
    const storageKey = getStorageKey();
    let localSessions: HistorySessionItem[] = [];

    // 1. Instantly hydrate cached local history for immediate UI rendering (0ms lag)
    try {
      const stored = await SecureStore.getItemAsync(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Never display sessions that never progressed past the waiting room
          localSessions = parsed.filter((s) => s && s.status !== 'waiting');
          set({ historySessions: localSessions, isInitialized: true });
        }
      }
    } catch (e) {
      // Ignore parse failure
    }

    // 2. Fetch fresh history from server
    try {
      set({ isLoading: localSessions.length === 0, syncStatus: 'syncing' });
      const res = await api.sessions.getHistory();
      if (res && Array.isArray(res.sessions)) {
        const currentUserId = require('./authStore').useAuthStore.getState().user?.id;
        const serverSessions: HistorySessionItem[] = res.sessions
          .filter(
            (s: any) =>
              s.status !== 'waiting' &&
              (!currentUserId ||
                s.hostId === currentUserId ||
                (s.participants &&
                  s.participants.some(
                    (p: any) => p.userId === currentUserId || p.id === currentUserId
                  )))
          )
          .map((s: any) => ({
            id: s.id,
            code: s.code,
            languagePreset: s.languagePreset || s.language_preset || 'python',
            approvalMode: s.approvalMode || s.approval_mode || 'open',
            maxParticipants: s.maxParticipants || s.max_participants || 2,
            status: s.status || 'ended',
            createdAt: s.createdAt || s.created_at,
            endedAt: s.endedAt || s.ended_at,
            hostName: s.host?.name || s.hostName || (s.isHost ? 'You' : 'Collaborator'),
            hostId: s.hostId,
            participantCount: s.participants?.length || s.participantCount || 1,
            isHost: s.isHost ?? (currentUserId ? s.hostId === currentUserId : true),
          }));

        // Merge server sessions with any locally created ones that might not have reached server yet
        const existingCodes = new Set(serverSessions.map((s) => s.code));
        const localOnly = localSessions.filter((s) => !existingCodes.has(s.code));
        const mergedSessions = [...localOnly, ...serverSessions].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        set({
          historySessions: serverSessions,
          isInitialized: true,
          isLoading: false,
          lastSyncedAt: Date.now(),
          syncStatus: 'idle',
        });
        saveToSecureStore(storageKey, serverSessions);
        return;
      }
    } catch (apiErr) {
      // Backend not available or unauthenticated -> fallback to local history
    }

    set({ historySessions: localSessions, isInitialized: true, isLoading: false, syncStatus: 'offline' });
  },

  addHistoryEntry: (entry) => {
    // Only record sessions that have actually entered the room (active or ended)
    if (entry.status === 'waiting') return;

    const storageKey = getStorageKey();
    const existing = get().historySessions.find((s) => s.code === entry.code);
    if (existing) {
      // Update existing entry status/time
      const updated = get().historySessions.map((s) =>
        s.code === entry.code ? { ...s, ...entry } : s
      );
      set({ historySessions: updated });
      saveToSecureStore(storageKey, updated);
      return;
    }

    const newEntry: HistorySessionItem = {
      id: entry.id || 'h_' + Date.now(),
      code: entry.code,
      languagePreset: entry.languagePreset,
      approvalMode: entry.approvalMode || 'open',
      maxParticipants: entry.maxParticipants || 2,
      status: entry.status || 'active',
      createdAt: entry.createdAt || new Date().toISOString(),
      endedAt: entry.endedAt || null,
      hostName: entry.hostName || 'You',
      hostId: entry.hostId,
      participantCount: entry.participantCount || 1,
      isHost: entry.isHost ?? true,
    };

    const updated = [newEntry, ...get().historySessions];
    set({ historySessions: updated });
    saveToSecureStore(storageKey, updated);
  },

  updateSessionStatus: (code, status, endedAt) => {
    const storageKey = getStorageKey();
    const existing = get().historySessions.find((s) => s.code === code);
    if (!existing) return;

    if (existing.status === 'waiting') {
      const updated = get().historySessions.filter((s) => s.code !== code);
      set({ historySessions: updated });
      saveToSecureStore(storageKey, updated);
      return;
    }

    const updated = get().historySessions.map((s) =>
      s.code === code
        ? {
            ...s,
            status,
            endedAt: endedAt !== undefined ? endedAt : (status === 'ended' ? new Date().toISOString() : s.endedAt),
          }
        : s
    );
    set({ historySessions: updated });
    saveToSecureStore(storageKey, updated);
  },

  removeHistoryEntry: (idOrCode) => {
    const storageKey = getStorageKey();
    const updated = get().historySessions.filter(
      (s) => s.id !== idOrCode && s.code !== idOrCode
    );
    set({ historySessions: updated });
    saveToSecureStore(storageKey, updated);
    api.sessions.deleteHistory(idOrCode).catch((err) => {
      console.warn('Failed to delete history record on server:', err);
    });
  },

  clearHistory: () => {
    const storageKey = getStorageKey();
    set({ historySessions: [] });
    SecureStore.setItemAsync(storageKey, JSON.stringify([])).catch(() => {});
    api.sessions.clearHistory().catch((err) => {
      console.warn('Failed to clear history on server:', err);
    });
  },
}));
