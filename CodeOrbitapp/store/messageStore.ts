import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export interface ChatItem {
  id: string;
  name: string;
  avatar: string;
  color: string;
  lastMessage: string;
  time: string;
  unreadCount?: number | string;
  isOnline?: boolean;
  isArchived?: boolean;
}

export interface ThreadMessage {
  id: string;
  text: string;
  isUser: boolean;
  time: string;
  createdAt: number;
  isEdited?: boolean;
  type?: 'text' | 'code' | 'file';
  codeLanguage?: string;
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
}

const CHAT_COLORS = [
  '#E11D48',
  '#8B5CF6',
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#EC4899',
  '#6366F1',
  '#FF453A',
];

export const INITIAL_CHATS: ChatItem[] = [];

export const INITIAL_MESSAGES: Record<string, ThreadMessage[]> = {};

const getStorageKeys = () => {
  try {
    const { useAuthStore } = require('./authStore');
    const currentUserId = useAuthStore.getState().user?.id;
    return {
      chatsKey: currentUserId ? `codeorbit_chats_${currentUserId}` : 'codeorbit_chats_guest',
      messagesKey: currentUserId ? `codeorbit_messages_${currentUserId}` : 'codeorbit_messages_guest',
    };
  } catch (e) {
    return {
      chatsKey: 'codeorbit_chats_guest',
      messagesKey: 'codeorbit_messages_guest',
    };
  }
};

interface MessageState {
  chats: ChatItem[];
  messagesByChat: Record<string, ThreadMessage[]>;
  isInitialized: boolean;
  initializeStore: () => Promise<void>;
  addChat: (name: string, initialMessage?: string) => string;
  restoreChat: (chat: ChatItem, messages?: ThreadMessage[]) => void;
  sendMessage: (
    chatId: string,
    text: string,
    isUser?: boolean,
    replyTo?: { id: string; text: string; senderName: string },
    type?: 'text' | 'code' | 'file',
    codeLanguage?: string
  ) => void;
  editMessage: (chatId: string, messageId: string, newText: string) => void;
  unsendMessage: (chatId: string, messageId: string) => void;
  markAsRead: (chatId: string) => void;
  toggleArchiveChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  clearChatHistory: (chatId: string) => void;
  clearAllMessages: () => void;
}

