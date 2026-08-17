import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  Platform,
  Modal,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/authStore';
import { useSessionHistoryStore } from '../../store/sessionHistoryStore';
import { APP_COLORS } from '../../constants';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isGuest, logout } = useAuthStore();
  const { historySessions } = useSessionHistoryStore();

  const [showQRModal, setShowQRModal] = useState(false);

  const totalSessions = historySessions.length;
  const totalCollaborators = historySessions.reduce((acc, s) => acc + (s.participantCount || 1), 0);
  const totalHoursCoded = totalSessions > 0 ? `${totalSessions * 1}h` : '0h';

  const handleLogout = () => {
    Alert.alert(
      'Log out of CodeOrbit?',
      'You will need to sign in again to access your saved sessions and preferences.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/(auth)/welcome');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Compact Curved Header Banner */}
        <View style={styles.headerWrapper}>
          <LinearGradient
            colors={['#EF4444', '#B91C1C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            {/* Top Action Bar */}
            <View style={styles.headerActionRow}>
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={() => setShowQRModal(true)}
                activeOpacity={0.75}
                accessibilityLabel="Share Profile QR"
              >
                <Ionicons name="qr-code-outline" size={18} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={() => router.push({ pathname: '/(main)/notifications', params: { from: 'profile' } })}
                activeOpacity={0.75}
                accessibilityLabel="Notifications"
              >
                <Ionicons name="notifications-outline" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Profile Header Identity */}
            <View style={styles.headerUserInfo}>
              <Text style={styles.headerName}>{user?.name || 'Guest Developer'}</Text>
              <Text style={styles.headerSubtext}>
                {user?.email || 'Live Collaborative Coding'}
              </Text>
            </View>
          </LinearGradient>

          {/* Overlapping Avatar with Edit Camera Camera Affordance */}
          <View style={styles.avatarOverlapContainer}>
            <TouchableOpacity
              style={styles.avatarCircle}
              onPress={() => router.push('/(main)/edit-profile')}
              activeOpacity={0.85}
            >
              {user && (user.avatar_url || (user as any).avatarUrl) ? (
                <Image
                  source={{ uri: user.avatar_url || (user as any).avatarUrl }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0).toUpperCase() || 'G'}
                </Text>
              )}
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={12} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tappable Interactive Stats Row */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => router.push('/(main)/history')}
            activeOpacity={0.7}
          >
            <Text style={styles.statNumber}>{totalSessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statItem}
            onPress={() =>
              Alert.alert(
                'Coding Time',
                `You have logged ${totalHoursCoded} of active pair coding across your sessions.`
              )
            }
            activeOpacity={0.7}
          >
            <Text style={styles.statNumber}>{totalHoursCoded}</Text>
            <Text style={styles.statLabel}>Coding Time</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statItem}
            onPress={() => router.push('/(main)/user-search')}
            activeOpacity={0.7}
          >
            <Text style={styles.statNumber}>{totalCollaborators}</Text>
            <Text style={styles.statLabel}>Collaborators</Text>
          </TouchableOpacity>
        </View>

        {/* Upgrade Banner for Guest Users */}
        {isGuest && (
          <TouchableOpacity
            style={styles.upgradeCard}
            onPress={() => router.push('/(auth)/signup')}
            activeOpacity={0.8}
          >
            <View style={styles.upgradeIconBox}>
              <Ionicons name="star" size={20} color="#EF4444" />
            </View>
            <View style={styles.upgradeContent}>
              <Text style={styles.upgradeTitle}>Create an Account</Text>
              <Text style={styles.upgradeText}>Save sessions, track history & access AI features</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={APP_COLORS.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Grouped Settings Sections */}
        <View style={styles.groupedSectionContainer}>
          {/* Group 1: ACCOUNT */}
          <Text style={styles.sectionHeaderTitle}>ACCOUNT</Text>
          <View style={styles.groupedCard}>
            <TouchableOpacity
              style={styles.groupedRow}
              onPress={() => router.push('/(main)/edit-profile')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: '#3B82F618' }]}>
                <Ionicons name="person-outline" size={18} color="#3B82F6" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuLabel}>Edit Profile</Text>
                <Text style={styles.menuSubLabel}>Manage account details and avatar</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            <TouchableOpacity
              style={styles.groupedRow}
              onPress={() => router.push('/(main)/history')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: '#10B98118' }]}>
                <Ionicons name="time-outline" size={18} color="#10B981" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuLabel}>Session History</Text>
                <Text style={styles.menuSubLabel}>View past coding sessions and stats</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            <TouchableOpacity
              style={styles.groupedRow}
              onPress={() => router.push({ pathname: '/(main)/notifications', params: { from: 'profile' } })}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: '#F59E0B18' }]}>
                <Ionicons name="notifications-outline" size={18} color="#F59E0B" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuLabel}>Notifications</Text>
                <Text style={styles.menuSubLabel}>Session invites and workspace alerts</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Group 2: PREFERENCES */}
          <Text style={styles.sectionHeaderTitle}>PREFERENCES</Text>
          <View style={styles.groupedCard}>
            <TouchableOpacity
              style={styles.groupedRow}
              onPress={() => router.push('/(main)/theme')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: '#8B5CF618' }]}>
                <Ionicons name="color-palette-outline" size={18} color="#8B5CF6" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuLabel}>Appearance & Preferences</Text>
                <Text style={styles.menuSubLabel}>Editor themes and syntax highlighting</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            <TouchableOpacity
              style={styles.groupedRow}
              onPress={() => router.push({ pathname: '/(main)/ai-assistant', params: { from: 'profile' } })}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: '#EC489918' }]}>
                <Ionicons name="sparkles-outline" size={18} color="#EC4899" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuLabel}>AI Assistant</Text>
                <Text style={styles.menuSubLabel}>Code generation, explanations & pair-AI</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Group 3: SUPPORT */}
          <Text style={styles.sectionHeaderTitle}>SUPPORT</Text>
          <View style={styles.groupedCard}>
            <TouchableOpacity
              style={styles.groupedRow}
              onPress={() => router.push({ pathname: '/(main)/contact', params: { from: 'profile' } })}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: '#06B6D418' }]}>
                <Ionicons name="help-circle-outline" size={18} color="#06B6D4" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuLabel}>Help Center & Support</Text>
                <Text style={styles.menuSubLabel}>FAQs, feedback, and live agent chat</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Group 4: LEGAL */}
          <Text style={styles.sectionHeaderTitle}>LEGAL</Text>
          <View style={styles.groupedCard}>
            <TouchableOpacity
              style={styles.groupedRow}
              onPress={() => router.push('/(main)/privacy')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: '#10B98118' }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#10B981" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuLabel}>Privacy Policy</Text>
                <Text style={styles.menuSubLabel}>Your privacy and data practices</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            <TouchableOpacity
              style={styles.groupedRow}
              onPress={() => router.push('/(main)/terms')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: '#3B82F618' }]}>
                <Ionicons name="document-text-outline" size={18} color="#3B82F6" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuLabel}>Terms & Conditions</Text>
                <Text style={styles.menuSubLabel}>Rules for using CodeOrbit</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Group 5: ACCOUNT ACTION */}
          <View style={styles.logoutContainer}>
            <TouchableOpacity
              style={styles.logoutRow}
              onPress={handleLogout}
              activeOpacity={0.75}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: '#EF444415' }]}>
                <Ionicons name="log-out-outline" size={18} color="#EF4444" />
              </View>
              <Text style={styles.logoutLabel}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.versionText}>CodeOrbit • Version 1.0.0</Text>
      </ScrollView>

      {/* Profile QR Sharing Modal */}
      <Modal
        visible={showQRModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQRModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowQRModal(false)}
        >
          <View style={styles.qrCard} onStartShouldSetResponder={() => true}>
            <View style={styles.qrHeader}>
              <Text style={styles.qrTitle}>CodeOrbit Developer Profile</Text>
              <TouchableOpacity onPress={() => setShowQRModal(false)} style={styles.qrCloseBtn}>
                <Ionicons name="close" size={20} color={APP_COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.qrAvatarBox}>
              <Text style={styles.qrAvatarText}>
                {user?.name?.charAt(0).toUpperCase() || 'G'}
              </Text>
            </View>

            <Text style={styles.qrName}>{user?.name || 'Guest Developer'}</Text>
            <Text style={styles.qrEmail}>{user?.email || 'Live Collaborative Coding'}</Text>

            <View style={styles.qrPlaceholderBox}>
              <Ionicons name="qr-code" size={120} color={APP_COLORS.text} />
              <Text style={styles.qrScanText}>Scan to connect on CodeOrbit</Text>
            </View>

            <TouchableOpacity
              style={styles.qrShareBtn}
              onPress={() => {
                setShowQRModal(false);
                Alert.alert('Profile Link Copied!', 'Share link copied to clipboard.');
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="share-social-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.qrShareBtnText}>Share Profile</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  scrollContent: {
    paddingBottom: 150, // Ensures all bottom elements scroll safely above navigation bar
  },
  headerWrapper: {
    width: width,
    marginBottom: 44,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 52 : 44,
    paddingHorizontal: 20,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerUserInfo: {
    alignItems: 'center',
    marginTop: 2,
  },
  headerName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '400',
  },
  avatarOverlapContainer: {
    position: 'absolute',
    bottom: -34,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EF4444',
    borderWidth: 3,
    borderColor: APP_COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  avatarImage: {
    width: 66,
    height: 66,
    borderRadius: 33,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#17181A',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: APP_COLORS.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    fontWeight: '500',
  },
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.surface,
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EF444440',
  },
  upgradeIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EF444415',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  upgradeContent: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginBottom: 2,
  },
  upgradeText: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
  },
  groupedSectionContainer: {
    paddingHorizontal: 20,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: APP_COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 12,
    marginLeft: 4,
  },
  groupedCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    overflow: 'hidden',
    marginBottom: 14,
  },
  groupedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowDivider: {
    height: 1,
    backgroundColor: APP_COLORS.border + '50',
    marginLeft: 56,
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  menuLabel: {
    fontSize: 14.5,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginBottom: 1.5,
  },
  menuSubLabel: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    fontWeight: '400',
  },
  logoutContainer: {
    marginTop: 10,
    marginBottom: 8,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF444410',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#EF444430',
  },
  logoutLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  versionText: {
    textAlign: 'center',
    color: APP_COLORS.textSecondary,
    fontSize: 13,
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  qrCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  qrHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: APP_COLORS.text,
  },
  qrCloseBtn: {
    padding: 4,
  },
  qrAvatarBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  qrAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  qrName: {
    fontSize: 18,
    fontWeight: '700',
    color: APP_COLORS.text,
    marginBottom: 2,
  },
  qrEmail: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    marginBottom: 20,
  },
  qrPlaceholderBox: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  qrScanText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#17181A',
    marginTop: 10,
  },
  qrShareBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 14,
  },
  qrShareBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
