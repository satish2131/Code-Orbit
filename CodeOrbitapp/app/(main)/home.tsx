import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useSessionHistoryStore } from '../../store/sessionHistoryStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useSessionStore } from '../../store/sessionStore';
import { APP_COLORS, getLanguagePreset } from '../../constants';

const CATEGORIES = ['All Sessions', 'Python', 'Web', 'TypeScript', 'C++ / Java', 'Rust'];

const CATEGORY_TO_LANG: Record<string, string> = {
  'Python': 'python',
  'Web': 'web',
  'TypeScript': 'typescript',
  'C++ / Java': 'cpp',
  'Rust': 'rust',
};

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { historySessions, loadHistory, isLoading } = useSessionHistoryStore();
  const { unreadCount: unreadNotifCount, loadNotifications } = useNotificationStore();
  const { currentSession } = useSessionStore();

  const [selectedCategory, setSelectedCategory] = useState('All Sessions');

  useFocusEffect(
    useCallback(() => {
      loadHistory();
      loadNotifications();
    }, [user?.id])
  );

  // Dynamic time-of-day greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const handleSelectCategory = useCallback((category: string) => {
    setSelectedCategory(category);
  }, []);

  // Filter history sessions dynamically
  const filteredSessions = useMemo(() => {
    if (selectedCategory === 'All Sessions') {
      return historySessions;
    }
    const cat = selectedCategory.toLowerCase();

    return historySessions.filter((session) => {
      const lang = (session.languagePreset || '').toLowerCase();
      if (cat.includes('python')) return lang.includes('python') || lang.includes('py');
      if (cat.includes('web'))
        return (
          lang.includes('web') ||
          lang.includes('html') ||
          lang.includes('javascript') ||
          lang.includes('js')
        );
      if (cat.includes('typescript')) return lang.includes('typescript') || lang.includes('ts');
      if (cat.includes('c++') || cat.includes('java'))
        return (
          lang.includes('cpp') ||
          lang.includes('c++') ||
          lang.includes('java') ||
          lang === 'c'
        );
      if (cat.includes('rust')) return lang.includes('rust') || lang.includes('rs');
      return lang.includes(cat);
    });
  }, [historySessions, selectedCategory]);

  const recentSessions = useMemo(() => filteredSessions.slice(0, 5), [filteredSessions]);
  const targetLang = CATEGORY_TO_LANG[selectedCategory];

  const handleCreateSession = () => {
    if (targetLang) {
      router.push({ pathname: '/(main)/create-session', params: { lang: targetLang } });
    } else {
      router.push('/(main)/create-session');
    }
  };

  const getEnvIcon = (presetKey?: string) => {
    const key = (presetKey || '').toLowerCase();
    if (key.includes('python') || key.includes('py')) return 'terminal-outline';
    if (key.includes('web') || key.includes('html')) return 'globe-outline';
    if (key.includes('typescript') || key.includes('ts') || key.includes('js'))
      return 'code-slash-outline';
    if (key.includes('cpp') || key.includes('c++') || key.includes('rust'))
      return 'hardware-chip-outline';
    return 'code-outline';
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Clean Top Header: Tappable Avatar on left, Notification Bell on right */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => router.push('/(main)/profile')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="View Profile"
          >
            <View style={styles.avatarCircle}>
              {user && (user.avatar_url || (user as any).avatarUrl) ? (
                <Image
                  source={{ uri: user.avatar_url || (user as any).avatarUrl }}
                  style={{ width: 36, height: 36, borderRadius: 18 }}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0).toUpperCase() || 'G'}
                </Text>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push('/(main)/notifications')}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={21} color={APP_COLORS.text} />
            {unreadNotifCount > 0 && <View style={styles.badgeDot} />}
          </TouchableOpacity>
        </View>

        {/* 2. Personalized Greeting */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingText}>{greeting}</Text>
          <Text style={styles.userNameText}>{user?.name || 'Developer'}</Text>
        </View>

        {/* 3. Live Active Session Banner (If active session exists) */}
        {currentSession && currentSession.status === 'active' && (
          <TouchableOpacity
            style={styles.activeSessionBanner}
            onPress={() =>
              router.push({
                pathname: '/session/[code]/room',
                params: {
                  code: currentSession.code,
                  lang: currentSession.languagePreset || currentSession.language_preset,
                },
              })
            }
            activeOpacity={0.85}
          >
            <View style={styles.activeDotPulse} />
            <Text style={styles.activeSessionText}>
              Live Session: <Text style={styles.activeSessionCode}>{currentSession.code}</Text>
            </Text>
            <Ionicons name="arrow-forward" size={14} color="#10B981" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        )}

        {/* 4. Horizontal Category Filter Chips (Smooth scroll, unclipped) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {CATEGORIES.map((category) => {
            const isActive = selectedCategory === category;
            return (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  isActive ? styles.categoryChipActive : styles.categoryChipInactive,
                ]}
                onPress={() => handleSelectCategory(category)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.categoryText,
                    isActive ? styles.categoryTextActive : styles.categoryTextInactive,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 5. 2-Column Action Cards (Create Session & Join Session) */}
        <View style={styles.gridRow}>
          {/* Card 1: Create Session */}
          <TouchableOpacity
            style={styles.gridCard}
            onPress={handleCreateSession}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Create Session"
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardIconBox}>
                <Ionicons name="add" size={22} color="#EF4444" />
              </View>
            </View>

            <Text style={styles.gridCardTitle}>
              {targetLang ? `Create ${selectedCategory}` : 'Create Session'}
            </Text>
            <Text style={styles.gridCardSubtitle}>
              {targetLang ? `Start live ${selectedCategory} room` : 'Start live pair coding'}
            </Text>

            <View style={styles.cardFooter}>
              <Text style={styles.actionTagText}>Start →</Text>
            </View>
          </TouchableOpacity>

          {/* Card 2: Join Session */}
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => router.push('/(main)/join-session')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Join Session"
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardIconBox}>
                <Ionicons name="arrow-forward" size={20} color={APP_COLORS.text} />
              </View>
            </View>

            <Text style={styles.gridCardTitle}>Join Session</Text>
            <Text style={styles.gridCardSubtitle}>Enter 6-digit room code</Text>

            <View style={styles.cardFooter}>
              <Text style={[styles.actionTagText, { color: APP_COLORS.text }]}>Join →</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 6. Recent Sessions Header & List */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitleText}>Recent Sessions</Text>
          <TouchableOpacity
            onPress={() => router.push('/(main)/history')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.seeAllText}>See all →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listSection}>
          {isLoading && recentSessions.length === 0 ? (
            <View style={[styles.listCardRow, { justifyContent: 'center', paddingVertical: 18 }]}>
              <ActivityIndicator size="small" color={APP_COLORS.primary} style={{ marginRight: 10 }} />
              <Text style={styles.rowSubtitle}>Loading recent sessions...</Text>
            </View>
          ) : recentSessions.length === 0 ? (
            <TouchableOpacity
              style={styles.listCardRow}
              onPress={handleCreateSession}
              activeOpacity={0.75}
            >
              <View style={styles.rowAvatar}>
                <Ionicons name="code-slash" size={18} color={APP_COLORS.textSecondary} />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>No recent sessions</Text>
                <Text style={styles.rowSubtitle}>Tap to start your first pair coding room</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          ) : (
            recentSessions.map((session) => {
              const preset = getLanguagePreset(session.languagePreset);
              const langName = preset?.name || session.languagePreset?.toUpperCase() || 'Code';
              const isLive = session.status === 'active';

              return (
                <TouchableOpacity
                  key={session.id || session.code}
                  style={styles.listCardRow}
                  onPress={() => router.push('/(main)/history')}
                  activeOpacity={0.75}
                >
                  <View style={styles.rowAvatar}>
                    <Ionicons
                      name={getEnvIcon(session.languagePreset) as any}
                      size={18}
                      color={APP_COLORS.text}
                    />
                  </View>

                  <View style={styles.rowContent}>
                    <Text style={styles.rowTitle}>{session.code}</Text>
                    <Text style={styles.rowSubtitle}>
                      {langName} · {session.participantCount}{' '}
                      {session.participantCount === 1 ? 'member' : 'members'}
                    </Text>
                  </View>

                  <View style={styles.rowRight}>
                    <View style={styles.statusBadgeRow}>
                      <View
                        style={[
                          styles.statusSmallDot,
                          { backgroundColor: isLive ? '#10B981' : '#6E6E73' },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusLabelText,
                          { color: isLive ? '#10B981' : '#9A9A9A' },
                        ]}
                      >
                        {isLive ? 'Live' : 'Ended'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={15} color={APP_COLORS.textSecondary} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171717',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 46,
    paddingBottom: 140,
  },

  // Top Header
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  avatarButton: {
    borderRadius: 20,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#303030',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#242424',
    borderWidth: 1,
    borderColor: '#303030',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: 9,
    right: 11,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },

  // Greeting
  greetingSection: {
    marginBottom: 18,
  },
  greetingText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#9A9A9A',
    marginBottom: 2,
  },
  userNameText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F5F5F5',
    letterSpacing: -0.4,
  },

  // Live Active Session Banner
  activeSessionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.28)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 18,
  },
  activeDotPulse: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  activeSessionText: {
    fontSize: 13,
    color: '#F5F5F5',
    fontWeight: '500',
  },
  activeSessionCode: {
    color: '#10B981',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Filter Chips
  categoriesScroll: {
    gap: 8,
    paddingRight: 24,
    marginBottom: 20,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryChipActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  categoryChipInactive: {
    backgroundColor: '#242424',
    borderColor: '#303030',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  categoryTextInactive: {
    color: '#9A9A9A',
  },

  // Grid Action Cards
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  gridCard: {
    flex: 1,
    backgroundColor: '#242424',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#303030',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F5F5F5',
    marginBottom: 3,
  },
  gridCardSubtitle: {
    fontSize: 12,
    color: '#9A9A9A',
    marginBottom: 12,
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionTagText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },

  // Recent Sessions Section
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F5F5F5',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },

  // List Cards
  listSection: {
    gap: 8,
  },
  listCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#242424',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#303030',
  },
  rowAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#F5F5F5',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  rowSubtitle: {
    fontSize: 12,
    color: '#9A9A9A',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusSmallDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabelText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
