import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AUTH_COLORS } from '../../constants';
import { AuthDivider } from '../../components/auth/AuthDivider';

const HERO_IMAGE = require('../../assets/images/auth_hero_banner.png');

export default function WelcomeScreen() {
  const router = useRouter();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Responsive hero banner height (~36% screen height, bounded between 250 and 380)
  const bannerHeight = Math.max(250, Math.min(380, windowHeight * 0.36));
  const buttonHeight = Math.max(48, Math.min(54, windowHeight * 0.065));

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(24, insets.bottom + 16) }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Top Hero Image Banner */}
        <View style={[styles.bannerContainer, { width: windowWidth, height: bannerHeight }]}>
          <Image source={HERO_IMAGE} style={styles.bannerImage} resizeMode="cover" />
          <LinearGradient
            colors={[
              'rgba(23, 24, 26, 0.4)',
              'rgba(23, 24, 26, 0.2)',
              'rgba(23, 24, 26, 0.65)',
              'rgba(23, 24, 26, 0.95)',
              AUTH_COLORS.background,
            ]}
            locations={[0, 0.25, 0.6, 0.88, 1]}
            style={styles.bannerGradient}
          />
          
          <View style={[styles.headerTextContainer, { paddingTop: insets.top }]}>
            <View style={styles.badgeContainer}>
              <Text style={styles.appName}>CODEORBIT</Text>
            </View>
            <Text style={[styles.title, windowHeight < 680 && { fontSize: 26 }]}>
              Live Collaborative Coding
            </Text>
            <Text style={styles.subtitle}>
              Code together. Build together.
            </Text>
          </View>
        </View>

        {/* Action Buttons Section */}
        <View style={styles.buttonsContainer}>
          {/* Primary Email CTA */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(auth)/signup')}
            style={styles.primaryButtonWrapper}
          >
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.primaryButton, { height: buttonHeight }]}
            >
              <Ionicons name="mail" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryButtonText}>Continue with Email</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Clean OR Divider */}
          <AuthDivider label="OR" style={{ marginVertical: 8 }} />

          {/* Social Apple Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.socialButton, { height: buttonHeight }]}
            onPress={() => {
              Alert.alert('Apple Sign-In', 'Apple Authentication will be available soon!');
            }}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.socialButtonText}>Continue with Apple</Text>
          </TouchableOpacity>

          {/* Social Google Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.socialButton, { height: buttonHeight }]}
            onPress={() => {
              Alert.alert('Google Sign-In', 'Google Authentication will be available soon!');
            }}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="logo-google" size={18} color="#EA4335" />
            </View>
            <Text style={styles.socialButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Guest Mode with Clear Product Explanation */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.guestContainer}
            onPress={() => router.push('/(auth)/guest')}
          >
            <View style={styles.guestContent}>
              <Ionicons name="person-outline" size={16} color={AUTH_COLORS.textMuted} style={{ marginRight: 8 }} />
              <Text style={styles.guestTitle}>Continue as Guest</Text>
            </View>
            <Text style={styles.guestSubtitle}>Join a room without creating an account</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Link */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.footerLinkText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AUTH_COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: AUTH_COLORS.background,
    justifyContent: 'space-between',
  },
  bannerContainer: {
    position: 'relative',
    justifyContent: 'flex-end',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  bannerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  headerTextContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  badgeContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 8,
  },
  appName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
    letterSpacing: 2.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#A1A1AA',
    textAlign: 'center',
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  buttonsContainer: {
    paddingHorizontal: 24,
    gap: 10,
    marginTop: 8,
  },
  primaryButtonWrapper: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButton: {
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  socialButton: {
    borderRadius: 28,
    backgroundColor: AUTH_COLORS.socialBg,
    borderWidth: 1,
    borderColor: AUTH_COLORS.socialBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  iconCircle: {
    marginRight: 10,
  },
  socialButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  guestContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 2,
  },
  guestContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  guestTitle: {
    color: '#D4D4D8',
    fontSize: 14,
    fontWeight: '600',
  },
  guestSubtitle: {
    color: AUTH_COLORS.textMuted,
    fontSize: 12,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 8,
  },
  footerText: {
    color: AUTH_COLORS.textMuted,
    fontSize: 14,
  },
  footerLinkText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
});
