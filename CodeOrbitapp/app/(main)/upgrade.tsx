import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Easing,
  Platform,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { APP_COLORS } from '../../constants';
import { useAuthStore } from '../../store/authStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type BillingCycle = 'monthly' | 'yearly';

interface Plan {
  id: string;
  name: string;
  badge?: string;
  popular?: boolean;
  monthlyPrice: string;
  yearlyPrice: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  color: string;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free Starter',
    monthlyPrice: '$0',
    yearlyPrice: '$0',
    period: 'forever',
    description: 'Essential tools for casual coding and quick collaborative sessions.',
    features: [
      '1 Active concurrent session',
      'Basic code editor & syntax highlighting',
      'Public session join access',
      '5 AI Assistant prompts per day',
      'Community support',
    ],
    cta: 'Current Plan',
    color: APP_COLORS.textSecondary,
  },
  {
    id: 'pro',
    name: 'Pro Developer',
    badge: 'MOST POPULAR',
    popular: true,
    monthlyPrice: '$9.99',
    yearlyPrice: '$7.99',
    period: '/ month',
    description: 'Supercharge your productivity with unlimited sessions & AI power.',
    features: [
      'Unlimited concurrent collaboration sessions',
      'Unlimited AI Assistant code generation & debugging',
      'Full cloud session history & 1-click restore',
      'Custom editor themes & custom fonts',
      'HD Voice & low-latency audio rooms',
      'Encrypted private room keys',
      'Priority customer support',
    ],
    cta: 'Upgrade to Pro',
    color: APP_COLORS.primary,
  },
  {
    id: 'team',
    name: 'Team & Enterprise',
    badge: 'FOR TEAMS',
    monthlyPrice: '$29.99',
    yearlyPrice: '$23.99',
    period: '/ month',
    description: 'Scalable collaboration and admin governance for dev teams.',
    features: [
      'Everything included in Pro Developer',
      'Up to 25 team members per active session',
      'Role-based permissions & audit logs',
      'Dedicated high-speed WebSocket relay',
      'GitHub & GitLab repository sync',
      'SSO & SAML Authentication',
      '24/7 Dedicated account manager',
    ],
    cta: 'Get Team Plan',
    color: APP_COLORS.secondary,
  },
];

const FAQS = [
  {
    question: 'Can I change or cancel my subscription anytime?',
    answer: 'Yes! You can upgrade, downgrade, or cancel your subscription at any time directly from your profile settings. No contracts or hidden fees.',
  },
  {
    question: 'How does the 7-day free trial work for Pro?',
    answer: 'When you select Pro Developer, you get 7 days of full access completely free. You won’t be charged until the trial period ends.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, MasterCard, American Express), Apple Pay, Google Pay, and PayPal.',
  },
  {
    question: 'What happens to my sessions if I downgrade?',
    answer: 'All existing session data remains safely saved in your account. You will just be subject to the single concurrent active session limit on the Free tier.',
  },
];

