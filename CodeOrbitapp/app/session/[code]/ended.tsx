import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSessionStore } from '../../../store/sessionStore';
import { useSessionHistoryStore } from '../../../store/sessionHistoryStore';
import { useAuthStore } from '../../../store/authStore';
import { APP_COLORS, getLanguagePreset } from '../../../constants';
import { api } from '../../../services/api';
import { Participant } from '../../../types';

export type SessionEndReason =
  | 'host_ended'
  | 'expired'
  | 'inactive_timeout'
  | 'server_shutdown'
  | 'interrupted';

export default function SessionEndedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code: string; reason?: SessionEndReason; lang?: string }>();
  const sessionCode = params.code || '';

  const { currentSession, participants, runLogs } = useSessionStore();
  const { historySessions } = useSessionHistoryStore();
  const { user } = useAuthStore();

  const [rating, setRating] = useState<number | null>(null);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [fetchedSession, setFetchedSession] = useState<any>(null);

  // Look up history session fallback
  const historyItem = useMemo(() => {
    return historySessions.find((s) => s.code.toLowerCase() === sessionCode.toLowerCase());
  }, [historySessions, sessionCode]);

  // Fetch session details from API if store was reset
  useEffect(() => {
    if (!currentSession && sessionCode) {
      api.sessions
        .getByCode(sessionCode)
        .then((res) => {
          if (res?.session) {
            setFetchedSession(res.session);
          }
        })
        .catch(() => {});
    }
  }, [sessionCode, currentSession]);

  // Resolve language preset name reliably
  const languagePresetKey =
    currentSession?.languagePreset ||
    currentSession?.language_preset ||
    historyItem?.languagePreset ||
    fetchedSession?.language_preset ||
    fetchedSession?.languagePreset ||
    params.lang ||
    'web';

  const languagePreset = getLanguagePreset(languagePresetKey);
  const languageName = languagePreset?.name || languagePresetKey.toUpperCase();

  // Resolve total participant count
  const participantCount = useMemo(() => {
    if (participants.length > 0) return participants.length;
    if (historyItem?.participantCount) return historyItem.participantCount;
    if (fetchedSession?.participants && Array.isArray(fetchedSession.participants)) {
      return fetchedSession.participants.length;
    }
    return 1;
  }, [participants.length, historyItem?.participantCount, fetchedSession]);

  // Compute session duration
  const durationDisplay = useMemo(() => {
    const startStr =
      currentSession?.createdAt ||
      currentSession?.created_at ||
      historyItem?.createdAt ||
      fetchedSession?.created_at ||
      fetchedSession?.createdAt;

    const endStr =
      currentSession?.endedAt ||
      currentSession?.ended_at ||
      historyItem?.endedAt ||
      fetchedSession?.ended_at ||
      new Date().toISOString();

    if (!startStr) return '1m';

    try {
      const startTime = new Date(startStr).getTime();
      const endTime = new Date(endStr).getTime();
      const diffMinutes = Math.max(1, Math.round((endTime - startTime) / (1000 * 60)));

      if (diffMinutes < 60) {
        return `${diffMinutes}m`;
      }
      const hours = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    } catch {
      return '1m';
    }
  }, [currentSession, historyItem, fetchedSession]);

  const isInterrupted =
    params.reason === 'server_shutdown' || params.reason === 'interrupted';

  const handleRate = useCallback((stars: number) => {
    setRating(stars);
    setRatingSubmitted(true);
  }, []);

  const handleStartNewSession = useCallback(() => {
    router.replace('/(main)/create-session');
  }, [router]);

  const handleBackToHome = useCallback(() => {
    router.replace('/(main)/home');
  }, [router]);

  const handleJoinAnotherRoom = useCallback(() => {
    router.replace('/(main)/join-session');
  }, [router]);

  const getParticipantName = (p: Participant | any) => {
    return (
      p.guest_name ||
      p.guestName ||
      p.user?.username ||
      p.username ||
      p.user?.name ||
      p.name ||
      'Participant'
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Header with Status Icon */}
        <View style={styles.header}>
          <View
            style={[
              styles.iconCircle,
              isInterrupted ? styles.iconCircleInterrupted : styles.iconCircleSuccess,
            ]}
          >
            <Ionicons
              name={isInterrupted ? 'alert-circle' : 'checkmark-circle'}
              size={36}
              color={isInterrupted ? APP_COLORS.primary : APP_COLORS.success}
            />
          </View>

          <Text style={styles.title}>
            {isInterrupted ? 'Session Interrupted' : 'Session Ended'}
          </Text>
          <Text style={styles.subtitle}>
            {isInterrupted
              ? 'The session ended unexpectedly. All code edits were preserved.'
              : "Here's your session summary"}
          </Text>
        </View>

        {/* 2. Three Metric Stats Cards */}
        <View style={styles.statsRow}>
          {/* Participants */}
          <View style={styles.statCard}>
            <Ionicons name="people" size={20} color={APP_COLORS.primary} />
            <Text style={styles.statNumber}>{participantCount}</Text>
            <Text style={styles.statLabel}>
              {participantCount === 1 ? 'Participant' : 'Participants'}
            </Text>
          </View>

          {/* Code Runs */}
          <View style={styles.statCard}>
            <Ionicons name="play" size={20} color={APP_COLORS.success} />
            <Text style={styles.statNumber}>{runLogs.length}</Text>
            <Text style={styles.statLabel}>
              {runLogs.length === 1 ? 'Code Run' : 'Code Runs'}
            </Text>
          </View>

          {/* Duration */}
          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={20} color={APP_COLORS.textSecondary} />
            <Text style={styles.statNumber}>{durationDisplay}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
        </View>

        {/* 3. Session Info Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeaderTitle}>SESSION INFO</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Room Code</Text>
            <Text style={styles.infoCodeValue}>{sessionCode || '------'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Language</Text>
            <Text style={styles.infoValue}>{languageName}</Text>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Status</Text>
            <View style={styles.statusBadge}>
              <Ionicons
                name={isInterrupted ? 'alert-circle' : 'checkmark-circle'}
                size={14}
                color={isInterrupted ? APP_COLORS.primary : APP_COLORS.success}
              />
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: isInterrupted ? APP_COLORS.primary : APP_COLORS.success },
                ]}
              >
                {isInterrupted ? 'Interrupted' : 'Ended'}
              </Text>
            </View>
          </View>
        </View>

        {/* 4. Participants Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeaderTitle}>PARTICIPANTS</Text>

          {participants.length > 0 ? (
            participants.map((p, idx) => (
              <View
                key={p.id || idx}
                style={[
                  styles.participantRow,
                  idx === participants.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <View style={styles.participantAvatar}>
                  <Text style={styles.avatarInitial}>
                    {getParticipantName(p).charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>{getParticipantName(p)}</Text>
                  <Text style={styles.participantRole}>
                    {p.role === 'host' ? 'Host' : 'Collaborator'}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.participantRowSingle}>
              <View style={styles.participantAvatar}>
                <Text style={styles.avatarInitial}>
                  {(user?.name || user?.username || 'You').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.participantInfo}>
                <Text style={styles.participantName}>{user?.name || user?.username || 'You'}</Text>
                <Text style={styles.participantRole}>
                  {historyItem?.isHost ? 'Host' : 'Participant'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* 5. Run History Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeaderTitle}>RUN HISTORY</Text>
          {runLogs.length > 0 ? (
            runLogs.map((log, index) => (
              <View
                key={log.id || index}
                style={[
                  styles.runRow,
                  index === runLogs.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <View style={styles.runHeader}>
                  <Text style={styles.runLanguage}>
                    #{index + 1} {log.language}
                  </Text>
                  <View
                    style={[
                      styles.runBadge,
                      log.exit_code === 0 ? styles.runBadgeSuccess : styles.runBadgeError,
                    ]}
                  >
                    <Text
                      style={[
                        styles.runBadgeText,
                        { color: log.exit_code === 0 ? APP_COLORS.success : APP_COLORS.error },
                      ]}
                    >
                      {log.exit_code === 0 ? '✓ Success' : '✕ Error'}
                    </Text>
                  </View>
                </View>
                {log.stdout ? (
                  <Text style={styles.runOutput} numberOfLines={2}>
                    {log.stdout}
                  </Text>
                ) : null}
              </View>
            ))
          ) : (
            <Text style={styles.emptyRunText}>No code runs in this session.</Text>
          )}
        </View>

        {/* 6. Rate Your Experience (Optional) */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeaderTitle}>RATE YOUR EXPERIENCE</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => handleRate(star)}
                style={styles.starButton}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Ionicons
                  name={rating && rating >= star ? 'star' : 'star-outline'}
                  size={26}
                  color={rating && rating >= star ? '#F59E0B' : '#525252'}
                />
              </TouchableOpacity>
            ))}
          </View>
          {ratingSubmitted && (
            <Text style={styles.ratingFeedback}>Thanks for your feedback! ✓</Text>
          )}
        </View>

        {/* 7. Action Navigation Buttons */}
        <View style={styles.actionsContainer}>
          {/* Primary CTA: Start New Session */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleStartNewSession}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Start New Session"
          >
            <Ionicons name="add" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.primaryBtnText}>Start New Session</Text>
          </TouchableOpacity>

          {/* Secondary CTA: Back to Home */}
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={handleBackToHome}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Back to Home"
          >
            <Ionicons name="home-outline" size={17} color={APP_COLORS.text} style={{ marginRight: 6 }} />
            <Text style={styles.secondaryBtnText}>Back to Home</Text>
          </TouchableOpacity>

          {/* Tertiary Action: Join Another Room */}
          <TouchableOpacity
            style={styles.tertiaryBtn}
            onPress={handleJoinAnotherRoom}
            activeOpacity={0.7}
          >
            <Text style={styles.tertiaryBtnText}>Join Another Room</Text>
          </TouchableOpacity>
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
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 40,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconCircleSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  iconCircleInterrupted: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F5F5F5',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#9A9A9A',
    textAlign: 'center',
    lineHeight: 20,
  },

  // 3 Metrics Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#242424',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#303030',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F5F5F5',
    marginTop: 6,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9A9A9A',
  },

  // Section Cards
  sectionCard: {
    backgroundColor: '#242424',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#303030',
    marginBottom: 14,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9A9A9A',
    letterSpacing: 0.6,
    marginBottom: 12,
    textTransform: 'uppercase',
  },

  // Info Rows
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2F33',
  },
  infoLabel: {
    fontSize: 14,
    color: '#9A9A9A',
  },
  infoValue: {
    fontSize: 14,
    color: '#F5F5F5',
    fontWeight: '600',
  },
  infoCodeValue: {
    fontSize: 14,
    color: APP_COLORS.primary,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Participant Rows
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2F33',
  },
  participantRowSingle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  participantAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: APP_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F5F5F5',
  },
  participantRole: {
    fontSize: 12,
    color: '#9A9A9A',
  },

  // Run History Rows
  runRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2F33',
  },
  runHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  runLanguage: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F5F5F5',
  },
  runBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  runBadgeSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  runBadgeError: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  runBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  runOutput: {
    fontSize: 12,
    color: '#9A9A9A',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  emptyRunText: {
    fontSize: 13,
    color: '#9A9A9A',
    fontStyle: 'italic',
    paddingVertical: 4,
  },

  // Rating
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingFeedback: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: APP_COLORS.success,
    marginTop: 8,
  },

  // Actions Container
  actionsContainer: {
    marginTop: 12,
    gap: 10,
  },
  primaryBtn: {
    height: 52,
    backgroundColor: APP_COLORS.primary,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    height: 48,
    backgroundColor: '#242424',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#303030',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: '#F5F5F5',
    fontSize: 14,
    fontWeight: '600',
  },
  tertiaryBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tertiaryBtnText: {
    color: '#9A9A9A',
    fontSize: 13,
    fontWeight: '600',
  },
});
