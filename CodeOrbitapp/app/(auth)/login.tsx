import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { validateEmail, validatePassword } from '../../utils/validation';
import { safeGoBack } from '../../utils/navigation';
import { AUTH_COLORS } from '../../constants';
import { AuthDivider } from '../../components/auth/AuthDivider';
import { AuthErrorBanner } from '../../components/auth/AuthErrorBanner';

const HERO_IMAGE = require('../../assets/images/auth_hero_banner.png');

export default function LoginScreen() {
  const router = useRouter();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { setUser, setLoading, isLoading } = useAuthStore();
  
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; auth?: string }>({});

  // Compact hero banner height (22-25% screen height) to eliminate vertical dead space
  const bannerHeight = Math.max(160, Math.min(220, windowHeight * 0.24));
  const inputHeight = Math.max(48, Math.min(52, windowHeight * 0.062));

  const handleLogin = async () => {
    if (isLoading) return;

    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);

    if (!emailValidation.isValid || !passwordValidation.isValid) {
      setErrors({
        email: emailValidation.error,
        password: passwordValidation.error,
        auth: undefined,
      });
      if (!emailValidation.isValid) {
        emailRef.current?.focus();
      } else if (!passwordValidation.isValid) {
        passwordRef.current?.focus();
      }
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const result = await api.auth.login(email.trim(), password);
      await setUser(result.user, result.token);
      router.replace('/(main)/home');
    } catch (error: any) {
      console.error('Login error:', error);
      const msg = error?.message || 'The email or password you entered is incorrect.';
      setErrors((prev) => ({ ...prev, auth: msg }));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    router.push('/(auth)/forgot-password');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(24, insets.bottom + 16) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Compact Hero Banner with Gradient Overlay */}
        <View style={[styles.bannerContainer, { width: windowWidth, height: bannerHeight }]}>
          <Image source={HERO_IMAGE} style={styles.bannerImage} resizeMode="cover" />
          <LinearGradient
            colors={[
              'rgba(23, 24, 26, 0.4)',
              'rgba(23, 24, 26, 0.25)',
              'rgba(23, 24, 26, 0.7)',
              'rgba(23, 24, 26, 0.95)',
              AUTH_COLORS.background,
            ]}
            locations={[0, 0.25, 0.65, 0.88, 1]}
            style={styles.bannerGradient}
          />
          
          <TouchableOpacity
            style={[styles.backButton, { top: Math.max(16, insets.top + 8) }]}
            onPress={() => safeGoBack(router, '/(auth)/welcome')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={styles.backIconWrapper}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={[styles.title, windowHeight < 680 && { fontSize: 26 }]}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to continue coding together.</Text>
          </View>
        </View>

        {/* Auth Form Section */}
        <View style={styles.formContainer}>
          {/* Inline Error Alert */}
          {errors.auth && (
            <AuthErrorBanner
              title="Unable to sign in"
              message={errors.auth}
              onDismiss={() => setErrors((prev) => ({ ...prev, auth: undefined }))}
            />
          )}

          {/* Email Input */}
          <View style={styles.inputFieldContainer}>
            <View style={[styles.inputWrapper, { height: inputHeight }, errors.email ? styles.inputError : null]}>
              <Ionicons name="mail-outline" size={20} color={AUTH_COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                ref={emailRef}
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={AUTH_COLORS.textPlaceholder}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email || errors.auth) {
                    setErrors((prev) => ({ ...prev, email: undefined, auth: undefined }));
                  }
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
              {email.length > 0 && (
                <TouchableOpacity
                  onPress={() => setEmail('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={16} color={AUTH_COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Password Input */}
          <View style={styles.inputFieldContainer}>
            <View style={[styles.inputWrapper, { height: inputHeight }, errors.password ? styles.inputError : null]}>
              <Ionicons name="lock-closed-outline" size={20} color={AUTH_COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                ref={passwordRef}
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={AUTH_COLORS.textPlaceholder}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password || errors.auth) {
                    setErrors((prev) => ({ ...prev, password: undefined, auth: undefined }));
                  }
                }}
                secureTextEntry={!showPassword}
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={AUTH_COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* Forgot Password Link */}
          <TouchableOpacity
            style={styles.forgotPasswordButton}
            onPress={handleForgotPassword}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Primary Sign In Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleLogin}
            disabled={isLoading}
            style={styles.primaryButtonWrapper}
          >
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.primaryButton, { height: inputHeight }, isLoading && styles.buttonDisabled]}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryButtonText}>Signing In...</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>Sign In</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Clean OR Divider */}
          <AuthDivider label="OR" style={{ marginVertical: 4 }} />

          {/* Continue with Apple Social Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.socialButton, { height: inputHeight }]}
            onPress={() => {
              Alert.alert('Apple Sign-In', 'Apple Authentication will be available soon!');
            }}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.socialButtonText}>Continue with Apple</Text>
          </TouchableOpacity>

          {/* Continue with Google Social Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.socialButton, { height: inputHeight }]}
            onPress={() => {
              Alert.alert('Google Sign-In', 'Google Authentication will be available soon!');
            }}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="logo-google" size={18} color="#EA4335" />
            </View>
            <Text style={styles.socialButtonText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Link */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
            <Text style={styles.footerLinkText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  backButton: {
    position: 'absolute',
    left: 20,
    zIndex: 10,
  },
  backIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    paddingHorizontal: 24,
    paddingBottom: 14,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#A1A1AA',
    textAlign: 'center',
  },
  formContainer: {
    paddingHorizontal: 24,
    paddingTop: 4,
    gap: 10,
  },
  inputFieldContainer: {
    marginBottom: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AUTH_COLORS.inputBackground,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: AUTH_COLORS.inputBorder,
    paddingHorizontal: 18,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    color: AUTH_COLORS.textPrimary,
    fontSize: 15,
  },
  eyeButton: {
    paddingLeft: 8,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 16,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    paddingVertical: 2,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  forgotPasswordText: {
    color: '#A1A1AA',
    fontSize: 13,
    fontWeight: '500',
  },
  primaryButtonWrapper: {
    marginTop: 2,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  loadingContainer: {
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
