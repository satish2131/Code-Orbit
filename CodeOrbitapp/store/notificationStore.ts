import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export interface NotificationItem {
  id: string;
  sender: string;
  action: string;
  subtitle: string;
  time: string;
  createdAt: number;
  isRead: boolean;
  section: 'Today' | 'This Week';
  icon: string;
  color: string;
  type?: 'permission_request' | 'permission_response' | 'session_invite' | 'chat_message' | 'system';
  data?: Record<string, any>;
}

const getStorageKey = () => {
  try {
    const { useAuthStore } = require('./authStore');
    const currentUserId = useAuthStore.getState().user?.id;
    return currentUserId ? `codeorbit_notifications_${currentUserId}` : 'codeorbit_notifications_guest';
  } catch (e) {
    return 'codeorbit_notifications_guest';
  }
};

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n_welcome',
    sender: 'CodeOrbit Team',
    action: 'Welcome to CodeOrbit!',
    subtitle: 'Start live pair coding or join a room code',
    time: 'Just now',
    createdAt: Date.now(),
    isRead: false,
    section: 'Today',
    icon: 'sparkles',
    color: '#EF4444',
    type: 'system',
  },
  {
    id: 'n_permission_tip',
    sender: 'Host Permission',
    action: 'Permission System Enabled',
    subtitle: 'Participants can request edit permissions during live sessions',
    time: '1h ago',
    createdAt: Date.now() - 3600000,
    isRead: false,
    section: 'Today',
    icon: 'shield-checkmark-outline',
    color: '#22C55E',
    type: 'system',
  },
];

interface NotificationState {
  notifications: NotificationItem[];
  isInitialized: boolean;
  unreadCount: number;
  loadNotifications: () => Promise<void>;
  addNotification: (
    item: Omit<NotificationItem, 'id' | 'createdAt' | 'isRead' | 'section'> & { id?: string }
  ) => void;
  markAsRead: (id: string) => void;
  markAsUnread: (id: string) => void;
  markAllAsRead: () => void;
  markAllAsUnread: () => void;
  deleteNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  isInitialized: false,
  unreadCount: 0,

  loadNotifications: async () => {
    const storageKey = getStorageKey();
    try {
      const savedStr = await SecureStore.getItemAsync(storageKey);
      let items: NotificationItem[] = DEFAULT_NOTIFICATIONS;

      if (savedStr !== null) {
        try {
          const parsed = JSON.parse(savedStr);
          if (Array.isArray(parsed)) {
            items = parsed;
          }
        } catch (e) {}
      }

      const unread = items.filter((n) => !n.isRead).length;
      set({ notifications: items, unreadCount: unread, isInitialized: true });
    } catch (err) {
      console.warn('Failed to load notifications:', err);
      const unread = DEFAULT_NOTIFICATIONS.filter((n) => !n.isRead).length;
      set({ notifications: DEFAULT_NOTIFICATIONS, unreadCount: unread, isInitialized: true });
    }
  },

  addNotification: (item) => {
    const storageKey = getStorageKey();
    const newId = item.id || 'notif_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    
    // Prevent duplicates if same ID exists
    const existing = get().notifications.find((n) => n.id === newId);
    if (existing) return;

    const newNotification: NotificationItem = {
      ...item,
      id: newId,
      createdAt: Date.now(),
      isRead: false,
      section: 'Today',
      time: 'Just now',
    };

    const updated = [newNotification, ...get().notifications];
    const unread = updated.filter((n) => !n.isRead).length;

    set({ notifications: updated, unreadCount: unread });
    SecureStore.setItemAsync(storageKey, JSON.stringify(updated)).catch(() => {});
  },

  markAsRead: (id: string) => {
    const storageKey = getStorageKey();
    const updated = get().notifications.map((n) =>
      n.id === id ? { ...n, isRead: true } : n
    );
    const unread = updated.filter((n) => !n.isRead).length;

    set({ notifications: updated, unreadCount: unread });
    SecureStore.setItemAsync(storageKey, JSON.stringify(updated)).catch(() => {});
  },

  markAsUnread: (id: string) => {
    const storageKey = getStorageKey();
    const updated = get().notifications.map((n) =>
      n.id === id ? { ...n, isRead: false } : n
    );
    const unread = updated.filter((n) => !n.isRead).length;

    set({ notifications: updated, unreadCount: unread });
    SecureStore.setItemAsync(storageKey, JSON.stringify(updated)).catch(() => {});
  },

  markAllAsRead: () => {
    const storageKey = getStorageKey();
    const updated = get().notifications.map((n) => ({ ...n, isRead: true }));

    set({ notifications: updated, unreadCount: 0 });
    SecureStore.setItemAsync(storageKey, JSON.stringify(updated)).catch(() => {});
  },

  markAllAsUnread: () => {
    const storageKey = getStorageKey();
    const updated = get().notifications.map((n) => ({ ...n, isRead: false }));

    set({ notifications: updated, unreadCount: updated.length });
    SecureStore.setItemAsync(storageKey, JSON.stringify(updated)).catch(() => {});
  },

  deleteNotification: (id: string) => {
    const storageKey = getStorageKey();
    const updated = get().notifications.filter((n) => n.id !== id);
    const unread = updated.filter((n) => !n.isRead).length;

    set({ notifications: updated, unreadCount: unread });
    SecureStore.setItemAsync(storageKey, JSON.stringify(updated)).catch(() => {});
  },

  clearAllNotifications: () => {
    const storageKey = getStorageKey();
    set({ notifications: [], unreadCount: 0, isInitialized: false });
    SecureStore.setItemAsync(storageKey, JSON.stringify([])).catch(() => {});
  },
}));