export default function UpgradeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('pro');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [subscribedPlan, setSubscribedPlan] = useState<string>('Pro Developer');

  const handleBack = () => {
    router.replace('/(main)/profile');
  };

  const handleUpgrade = (plan: Plan) => {
    if (plan.id === 'free') {
      Alert.alert('Current Plan', 'You are already on the Free Starter plan.');
      return;
    }

    setSelectedPlanId(plan.id);
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setSubscribedPlan(plan.name);
      setShowSuccessModal(true);
    }, 1200);
  };

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={APP_COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription Plans</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Header */}
        <View style={styles.heroSection}>
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles" size={14} color={APP_COLORS.primary} />
            <Text style={styles.heroBadgeText}>UNLOCK PREMIUM POWER</Text>
          </View>
          <Text style={styles.heroTitle}>Upgrade Your CodeOrbit Experience</Text>
          <Text style={styles.heroSubtitle}>
            Collaborate in real-time, leverage unlimited AI assistance, and store unlimited cloud history.
          </Text>

          {/* Billing Cycle Switcher */}
          <View style={styles.billingToggleContainer}>
            <TouchableOpacity
              style={[styles.billingOption, billingCycle === 'monthly' && styles.billingOptionActive]}
              onPress={() => setBillingCycle('monthly')}
              activeOpacity={0.8}
            >
              <Text style={[styles.billingOptionText, billingCycle === 'monthly' && styles.billingOptionTextActive]}>
                Monthly
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.billingOption, billingCycle === 'yearly' && styles.billingOptionActive]}
              onPress={() => setBillingCycle('yearly')}
              activeOpacity={0.8}
            >
              <Text style={[styles.billingOptionText, billingCycle === 'yearly' && styles.billingOptionTextActive]}>
                Yearly
              </Text>
              <View style={styles.discountTag}>
                <Text style={styles.discountTagText}>SAVE 20%</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pricing Cards */}
        <View style={styles.plansContainer}>
          {PLANS.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;

            return (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  plan.popular && styles.popularPlanCard,
                  isSelected && { borderColor: plan.color },
                ]}
                onPress={() => setSelectedPlanId(plan.id)}
                activeOpacity={0.9}
              >
                {plan.badge && (
                  <View style={[styles.planBadge, { backgroundColor: plan.color }]}>
                    <Text style={styles.planBadgeText}>{plan.badge}</Text>
                  </View>
                )}

                <View style={styles.planHeader}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planDescription}>{plan.description}</Text>

                  <View style={styles.priceContainer}>
                    <Text style={styles.priceText}>{price}</Text>
                    <Text style={styles.periodText}>{plan.period}</Text>
                  </View>
                  {billingCycle === 'yearly' && plan.id !== 'free' && (
                    <Text style={styles.billedYearlySubtext}>Billed annually ($95.88/yr)</Text>
                  )}
                </View>

                <View style={styles.divider} />

                {/* Features List */}
                <View style={styles.featuresList}>
                  {plan.features.map((feature, idx) => (
                    <View key={idx} style={styles.featureRow}>
                      <View style={[styles.checkCircle, { backgroundColor: plan.color + '20' }]}>
                        <Ionicons name="checkmark" size={14} color={plan.color} />
                      </View>
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                {/* CTA Button */}
                <TouchableOpacity
                  style={[
                    styles.ctaButton,
                    plan.popular ? { backgroundColor: APP_COLORS.primary } : { backgroundColor: APP_COLORS.surfaceLight },
                    plan.id === 'free' && styles.disabledCta,
                  ]}
                  disabled={plan.id === 'free'}
                  onPress={() => handleUpgrade(plan)}
                  activeOpacity={0.8}
                >
                  {isProcessing && selectedPlanId === plan.id ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text
                      style={[
                        styles.ctaButtonText,
                        plan.id === 'free' && { color: APP_COLORS.textSecondary },
                      ]}
                    >
                      {plan.cta}
                    </Text>
                  )}
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Feature Highlights Grid */}
        <View style={styles.highlightsSection}>
          <Text style={styles.sectionHeading}>Why Upgrade to Pro?</Text>
          <View style={styles.highlightsGrid}>
            <View style={styles.highlightCard}>
              <View style={[styles.highlightIcon, { backgroundColor: APP_COLORS.primary + '20' }]}>
                <Ionicons name="flash" size={24} color={APP_COLORS.primary} />
              </View>
              <Text style={styles.highlightTitle}>Real-time Sync</Text>
              <Text style={styles.highlightDesc}>Sub-millisecond code syncing for seamless team coding.</Text>
            </View>

            <View style={styles.highlightCard}>
              <View style={[styles.highlightIcon, { backgroundColor: APP_COLORS.secondary + '20' }]}>
                <Ionicons name="hardware-chip" size={24} color={APP_COLORS.secondary} />
              </View>
              <Text style={styles.highlightTitle}>AI Autocomplete</Text>
              <Text style={styles.highlightDesc}>Context-aware code completions and automated test generation.</Text>
            </View>

            <View style={styles.highlightCard}>
              <View style={[styles.highlightIcon, { backgroundColor: APP_COLORS.warning + '20' }]}>
                <Ionicons name="cloud-upload" size={24} color={APP_COLORS.warning} />
              </View>
              <Text style={styles.highlightTitle}>Cloud History</Text>
              <Text style={styles.highlightDesc}>Never lose code with automated revision control & cloud snapshots.</Text>
            </View>

            <View style={styles.highlightCard}>
              <View style={[styles.highlightIcon, { backgroundColor: APP_COLORS.success + '20' }]}>
                <Ionicons name="shield-checkmark" size={24} color={APP_COLORS.success} />
              </View>
              <Text style={styles.highlightTitle}>Bank-Grade Security</Text>
              <Text style={styles.highlightDesc}>End-to-end encrypted session rooms and private credentials.</Text>
            </View>
          </View>
        </View>

        {/* FAQ Accordion */}
        <View style={styles.faqSection}>
          <Text style={styles.sectionHeading}>Frequently Asked Questions</Text>
          {FAQS.map((faq, index) => {
            const isExpanded = expandedFaq === index;
            return (
              <TouchableOpacity
                key={index}
                style={styles.faqCard}
                onPress={() => toggleFaq(index)}
                activeOpacity={0.8}
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={APP_COLORS.textSecondary}
                  />
                </View>
                {isExpanded && <Text style={styles.faqAnswer}>{faq.answer}</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Guarantee Banner */}
        <View style={styles.guaranteeBanner}>
          <Ionicons name="shield" size={24} color={APP_COLORS.success} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.guaranteeTitle}>14-Day Money Back Guarantee</Text>
            <Text style={styles.guaranteeSubtitle}>Try Pro risk-free. If you aren't completely satisfied, cancel anytime.</Text>
          </View>
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark" size={40} color="#fff" />
            </View>
            <Text style={styles.modalTitle}>Upgrade Successful! 🎉</Text>
            <Text style={styles.modalMessage}>
              Welcome to <Text style={{ fontWeight: 'bold', color: APP_COLORS.primary }}>{subscribedPlan}</Text>! Your account has been upgraded with unlimited sessions and full AI access.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowSuccessModal(false);
                handleBack();
              }}
            >
              <Text style={styles.modalButtonText}>Start Coding Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: 16,
    backgroundColor: APP_COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.surface,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: APP_COLORS.text,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 12,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: APP_COLORS.primary,
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: APP_COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  billingToggleContainer: {
    flexDirection: 'row',
    backgroundColor: APP_COLORS.surface,
    borderRadius: 30,
    padding: 4,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  billingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 24,
    gap: 6,
  },
  billingOptionActive: {
    backgroundColor: APP_COLORS.primary,
  },
  billingOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: APP_COLORS.textSecondary,
  },
  billingOptionTextActive: {
    color: '#ffffff',
  },
  discountTag: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  discountTagText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000',
  },
  plansContainer: {
    gap: 20,
    marginBottom: 32,
  },
  planCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1.5,
    borderColor: APP_COLORS.border,
    position: 'relative',
  },
  popularPlanCard: {
    borderColor: APP_COLORS.primary,
    backgroundColor: APP_COLORS.surface,
    elevation: 4,
    shadowColor: APP_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  planBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  planBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  planHeader: {
    marginBottom: 16,
  },
  planName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    marginBottom: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceText: {
    fontSize: 34,
    fontWeight: '800',
    color: APP_COLORS.text,
  },
  periodText: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    marginLeft: 6,
  },
  billedYearlySubtext: {
    fontSize: 11,
    color: APP_COLORS.success,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: APP_COLORS.border,
    marginBottom: 16,
  },
  featuresList: {
    gap: 12,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 13.5,
    color: APP_COLORS.text,
    flex: 1,
  },
  ctaButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledCta: {
    backgroundColor: APP_COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  highlightsSection: {
    marginBottom: 32,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: APP_COLORS.text,
    marginBottom: 16,
  },
  highlightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  highlightCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    backgroundColor: APP_COLORS.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  highlightIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  highlightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  highlightDesc: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    lineHeight: 16,
  },
  faqSection: {
    marginBottom: 28,
  },
  faqCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: APP_COLORS.text,
    flex: 1,
    marginRight: 10,
  },
  faqAnswer: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    lineHeight: 18,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
  },
  guaranteeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: APP_COLORS.success + '40',
  },
  guaranteeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: APP_COLORS.text,
    marginBottom: 2,
  },
  guaranteeSubtitle: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: APP_COLORS.primary,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: APP_COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: APP_COLORS.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: APP_COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
