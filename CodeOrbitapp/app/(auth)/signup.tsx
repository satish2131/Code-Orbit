import React, { useState, useEffect, useRef } from 'react';
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
import { validateEmail, validatePassword, validateName, validateUsername } from '../../utils/validation';
import { safeGoBack } from '../../utils/navigation';
import { AUTH_COLORS } from '../../constants';
import { AuthDivider } from '../../components/auth/AuthDivider';
import { AuthErrorBanner } from '../../components/auth/AuthErrorBanner';
import { PasswordRequirements } from '../../components/auth/PasswordRequirements';

const HERO_IMAGE = require('../../assets/images/auth_hero_banner.png');

export default function SignupScreen() {
  const router = useRouter();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { setUser, setLoading, isLoading } = useAuthStore();
  
  const nameRef = useRef<TextInput>(null);
  const usernameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'invalid' | 'taken'>('idle');
  
  const [errors, setErrors] = useState<{
    name?: string;
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    auth?: string;
  }>({});

  // Compact banner height (20-22% of screen height) to give maximum space to the form
  const bannerHeight = Math.max(140, Math.min(190, windowHeight * 0.20));
  const inputHeight = Math.max(46, Math.min(50, windowHeight * 0.058));

  // Debounced real-time username availability check
  useEffect(() => {
    if (!username.trim()) {
      setUsernameStatus('idle');
      return;
    }

    const validation = validateUsername(username);
    if (!validation.isValid) {
      setUsernameStatus('invalid');
      setErrors((prev) => ({ ...prev, username: validation.error }));
      return;
    }

    setUsernameStatus('checking');
    const timer = setTimeout(() => {
      api.auth.checkUsername(username)
        .then((res) => {
          if (res.available) {
            setUsernameStatus('available');
            setErrors((prev) => ({ ...prev, username: undefined }));
          } else {
            setUsernameStatus('taken');
            setErrors((prev) => ({ ...prev, username: res.message || 'Username is already taken' }));
          }
        })
        .catch(() => {
          setUsernameStatus('idle');
        });
    }, 400);

    return () => clearTimeout(timer);
  }, [username]);

  const handleSignup = async () => {
    if (isLoading) return;

    const nameValidation = validateName(name);
    const usernameValidation = validateUsername(username);
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);
    
    const newErrors: typeof errors = {};
    
    if (!nameValidation.isValid) newErrors.name = nameValidation.error;
    if (!usernameValidation.isValid) newErrors.username = usernameValidation.error;
    if (!emailValidation.isValid) newErrors.email = emailValidation.error;
    if (!passwordValidation.isValid) newErrors.password = passwordValidation.error;
    
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (!nameValidation.isValid) {
        nameRef.current?.focus();
      } else if (!usernameValidation.isValid) {
        usernameRef.current?.focus();
      } else if (!emailValidation.isValid) {
        emailRef.current?.focus();
      } else if (!passwordValidation.isValid) {
        passwordRef.current?.focus();
      } else if (password !== confirmPassword) {
        confirmPasswordRef.current?.focus();
      }
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      console.log('[AUTH] Signup: calling API...');
      const result = await api.auth.signup(email.trim(), username.trim().toLowerCase(), password, name.trim());

      if (!result?.user || !result?.token) {
        throw new Error('Server returned an unexpected response. Please try again.');
      }

      console.log('[AUTH] Signup: API success, persisting session...');
      // setUser sets status → AUTHENTICATED; AuthGate handles navigation
      await setUser(result.user, result.token);
      console.log('[AUTH] Signup: done — AuthGate will navigate');
    } catch (error: any) {
      console.error('[AUTH] Signup error:', error);
      const msg = error?.message || 'Failed to create your account. Please try again.';
      if (msg.toLowerCase().includes('username')) {
        setErrors({ username: msg, auth: msg });
      } else if (msg.toLowerCase().includes('email')) {
        setErrors({ email: msg, auth: msg });
      } else {
        setErrors({ auth: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  // Live matching status for confirm password field
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

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
            <Text style={[styles.title, windowHeight < 680 && { fontSize: 24 }]}>Create your account</Text>
            <Text style={styles.subtitle}>Join CodeOrbit and start collaborating.</Text>
          </View>
        </View>

        {/* Auth Form Section */}
        <View style={styles.formContainer}>
          {/* Inline Error Banner */}
          {errors.auth && (
            <AuthErrorBanner
              title="Registration Error"
              message={errors.auth}
              onDismiss={() => setErrors((prev) => ({ ...prev, auth: undefined }))}
            />
          )}

          {/* Full Name Input */}
          <View style={styles.inputFieldContainer}>
            <View style={[styles.inputWrapper, { height: inputHeight }, errors.name ? styles.inputError : null]}>
              <Ionicons name="person-outline" size={19} color={AUTH_COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                ref={nameRef}
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor={AUTH_COLORS.textPlaceholder}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (errors.name || errors.auth) setErrors((prev) => ({ ...prev, name: undefined, auth: undefined }));
                }}
                autoCapitalize="words"
                autoComplete="name"
                returnKeyType="next"
                onSubmitEditing={() => usernameRef.current?.focus()}
              />
            </View>
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          {/* Username Input with Live Verification */}
          <View style={styles.inputFieldContainer}>
            <View style={[
              styles.inputWrapper,
              { height: inputHeight },
              errors.username ? styles.inputError : null,
              usernameStatus === 'available' ? { borderColor: '#10B981' } : null,
            ]}>
              <Ionicons name="at-outline" size={19} color={AUTH_COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                ref={usernameRef}
                style={styles.input}
                placeholder="Username (e.g. satish)"
                placeholderTextColor={AUTH_COLORS.textPlaceholder}
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  if (errors.username || errors.auth) setErrors((prev) => ({ ...prev, username: undefined, auth: undefined }));
                }}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
              {usernameStatus === 'checking' && (
                <ActivityIndicator size="small" color="#EF4444" style={{ marginLeft: 8 }} />
              )}
              {usernameStatus === 'available' && (
                <Ionicons name="checkmark-circle" size={18} color="#10B981" style={{ marginLeft: 8 }} />
              )}
              {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                <Ionicons name="close-circle" size={18} color="#EF4444" style={{ marginLeft: 8 }} />
              )}
            </View>
            {errors.username ? (
              <Text style={styles.errorText}>{errors.username}</Text>
            ) : usernameStatus === 'available' ? (
              <Text style={[styles.errorText, { color: '#10B981' }]}>✓ Username available</Text>
            ) : null}
          </View>

          {/* Email Input */}
          <View style={styles.inputFieldContainer}>
            <View style={[styles.inputWrapper, { height: inputHeight }, errors.email ? styles.inputError : null]}>
              <Ionicons name="mail-outline" size={19} color={AUTH_COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                ref={emailRef}
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={AUTH_COLORS.textPlaceholder}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email || errors.auth) setErrors((prev) => ({ ...prev, email: undefined, auth: undefined }));
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Password Input */}
          <View style={styles.inputFieldContainer}>
            <View style={[styles.inputWrapper, { height: inputHeight }, errors.password ? styles.inputError : null]}>
              <Ionicons name="lock-closed-outline" size={19} color={AUTH_COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                ref={passwordRef}
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={AUTH_COLORS.textPlaceholder}
                value={password}
                onFocus={() => setIsPasswordFocused(true)}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password || errors.auth) setErrors((prev) => ({ ...prev, password: undefined, auth: undefined }));
                }}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                returnKeyType="next"
                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={19}
                  color={AUTH_COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>
            {/* Live Interactive Password Requirements */}
            <PasswordRequirements password={password} visible={isPasswordFocused || password.length > 0} />
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputFieldContainer}>
            <View style={[
              styles.inputWrapper,
              { height: inputHeight },
              errors.confirmPassword ? styles.inputError : null,
              passwordsMatch ? { borderColor: '#10B981' } : null,
            ]}>
              <Ionicons name="shield-checkmark-outline" size={19} color={AUTH_COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                ref={confirmPasswordRef}
                style={styles.input}
                placeholder="Confirm password"
                placeholderTextColor={AUTH_COLORS.textPlaceholder}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }}
                secureTextEntry={!showConfirmPassword}
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={handleSignup}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={19}
                  color={AUTH_COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>
            {passwordsMatch ? (
              <Text style={[styles.errorText, { color: '#10B981' }]}>✓ Passwords match</Text>
            ) : passwordsMismatch ? (
              <Text style={styles.errorText}>✕ Passwords don't match</Text>
            ) : errors.confirmPassword ? (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            ) : null}
          </View>

          {/* Red Coral Gradient Primary Create Account Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSignup}
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
                  <Text style={styles.primaryButtonText}>Creating Account...</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>Create Account</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Clean OR Divider */}
          <AuthDivider label="OR" style={{ marginVertical: 2 }} />

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
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.footerLinkText}>Sign In</Text>
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
    paddingBottom: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13.5,
    color: '#A1A1AA',
    textAlign: 'center',
  },
  formContainer: {
    paddingHorizontal: 24,
    paddingTop: 4,
    gap: 8,
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
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    color: AUTH_COLORS.textPrimary,
    fontSize: 14.5,
  },
  eyeButton: {
    paddingLeft: 8,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 11.5,
    marginTop: 3,
    marginLeft: 14,
  },
  primaryButtonWrapper: {
    marginTop: 4,
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
    fontSize: 15.5,
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
    marginTop: 14,
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
