import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { validateEmail, validatePassword } from '../../utils/validation';
import { safeGoBack } from '../../utils/navigation';
import { APP_COLORS } from '../../constants';

type Step = 'email' | 'otp' | 'password' | 'success';

// Mask email for privacy: s***h@gmail.com
function maskEmail(rawEmail: string): string {
  const parts = rawEmail.trim().split('@');
  if (parts.length !== 2) return rawEmail;
  const [name, domain] = parts;
  if (name.length <= 2) return `${name.charAt(0)}*@${domain}`;
  return `${name.charAt(0)}${'•'.repeat(Math.min(name.length - 2, 8))}${name.slice(-1)}@${domain}`;
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Current Step state
  const [step, setStep] = useState<Step>('email');

  // Form State
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Resend states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showResentBadge, setShowResentBadge] = useState(false);

  // Input Refs
  const emailInputRef = useRef<TextInput>(null);
  const otpInputRefs = useRef<(TextInput | null)[]>([]);
  const newPasswordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const animateTransition = (callback: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(callback, 100);
  };

  // Password strength calculation (8+ characters policy)
  const passwordStrength = useMemo(() => {
    if (!newPassword) return { score: 0, label: '', color: '#404040' };
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (newPassword.length >= 12) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) score++;

    if (newPassword.length < 8) {
      return { score: 1, label: 'Too short (min 8)', color: '#EF4444' };
    }
    if (score <= 2) return { score: 2, label: 'Fair', color: '#F59E0B' };
    if (score <= 3) return { score: 3, label: 'Good', color: '#3B82F6' };
    return { score: 4, label: 'Strong', color: '#10B981' };
  }, [newPassword]);

  // Real-time password match check
  const passwordsMatch = useMemo(() => {
    if (!confirmPassword) return null;
    return newPassword === confirmPassword;
  }, [newPassword, confirmPassword]);

  // 1. Submit Email -> Send 6-Digit OTP
  const handleSendOtp = async () => {
    const emailValidation = validateEmail(email.trim());
    if (!emailValidation.isValid) {
      setErrorMessage(emailValidation.error || 'Please enter a valid email address.');
      emailInputRef.current?.focus();
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      await api.auth.forgotPassword(email.trim());
      setResendCooldown(60);
      animateTransition(() => {
        setStep('otp');
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Handle OTP Digits Input with Auto-Advance and Paste support
  const handleOtpChange = (text: string, index: number) => {
    const cleaned = text.replace(/[^0-9]/g, '');

    // Handle full paste of 6-digit code
    if (cleaned.length >= 6) {
      const newOtp = cleaned.slice(0, 6).split('');
      setOtp(newOtp);
      otpInputRefs.current[5]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleaned ? cleaned.slice(-1) : '';
    setOtp(newOtp);

    // Auto-advance to next box
    if (cleaned && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // 3. Verify OTP -> Advance to New Password Step
  const handleVerifyOtp = async () => {
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      await api.auth.verifyOtp(email.trim(), otpCode);
      animateTransition(() => {
        setStep('password');
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Invalid or expired code. Please check and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Resend OTP with visual feedback
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await api.auth.forgotPassword(email.trim());
      setResendCooldown(60);
      setShowResentBadge(true);
      setTimeout(() => setShowResentBadge(false), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not resend code. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Submit New Password
  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      newPasswordRef.current?.focus();
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please ensure both fields are identical.');
      confirmPasswordRef.current?.focus();
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const otpCode = otp.join('');
      await api.auth.resetPassword(email.trim(), otpCode, newPassword);
      animateTransition(() => {
        setStep('success');
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to reset password. The code may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + (Platform.OS === 'ios' ? 12 : 20),
            paddingBottom: insets.bottom + 20,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Header Navigation & Step Indicator */}
        <View style={styles.headerRow}>
          {step !== 'success' ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                if (step === 'otp') setStep('email');
                else if (step === 'password') setStep('otp');
                else safeGoBack(router, '/(auth)/login');
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 38 }} />
          )}

          {step !== 'success' && (
            <View style={styles.stepIndicatorRow}>
              {/* Step 1 Indicator */}
              <View
                style={[
                  styles.stepDot,
                  (step === 'email' || step === 'otp' || step === 'password') && styles.stepDotActive,
                ]}
              />
              <View
                style={[
                  styles.stepLine,
                  (step === 'otp' || step === 'password') && styles.stepLineActive,
                ]}
              />
              {/* Step 2 Indicator */}
              <View
                style={[
                  styles.stepDot,
                  (step === 'otp' || step === 'password') && styles.stepDotActive,
                ]}
              />
              <View
                style={[
                  styles.stepLine,
                  step === 'password' && styles.stepLineActive,
                ]}
              />
              {/* Step 3 Indicator */}
              <View
                style={[
                  styles.stepDot,
                  step === 'password' && styles.stepDotActive,
                ]}
              />
            </View>
          )}

          <View style={{ width: 38 }} />
        </View>

        {/* Dynamic Animated Content */}
        <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
          {/* STEP 1: Enter Email */}
          {step === 'email' && (
            <View style={styles.stepContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="key-outline" size={28} color="#EF4444" />
              </View>
              <Text style={styles.stepTitle}>Forgot Password?</Text>
              <Text style={styles.stepSubtitle}>
                Enter your registered email and we'll send you a 6-digit verification code.
              </Text>

              {errorMessage && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={17} color="#EF4444" style={{ marginRight: 8 }} />
                  <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={18} color="#71717A" style={styles.inputIcon} />
                  <TextInput
                    ref={emailInputRef}
                    style={styles.textInput}
                    placeholder="name@example.com"
                    placeholderTextColor="#71717A"
                    value={email}
                    onChangeText={(t) => {
                      setEmail(t);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    returnKeyType="done"
                    onSubmitEditing={handleSendOtp}
                  />
                  {email.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setEmail('')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close-circle" size={16} color="#71717A" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleSendOtp}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Send Verification Code</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 2: Enter 6-Digit OTP */}
          {step === 'otp' && (
            <View style={styles.stepContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="shield-checkmark-outline" size={28} color="#EF4444" />
              </View>
              <Text style={styles.stepTitle}>Enter Verification Code</Text>
              <Text style={styles.stepSubtitle}>
                We've sent a 6-digit code to{' '}
                <Text style={{ color: '#F4F4F5', fontWeight: '600' }}>{maskEmail(email)}</Text>.
              </Text>

              {errorMessage && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={17} color="#EF4444" style={{ marginRight: 8 }} />
                  <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </View>
              )}

              {showResentBadge && (
                <View style={styles.successBanner}>
                  <Ionicons name="checkmark-circle" size={17} color="#10B981" style={{ marginRight: 8 }} />
                  <Text style={styles.successBannerText}>Code sent ✓ Please check your inbox.</Text>
                </View>
              )}

              {/* 6-box numeric OTP grid */}
              <View style={styles.otpGrid}>
                {otp.map((digit, idx) => (
                  <TextInput
                    key={idx}
                    ref={(el) => {
                      otpInputRefs.current[idx] = el;
                    }}
                    style={[
                      styles.otpBox,
                      digit.length > 0 && styles.otpBoxFilled,
                    ]}
                    value={digit}
                    onChangeText={(text) => handleOtpChange(text, idx)}
                    onKeyPress={(e) => handleOtpKeyPress(e, idx)}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    maxLength={1}
                    selectTextOnFocus
                    textAlign="center"
                    autoFocus={idx === 0}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleVerifyOtp}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Verify Code</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </>
                )}
              </TouchableOpacity>

              {/* Resend OTP button with cooldown timer */}
              <View style={styles.resendRow}>
                <Text style={styles.resendText}>Didn't receive the code? </Text>
                <TouchableOpacity
                  onPress={handleResendOtp}
                  disabled={resendCooldown > 0 || isLoading}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                >
                  <Text
                    style={[
                      styles.resendLink,
                      resendCooldown > 0 && { color: '#71717A' },
                    ]}
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 3: Create New Password */}
          {step === 'password' && (
            <View style={styles.stepContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="lock-closed-outline" size={28} color="#EF4444" />
              </View>
              <Text style={styles.stepTitle}>Reset Password</Text>
              <Text style={styles.stepSubtitle}>
                Create a new password for your account (minimum 8 characters).
              </Text>

              {errorMessage && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={17} color="#EF4444" style={{ marginRight: 8 }} />
                  <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </View>
              )}

              {/* New Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>NEW PASSWORD</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={18} color="#71717A" style={styles.inputIcon} />
                  <TextInput
                    ref={newPasswordRef}
                    style={styles.textInput}
                    placeholder="Enter new password (8+ chars)"
                    placeholderTextColor="#71717A"
                    value={newPassword}
                    onChangeText={(t) => {
                      setNewPassword(t);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color="#71717A"
                    />
                  </TouchableOpacity>
                </View>

                {/* Password Strength Meter */}
                {newPassword.length > 0 && (
                  <View style={styles.strengthMeterContainer}>
                    <View style={styles.strengthBarsRow}>
                      {[1, 2, 3, 4].map((level) => (
                        <View
                          key={level}
                          style={[
                            styles.strengthBar,
                            level <= passwordStrength.score && {
                              backgroundColor: passwordStrength.color,
                            },
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                      Strength: {passwordStrength.label}
                    </Text>
                  </View>
                )}
              </View>

              {/* Confirm Password Input with Real-Time Match Validation */}
              <View style={styles.inputGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={styles.inputLabel}>CONFIRM NEW PASSWORD</Text>
                  {passwordsMatch !== null && (
                    <Text
                      style={[
                        styles.matchIndicatorText,
                        { color: passwordsMatch ? '#10B981' : '#EF4444' },
                      ]}
                    >
                      {passwordsMatch ? '✓ Passwords match' : 'Passwords don\'t match'}
                    </Text>
                  )}
                </View>

                <View
                  style={[
                    styles.inputWrapper,
                    passwordsMatch === false && { borderColor: '#EF444480' },
                    passwordsMatch === true && { borderColor: '#10B98180' },
                  ]}
                >
                  <Ionicons name="lock-closed-outline" size={18} color="#71717A" style={styles.inputIcon} />
                  <TextInput
                    ref={confirmPasswordRef}
                    style={styles.textInput}
                    placeholder="Confirm new password"
                    placeholderTextColor="#71717A"
                    value={confirmPassword}
                    onChangeText={(t) => {
                      setConfirmPassword(t);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleResetPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color="#71717A"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleResetPassword}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Update Password</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 4: Success Screen */}
          {step === 'success' && (
            <View style={[styles.stepContainer, { alignItems: 'center' }]}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
                <Ionicons name="checkmark-circle" size={38} color="#10B981" />
              </View>
              <Text style={styles.stepTitle}>Password Updated</Text>
              <Text style={[styles.stepSubtitle, { textAlign: 'center' }]}>
                Your password has been changed successfully. You can now log in to CodeOrbit.
              </Text>

              <TouchableOpacity
                style={[styles.primaryButton, { width: '100%', marginTop: 20 }]}
                onPress={() => router.replace('/(auth)/login')}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Log In</Text>
                <Ionicons name="log-in-outline" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* Bottom Login Link */}
        {step !== 'success' && (
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Remember your password? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.footerLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#17181A',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#202022',
    borderWidth: 1,
    borderColor: '#2E2E34',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2E2E34',
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  stepDotActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
    width: 16,
  },
  stepLine: {
    width: 14,
    height: 2,
    backgroundColor: '#2E2E34',
  },
  stepLineActive: {
    backgroundColor: '#EF4444',
  },

  // Step Container
  stepContainer: {
    width: '100%',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 18,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 21,
    textAlign: 'center',
    paddingHorizontal: 8,
    marginBottom: 24,
  },

  // Error & Success Banners
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
  },
  errorBannerText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
  },
  successBannerText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },

  // Inputs
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A1A1AA',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202022',
    borderWidth: 1,
    borderColor: '#2E2E34',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14.5,
    color: '#FFFFFF',
  },

  // 6-digit OTP grid
  otpGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  otpBox: {
    width: 46,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#202022',
    borderWidth: 1.5,
    borderColor: '#2E2E34',
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  otpBoxFilled: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },

  // Buttons
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    backgroundColor: '#EF4444',
    borderRadius: 14,
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Password Strength & Match Indicators
  strengthMeterContainer: {
    marginTop: 8,
  },
  strengthBarsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  strengthBar: {
    flex: 1,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#2E2E34',
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  matchIndicatorText: {
    fontSize: 11.5,
    fontWeight: '600',
  },

  // Resend
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  resendText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  resendLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },

  // Footer
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingTop: 28,
  },
  footerText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
});
