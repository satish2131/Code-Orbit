import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { APP_COLORS } from '../../constants';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    useCallback(() => {
      slideAnim.setValue(0);
      opacityAnim.setValue(1);
    }, [opacityAnim, slideAnim])
  );

  const handleBack = () => {
    router.replace('/(main)/profile');
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={{
          flex: 1,
          opacity: opacityAnim,
          transform: [{ translateX: slideAnim }],
        }}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, Platform.OS === 'ios' ? 52 : 40) }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color="#E0E0E0" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Privacy Policy</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Banner */}
          <View style={styles.heroSection}>
            <View style={styles.heroIconCircle}>
              <Ionicons name="shield-checkmark" size={32} color="#EF4444" />
            </View>
            <Text style={styles.heroHeading}>CodeOrbit Privacy Policy</Text>
            <Text style={styles.lastUpdated}>Effective Date: August 15, 2026</Text>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Ionicons name="lock-closed-outline" size={12} color="#10B981" />
                <Text style={styles.badgeText}>End-to-End Secure Sessions</Text>
              </View>
              <View style={styles.badge}>
                <Ionicons name="code-slash-outline" size={12} color="#3B82F6" />
                <Text style={styles.badgeText}>User Code Ownership</Text>
              </View>
            </View>
          </View>

          {/* Policy Overview Summary Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>At a Glance</Text>
            <Text style={styles.summaryText}>
              CodeOrbit is built for developers. We believe your code, project architecture, and collaborative workspaces belong entirely to you. This Privacy Policy details how CodeOrbit collects, processes, and safeguards information across our mobile app, real-time synchronization servers, and execution runtimes.
            </Text>
          </View>

          {/* Section 1 */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionNumberCircle, { backgroundColor: '#3B82F618' }]}>
                <Text style={[styles.sectionNumberText, { color: '#3B82F6' }]}>1</Text>
              </View>
              <Text style={styles.sectionTitle}>Information We Collect</Text>
            </View>

            <Text style={styles.subHeading}>A. Account & Profile Information</Text>
            <Text style={styles.paragraph}>
              When you register for an account, we collect your name, email address, hashed credentials, and optional profile avatar. If you join as a Guest, a temporary anonymous identifier is assigned to facilitate participation without collecting personal contact details.
            </Text>

            <Text style={styles.subHeading}>B. Live Collaborative Sessions & Rooms</Text>
            <Text style={styles.paragraph}>
              During active collaborative sessions, CodeOrbit processes real-time synchronization messages (such as document changes, cursor coordinates, user presence status, and active room codes). This communication occurs over secure WebSockets (WSS) and HTTPS to enable seamless pair-programming.
            </Text>

            <Text style={styles.subHeading}>C. Source Code & Sandbox Execution</Text>
            <Text style={styles.paragraph}>
              Code entered in the editor is transmitted to facilitate real-time peer synchronization and, when triggered by the user, submitted to isolated sandbox containers (such as Piston or Web environments) for compilation and execution. Code Orbit does not use your private code to train commercial machine learning models.
            </Text>

            <Text style={styles.subHeading}>D. Device & Operational Telemetry</Text>
            <Text style={styles.paragraph}>
              We collect minimal technical information required for app reliability, including device operating system version, CodeOrbit app version, network connectivity status, and crash diagnostics.
            </Text>
          </View>

          {/* Section 2 */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionNumberCircle, { backgroundColor: '#10B98118' }]}>
                <Text style={[styles.sectionNumberText, { color: '#10B981' }]}>2</Text>
              </View>
              <Text style={styles.sectionTitle}>How We Use Information</Text>
            </View>
            <Text style={styles.paragraph}>
              We process data strictly for operational, security, and collaborative functionality:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Facilitate real-time multi-user editing, room discovery, and socket synchronization.</Text>
              <Text style={styles.bulletItem}>• Authenticate user identities and preserve user preferences and session history.</Text>
              <Text style={styles.bulletItem}>• Execute language runtimes in isolated sandboxes and stream terminal output back to your device.</Text>
              <Text style={styles.bulletItem}>• Detect, prevent, and remediate technical glitches, security vulnerabilities, or abusive execution patterns.</Text>
              <Text style={styles.bulletItem}>• Deliver transactional service notifications and vital security alerts.</Text>
            </View>
          </View>

          {/* Section 3 */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionNumberCircle, { backgroundColor: '#8B5CF618' }]}>
                <Text style={[styles.sectionNumberText, { color: '#8B5CF6' }]}>3</Text>
              </View>
              <Text style={styles.sectionTitle}>Security & Local Storage</Text>
            </View>
            <Text style={styles.paragraph}>
              Security is foundational to CodeOrbit:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• <Text style={styles.boldText}>Encrypted Key Storage:</Text> User authentication tokens and cached credentials are encrypted on-device using platform-native hardware security (iOS Keychain and Android Keystore via Expo SecureStore).</Text>
              <Text style={styles.bulletItem}>• <Text style={styles.boldText}>Transport Encryption:</Text> All network traffic between your client and CodeOrbit servers uses TLS 1.3 encryption.</Text>
              <Text style={styles.bulletItem}>• <Text style={styles.boldText}>Ephemeral Guest Data:</Text> Guest session histories are stored locally and can be cleared instantly upon logging out.</Text>
            </View>
          </View>

          {/* Section 4 */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionNumberCircle, { backgroundColor: '#F59E0B18' }]}>
                <Text style={[styles.sectionNumberText, { color: '#F59E0B' }]}>4</Text>
              </View>
              <Text style={styles.sectionTitle}>Data Retention & Account Deletion</Text>
            </View>
            <Text style={styles.paragraph}>
              We retain account data for as long as your account remains active. Collaborative session logs and transient code executions are deleted on scheduled lifecycle rotations.
            </Text>
            <Text style={styles.paragraph}>
              You have the right to request full deletion of your account, profile data, and session history at any time directly through the app or by emailing our Data Privacy team. Upon confirmation, all associated personal records are permanently erased from our active databases within 30 days.
            </Text>
          </View>

          {/* Section 5 */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionNumberCircle, { backgroundColor: '#06B6D418' }]}>
                <Text style={[styles.sectionNumberText, { color: '#06B6D4' }]}>5</Text>
              </View>
              <Text style={styles.sectionTitle}>Your Privacy Rights (GDPR & CCPA)</Text>
            </View>
            <Text style={styles.paragraph}>
              Depending on your location, you possess statutory rights regarding your personal data:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• <Text style={styles.boldText}>Right of Access & Portability:</Text> Request an export of your stored personal profile data.</Text>
              <Text style={styles.bulletItem}>• <Text style={styles.boldText}>Right to Rectification:</Text> Update and edit your profile details at any time.</Text>
              <Text style={styles.bulletItem}>• <Text style={styles.boldText}>Right to Erasure (To Be Forgotten):</Text> Request permanent deletion of all account data.</Text>
              <Text style={styles.bulletItem}>• <Text style={styles.boldText}>No Sale of Data:</Text> CodeOrbit does NOT sell, rent, or trade your personal information or code to third parties or advertisers.</Text>
            </View>
          </View>

          {/* Section 6 */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionNumberCircle, { backgroundColor: '#EF444418' }]}>
                <Text style={[styles.sectionNumberText, { color: '#EF4444' }]}>6</Text>
              </View>
              <Text style={styles.sectionTitle}>Contact Us</Text>
            </View>
            <Text style={styles.paragraph}>
              If you have any questions, concerns, or requests regarding this Privacy Policy or your personal information, please contact our Data Protection team:
            </Text>
            <View style={styles.contactCard}>
              <View style={styles.contactRow}>
                <Ionicons name="mail-outline" size={18} color="#EF4444" />
                <Text style={styles.contactText}>codeorbitofficiall@gmail.com</Text>
              </View>
              <View style={styles.contactRow}>
                <Ionicons name="help-buoy-outline" size={18} color="#EF4444" />
                <Text style={styles.contactText}>codeorbitofficiall@gmail.com</Text>
              </View>
            </View>
          </View>

          <Text style={styles.footerNote}>
            CodeOrbit Technologies Inc. • All Rights Reserved
          </Text>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171717',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#1C1C1E',
    borderBottomWidth: 1,
    borderBottomColor: '#28282A',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#262628',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F5F5F5',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 48,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  heroIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EF444415',
    borderWidth: 1.5,
    borderColor: '#EF444430',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F5F5F5',
    marginBottom: 4,
    textAlign: 'center',
  },
  lastUpdated: {
    fontSize: 12.5,
    color: '#8A8A8E',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#222226',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#2D2D32',
  },
  badgeText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#D0D0D0',
  },
  summaryCard: {
    backgroundColor: '#202024',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2C2C32',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F5F5F5',
    marginBottom: 6,
  },
  summaryText: {
    fontSize: 13.5,
    color: '#A0A0A5',
    lineHeight: 20,
  },
  cardSection: {
    backgroundColor: '#1E1E22',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A30',
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  sectionNumberCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionNumberText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#F5F5F5',
    flex: 1,
  },
  subHeading: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#E0E0E0',
    marginTop: 10,
    marginBottom: 4,
  },
  paragraph: {
    fontSize: 13,
    color: '#9C9CA4',
    lineHeight: 19.5,
    marginBottom: 8,
  },
  boldText: {
    color: '#E0E0E0',
    fontWeight: '600',
  },
  bulletList: {
    marginTop: 4,
    marginBottom: 8,
    gap: 6,
  },
  bulletItem: {
    fontSize: 13,
    color: '#9C9CA4',
    lineHeight: 19,
    paddingLeft: 4,
  },
  contactCard: {
    backgroundColor: '#25252A',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#303038',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contactText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#F5F5F5',
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666666',
    marginTop: 16,
    marginBottom: 8,
  },
});
