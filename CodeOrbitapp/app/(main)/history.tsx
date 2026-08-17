import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
  Modal,
  Platform,
  Alert,
  Share,
  Clipboard,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { APP_COLORS, getLanguagePreset } from '../../constants';
import { useSessionHistoryStore, HistorySessionItem } from '../../store/sessionHistoryStore';
import { useSessionSocket } from '../../hooks/useSessionSocket';

type FilterTab = 'all' | 'active' | 'hosted' | 'ended';

export default function HistoryScreen() {
  const router = useRouter();
  const { historySessions, isLoading, loadHistory, removeHistoryEntry, clearHistory } =
    useSessionHistoryStore();
  const { joinExistingSession } = useSessionSocket();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [actionMenuSession, setActionMenuSession] = useState<HistorySessionItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2000);
  };

  const filteredSessions = useMemo(() => {
    // Only display sessions that were actually entered (active or ended), never waiting or cancelled
    let list = historySessions.filter(
      (s) => s && (s.status === 'active' || s.status === 'ended')
    );

    // Apply Tab Filter
    if (activeTab === 'active') {
      list = list.filter((s) => s.status === 'active');
    } else if (activeTab === 'hosted') {
      list = list.filter((s) => s.isHost);
    } else if (activeTab === 'ended') {
      list = list.filter((s) => s.status === 'ended');
    }

    // Apply Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) => {
        const codeMatch = s.code.toLowerCase().includes(q);
        const langMatch = s.languagePreset.toLowerCase().includes(q);
        const hostMatch = (s.hostName || '').toLowerCase().includes(q);
        const dateMatch = new Date(s.createdAt).toLocaleDateString().toLowerCase().includes(q);
        return codeMatch || langMatch || hostMatch || dateMatch;
      });
    }

    return list;
  }, [historySessions, activeTab, searchQuery]);

  // Group filtered sessions into Today, Yesterday, and Earlier sections
  const groupedSessions = useMemo(() => {
    const today: HistorySessionItem[] = [];
    const yesterday: HistorySessionItem[] = [];
    const earlier: HistorySessionItem[] = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;

    filteredSessions.forEach((session) => {
      const sessionTime = new Date(session.createdAt).getTime();
      if (sessionTime >= startOfToday) {
        today.push(session);
      } else if (sessionTime >= startOfYesterday) {
        yesterday.push(session);
      } else {
        earlier.push(session);
      }
    });

    return [
      { title: 'TODAY', data: today },
      { title: 'YESTERDAY', data: yesterday },
      { title: 'EARLIER', data: earlier },
    ].filter((group) => group.data.length > 0);
  }, [filteredSessions]);

  const handleCopyCode = useCallback((code: string) => {
    try {
      Clipboard.setString(code);
    } catch {}
    showToast(`✓ Copied "${code}"`);
  }, []);

  const handleShareCode = useCallback(async (session: HistorySessionItem) => {
    setActionMenuSession(null);
    try {
      await Share.share({
        message: `Join my live coding room on CodeOrbit!\nCode: ${session.code} (${session.languagePreset.toUpperCase()})`,
      });
    } catch (e) {}
  }, []);

  const handleRejoinSession = useCallback(
    (session: HistorySessionItem) => {
      joinExistingSession(session.code);
      router.push({
        pathname: '/session/[code]/room',
        params: { code: session.code },
      });
    },
    [joinExistingSession, router]
  );

  const handleViewEndedSession = useCallback(
    (session: HistorySessionItem) => {
      router.push({
        pathname: '/session/[code]/ended',
        params: { code: session.code },
      });
    },
    [router]
  );

  const handleDeleteSession = useCallback(
    (session: HistorySessionItem) => {
      setActionMenuSession(null);
      Alert.alert(
        'Delete Session Record?',
        `Are you sure you want to remove session ${session.code} from your history?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              removeHistoryEntry(session.id);
              showToast(`Session ${session.code} deleted`);
            },
          },
        ]
      );
    },
    [removeHistoryEntry]
  );

  const handleClearAllHistory = useCallback(() => {
    Alert.alert(
      'Clear All History?',
      'This will permanently remove all session records from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear History',
          style: 'destructive',
          onPress: () => {
            clearHistory();
            showToast('Session history cleared');
          },
        },
      ]
    );
  }, [clearHistory]);

  const getEnvIcon = (lang: string) => {
    const key = (lang || '').toLowerCase();
    if (key.includes('python') || key.includes('py')) return 'terminal-outline';
    if (key.includes('web') || key.includes('html')) return 'globe-outline';
    if (key.includes('typescript') || key.includes('ts') || key.includes('js'))
      return 'code-slash-outline';
    if (key.includes('cpp') || key.includes('c++') || key.includes('rust'))
      return 'hardware-chip-outline';
    return 'code-outline';
  };

  const formatShortTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const startOfYesterday = startOfToday - 86400000;
      const dateTime = d.getTime();

      const timeString = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

      if (dateTime >= startOfToday) {
        return timeString;
      } else if (dateTime >= startOfYesterday) {
        return timeString;
      } else {
        const dateFormatted = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        return `${dateFormatted} · ${timeString}`;
      }
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Top Header: Title on Left, Subtle Muted Trash Icon on Right */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Session History</Text>
          {historySessions.length > 0 && (
            <TouchableOpacity
              onPress={handleClearAllHistory}
              style={styles.clearIconBtn}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Clear history"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={17} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>

        {/* 2. Specific Search Bar with Clear X */}
        <View style={styles.searchWrapper}>
          <Ionicons
            name="search-outline"
            size={17}
            color={APP_COLORS.textSecondary}
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search room code or language..."
            placeholderTextColor={APP_COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery ? (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* 3. Shortened Filter Chips (Unclipped Horizontal Scroll) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
          style={styles.tabsScrollView}
        >
          <TouchableOpacity
            style={[styles.chip, activeTab === 'all' && styles.chipActive]}
            onPress={() => setActiveTab('all')}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, activeTab === 'all' && styles.chipTextActive]}>
              All ({historySessions.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.chip, activeTab === 'active' && styles.chipActive]}
            onPress={() => setActiveTab('active')}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, activeTab === 'active' && styles.chipTextActive]}>
              Active
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.chip, activeTab === 'hosted' && styles.chipActive]}
            onPress={() => setActiveTab('hosted')}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, activeTab === 'hosted' && styles.chipTextActive]}>
              Hosted by me
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.chip, activeTab === 'ended' && styles.chipActive]}
            onPress={() => setActiveTab('ended')}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, activeTab === 'ended' && styles.chipTextActive]}>
              Completed
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Floating Copy Confirmation Toast */}
      {toastMessage && (
        <View style={styles.toastContainer}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* 4. Main Scrollable List of History Cards */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isLoading}
            onRefresh={onRefresh}
            tintColor={APP_COLORS.primary}
          />
        }
      >
        {filteredSessions.length === 0 ? (
          /* Empty State */
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="time-outline" size={36} color={APP_COLORS.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No matching sessions' : 'No sessions yet'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? `No sessions found matching "${searchQuery}"`
                : 'Create or join a coding session and your history will appear here.'}
            </Text>
            <TouchableOpacity
              style={styles.emptyCreateBtn}
              onPress={() => router.push('/(main)/create-session')}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.emptyCreateBtnText}>Create Session</Text>
            </TouchableOpacity>
          </View>
        ) : (
          groupedSessions.map((group) => (
            <View key={group.title} style={styles.groupSection}>
              {/* Date Section Header */}
              <Text style={styles.groupTitleText}>{group.title}</Text>

              {group.data.map((session) => (
                <HistorySessionCard
                  key={session.id}
                  session={session}
                  onCopyCode={handleCopyCode}
                  onRejoin={handleRejoinSession}
                  onViewEnded={handleViewEndedSession}
                  onOpenActionMenu={setActionMenuSession}
                  getEnvIcon={getEnvIcon}
                  formatShortTime={formatShortTime}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {/* Overflow Action Menu Modal */}
      <Modal
        visible={Boolean(actionMenuSession)}
        transparent
        animationType="fade"
        onRequestClose={() => setActionMenuSession(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActionMenuSession(null)}
        >
          <View style={styles.actionMenuCard}>
            <View style={styles.actionMenuHeader}>
              <Text style={styles.actionMenuTitle}>Session {actionMenuSession?.code}</Text>
              <Text style={styles.actionMenuSubtitle}>
                {actionMenuSession?.languagePreset.toUpperCase()} ·{' '}
                {actionMenuSession && formatShortTime(actionMenuSession.createdAt)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => {
                if (actionMenuSession) handleCopyCode(actionMenuSession.code);
                setActionMenuSession(null);
              }}
            >
              <Ionicons name="copy-outline" size={18} color={APP_COLORS.text} />
              <Text style={styles.actionMenuLabel}>Copy Room Code</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => {
                if (actionMenuSession) handleShareCode(actionMenuSession);
              }}
            >
              <Ionicons name="share-social-outline" size={18} color={APP_COLORS.text} />
              <Text style={styles.actionMenuLabel}>Share Session</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionMenuItem, styles.actionMenuDestructive]}
              onPress={() => {
                if (actionMenuSession) handleDeleteSession(actionMenuSession);
              }}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={[styles.actionMenuLabel, { color: '#EF4444' }]}>
                Delete Session Record
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionMenuCancel}
              onPress={() => setActionMenuSession(null)}
            >
              <Text style={styles.actionMenuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

interface HistorySessionCardProps {
  session: HistorySessionItem;
  onCopyCode: (code: string) => void;
  onRejoin: (session: HistorySessionItem) => void;
  onViewEnded: (session: HistorySessionItem) => void;
  onOpenActionMenu: (session: HistorySessionItem) => void;
  getEnvIcon: (lang: string) => string;
  formatShortTime: (dateStr: string) => string;
}

const HistorySessionCard = React.memo(function HistorySessionCard({
  session,
  onCopyCode,
  onRejoin,
  onViewEnded,
  onOpenActionMenu,
  getEnvIcon,
  formatShortTime,
}: HistorySessionCardProps) {
  const isActive = session.status === 'active' || session.status === 'waiting';
  const preset = getLanguagePreset(session.languagePreset);
  const langLabel = preset?.name || session.languagePreset;
  const maxUsers = session.maxParticipants || 4;
  const currentCount = session.participantCount || 1;

  const handleCardPress = () => {
    if (isActive) {
      onRejoin(session);
    } else {
      onViewEnded(session);
    }
  };

  return (
    <TouchableOpacity
      style={styles.sessionCard}
      onPress={handleCardPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Session ${session.code}, ${langLabel}`}
    >
      {/* 1. Header: Icon + Code + Copy + Status */}
      <View style={styles.cardHeader}>
        <View style={styles.codeGroup}>
          <View style={styles.langIconBox}>
            <Ionicons
              name={getEnvIcon(session.languagePreset) as any}
              size={15}
              color={APP_COLORS.text}
            />
          </View>
          <Text style={styles.codeText}>{session.code}</Text>

          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onCopyCode(session.code);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.copyButton}
          >
            <Ionicons name="copy-outline" size={14} color={APP_COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Status Badge: Mixed case (Ended / Live) */}
        <View style={styles.statusPill}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isActive ? '#10B981' : '#6E6E73' },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: isActive ? '#10B981' : '#9A9A9A' },
            ]}
          >
            {isActive ? 'Live' : 'Ended'}
          </Text>
        </View>
      </View>

      {/* 2. Compact Metadata Info */}
      <View style={styles.cardBody}>
        <Text style={styles.metaLine}>
          <Text style={styles.metaHighlight}>{langLabel}</Text>
          <Text style={styles.metaDot}> · </Text>
          <Text style={styles.metaText}>
            {currentCount}/{maxUsers} {maxUsers === 1 ? 'user' : 'users'}
          </Text>
        </Text>

        <Text style={styles.hostLine}>
          {session.isHost ? 'Hosted by you' : `Host: ${session.hostName || 'Collaborator'}`}
          <Text style={styles.metaDot}> · </Text>
          <Text style={styles.dateText}>{formatShortTime(session.createdAt)}</Text>
        </Text>
      </View>

      {/* 3. Footer: View Action Link + Three-Dot Menu */}
      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={styles.viewLink}
          onPress={handleCardPress}
          activeOpacity={0.7}
        >
          <Text style={[styles.viewLinkText, isActive && { color: '#10B981' }]}>
            {isActive ? 'Rejoin Workspace →' : 'View Session →'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.overflowBtn}
          onPress={(e) => {
            e.stopPropagation();
            onOpenActionMenu(session);
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="ellipsis-horizontal" size={18} color={APP_COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171717',
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 10,
    backgroundColor: '#171717',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#F5F5F5',
    letterSpacing: -0.4,
  },
  clearIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#242424',
    borderWidth: 1,
    borderColor: '#303030',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#242424',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: '#303030',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#F5F5F5',
  },

  // Filter Chips
  tabsScrollView: {
    maxHeight: 38,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 24,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: '#242424',
    borderWidth: 1,
    borderColor: '#303030',
  },
  chipActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#9A9A9A',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },

  // Toast
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 108 : 96,
    alignSelf: 'center',
    backgroundColor: '#242424',
    borderWidth: 1,
    borderColor: '#383838',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 999,
  },
  toastText: {
    color: '#F5F5F5',
    fontSize: 13,
    fontWeight: '600',
  },

  // Scroll Content
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 140,
  },
  groupSection: {
    marginBottom: 18,
  },
  groupTitleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9A9A9A',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 2,
  },

  // Session Card
  sessionCard: {
    backgroundColor: '#242424',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#303030',
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  codeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  codeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F5F5F5',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyButton: {
    padding: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Card Body
  cardBody: {
    marginBottom: 10,
  },
  metaLine: {
    fontSize: 13,
    color: '#9A9A9A',
    marginBottom: 2,
  },
  metaHighlight: {
    color: '#F5F5F5',
    fontWeight: '600',
  },
  metaDot: {
    color: '#555555',
  },
  metaText: {
    color: '#9A9A9A',
  },
  hostLine: {
    fontSize: 12,
    color: '#8A8A8E',
  },
  dateText: {
    fontSize: 12,
    color: '#8A8A8E',
  },

  // Card Footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#2D2F33',
    paddingTop: 10,
  },
  viewLink: {
    paddingVertical: 2,
  },
  viewLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  overflowBtn: {
    padding: 4,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#242424',
    borderWidth: 1,
    borderColor: '#303030',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F5F5F5',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: '#9A9A9A',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyCreateBtn: {
    backgroundColor: APP_COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
  },
  emptyCreateBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },

  // Action Menu Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
    padding: 20,
  },
  actionMenuCard: {
    backgroundColor: '#242424',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#303030',
    padding: 16,
  },
  actionMenuHeader: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#303030',
    marginBottom: 8,
  },
  actionMenuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F5F5F5',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  actionMenuSubtitle: {
    fontSize: 12,
    color: '#9A9A9A',
    marginTop: 2,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  actionMenuLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F5F5F5',
  },
  actionMenuDestructive: {
    borderTopWidth: 1,
    borderTopColor: '#2D2F33',
    marginTop: 4,
  },
  actionMenuCancel: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
  },
  actionMenuCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9A9A9A',
  },
});
