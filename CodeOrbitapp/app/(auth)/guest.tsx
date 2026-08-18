import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { validateName } from '../../utils/validation';
import { safeGoBack } from '../../utils/navigation';
import { APP_COLORS } from '../../constants';

export default function GuestScreen() {
  const router = useRouter();
  const { setGuest } = useAuthStore();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();

  const handleContinue = () => {
    const nameValidation = validateName(name);
    
    if (!nameValidation.isValid) {
      setNameError(nameValidation.error);
      return;
    }

    setNameError(undefined);
    setGuest(name.trim());
    // setGuest sets status → AUTHENTICATED; AuthGate in _layout.tsx handles navigation to home
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <TouchableOpacity style={styles.backButton} onPress={() => safeGoBack(router, '/(auth)/welcome')}>
            <Ionicons name="arrow-back" size={20} color={APP_COLORS.primary} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="person" size={40} color={APP_COLORS.primary} />
            </View>
            <Text style={styles.title}>Continue as Guest</Text>
            <Text style={styles.subtitle}>No account required — just pick a nickname</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Your Nickname</Text>
              <View style={[styles.inputWrapper, nameError && styles.inputError]}>
                <Ionicons name="person-outline" size={20} color={APP_COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter a nickname"
                  placeholderTextColor={APP_COLORS.textSecondary}
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    if (nameError) setNameError(undefined);
                  }}
                  autoCapitalize="words"
                  maxLength={20}
                  autoComplete="name"
                />
              </View>
              {nameError && <Text style={styles.errorText}>{nameError}</Text>}
              <Text style={styles.hint}>This is how others will see you in the session</Text>
            </View>

            <View style={styles.infoBox}>
              <View style={styles.infoHeader}>
                <Ionicons name="information-circle" size={20} color={APP_COLORS.primary} />
                <Text style={styles.infoTitle}>Guest Mode Limitations</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="close-circle" size={16} color={APP_COLORS.textSecondary} />
                <Text style={styles.infoText}>Sessions are temporary and won't be saved</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="close-circle" size={16} color={APP_COLORS.textSecondary} />
                <Text style={styles.infoText}>No access to session history</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="checkmark-circle" size={16} color={APP_COLORS.success} />
                <Text style={styles.infoText}>Create an account for full features</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, !name.trim() && styles.buttonDisabled]}
              onPress={handleContinue}
              disabled={!name.trim()}
            >
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Want to save your sessions? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
              <Text style={styles.footerLink}>Create Account</Text>
            </TouchableOpacity>
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
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButtonText: {
    color: APP_COLORS.primary,
    fontSize: 16,
    marginLeft: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: APP_COLORS.surface,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: APP_COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: APP_COLORS.text,
    marginBottom: 8,
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
  },
  infoBox: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    marginLeft: 8,
  },
  button: {
    backgroundColor: APP_COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    color: APP_COLORS.textSecondary,
    fontSize: 14,
  },
  footerLink: {
    color: APP_COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
