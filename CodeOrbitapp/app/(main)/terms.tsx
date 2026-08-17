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

export default function TermsOfServiceScreen() {
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

          <Text style={styles.headerTitle}>Terms & Conditions</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Banner */}
          <View style={styles.heroSection}>
            <View style={styles.heroIconCircle}>
              <Ionicons name="document-text" size={32} color="#EF4444" />
            </View>
            <Text style={styles.heroHeading}>Terms & Conditions</Text>
            <Text style={styles.lastUpdated}>Effective Date: August 15, 2026</Text>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Ionicons name="shield-outline" size={12} color="#10B981" />
                <Text style={styles.badgeText}>Safe Collaborative Coding</Text>
              </View>
              <View style={styles.badge}>
                <Ionicons name="sparkles-outline" size={12} color="#3B82F6" />
                <Text style={styles.badgeText}>100% Code Ownership</Text>
              </View>
            </View>
          </View>

          {/* Terms Overview Summary Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Welcome to CodeOrbit</Text>
            <Text style={styles.summaryText}>
              These Terms & Conditions constitute a legally binding agreement between you and CodeOrbit Technologies Inc. By installing, accessing, or using CodeOrbit, you agree to comply with these terms governing our real-time collaboration tools, room codes, and code execution environments.
            </Text>
          </View>

          {/* Section 1 */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionNumberCircle, { backgroundColor: '#3B82F618' }]}>
                <Text style={[styles.sectionNumberText, { color: '#3B82F6' }]}>1</Text>
              </View>
              <Text style={styles.sectionTitle}>User Accounts & Eligibility</Text>
            </View>
            <Text style={styles.paragraph}>
              You must be at least 13 years old (or the applicable age of digital consent in your jurisdiction) to use CodeOrbit. You agree to provide accurate registration details and maintain the security of your account credentials and session access tokens.
            </Text>
            <Text style={styles.paragraph}>
              You are responsible for all activities and code modifications executed under your authenticated account or active session identity.
            </Text>
          </View>

          {/* Section 2 */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionNumberCircle, { backgroundColor: '#10B98118' }]}>
                <Text style={[styles.sectionNumberText, { color: '#10B981' }]}>2</Text>
              </View>
              <Text style={styles.sectionTitle}>Collaborative Sessions & Room Codes</Text>
            </View>
            <Text style={styles.paragraph}>
              CodeOrbit provides live collaborative workspaces connected via unique 6-character room codes and QR invites:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• <Text style={styles.boldText}>Host Controls:</Text> Room hosts hold administrative discretion over participant permissions, editor access levels, and participant removal.</Text>
              <Text style={styles.bulletItem}>• <Text style={styles.boldText}>Room Sharing:</Text> You are responsible for distributing room codes only to intended collaborators. Anyone with a valid session code may join the workspace if public or authorized by the host.</Text>
              <Text style={styles.bulletItem}>• <Text style={styles.boldText}>Real-Time Chat & Interactions:</Text> Participants must maintain civil, professional collaboration in workspace chats and comments.</Text>
            </View>
          </View>

          {/* Section 3 */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionNumberCircle, { backgroundColor: '#EF444418' }]}>
                <Text style={[styles.sectionNumberText, { color: '#EF4444' }]}>3</Text>
              </View>
              <Text style={styles.sectionTitle}>Code Execution & Sandbox Rules</Text>
            </View>
            <Text style={styles.paragraph}>
              CodeOrbit features sandboxed multi-language code compilation and execution (e.g. Python, TypeScript, C++, Rust, Go, Java, and Web). To maintain runtime integrity and network safety, you agree NOT to:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Execute malware, viruses, worms, keyloggers, or destructive scripts.</Text>
              <Text style={styles.bulletItem}>• Conduct unauthorized port scans, network penetration tests, or distributed denial-of-service (DDoS) attacks.</Text>
              <Text style={styles.bulletItem}>• Run cryptocurrency miners or background processes designed to exhaust server CPU/RAM resources.</Text>
              <Text style={styles.bulletItem}>• Attempt to escape sandbox boundaries or interfere with peer container isolation.</Text>
            </View>
            <Text style={styles.paragraph}>
              CodeOrbit reserves the right to impose automated execution execution timeouts and terminate abusive execution instances immediately.
            </Text>
          </View>

          {/* Section 4 */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionNumberCircle, { backgroundColor: '#8B5CF618' }]}>
                <Text style={[styles.sectionNumberText, { color: '#8B5CF6' }]}>4</Text>
              </View>
              <Text style={styles.sectionTitle}>Intellectual Property & Code Ownership</Text>
            </View>
            <Text style={styles.paragraph}>
              <Text style={styles.boldText}>You retain 100% ownership and intellectual property rights</Text> over all code, algorithms, assets, and project files you create or upload to CodeOrbit.
            </Text>
            <Text style={styles.paragraph}>
              CodeOrbit claims no copyright, patent, or proprietary interest in your source code. By using collaborative rooms, you grant CodeOrbit a non-exclusive, worldwide, royalty-free license solely to transmit, buffer, execute, and display your code to authorized room participants for the duration of the session.
            </Text>
          </View>

          {/* Section 5 */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionNumberCircle, { backgroundColor: '#F59E0B18' }]}>
                <Text style={[styles.sectionNumberText, { color: '#F59E0B' }]}>5</Text>
              </View>
              <Text style={styles.sectionTitle}>Prohibited Conduct</Text>
            </View>
            <Text style={styles.paragraph}>
              While using CodeOrbit, you agree not to:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Harass, abuse, defame, or intimidate other collaborators.</Text>
              <Text style={styles.bulletItem}>• Reverse-engineer, decompile, or disassemble proprietary client or server components.</Text>
              <Text style={styles.bulletItem}>• Bypass authentication mechanisms, rate limits, or access controls.</Text>
              <Text style={styles.bulletItem}>• Impersonate another individual, organization, or CodeOrbit staff member.</Text>
            </View>
          </View>

          {/* Section 6 */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionNumberCircle, { backgroundColor: '#06B6D418' }]}>
                <Text style={[styles.sectionNumberText, { color: '#06B6D4' }]}>6</Text>
              </View>
              <Text style={styles.sectionTitle}>Service Availability & Disclaimers</Text>
            </View>
            <Text style={styles.paragraph}>
              CodeOrbit is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis without warranties of any kind, whether express or implied. While we strive for 99.9% uptime, we do not guarantee uninterrupted socket connectivity, instantaneous execution response times, or zero data loss during network disruptions.
            </Text>
            <Text style={styles.paragraph}>
              We strongly advise frequently saving and exporting critical codebases to local repositories or version control systems.
            </Text>
          </View>

          {/* Section 7 */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionNumberCircle, { backgroundColor: '#EC489918' }]}>
                <Text style={[styles.sectionNumberText, { color: '#EC4899' }]}>7</Text>
              </View>
              <Text style={styles.sectionTitle}>Limitation of Liability</Text>
            </View>
            <Text style={styles.paragraph}>
              To the maximum extent permitted by applicable law, CodeOrbit Technologies Inc., its directors, employees, and licensors shall not be liable for any indirect, punitive, incidental, special, consequential, or exemplary damages, including loss of profits, goodwill, data, or other intangible losses resulting from your use of or inability to use the service.
            </Text>
          </View>

          {/* Section 8 */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionNumberCircle, { backgroundColor: '#EF444418' }]}>
                <Text style={[styles.sectionNumberText, { color: '#EF4444' }]}>8</Text>
              </View>
              <Text style={styles.sectionTitle}>Termination & Contact</Text>
            </View>
            <Text style={styles.paragraph}>
              We reserve the right to suspend or terminate accounts that breach these terms. You may terminate your agreement at any time by closing your account.
            </Text>
            <Text style={styles.paragraph}>
              For legal inquiries, terms clarification, or notices, contact:
            </Text>
            <View style={styles.contactCard}>
              <View style={styles.contactRow}>
                <Ionicons name="document-text-outline" size={18} color="#EF4444" />
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
