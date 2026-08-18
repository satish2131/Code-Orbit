import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSessionSocket } from '../../hooks/useSessionSocket';
import { useAuthStore } from '../../store/authStore';
import { validateSessionCode, validateName } from '../../utils/validation';
import { safeGoBack } from '../../utils/navigation';
import { APP_COLORS } from '../../constants';

export default function JoinSessionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { joinExistingSession } = useSessionSocket();
  const { user, isGuest } = useAuthStore();
  const [sessionCode, setSessionCode] = useState('');
  const [nickname, setNickname] = useState(user?.name || '');
  const [errors, setErrors] = useState<{ code?: string; nickname?: string }>({});

  const handleJoinSession = () => {
    const codeValidation = validateSessionCode(sessionCode);
    const nicknameValidation = isGuest ? validateName(nickname) : { isValid: true };
    
    const newErrors: typeof errors = {};
    
    if (!codeValidation.isValid) newErrors.code = codeValidation.error;
    if (!nicknameValidation.isValid) newErrors.nickname = nicknameValidation.error;
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    joinExistingSession(sessionCode.toUpperCase());
    router.push('/(main)/waiting-room');
  };

  const handleScanQR = () => {
    router.push('/(main)/qr-scanner');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom > 0 ? insets.bottom + 20 : 30 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.content, { paddingTop: insets.top > 0 ? insets.top + 16 : 60 }]}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => safeGoBack(router, '/(main)/home')}>
              <Ionicons name="arrow-back" size={20} color={APP_COLORS.primary} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Join Session</Text>
            <Text style={styles.subtitle}>Enter a session code to join</Text>
          </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Session Code</Text>
            <View style={[styles.codeInputWrapper, errors.code && styles.inputError]}>
              <Ionicons name="keypad" size={24} color={APP_COLORS.primary} style={styles.codeIcon} />
              <TextInput
                style={styles.codeInput}
                placeholder="XXXXXX"
                placeholderTextColor={APP_COLORS.textSecondary}
                value={sessionCode}
                onChangeText={(text) => {
                  setSessionCode(text.toUpperCase());
                  if (errors.code) setErrors({ ...errors, code: undefined });
                }}
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>
            {errors.code && <Text style={styles.errorText}>{errors.code}</Text>}
            <Text style={styles.hint}>Example: 7F3-K9Q</Text>
          </View>

          <TouchableOpacity style={styles.qrButton} onPress={handleScanQR}>
            <Ionicons name="qr-code" size={22} color={APP_COLORS.primary} style={{ marginRight: 8 }} />
            <Text style={styles.qrText}>Scan QR Code</Text>
          </TouchableOpacity>

          {isGuest && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Your Nickname</Text>
              <View style={[styles.inputWrapper, errors.nickname && styles.inputError]}>
                <Ionicons name="person-outline" size={20} color={APP_COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter a nickname"
                  placeholderTextColor={APP_COLORS.textSecondary}
                  value={nickname}
                  onChangeText={(text) => {
                    setNickname(text);
                    if (errors.nickname) setErrors({ ...errors, nickname: undefined });
                  }}
                  autoCapitalize="words"
                  maxLength={20}
                  autoComplete="name"
                />
              </View>
              {errors.nickname && <Text style={styles.errorText}>{errors.nickname}</Text>}
            </View>
          )}

          <TouchableOpacity
            style={[styles.joinButton, !sessionCode.trim() && styles.joinButtonDisabled]}
            onPress={handleJoinSession}
            disabled={!sessionCode.trim()}
          >
            <Ionicons name="log-in" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.joinButtonText}>Join Session</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.helpSection}>
          <View style={styles.helpHeader}>
            <Ionicons name="help-circle" size={20} color={APP_COLORS.primary} />
            <Text style={styles.helpTitle}>How to join</Text>
          </View>
          <View style={styles.helpStep}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNumber}>1</Text>
            </View>
            <Text style={styles.stepText}>Get a session code from the host</Text>
          </View>
          <View style={styles.helpStep}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNumber}>2</Text>
            </View>
            <Text style={styles.stepText}>Enter the code above or scan the QR</Text>
          </View>
          <View style={styles.helpStep}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNumber}>3</Text>
            </View>
            <Text style={styles.stepText}>Wait for the host to approve you</Text>
          </View>
        </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  header: {
    marginBottom: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButtonText: {
    color: APP_COLORS.primary,
    fontSize: 16,
    marginLeft: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: APP_COLORS.textSecondary,
  },
  form: {
    marginBottom: 40,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: APP_COLORS.text,
    marginBottom: 8,
  },
  codeInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: APP_COLORS.primary,
  },
  codeIcon: {
    paddingLeft: 16,
  },
  codeInput: {
    flex: 1,
    padding: 20,
    fontSize: 28,
    fontWeight: 'bold',
    color: APP_COLORS.text,
    textAlign: 'center',
    letterSpacing: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  inputIcon: {
    paddingLeft: 16,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: APP_COLORS.text,
  },
  inputError: {
    borderColor: APP_COLORS.error,
  },
  errorText: {
    color: APP_COLORS.error,
    fontSize: 12,
    marginTop: 4,
  },
  hint: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.surface,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    marginBottom: 20,
  },
  qrText: {
    color: APP_COLORS.text,
    fontSize: 16,
    fontWeight: '500',
  },
  joinButton: {
    backgroundColor: APP_COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  joinButtonDisabled: {
    opacity: 0.5,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  helpSection: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
  },
  helpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginLeft: 8,
  },
  helpStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepCircle: {
    width: 24,
    height: 24,
    backgroundColor: APP_COLORS.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumber: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: APP_COLORS.textSecondary,
  },
});
