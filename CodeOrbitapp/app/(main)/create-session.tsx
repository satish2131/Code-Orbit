import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSessionSocket } from '../../hooks/useSessionSocket';
import { useSessionStore } from '../../store/sessionStore';
import { LANGUAGE_PRESETS, APP_COLORS } from '../../constants';
import { safeGoBack } from '../../utils/navigation';

const PARTICIPANT_PRESETS = [2, 4, 8, 12, 16, 25, 50];

export default function CreateSessionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ lang?: string }>();
  const { createNewSession } = useSessionSocket();

  // Multi-step flow state (Step 1: Language selection, Step 2: Configuration)
  const [step, setStep] = useState<1 | 2>(1);

  // Form State - dynamically derived from LANGUAGE_PRESETS registry
  const initialLang = params.lang && LANGUAGE_PRESETS[params.lang] ? params.lang : '';
  const [selectedLanguage, setSelectedLanguage] = useState<string>(initialLang);
  const [approvalMode, setApprovalMode] = useState<'approval_required' | 'open'>('approval_required');
  const [maxParticipants, setMaxParticipants] = useState<number>(4);
  const [isCreating, setIsCreating] = useState(false);

  // Reset creation loading state whenever screen is focused or returned to
  useFocusEffect(
    useCallback(() => {
      setIsCreating(false);
    }, [])
  );

  const handleNextStep = useCallback(() => {
    setStep(2);
  }, []);

  const handlePrevStep = useCallback(() => {
    setStep(1);
  }, []);

  const handleBackPress = useCallback(() => {
    if (step === 2) {
      handlePrevStep();
    } else {
      safeGoBack(router, '/(main)/home');
    }
  }, [step, handlePrevStep, router]);

  const handleParticipantChange = useCallback((value: number) => {
    const validValue = Math.max(1, Math.min(100, value));
    setMaxParticipants(validValue);
  }, []);

  const handleCustomInputChange = useCallback((text: string) => {
    const parsed = parseInt(text.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
      setMaxParticipants(parsed);
    } else if (text === '') {
      setMaxParticipants(1);
    }
  }, []);

  const handleCreateSession = useCallback(async () => {
    if (isCreating) return;
    if (maxParticipants < 1) {
      Alert.alert('Invalid Selection', 'Max participants must be at least 1.');
      return;
    }
    setIsCreating(true);
    useSessionStore.getState().resetSession();
    useSessionStore.getState().setIsHost(true);

    try {
      await createNewSession(selectedLanguage, approvalMode, maxParticipants);
      router.replace('/(main)/waiting-room');
    } catch (err: any) {
      setIsCreating(false);
      Alert.alert('Error Creating Room', err?.message || 'Failed to generate room code. Please try again.');
    }
  }, [isCreating, maxParticipants, selectedLanguage, approvalMode, createNewSession, router]);

  const selectedPreset = LANGUAGE_PRESETS[selectedLanguage];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* 1. Header & Consistent Back Navigation */}
      <View style={[styles.headerContainer, { paddingTop: insets.top > 0 ? insets.top + 8 : (Platform.OS === 'ios' ? 56 : 44) }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="arrow-back" size={20} color={APP_COLORS.text} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Step {step} of 2</Text>
          </View>
        </View>

        <Text style={styles.title}>
          {step === 1 ? 'Select Language' : 'Session Settings'}
        </Text>
        <Text style={styles.subtitle}>
          {step === 1
            ? 'Choose the primary programming language for your room'
            : 'Configure room access and participant capacity'}
        </Text>

        {/* Subtle 3px Progress Bar */}
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: step === 1 ? '50%' : '100%' }]} />
        </View>
      </View>

      {/* 2. Scrollable Body Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom > 0 ? insets.bottom + 90 : 110 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* STEP 1: SELECT LANGUAGE */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <View style={styles.section}>
              <Text style={styles.sectionHeading}>Available Environments</Text>
              <View style={styles.languageGrid}>
                {Object.values(LANGUAGE_PRESETS).map((preset) => {
                  const isSelected = selectedLanguage === preset.id;
                  return (
                    <TouchableOpacity
                      key={preset.id}
                      style={[
                        styles.languageCard,
                        isSelected && styles.languageCardSelected,
                      ]}
                      onPress={() => setSelectedLanguage(preset.id)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.cardHeaderRow}>
                        <View
                          style={[
                            styles.languageIconBox,
                            isSelected && styles.languageIconBoxSelected,
                          ]}
                        >
                          <Ionicons
                            name={preset.icon as any}
                            size={20}
                            color={isSelected ? '#fff' : APP_COLORS.primary}
                          />
                        </View>

                        {isSelected && (
                          <View style={styles.checkBadge}>
                            <Ionicons name="checkmark" size={12} color="#fff" />
                          </View>
                        )}
                      </View>

                      <Text style={styles.languageName} numberOfLines={1}>
                        {preset.name}
                      </Text>
                      <Text style={styles.languageTabs}>
                        {preset.tabs.length} {preset.tabs.length === 1 ? 'file' : 'files'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Compact Selected Summary Box */}
            {selectedPreset && (
              <View style={styles.selectedLanguageBanner}>
                <View style={styles.bannerIconBox}>
                  <Ionicons name="code-slash" size={18} color={APP_COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.bannerTitle}>{selectedPreset.name}</Text>
                    <Ionicons name="checkmark-circle" size={16} color={APP_COLORS.success} />
                  </View>
                  <Text style={styles.bannerSubtitle} numberOfLines={1}>
                    {selectedPreset.tabs.join(' · ')}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* STEP 2: SESSION SETTINGS */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            {/* Join Approval - Unified Compact Radio Group */}
            <View style={styles.section}>
              <Text style={styles.sectionHeading}>JOIN APPROVAL</Text>
              <View style={styles.radioGroupCard}>
                {/* Option 1: Approval Required */}
                <TouchableOpacity
                  style={[
                    styles.radioRow,
                    approvalMode === 'approval_required' && styles.radioRowActive,
                  ]}
                  onPress={() => setApprovalMode('approval_required')}
                  activeOpacity={0.7}
                >
                  <View style={styles.radioIconBox}>
                    <Ionicons name="lock-closed" size={18} color={APP_COLORS.primary} />
                  </View>
                  <View style={styles.radioContent}>
                    <Text style={styles.radioTitle}>Approval Required</Text>
                    <Text style={styles.radioSub}>Host approves each participant</Text>
                  </View>
                  <View style={[styles.radioCircle, approvalMode === 'approval_required' && styles.radioCircleActive]}>
                    {approvalMode === 'approval_required' && (
                      <View style={styles.radioDot} />
                    )}
                  </View>
                </TouchableOpacity>

                <View style={styles.radioDivider} />

                {/* Option 2: Open Session */}
                <TouchableOpacity
                  style={[
                    styles.radioRow,
                    approvalMode === 'open' && styles.radioRowActive,
                  ]}
                  onPress={() => setApprovalMode('open')}
                  activeOpacity={0.7}
                >
                  <View style={styles.radioIconBox}>
                    <Ionicons name="lock-open" size={18} color={APP_COLORS.success} />
                  </View>
                  <View style={styles.radioContent}>
                    <Text style={styles.radioTitle}>Open Session</Text>
                    <Text style={styles.radioSub}>Anyone with the room code joins</Text>
                  </View>
                  <View style={[styles.radioCircle, approvalMode === 'open' && styles.radioCircleActive]}>
                    {approvalMode === 'open' && (
                      <View style={styles.radioDot} />
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Max Participants - Clean Stepper + Single Row Horizontal Presets */}
            <View style={styles.section}>
              <Text style={styles.sectionHeading}>MAX PARTICIPANTS</Text>

              {/* Stepper */}
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => handleParticipantChange(maxParticipants - 1)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="remove" size={20} color={APP_COLORS.text} />
                </TouchableOpacity>

                <View style={styles.stepperCenter}>
                  <TextInput
                    style={styles.stepperInput}
                    value={maxParticipants.toString()}
                    onChangeText={handleCustomInputChange}
                    keyboardType="number-pad"
                    maxLength={3}
                    selectTextOnFocus
                  />
                  <Text style={styles.stepperLabel}>Users</Text>
                </View>

                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => handleParticipantChange(maxParticipants + 1)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="add" size={20} color={APP_COLORS.text} />
                </TouchableOpacity>
              </View>

              {/* Single Horizontal Presets Row */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.presetsRow}
              >
                {PARTICIPANT_PRESETS.map((num) => {
                  const isSelected = maxParticipants === num;
                  return (
                    <TouchableOpacity
                      key={num}
                      style={[styles.presetPill, isSelected && styles.presetPillSelected]}
                      onPress={() => handleParticipantChange(num)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.presetPillText,
                          isSelected && styles.presetPillTextSelected,
                        ]}
                      >
                        {num}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Room Summary Card - Compact, Light & Comprehensive */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryHeading}>ROOM SUMMARY</Text>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Language</Text>
                <Text style={styles.summaryValue}>{selectedPreset?.name}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Files</Text>
                <Text style={styles.summaryValue}>{selectedPreset?.tabs.length || 1}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Access</Text>
                <Text style={styles.summaryValue}>
                  {approvalMode === 'approval_required' ? 'Host approval' : 'Open access'}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Participants</Text>
                <Text style={[styles.summaryValue, { color: APP_COLORS.primary, fontWeight: '700' }]}>
                  {maxParticipants}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* 3. Floating Bottom Button (Hidden until language is selected) */}
      {(step === 2 || (step === 1 && !!selectedLanguage)) && (
        <View style={[styles.floatingFooter, { bottom: insets.bottom > 0 ? insets.bottom + 12 : (Platform.OS === 'ios' ? 32 : 24) }]}>
          {step === 1 ? (
            <TouchableOpacity
              style={styles.primaryCta}
              onPress={handleNextStep}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Continue to session settings"
            >
              <Text style={styles.primaryCtaText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          ) : (
          <TouchableOpacity
            style={[styles.primaryCta, isCreating && { opacity: 0.7 }]}
            onPress={handleCreateSession}
            disabled={isCreating}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Create session"
          >
            {isCreating ? (
              <Text style={styles.primaryCtaText}>Creating Room...</Text>
            ) : (
              <>
                <Ionicons name="add" size={20} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.primaryCtaText}>Create Session</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    )}
  </KeyboardAvoidingView>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },

  // Header
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 14,
    backgroundColor: APP_COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    color: APP_COLORS.text,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
  stepBadge: {
    backgroundColor: '#242424',
    borderWidth: 1,
    borderColor: '#303030',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: APP_COLORS.textSecondary,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: APP_COLORS.text,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    marginBottom: 14,
    lineHeight: 20,
  },
  progressBarBackground: {
    height: 3,
    backgroundColor: '#262626',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: APP_COLORS.primary,
    borderRadius: 2,
  },

  // Scroll View & Layout
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 110,
  },
  stepContainer: {
    gap: 20,
  },
  section: {
    marginBottom: 4,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: APP_COLORS.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },

  // Step 1: Language Grid
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  languageCard: {
    width: '48%',
    backgroundColor: APP_COLORS.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#2D2F33',
  },
  languageCardSelected: {
    borderColor: APP_COLORS.primary,
    backgroundColor: '#201819',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  languageIconBox: {
    width: 38,
    height: 38,
    backgroundColor: '#262626',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageIconBoxSelected: {
    backgroundColor: APP_COLORS.primary,
  },
  checkBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: APP_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageName: {
    fontSize: 14,
    fontWeight: '700',
    color: APP_COLORS.text,
    marginBottom: 2,
  },
  languageTabs: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
  },

  // Selected Language Banner
  selectedLanguageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#303030',
  },
  bannerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: APP_COLORS.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: APP_COLORS.text,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    marginTop: 2,
  },

  // Step 2: Radio Group Card (Join Approval)
  radioGroupCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#303030',
    overflow: 'hidden',
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  radioRowActive: {
    backgroundColor: '#201819',
  },
  radioIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioContent: {
    flex: 1,
  },
  radioTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: APP_COLORS.text,
    marginBottom: 2,
  },
  radioSub: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#4A4A4A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: APP_COLORS.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: APP_COLORS.primary,
  },
  radioDivider: {
    height: 1,
    backgroundColor: '#2D2F33',
  },

  // Step 2: Stepper & Presets (Max Participants)
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: APP_COLORS.surface,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#303030',
    marginBottom: 12,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperCenter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  stepperInput: {
    fontSize: 24,
    fontWeight: '800',
    color: APP_COLORS.text,
    textAlign: 'center',
    minWidth: 40,
    padding: 0,
  },
  stepperLabel: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    fontWeight: '600',
  },
  presetsRow: {
    paddingRight: 10,
    gap: 8,
  },
  presetPill: {
    minWidth: 44,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: '#303030',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetPillSelected: {
    backgroundColor: APP_COLORS.primary,
    borderColor: APP_COLORS.primary,
  },
  presetPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: APP_COLORS.textSecondary,
  },
  presetPillTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // Step 2: Summary Card
  summaryCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#303030',
  },
  summaryHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: APP_COLORS.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 13,
    color: APP_COLORS.text,
    fontWeight: '600',
  },

  // Floating Bottom Footer
  floatingFooter: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 32 : 24,
    left: 20,
    right: 20,
    zIndex: 99,
  },
  primaryCta: {
    height: 54,
    backgroundColor: APP_COLORS.primary,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  primaryCtaText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
