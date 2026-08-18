import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useMessageStore } from '../../store/messageStore';
import { APP_COLORS } from '../../constants';
import { api } from '../../services/api';
import { safeGoBack } from '../../utils/navigation';

export interface UserItem {
  id: string;
  name: string;
  username: string;
  bio: string;
  avatar?: string;
  color: string;
}

export interface RecentSearchItem {
  id: string;
  name: string;
  username: string;
  color?: string;
}

const STORAGE_KEY_RECENT_SEARCHES = 'codeorbit_recent_user_searches';
const PRESET_COLORS = ['#E11D48', '#8B5CF6', '#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#6366F1'];

export default function UserSearchScreen() {
  const router = useRouter();
  const { addChat } = useMessageStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);

  // Load recent searches from SecureStore on mount
  useEffect(() => {
    const loadRecentSearches = async () => {
      try {
        const stored = await SecureStore.getItemAsync(STORAGE_KEY_RECENT_SEARCHES);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setRecentSearches(parsed);
          }
        }
      } catch (e) {
        console.warn('Failed to load recent searches:', e);
      }
    };
    loadRecentSearches();
  }, []);

  // Save recent searches to SecureStore
  const saveRecentSearches = async (newList: RecentSearchItem[]) => {
    setRecentSearches(newList);
    try {
      await SecureStore.setItemAsync(STORAGE_KEY_RECENT_SEARCHES, JSON.stringify(newList));
    } catch (e) {
      console.warn('Failed to save recent searches:', e);
    }
  };

  const addRecentSearch = (item: RecentSearchItem) => {
    const filtered = recentSearches.filter((r) => r.username.toLowerCase() !== item.username.toLowerCase());
    const updated = [item, ...filtered].slice(0, 10);
    saveRecentSearches(updated);
  };

  const removeRecentSearch = (username: string) => {
    const updated = recentSearches.filter((r) => r.username.toLowerCase() !== username.toLowerCase());
    saveRecentSearches(updated);
  };

  const clearAllRecentSearches = () => {
    saveRecentSearches([]);
  };

  const hasSearched = searchQuery.trim().length > 0;

  // Fetch real users from backend API database when search query is entered
  const loadUsers = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setUsers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.auth.searchUsers(trimmed);
      if (response && Array.isArray(response.users)) {
        const mapped: UserItem[] = response.users.map((u: any, idx: number) => ({
          id: u.id || `u_${u.username}`,
          name: u.name || u.username,
          username: u.username,
          bio: `@${u.username}`,
          color: PRESET_COLORS[idx % PRESET_COLORS.length],
        }));
        setUsers(mapped);
      } else {
        setUsers([]);
      }
    } catch (err) {
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!hasSearched) {
      setUsers([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      loadUsers(searchQuery);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleStartChat = (user: UserItem | RecentSearchItem) => {
    const safeName     = user.name     || user.username || 'User';
    const safeUsername = user.username || user.name     || 'user';

    // Add selected user to recent searches
    addRecentSearch({
      id: user.id,
      name: safeName,
      username: safeUsername,
      color: user.color || PRESET_COLORS[0],
    });

    const displayName = user.name
      ? `${user.name} (@${safeUsername})`
      : `@${safeUsername}`;
    const newChatId = addChat(displayName, 'Started a new conversation');
    const targetChat = useMessageStore.getState().chats.find((c) => c.id === newChatId);

    // Safe avatar initial — never call .charAt(0) on a potentially null value
    const avatarInitial =
      targetChat?.avatar ||
      (safeName.trim() ? safeName.trim().charAt(0).toUpperCase() : '?');

    router.replace({
      pathname: '/(main)/chat-thread',
      params: {
        id: newChatId,
        name: displayName,
        avatar: avatarInitial,
        color: targetChat?.color || user.color || PRESET_COLORS[0],
        status: 'Online',
      },
    });
  };

  const handleSelectRecentSearch = (item: RecentSearchItem) => {
    setSearchQuery(item.username);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Header Navigation */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => safeGoBack(router, '/(main)/messages')}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={APP_COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search People</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Pill Search Input Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchPill}>
          <Ionicons name="search-outline" size={20} color={APP_COLORS.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users by username..."
            placeholderTextColor={APP_COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => loadUsers(searchQuery)}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close" size={18} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* CASE 1: INITIAL STATE (hasSearched is false) -> Hide People title, Show Recent Searches */}
        {!hasSearched ? (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Recent searches</Text>
              {recentSearches.length > 0 ? (
                <TouchableOpacity onPress={clearAllRecentSearches}>
                  <Text style={styles.clearAllText}>Clear all</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {recentSearches.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={44} color={APP_COLORS.textSecondary + '60'} />
                <Text style={styles.emptyTitle}>No recent searches</Text>
                <Text style={styles.emptySubtitle}>
                  Enter a username above to search registered people.
                </Text>
              </View>
            ) : (
              recentSearches.map((item) => (
                <View key={item.id || item.username} style={styles.recentRow}>
                  <TouchableOpacity
                    style={styles.recentRowMain}
                    onPress={() => handleSelectRecentSearch(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.recentIconBox}>
                      <Ionicons name="time-outline" size={20} color={APP_COLORS.textSecondary} />
                    </View>
                    <View style={styles.recentInfo}>
                      <Text style={styles.recentName}>{item.name}</Text>
                      <Text style={styles.recentUsername}>@{item.username}</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.recentRemoveButton}
                    onPress={() => removeRecentSearch(item.username)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={18} color={APP_COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        ) : (
          /* CASE 2: SEARCHED STATE (hasSearched is true) -> Show People title and related users */
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>People</Text>
              {isLoading ? (
                <ActivityIndicator size="small" color={APP_COLORS.primary} style={{ marginLeft: 8 }} />
              ) : null}
            </View>

            {!isLoading && users.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={APP_COLORS.textSecondary + '60'} />
                <Text style={styles.emptyTitle}>No users found</Text>
                <Text style={styles.emptySubtitle}>
                  No registered user matching "{searchQuery}" was found.
                </Text>
              </View>
            ) : (
              users.map((person) => {
                const avatarInitial = person.name.charAt(0).toUpperCase();

                return (
                  <TouchableOpacity
                    key={person.id}
                    style={styles.userRow}
                    onPress={() => handleStartChat(person)}
                    activeOpacity={0.7}
                  >
                    {/* User Avatar Circle */}
                    <View style={[styles.avatarBox, { backgroundColor: person.color }]}>
                      <Text style={styles.avatarText}>{avatarInitial}</Text>
                    </View>

                    {/* User Info */}
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{person.name}</Text>
                      <Text style={styles.userBio} numberOfLines={1}>
                        {person.bio}
                      </Text>
                    </View>

                    {/* Action Icon */}
                    <View style={styles.chatActionIcon}>
                      <Ionicons name="chatbubble-outline" size={20} color={APP_COLORS.primary} />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: APP_COLORS.text,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.surface,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: APP_COLORS.text,
  },
  clearButton: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sectionContainer: {
    marginTop: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: APP_COLORS.text,
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: APP_COLORS.primary,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border + '40',
  },
  recentRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: APP_COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recentInfo: {
    flex: 1,
  },
  recentName: {
    fontSize: 15,
    fontWeight: '600',
    color: APP_COLORS.text,
  },
  recentUsername: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    marginTop: 2,
  },
  recentRemoveButton: {
    padding: 6,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border + '40',
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  userBio: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
  },
  chatActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: APP_COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