const formatCurrentTime = () => {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

export const useMessageStore = create<MessageState>((set, get) => ({
  chats: INITIAL_CHATS,
  messagesByChat: INITIAL_MESSAGES,
  isInitialized: false,

  initializeStore: async () => {
    const { chatsKey, messagesKey } = getStorageKeys();
    try {
      const savedChatsStr = await SecureStore.getItemAsync(chatsKey);
      const savedMessagesStr = await SecureStore.getItemAsync(messagesKey);

      let chats = INITIAL_CHATS;
      let messagesByChat = INITIAL_MESSAGES;

      if (savedChatsStr) {
        try {
          chats = JSON.parse(savedChatsStr);
        } catch (e) {}
      }
      if (savedMessagesStr) {
        try {
          messagesByChat = JSON.parse(savedMessagesStr);
        } catch (e) {}
      }

      set({ chats, messagesByChat, isInitialized: true });
    } catch (err) {
      console.warn('Failed to initialize messageStore:', err);
      set({ isInitialized: true });
    }
  },

  addChat: (name: string, initialMessage = 'Started a new conversation') => {
    const { chatsKey, messagesKey } = getStorageKeys();
    const trimmedName = name.trim();
    const existing = get().chats.find(
      (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (existing) {
      return existing.id;
    }

    const chatId = Date.now().toString();
    const avatar = trimmedName.charAt(0).toUpperCase();
    const color = CHAT_COLORS[Math.floor(Math.random() * CHAT_COLORS.length)];
    const timeStr = formatCurrentTime();

    const newChat: ChatItem = {
      id: chatId,
      name: trimmedName,
      avatar,
      color,
      lastMessage: initialMessage,
      time: timeStr,
      unreadCount: 0,
      isOnline: true,
      isArchived: false,
    };

    const initialMsg: ThreadMessage = {
      id: 'm_' + Date.now(),
      text: initialMessage,
      isUser: true,
      time: timeStr,
      createdAt: Date.now(),
    };

    const updatedChats = [newChat, ...get().chats];
    const updatedMessagesByChat = {
      ...get().messagesByChat,
      [chatId]: [initialMsg],
    };

    set({ chats: updatedChats, messagesByChat: updatedMessagesByChat });

    SecureStore.setItemAsync(chatsKey, JSON.stringify(updatedChats)).catch(() => {});
    SecureStore.setItemAsync(messagesKey, JSON.stringify(updatedMessagesByChat)).catch(() => {});

    return chatId;
  },

  restoreChat: (chat: ChatItem, messages?: ThreadMessage[]) => {
    const { chatsKey, messagesKey } = getStorageKeys();
    const existing = get().chats.find((c) => c.id === chat.id);
    const updatedChats = existing ? get().chats : [chat, ...get().chats];
    const updatedMessagesByChat = {
      ...get().messagesByChat,
      [chat.id]: messages || get().messagesByChat[chat.id] || [],
    };

    set({ chats: updatedChats, messagesByChat: updatedMessagesByChat });
    SecureStore.setItemAsync(chatsKey, JSON.stringify(updatedChats)).catch(() => {});
    SecureStore.setItemAsync(messagesKey, JSON.stringify(updatedMessagesByChat)).catch(() => {});
  },

  sendMessage: (
    chatId: string,
    text: string,
    isUser = true,
    replyTo?: { id: string; text: string; senderName: string },
    type: 'text' | 'code' | 'file' = 'text',
    codeLanguage?: string
  ) => {
    const { chatsKey, messagesKey } = getStorageKeys();
    const timeStr = formatCurrentTime();
    const newMsg: ThreadMessage = {
      id: 'm_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      text: text.trim(),
      isUser,
      time: timeStr,
      createdAt: Date.now(),
      replyTo,
      type,
      codeLanguage,
    };

    const currentMessages = get().messagesByChat[chatId] || [];
    const updatedMessagesByChat = {
      ...get().messagesByChat,
      [chatId]: [...currentMessages, newMsg],
    };

    const targetChat = get().chats.find((c) => c.id === chatId);
    let updatedChats = [...get().chats];

    if (targetChat) {
      const updatedTargetChat: ChatItem = {
        ...targetChat,
        lastMessage: text.trim(),
        time: timeStr,
        unreadCount: !isUser ? (typeof targetChat.unreadCount === 'number' ? targetChat.unreadCount + 1 : 1) : 0,
        isArchived: false,
      };

      updatedChats = [
        updatedTargetChat,
        ...get().chats.filter((c) => c.id !== chatId),
      ];
    } else {
      const newChat: ChatItem = {
        id: chatId,
        name: 'Chat ' + chatId,
        avatar: 'C',
        color: CHAT_COLORS[0],
        lastMessage: text.trim(),
        time: timeStr,
        unreadCount: !isUser ? 1 : 0,
        isOnline: true,
        isArchived: false,
      };
      updatedChats = [newChat, ...updatedChats];
    }

    set({ chats: updatedChats, messagesByChat: updatedMessagesByChat });

    SecureStore.setItemAsync(chatsKey, JSON.stringify(updatedChats)).catch(() => {});
    SecureStore.setItemAsync(messagesKey, JSON.stringify(updatedMessagesByChat)).catch(() => {});
  },

  editMessage: (chatId: string, messageId: string, newText: string) => {
    const { chatsKey, messagesKey } = getStorageKeys();
    const trimmed = newText.trim();
    if (!trimmed) return;

    const currentMsgs = get().messagesByChat[chatId] || [];
    const updatedMsgs = currentMsgs.map((m) =>
      m.id === messageId ? { ...m, text: trimmed, isEdited: true } : m
    );

    const updatedMessagesByChat = {
      ...get().messagesByChat,
      [chatId]: updatedMsgs,
    };

    const lastMsg = updatedMsgs[updatedMsgs.length - 1];
    const chats = get().chats.map((c) =>
      c.id === chatId ? { ...c, lastMessage: lastMsg ? lastMsg.text : 'No messages yet' } : c
    );

    set({ chats, messagesByChat: updatedMessagesByChat });
    SecureStore.setItemAsync(chatsKey, JSON.stringify(chats)).catch(() => {});
    SecureStore.setItemAsync(messagesKey, JSON.stringify(updatedMessagesByChat)).catch(() => {});
  },

  unsendMessage: (chatId: string, messageId: string) => {
    const { chatsKey, messagesKey } = getStorageKeys();
    const currentMsgs = get().messagesByChat[chatId] || [];
    const updatedMsgs = currentMsgs.filter((m) => m.id !== messageId);

    const updatedMessagesByChat = {
      ...get().messagesByChat,
      [chatId]: updatedMsgs,
    };

    const lastMsg = updatedMsgs[updatedMsgs.length - 1];
    const chats = get().chats.map((c) =>
      c.id === chatId ? { ...c, lastMessage: lastMsg ? lastMsg.text : 'No messages yet', time: lastMsg ? lastMsg.time : '' } : c
    );

    set({ chats, messagesByChat: updatedMessagesByChat });
    SecureStore.setItemAsync(chatsKey, JSON.stringify(chats)).catch(() => {});
    SecureStore.setItemAsync(messagesKey, JSON.stringify(updatedMessagesByChat)).catch(() => {});
  },

  markAsRead: (chatId: string) => {
    const { chatsKey } = getStorageKeys();
    const chats = get().chats.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c));
    set({ chats });
    SecureStore.setItemAsync(chatsKey, JSON.stringify(chats)).catch(() => {});
  },

  toggleArchiveChat: (chatId: string) => {
    const { chatsKey } = getStorageKeys();
    const chats = get().chats.map((c) =>
      c.id === chatId ? { ...c, isArchived: !c.isArchived } : c
    );
    set({ chats });
    SecureStore.setItemAsync(chatsKey, JSON.stringify(chats)).catch(() => {});
  },

  deleteChat: (chatId: string) => {
    const { chatsKey, messagesKey } = getStorageKeys();
    const chats = get().chats.filter((c) => c.id !== chatId);
    const messagesByChat = { ...get().messagesByChat };
    delete messagesByChat[chatId];

    set({ chats, messagesByChat });
    SecureStore.setItemAsync(chatsKey, JSON.stringify(chats)).catch(() => {});
    SecureStore.setItemAsync(messagesKey, JSON.stringify(messagesByChat)).catch(() => {});
  },

  clearChatHistory: (chatId: string) => {
    const { chatsKey, messagesKey } = getStorageKeys();
    const messagesByChat = {
      ...get().messagesByChat,
      [chatId]: [],
    };

    const chats = get().chats.map((c) =>
      c.id === chatId ? { ...c, lastMessage: 'No messages yet', time: '' } : c
    );

    set({ chats, messagesByChat });
    SecureStore.setItemAsync(chatsKey, JSON.stringify(chats)).catch(() => {});
    SecureStore.setItemAsync(messagesKey, JSON.stringify(messagesByChat)).catch(() => {});
  },

  clearAllMessages: () => {
    set({ chats: INITIAL_CHATS, messagesByChat: INITIAL_MESSAGES, isInitialized: false });
  },
}));
