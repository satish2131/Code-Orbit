import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useAuthStore } from '../../store/authStore';
import { useMessageStore, ChatItem, ThreadMessage } from '../../store/messageStore';
import { APP_COLORS } from '../../constants';

interface UndoAction {
  type: 'delete' | 'archive';
  chat: ChatItem;
  messages?: ThreadMessage[];
  message: string;
}

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    chats,
    messagesByChat,
    initializeStore,
    markAsRead,
    toggleArchiveChat,
    deleteChat,
    restoreChat,
  } = useMessageStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'inbox' | 'archived'>('inbox');
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const swipeableChatsRef = useRef<Map<string, Swipeable>>(new Map());

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    };
  }, []);

  const archivedCount = useMemo(() => {
    return chats.filter((c) => c.isArchived).length;
  }, [chats]);

  const filteredChats = useMemo(() => {
    let result = chats.filter((c) =>
      activeTab === 'archived' ? Boolean(c.isArchived) : !c.isArchived
    );

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.lastMessage.toLowerCase().includes(query)
      );
    }
    return result;
  }, [chats, activeTab, searchQuery]);

  const handleOpenChat = useCallback(
    (chat: ChatItem) => {
      markAsRead(chat.id);
      router.push({
        pathname: '/(main)/chat-thread',
        params: {
          id: chat.id,
          name: chat.name,
          avatar: chat.avatar,
          color: chat.color,
          status: chat.isOnline ? 'Online' : 'Offline',
        },
      });
    },
    [markAsRead, router]
  );

  const triggerUndoToast = (action: UndoAction) => {
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    setUndoAction(action);
    undoTimeoutRef.current = setTimeout(() => {
      setUndoAction(null);
    }, 4500);
  };

  const handleUndo = () => {
    if (!undoAction) return;
    if (undoAction.type === 'delete') {
      restoreChat(undoAction.chat, undoAction.messages);
    } else if (undoAction.type === 'archive') {
      toggleArchiveChat(undoAction.chat.id);
    }
    setUndoAction(null);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
  };

  const handleArchive = useCallback(
    (chat: ChatItem) => {
      swipeableChatsRef.current.get(chat.id)?.close();
      const wasArchived = chat.isArchived;
      toggleArchiveChat(chat.id);
      triggerUndoToast({
        type: 'archive',
        chat,
        message: wasArchived ? 'Conversation unarchived' : 'Conversation archived',
      });
    },
    [toggleArchiveChat]
  );

  const handleDelete = useCallback(
    (chat: ChatItem) => {
      swipeableChatsRef.current.get(chat.id)?.close();
      Alert.alert(
        'Delete conversation?',
        `This will remove the conversation with ${chat.name} from your chat list.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              const msgs = messagesByChat[chat.id] || [];
              deleteChat(chat.id);
              triggerUndoToast({
                type: 'delete',
                chat,
                messages: msgs,
                message: 'Conversation deleted',
              });
            },
          },
        ]
      );
    },
    [deleteChat, messagesByChat]
  );

  // Swipe Left -> Delete
  const renderRightActions = useCallback(
    (chat: ChatItem) => {
      return (
        <TouchableOpacity
          style={styles.deleteSwipeAction}
          onPress={() => handleDelete(chat)}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
          <Text style={styles.swipeActionText}>Delete</Text>
        </TouchableOpacity>
      );
    },
    [handleDelete]
  );

  // Swipe Right -> Archive
  const renderLeftActions = useCallback(
    (chat: ChatItem) => {
      const isArchived = chat.isArchived;
      return (
        <TouchableOpacity
          style={[styles.archiveSwipeAction, isArchived && styles.unarchiveSwipeAction]}
          onPress={() => handleArchive(chat)}
          activeOpacity={0.8}
        >
          <Ionicons name={isArchived ? 'arrow-undo' : 'archive-outline'} size={20} color="#FFFFFF" />
          <Text style={styles.swipeActionText}>{isArchived ? 'Unarchive' : 'Archive'}</Text>
        </TouchableOpacity>
      );
    },
    [handleArchive]
  );

  return (
    <View style={styles.container}>
      {/* 1. Header Bar: Avatar + Title + New Chat Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.avatarButton}
          onPress={() => router.push('/(main)/profile')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Go to profile"
        >
          <View style={styles.userAvatarCircle}>
            {user && (user.avatar_url || (user as any).avatarUrl) ? (
              <Image
                source={{ uri: user.avatar_url || (user as any).avatarUrl }}
                style={{ width: 36, height: 36, borderRadius: 18 }}
              />
            ) : (
              <Text style={styles.userAvatarText}>
                {user?.name?.charAt(0).toUpperCase() || 'G'}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Chats</Text>

        <TouchableOpacity
          style={styles.newChatButton}
          onPress={() => router.push('/(main)/user-search')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="New conversation"
        >
          <Ionicons name="create-outline" size={20} color="#F5F5F5" />
        </TouchableOpacity>
      </View>

      {/* 2. Category Tabs: Inbox vs Archived */}
      <View style={styles.tabBarContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'inbox' && styles.tabButtonActive]}
          onPress={() => setActiveTab('inbox')}
          activeOpacity={0.75}
        >
          <Ionicons
            name="chatbubbles-outline"
            size={15}
            color={activeTab === 'inbox' ? APP_COLORS.primary : APP_COLORS.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'inbox' && styles.tabTextActive]}>
            Inbox
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'archived' && styles.tabButtonActive]}
          onPress={() => setActiveTab('archived')}
          activeOpacity={0.75}
        >
          <Ionicons
            name="archive-outline"
            size={15}
            color={activeTab === 'archived' ? APP_COLORS.primary : APP_COLORS.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'archived' && styles.tabTextActive]}>
            Archived {archivedCount > 0 ? `(${archivedCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. Search Input Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={17} color={APP_COLORS.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              activeTab === 'archived' ? 'Search archived chats...' : 'Search conversations...'
            }
            placeholderTextColor={APP_COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* 4. Undo Toast Banner */}
      {undoAction && (
        <View style={styles.undoToastContainer}>
          <Text style={styles.undoToastText}>{undoAction.message}</Text>
          <TouchableOpacity onPress={handleUndo} style={styles.undoBtn} activeOpacity={0.8}>
            <Text style={styles.undoBtnText}>Undo</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 5. Swipe Gesture Hint */}
      <View style={styles.swipeHintBar}>
        <Ionicons name="swap-horizontal-outline" size={13} color="#777777" />
        <Text style={styles.swipeHintText}>Swipe right to archive · left to delete</Text>
      </View>

      {/* 6. Conversations List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredChats.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <Ionicons
                name={activeTab === 'archived' ? 'archive-outline' : 'chatbubbles-outline'}
                size={34}
                color={APP_COLORS.textSecondary}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery
                ? 'No matching conversations'
                : activeTab === 'archived'
                ? 'No archived chats'
                : 'No messages yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `No conversations matching "${searchQuery}"`
                : activeTab === 'archived'
                ? 'Swipe right on any conversation in your inbox to archive it.'
                : 'Start collaborating with developers and your messages will appear here.'}
            </Text>
          </View>
        ) : (
          filteredChats.map((chat) => (
            <ChatRowItem
              key={chat.id}
              chat={chat}
              onOpen={handleOpenChat}
              renderLeftActions={renderLeftActions}
              renderRightActions={renderRightActions}
              registerSwipeable={(ref) => {
                if (ref) swipeableChatsRef.current.set(chat.id, ref);
                else swipeableChatsRef.current.delete(chat.id);
              }}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

interface ChatRowItemProps {
  chat: ChatItem;
  onOpen: (chat: ChatItem) => void;
  renderLeftActions: (chat: ChatItem) => React.ReactNode;
  renderRightActions: (chat: ChatItem) => React.ReactNode;
  registerSwipeable: (ref: Swipeable | null) => void;
}

const ChatRowItem = React.memo(function ChatRowItem({
  chat,
  onOpen,
  renderLeftActions,
  renderRightActions,
  registerSwipeable,
}: ChatRowItemProps) {
  const hasUnread = Boolean(chat.unreadCount && Number(chat.unreadCount) > 0);

  return (
    <Swipeable
      ref={registerSwipeable}
      friction={1.5}
      leftThreshold={30}
      rightThreshold={30}
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={() => renderLeftActions(chat)}
      renderRightActions={() => renderRightActions(chat)}
      containerStyle={styles.swipeableContainer}
    >
      <TouchableOpacity
        style={styles.chatRow}
        onPress={() => onOpen(chat)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`Chat with ${chat.name}`}
      >
        {/* Avatar with Online Status Indicator */}
        <View style={styles.avatarWrapper}>
          <View style={[styles.chatAvatar, { backgroundColor: chat.color || '#EF4444' }]}>
            <Text style={styles.chatAvatarText}>{chat.avatar || chat.name.charAt(0)}</Text>
          </View>
          <View
            style={[
              styles.onlineStatusDot,
              { backgroundColor: chat.isOnline ? '#22C55E' : '#6E6E73' },
            ]}
          />
        </View>

        {/* Name & Last Message */}
        <View style={styles.chatInfo}>
          <View style={styles.chatInfoTop}>
            <Text style={[styles.chatName, hasUnread && styles.chatNameUnread]} numberOfLines={1}>
              {chat.name}
            </Text>
            <Text style={[styles.chatTime, hasUnread && styles.chatTimeUnread]}>
              {chat.time}
            </Text>
          </View>

          <View style={styles.chatInfoBottom}>
            <Text
              style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]}
              numberOfLines={1}
            >
              {chat.lastMessage}
            </Text>

            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{chat.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171717',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 12,
    backgroundColor: '#171717',
  },
  avatarButton: {
    padding: 2,
  },
  userAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#242424',
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F5F5F5',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F5F5F5',
    letterSpacing: -0.3,
  },
  newChatButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#242424',
    borderWidth: 1,
    borderColor: '#303030',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Category Tabs
  tabBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: '#242424',
    borderWidth: 1,
    borderColor: '#303030',
  },
  tabButtonActive: {
    borderColor: APP_COLORS.primary,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  tabText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#9A9A9A',
  },
  tabTextActive: {
    color: APP_COLORS.primary,
    fontWeight: '700',
  },

  // Search
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#242424',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 42,
    borderWidth: 1,
    borderColor: '#303030',
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#F5F5F5',
  },

  // Undo Toast
  undoToastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: '#262628',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#383838',
  },
  undoToastText: {
    fontSize: 13,
    color: '#F5F5F5',
    fontWeight: '500',
  },
  undoBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  undoBtnText: {
    color: APP_COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },

  // Swipe Hint
  swipeHintBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
    marginBottom: 8,
  },
  swipeHintText: {
    fontSize: 11.5,
    color: '#777777',
    fontWeight: '500',
  },

  // Scroll Content
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 140,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#242424',
    borderWidth: 1,
    borderColor: '#303030',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F5F5F5',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9A9A9A',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Chat Row
  swipeableContainer: {
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#242424',
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: '#303030',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  chatAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatAvatarText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  onlineStatusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#242424',
  },
  chatInfo: {
    flex: 1,
  },
  chatInfoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  chatName: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#E0E0E0',
    flex: 1,
    marginRight: 8,
  },
  chatNameUnread: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chatTime: {
    fontSize: 11,
    color: '#6E6E73',
  },
  chatTimeUnread: {
    color: APP_COLORS.primary,
    fontWeight: '600',
  },
  chatInfoBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 12.5,
    color: '#9A9A9A',
    flex: 1,
    marginRight: 8,
  },
  lastMessageUnread: {
    color: '#F0F0F0',
    fontWeight: '600',
  },
  unreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: APP_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
  },

  // Swipe Action Buttons
  deleteSwipeAction: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 76,
    borderRadius: 16,
    marginBottom: 10,
    marginLeft: 6,
  },
  archiveSwipeAction: {
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    width: 76,
    borderRadius: 16,
    marginBottom: 10,
    marginRight: 6,
  },
  unarchiveSwipeAction: {
    backgroundColor: '#10B981',
  },
  swipeActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
});
