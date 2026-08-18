import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  Clipboard,
  Share,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSessionStore } from '../../store/sessionStore';
import { useAuthStore } from '../../store/authStore';
import { useSessionSocket } from '../../hooks/useSessionSocket';
import { APP_COLORS, getLanguagePreset } from '../../constants';
import { safeGoBack } from '../../utils/navigation';
import { approveJoinRequest, declineJoinRequest } from '../../services/socket';

export default function WaitingRoomScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentSession, participants, isHost } = useSessionStore();
  const { user } = useAuthStore();
  useSessionSocket();

  const isUserHost = Boolean(
    isHost ||
    (currentSession?.hostId && user?.id && (currentSession.hostId === user.id || (currentSession as any).host_id === user.id)) ||
    participants.some(
      (p) =>
        p.role === 'host' &&
        ((p.user_id && p.user_id === user?.id) || ((p as any).userId && (p as any).userId === user?.id))
    )
  );

  const presetKey = currentSession?.languagePreset || currentSession?.language_preset;
  const currentPreset = getLanguagePreset(presetKey);

  const [showQRModal, setShowQRModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Derive total capacity
  const maxCapacity =
    currentSession?.max_participants ||
    (currentSession as any)?.maxParticipants ||
    4;

  // Filter out host for guest count
  const guestParticipants = useMemo(() => {
    return participants.filter(
      (p) => p.user_id !== user?.id && (p as any).userId !== user?.id && p.role !== 'host'
    );
  }, [participants, user?.id]);

  const activeGuestCount = useMemo(() => {
    return guestParticipants.filter((p) => p.status === 'active').length;
  }, [guestParticipants]);

  const myParticipant = useMemo(() => {
    return participants.find(
      (p) =>
        (p.user_id && p.user_id === user?.id) ||
        ((p as any).userId && (p as any).userId === user?.id) ||
        (p.guest_name && p.guest_name === user?.name)
    );
  }, [participants, user?.id, user?.name]);

  // Auto-navigate to live room ONLY for non-host participants when session is active & approved
  useEffect(() => {
    if (!currentSession?.code) return;
    if (isUserHost) return; // HOST NEVER AUTO-NAVIGATES

    if (!myParticipant || myParticipant.role === 'host') return;

    if (myParticipant.status === 'active' && currentSession?.status === 'active') {
      router.replace({
        pathname: '/session/[code]/room',
        params: {
          code: currentSession.code,
          lang: currentSession.languagePreset || currentSession.language_preset,
        },
      });
    } else if ((myParticipant.status as string) === 'kicked' || (myParticipant.status as string) === 'declined') {
      Alert.alert('Request Declined', 'The host declined your join request.');
      safeGoBack(router, '/(main)/home');
    }
  }, [participants, currentSession, isUserHost, myParticipant, router]);

  const handleCopyCode = useCallback(() => {
    if (currentSession?.code) {
      try {
        Clipboard.setString(currentSession.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  }, [currentSession?.code]);

  const handleShareCode = useCallback(async () => {
    if (currentSession?.code) {
      try {
        await Share.share({
          message: `Join my live coding room on CodeOrbit!\nSession Code: ${currentSession.code} (${(
            currentPreset?.name || 'Code'
          ).toUpperCase()})`,
        });
      } catch (e) {}
    }
  }, [currentSession?.code, currentPreset?.name]);

  const handleEnterSession = useCallback(() => {
    if (currentSession?.code) {
      router.push({
        pathname: '/session/[code]/room',
        params: {
          code: currentSession.code,
          lang: currentSession.languagePreset || currentSession.language_preset,
        },
      });
    }
  }, [currentSession, router]);

  const handleLeave = useCallback(() => {
    Alert.alert(
      'Leave Session?',
      isUserHost
        ? 'Are you sure you want to cancel and leave this waiting room?'
        : 'Are you sure you want to leave this waiting room?',
      [
        { text: 'Keep Waiting', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => {
            const sessionCode = currentSession?.code;
            if (sessionCode) {
              if (isUserHost) {
                try {
                  const { getSocket } = require('../../services/socket');
                  getSocket().emit('end_session', { sessionCode });
                } catch {}
              }
              try {
                const { useSessionHistoryStore } = require('../../store/sessionHistoryStore');
                useSessionHistoryStore.getState().removeHistoryEntry(sessionCode);
              } catch {}
            }
            useSessionStore.getState().resetSession();
            safeGoBack(router, '/(main)/home');
          },
        },
      ]
    );
  }, [currentSession?.code, isUserHost, router]);

  const handleApprove = useCallback((participantId: string) => {
    if (currentSession?.code) {
      approveJoinRequest(currentSession.code, participantId);
    }
  }, [currentSession?.code]);

  const handleDecline = useCallback((participantId: string) => {
    if (currentSession?.code) {
      declineJoinRequest(currentSession.code, participantId);
    }
  }, [currentSession?.code]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top > 0 ? insets.top + 8 : (Platform.OS === 'ios' ? 54 : 44), paddingBottom: insets.bottom > 0 ? insets.bottom + 24 : 36 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Minimal Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.leaveButton}
            onPress={handleLeave}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Leave waiting room"
          >
            <Ionicons name="close" size={20} color={APP_COLORS.text} />
            <Text style={styles.leaveButtonText}>Leave</Text>
          </TouchableOpacity>

          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{isUserHost ? 'Host' : 'Guest'}</Text>
          </View>
        </View>

        {/* Title & Language Badge */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Waiting Room</Text>
          {currentPreset && (
            <View style={styles.presetTag}>
              <Ionicons
                name={(currentPreset.icon || 'code-slash') as any}
                size={14}
                color={APP_COLORS.primary}
              />
              <Text style={styles.presetTagText}>{currentPreset.name}</Text>
            </View>
          )}
        </View>

        {/* 2. Room Code Box (Minimal & Clean) */}
        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>ROOM CODE</Text>

          <View style={styles.codeBox}>
            {currentSession?.code ? (
              <Text style={styles.codeText}>{currentSession.code}</Text>
            ) : (
              <View style={styles.generatingBox}>
                <ActivityIndicator size="small" color={APP_COLORS.primary} />
                <Text style={styles.generatingText}>Generating...</Text>
              </View>
            )}
          </View>

          {/* Secondary Actions: Copy, Share, Show QR */}
          <View style={styles.secondaryActionsRow}>
            <TouchableOpacity
              style={[styles.secondaryActionBtn, copied && styles.secondaryActionBtnCopied]}
              onPress={handleCopyCode}
              disabled={!currentSession?.code}
              activeOpacity={0.75}
            >
              <Ionicons
                name={copied ? 'checkmark' : 'copy-outline'}
                size={15}
                color={copied ? APP_COLORS.success : APP_COLORS.primary}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.secondaryActionText, copied && { color: APP_COLORS.success }]}>
                {copied ? 'Copied' : 'Copy'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryActionBtn}
              onPress={handleShareCode}
              disabled={!currentSession?.code}
              activeOpacity={0.75}
            >
              <Ionicons
                name="share-social-outline"
                size={15}
                color={APP_COLORS.primary}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.secondaryActionText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryActionBtn}
              onPress={() => setShowQRModal(true)}
              disabled={!currentSession?.code}
              activeOpacity={0.75}
            >
              <Ionicons
                name="qr-code-outline"
                size={15}
                color={APP_COLORS.primary}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.secondaryActionText}>Show QR</Text>
            </TouchableOpacity>
          </View>

          {/* Primary CTA: Enter Session */}
          {(isUserHost || myParticipant?.status === 'active') && (
            <TouchableOpacity
              style={styles.enterSessionButton}
              onPress={handleEnterSession}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Enter Session"
            >
              <Ionicons name="play" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.enterSessionButtonText}>
                {isUserHost ? 'Start Live Session' : 'Enter Session'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 3. Subtle Waiting Status Animation */}
        <View style={styles.statusSection}>
          <View style={styles.dotsContainer}>
            <View style={styles.pulseDot} />
            <View style={[styles.pulseDot, styles.pulseDotMiddle]} />
            <View style={styles.pulseDot} />
          </View>
          <Text style={styles.statusHeading}>
            {isUserHost ? 'Waiting for collaborators' : 'Waiting for host approval'}
          </Text>
          <Text style={styles.statusSubtext}>
            {isUserHost
              ? 'Share the code to invite others.'
              : 'You will be admitted automatically once approved.'}
          </Text>
        </View>

        {/* 4. Participants Section (Dynamic 0 / 4) */}
        <View style={styles.participantsSection}>
          <View style={styles.participantsHeaderRow}>
            <Text style={styles.participantsHeaderTitle}>Participants</Text>
            <Text style={styles.participantsCountBadge}>
              {activeGuestCount} / {maxCapacity}
            </Text>
          </View>

          {guestParticipants.length === 0 ? (
            /* Empty State Card */
            <View style={styles.emptyParticipantsCard}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="people-outline" size={24} color={APP_COLORS.textSecondary} />
              </View>
              <Text style={styles.emptyTitle}>No collaborators yet</Text>
              <Text style={styles.emptySubtext}>
                Share the code to invite someone to this session.
              </Text>
            </View>
          ) : (
            /* Dynamic List */
            <View style={styles.participantsCard}>
              {guestParticipants.map((p) => {
                const isPending = p.status === 'pending';
                const name = (p as any).name || p.guest_name || 'Participant';
                return (
                  <View key={p.id} style={styles.participantRow}>
                    <View style={styles.participantAvatar}>
                      <Text style={styles.avatarInitial}>
                        {name.charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.participantInfo}>
                      <Text style={styles.participantName}>{name}</Text>
                      <Text style={styles.participantStatusLabel}>
                        {isPending ? 'Requesting to join' : 'Ready'}
                      </Text>
                    </View>

                    {isUserHost && isPending ? (
                      <View style={styles.approvalActionGroup}>
                        <TouchableOpacity
                          style={styles.approveBtn}
                          onPress={() => handleApprove(p.id)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.declineBtn}
                          onPress={() => handleDecline(p.id)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Ionicons name="close" size={15} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.readyBadge}>
                        <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                        <Text style={styles.readyBadgeText}>Joined</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Interactive QR Code Modal */}
        <Modal
          visible={showQRModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowQRModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.qrCard}>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowQRModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color={APP_COLORS.textSecondary} />
              </TouchableOpacity>

              <Text style={styles.qrCardTitle}>Room QR Code</Text>
              <Text style={styles.qrCardSub}>Scan with CodeOrbit camera to join</Text>

              <View style={styles.qrBox}>
                <Ionicons name="qr-code" size={180} color="#171717" />
              </View>

              <View style={styles.qrCodeBadge}>
                <Text style={styles.qrCodeBadgeText}>{currentSession?.code || '------'}</Text>
              </View>

              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setShowQRModal(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 54 : 44,
    paddingBottom: 36,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leaveButtonText: {
    color: APP_COLORS.text,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
  roleBadge: {
    backgroundColor: '#242424',
    borderWidth: 1,
    borderColor: '#303030',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: APP_COLORS.textSecondary,
  },

  // Title Section
  titleSection: {
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: APP_COLORS.text,
    letterSpacing: -0.3,
  },
  presetTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  presetTagText: {
    color: APP_COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },

  // Room Code Container
  codeContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: APP_COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  codeBox: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.surface,
    borderRadius: 16,
    paddingVertical: 18,
    borderWidth: 1.5,
    borderColor: '#303030',
    marginBottom: 12,
  },
  codeText: {
    fontSize: 32,
    fontWeight: '800',
    color: APP_COLORS.text,
    letterSpacing: 6,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  generatingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  generatingText: {
    fontSize: 16,
    color: APP_COLORS.textSecondary,
  },

  // Secondary Actions (Copy, Share, Show QR)
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    marginBottom: 12,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.surface,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#303030',
  },
  secondaryActionBtnCopied: {
    borderColor: APP_COLORS.success + '60',
  },
  secondaryActionText: {
    color: APP_COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },

  // Primary CTA: Enter Session
  enterSessionButton: {
    width: '100%',
    height: 52,
    backgroundColor: APP_COLORS.primary,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  enterSessionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // Subtle Status Section
  statusSection: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: APP_COLORS.primary,
    opacity: 0.4,
  },
  pulseDotMiddle: {
    opacity: 0.8,
  },
  statusHeading: {
    fontSize: 15,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  statusSubtext: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
  },

  // Participants Section
  participantsSection: {
    marginBottom: 20,
  },
  participantsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  participantsHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: APP_COLORS.text,
  },
  participantsCountBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: APP_COLORS.textSecondary,
  },
  emptyParticipantsCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#303030',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
  },

  // Participants List Card
  participantsCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#303030',
    padding: 12,
    gap: 8,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  participantAvatar: {
    width: 34,
    height: 34,
    backgroundColor: APP_COLORS.primary,
    borderRadius: 17,
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
    color: APP_COLORS.text,
  },
  participantStatusLabel: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
  },
  approvalActionGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  approveBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  readyBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },

  // QR Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  qrCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: APP_COLORS.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#303030',
  },
  closeModalButton: {
    position: 'absolute',
    top: 14,
    right: 14,
  },
  qrCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: APP_COLORS.text,
    marginTop: 4,
    marginBottom: 2,
  },
  qrCardSub: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    marginBottom: 16,
  },
  qrBox: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
  },
  qrCodeBadge: {
    backgroundColor: '#171717',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#303030',
    marginBottom: 16,
  },
  qrCodeBadgeText: {
    fontSize: 20,
    fontWeight: '800',
    color: APP_COLORS.primary,
    letterSpacing: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  doneButton: {
    width: '100%',
    backgroundColor: APP_COLORS.primary,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
