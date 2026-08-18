import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  Easing,
  Linking,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_COLORS } from '../../constants';
import { safeGoBack } from '../../utils/navigation';
import { api } from '../../services/api';
import { aiService } from '../../services/aiService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const INITIAL_SUPPORT_MESSAGES: Message[] = [
  {
    id: '1',
    text: "Hi there! 👋 Welcome to CodeOrbit Live Support.\n\nI can help you with:\n\n• Creating & joining live coding sessions\n• Supported languages & Piston code execution\n• Web HTML/CSS/JS sandbox & console\n• Account settings & connection troubleshooting\n\nWhat can I help you with today?",
    isUser: false,
    timestamp: new Date(),
  },
];

const SUPPORT_QUICK_PROMPTS = [
  'How to create a session?',
  'Supported programming languages',
  'How code execution works?',
  'Can guests join without login?',
  'Troubleshoot connection issues',
];

const FAQ_ITEMS = [
  {
    question: 'How do I host a pair coding room?',
    answer: 'Go to the Home tab and tap "Create Session". Choose your language preset (Python, Web, TypeScript, C++) and share your generated 6-letter room code with collaborators.',
  },
  {
    question: 'Which languages are supported?',
    answer: 'CodeOrbit supports Web (HTML/CSS/JS with live browser preview), Python, JavaScript (Node.js), TypeScript, C/C++, Java, Go, Rust, PHP, Ruby, Swift, and Kotlin via isolated Piston sandboxes.',
  },
  {
    question: 'Do collaborators need an account to join?',
    answer: 'No! Guest users can join any active session instantly by typing a nickname and the 6-letter room code. Creating an account lets you save room history.',
  },
  {
    question: 'What if code execution fails or times out?',
    answer: 'Backend languages run via Piston API. Ensure your device is online. If using Expo Go locally, make sure your backend server on port 3000 is reachable.',
  },
];

export default function ContactScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { from } = useLocalSearchParams<{ from?: string }>();

  // Navigation mode: 'options', 'form' (email), 'bug' (report a bug), 'chat' (live support)
  const [viewMode, setViewMode] = useState<'options' | 'form' | 'bug' | 'chat'>('options');

  // Contact Email Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Input refs for field navigation
  const nameInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const subjectInputRef = useRef<TextInput>(null);
  const messageInputRef = useRef<TextInput>(null);

  // Bug Report Form state
  const [bugTitle, setBugTitle] = useState('');
  const [bugSteps, setBugSteps] = useState('');
  const [isBugSubmitting, setIsBugSubmitting] = useState(false);

  // FAQ Modal state
  const [showFAQModal, setShowFAQModal] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  // Live Support Chat state
  const [messages, setMessages] = useState<Message[]>(INITIAL_SUPPORT_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Smooth sliding transition
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (viewMode === 'chat') {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages, viewMode, isTyping]);

  const navigateToView = (targetMode: 'options' | 'form' | 'bug' | 'chat') => {
    if (targetMode === viewMode) return;

    const isBacking = targetMode === 'options';
    const exitOffset = isBacking ? SCREEN_WIDTH * 0.35 : -SCREEN_WIDTH * 0.35;
    const enterOffset = isBacking ? -SCREEN_WIDTH * 0.35 : SCREEN_WIDTH * 0.35;

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: exitOffset,
        duration: 140,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.2,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setViewMode(targetMode);
      slideAnim.setValue(enterOffset);

      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleEmailSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter your name.');
      nameInputRef.current?.focus();
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      emailInputRef.current?.focus();
      return;
    }
    if (!message.trim()) {
      Alert.alert('Missing Message', 'Please describe your question or issue.');
      messageInputRef.current?.focus();
      return;
    }

    try {
      setSubmitStatus('loading');
      await api.contact.submit({
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim() || undefined,
        message: message.trim(),
      });
      setSubmitStatus('success');
      setTimeout(() => {
        Alert.alert(
          'Message Sent!',
          'Thank you! Your message has been sent to codeorbitofficiall@gmail.com and a confirmation has been sent to your email.',
          [
            {
              text: 'OK',
              onPress: () => {
                setName('');
                setEmail('');
                setSubject('');
                setMessage('');
                setSubmitStatus('idle');
                navigateToView('options');
              },
            },
          ]
        );
      }, 400);
    } catch (err: any) {
      setSubmitStatus('idle');
      Alert.alert(
        'Delivery Notice',
        err?.message || 'Could not send message automatically. You can email us directly at codeorbitofficiall@gmail.com'
      );
    }
  };

  const handleBugSubmit = async () => {
    if (!bugTitle.trim() || !bugSteps.trim()) {
      Alert.alert('Missing Fields', 'Please describe the bug title and steps to reproduce.');
      return;
    }
    try {
      setIsBugSubmitting(true);
      await api.contact.reportBug({
        bugTitle: bugTitle.trim(),
        bugSteps: bugSteps.trim(),
        platform: Platform.OS === 'ios' ? 'iOS App' : Platform.OS === 'android' ? 'Android App' : 'Web Client',
      });
      setIsBugSubmitting(false);
      Alert.alert(
        'Bug Report Submitted!',
        'Thank you! Your bug report has been delivered to codeorbitofficiall@gmail.com.',
        [
          {
            text: 'OK',
            onPress: () => {
              setBugTitle('');
              setBugSteps('');
              navigateToView('options');
            },
          },
        ]
      );
    } catch (err: any) {
      setIsBugSubmitting(false);
      Alert.alert(
        'Submission Notice',
        err?.message || 'Could not send report automatically. Please email codeorbitofficiall@gmail.com directly.'
      );
    }
  };

  const generateSupportResponse = (userMessage: string): string => {
    const lowerMsg = userMessage.toLowerCase();

    if (lowerMsg.includes('create') || lowerMsg.includes('session') || lowerMsg.includes('host') || lowerMsg.includes('start')) {
      return "🚀 **Creating a Live Coding Session:**\n\n1. Go to the **Home** tab and tap **Create Session**.\n2. Choose your language preset (e.g. Python, JS, Web, C++).\n3. Share the generated **6-letter Code** (e.g. `ABC123`) with your peers!";
    }

    if (lowerMsg.includes('language') || lowerMsg.includes('python') || lowerMsg.includes('javascript') || lowerMsg.includes('cpp')) {
      return "💻 **Supported Languages in CodeOrbit:**\n\n• **Web**: HTML, CSS, JavaScript (Live WebView preview & console)\n• **Python**: `main.py`\n• **JavaScript**: Node.js `index.js`\n• **TypeScript**: `index.ts`\n• **C / C++**: `main.c` / `main.cpp`\n• **Java**: `Main.java`\n\nExecution runs safely via Piston sandboxes.";
    }

    if (lowerMsg.includes('run') || lowerMsg.includes('execute') || lowerMsg.includes('output')) {
      return "⚙️ **How Code Execution Works:**\n\n1. Write code in the editor tab.\n2. Tap ▶️ **Run** in the header.\n3. Output renders in the **Console Output** panel in real time!";
    }

    if (lowerMsg.includes('guest') || lowerMsg.includes('login') || lowerMsg.includes('account')) {
      return "👤 **Guest Access:**\n\nGuest mode lets anyone join rooms instantly with a nickname! Creating an account saves past history.";
    }

    return "Thank you for reaching out! I'm your CodeOrbit Live Support Assistant.\n\nYou can ask me about:\n• Creating & joining coding rooms\n• Supported languages & Piston code execution\n• Troubleshooting connections";
  };

  const handleSend = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: messageText,
      isUser: true,
      timestamp: new Date(),
    };

    const botMsgId = (Date.now() + 1).toString();
    const initialBotMsg: Message = {
      id: botMsgId,
      text: '',
      isUser: false,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg, initialBotMsg]);
    setInputText('');
    setIsTyping(true);

    const historyPayload = messages.slice(-6).map((m) => ({
      id: m.id,
      text: m.text,
      isUser: m.isUser,
      timestamp: m.timestamp,
    }));

    try {
      let accumulated = '';
      await aiService.generateStream(
        messageText,
        historyPayload,
        (chunk: string) => {
          accumulated += chunk;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMsgId ? { ...msg, text: accumulated } : msg
            )
          );
        },
        undefined,
        'support'
      );
    } catch (err) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId
            ? {
                ...msg,
                text:
                  msg.text ||
                  generateSupportResponse(messageText),
              }
            : msg
        )
      );
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
    >
      {/* Top Header - Lighter, compact hierarchy */}
      <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + 8 : (Platform.OS === 'ios' ? 52 : 20) }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (viewMode !== 'options') {
              navigateToView('options');
            } else {
              if (from === 'home') {
                router.replace('/(main)/home');
              } else {
                router.replace('/(main)/profile');
              }
            }
          }}
          activeOpacity={0.75}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color="#E0E0E0" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {viewMode === 'chat'
            ? 'Live Support'
            : viewMode === 'form'
            ? 'Email Support'
            : viewMode === 'bug'
            ? 'Report a Bug'
            : 'Contact & Support'}
        </Text>

        {viewMode === 'chat' ? (
          <TouchableOpacity
            style={styles.headerAction}
            onPress={() => setMessages(INITIAL_SUPPORT_MESSAGES)}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={18} color={APP_COLORS.textSecondary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      {/* Animated Sliding Container */}
      <Animated.View
        style={{
          flex: 1,
          opacity: opacityAnim,
          transform: [{ translateX: slideAnim }],
        }}
      >
        {/* View 1: Main Contact Options List */}
        {viewMode === 'options' && (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Hero Section */}
            <View style={styles.heroSection}>
              <View style={styles.heroIconBox}>
                <Ionicons name="headset-outline" size={26} color="#EF4444" />
              </View>
              <Text style={styles.heroTitle}>How can we help?</Text>
              <Text style={styles.heroSubtitle}>
                Get help with your account, live sessions, or code execution.
              </Text>
            </View>

            {/* Section: SUPPORT */}
            <View style={styles.sectionGroup}>
              <Text style={styles.sectionGroupTitle}>SUPPORT</Text>

              {/* 1. Live Support Card */}
              <TouchableOpacity
                style={styles.liveSupportCard}
                onPress={() => navigateToView('chat')}
                activeOpacity={0.8}
              >
                <View style={styles.liveSupportIconBox}>
                  <Ionicons name="chatbubbles" size={22} color="#FFFFFF" />
                </View>
                <View style={styles.liveSupportContent}>
                  <View style={styles.liveBadgeRow}>
                    <Text style={styles.liveSupportTitle}>Live Support</Text>
                    <View style={styles.onlineBadge}>
                      <View style={styles.onlineDot} />
                      <Text style={styles.onlineBadgeText}>Online now</Text>
                    </View>
                  </View>
                  <Text style={styles.liveSupportSubtitle}>
                    App help, sessions, accounts & troubleshooting
                  </Text>

                  <View style={styles.replyTimeRow}>
                    <Ionicons name="time-outline" size={12} color={APP_COLORS.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.replyTimeText}>Usually replies in ~2 min</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#EF4444" />
              </TouchableOpacity>

              {/* 2. Email Support Card */}
              <TouchableOpacity
                style={styles.compactRowCard}
                onPress={() => navigateToView('form')}
                activeOpacity={0.75}
              >
                <View style={[styles.compactIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                  <Ionicons name="mail-outline" size={19} color="#3B82F6" />
                </View>
                <View style={styles.compactContent}>
                  <Text style={styles.compactTitle}>Email Support</Text>
                  <Text style={styles.compactSubtitle}>codeorbitofficiall@gmail.com</Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color="#777777" />
              </TouchableOpacity>

              {/* 3. Help Center / FAQ */}
              <TouchableOpacity
                style={styles.compactRowCard}
                onPress={() => setShowFAQModal(true)}
                activeOpacity={0.75}
              >
                <View style={[styles.compactIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                  <Ionicons name="help-circle-outline" size={19} color="#EF4444" />
                </View>
                <View style={styles.compactContent}>
                  <Text style={styles.compactTitle}>Help Center & FAQ</Text>
                  <Text style={styles.compactSubtitle}>Find answers to common questions</Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color="#777777" />
              </TouchableOpacity>

              {/* 4. Report a Bug */}
              <TouchableOpacity
                style={styles.compactRowCard}
                onPress={() => navigateToView('bug')}
                activeOpacity={0.75}
              >
                <View style={[styles.compactIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                  <Ionicons name="bug-outline" size={19} color="#EF4444" />
                </View>
                <View style={styles.compactContent}>
                  <Text style={styles.compactTitle}>Report a Bug</Text>
                  <Text style={styles.compactSubtitle}>Found an issue? Tell our engineering team</Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color="#777777" />
              </TouchableOpacity>
            </View>

            {/* App Version Footer */}
            <View style={styles.versionFooter}>
              <Text style={styles.versionFooterTitle}>CodeOrbit v1.0.0 (Build 42)</Text>
              <Text style={styles.versionFooterCopy}>© 2026 CodeOrbit Inc. All rights reserved.</Text>
            </View>
          </ScrollView>
        )}

        {/* View 2: Send Email Message Form - Clean Mobile UX */}
        {viewMode === 'form' && (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Compact Direct Email Card */}
            <TouchableOpacity
              style={styles.directEmailCard}
              onPress={() => Linking.openURL('mailto:codeorbitofficiall@gmail.com?subject=CodeOrbit%20Support')}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Email support directly"
            >
              <View style={styles.directEmailIconBox}>
                <Ionicons name="mail-outline" size={18} color="#3B82F6" />
              </View>
              <View style={styles.directEmailContent}>
                <Text style={styles.directEmailTitle}>Email Us Directly</Text>
                <Text style={styles.directEmailAddress}>codeorbitofficiall@gmail.com</Text>
              </View>
              <View style={styles.tapToEmailBadge}>
                <Text style={styles.tapToEmailText}>Tap to email</Text>
                <Ionicons name="chevron-forward" size={12} color="#8A8A8E" />
              </View>
            </TouchableOpacity>

            {/* Clean Form Card */}
            <View style={styles.formSection}>
              <Text style={styles.formTitle}>Send us a Message</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name *</Text>
                <TextInput
                  ref={nameInputRef}
                  style={styles.input}
                  placeholder="Your full name"
                  placeholderTextColor="#777777"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => emailInputRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address *</Text>
                <TextInput
                  ref={emailInputRef}
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor="#777777"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => subjectInputRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Subject</Text>
                <TextInput
                  ref={subjectInputRef}
                  style={styles.input}
                  placeholder="What can we help with?"
                  placeholderTextColor="#777777"
                  value={subject}
                  onChangeText={setSubject}
                  returnKeyType="next"
                  onSubmitEditing={() => messageInputRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Message *</Text>
                <TextInput
                  ref={messageInputRef}
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe your question or issue in detail..."
                  placeholderTextColor="#777777"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  submitStatus === 'loading' && styles.submitButtonLoading,
                  submitStatus === 'success' && styles.submitButtonSuccess,
                ]}
                onPress={handleEmailSubmit}
                disabled={submitStatus === 'loading' || submitStatus === 'success'}
                activeOpacity={0.85}
              >
                {submitStatus === 'loading' ? (
                  <View style={styles.btnContentRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.submitButtonText}>Sending...</Text>
                  </View>
                ) : submitStatus === 'success' ? (
                  <View style={styles.btnContentRow}>
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.submitButtonText}>Message Sent ✓</Text>
                  </View>
                ) : (
                  <Text style={styles.submitButtonText}>Send Message</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* View 3: Report a Bug Form */}
        {viewMode === 'bug' && (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.directEmailCard}>
              <View style={[styles.directEmailIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                <Ionicons name="bug" size={19} color="#EF4444" />
              </View>
              <View style={styles.directEmailContent}>
                <Text style={styles.directEmailTitle}>Report a Technical Bug</Text>
                <Text style={styles.directEmailAddress}>Help us fix issues and improve stability</Text>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formTitle}>Bug Details</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Issue Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Code output not updating in Web room"
                  placeholderTextColor="#777777"
                  value={bugTitle}
                  onChangeText={setBugTitle}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Steps to Reproduce *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="1. Open session room&#10;2. Click Run code button&#10;3. Observed error behavior..."
                  placeholderTextColor="#777777"
                  value={bugSteps}
                  onChangeText={setBugSteps}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, isBugSubmitting && styles.submitButtonLoading]}
                onPress={handleBugSubmit}
                disabled={isBugSubmitting}
                activeOpacity={0.85}
              >
                {isBugSubmitting ? (
                  <View style={styles.btnContentRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.submitButtonText}>Submitting Report...</Text>
                  </View>
                ) : (
                  <View style={styles.btnContentRow}>
                    <Ionicons name="bug" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.submitButtonText}>Submit Bug Report</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* View 4: Live Support Agent Chat */}
        {viewMode === 'chat' && (
          <View style={styles.chatContainer}>
            <ScrollView
              ref={scrollViewRef}
              style={styles.chatMessagesArea}
              contentContainerStyle={styles.chatContentContainer}
              showsVerticalScrollIndicator={false}
            >
              {messages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.messageWrapper,
                    msg.isUser ? styles.userMessageWrapper : styles.botMessageWrapper,
                  ]}
                >
                  {!msg.isUser && (
                    <View style={styles.botAvatarCircle}>
                      <Ionicons name="headset" size={14} color="#FFFFFF" />
                    </View>
                  )}
                  <View
                    style={[
                      styles.messageBubble,
                      msg.isUser ? styles.userBubble : styles.botBubble,
                      !msg.text && styles.typingBubble,
                    ]}
                  >
                    {!msg.text ? (
                      <Text style={styles.typingText}>Support is typing...</Text>
                    ) : (
                      <Text style={[styles.messageText, msg.isUser && styles.userMessageText]}>
                        {msg.text}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Support Quick Prompts Horizontal Scroll */}
            <View style={styles.promptsSection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promptsContainer}>
                {SUPPORT_QUICK_PROMPTS.map((prompt, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.promptChip}
                    onPress={() => handleSend(prompt)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.promptText}>{prompt}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Input Bar */}
            <View style={[styles.chatInputBar, { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 12 }]}>
              <TextInput
                style={styles.chatInput}
                placeholder="Ask support a question..."
                placeholderTextColor="#777777"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => handleSend()}
              />
              <TouchableOpacity
                style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                onPress={() => handleSend()}
                disabled={!inputText.trim()}
                activeOpacity={0.8}
              >
                <Ionicons name="send" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>

      {/* Help Center & FAQ Bottom Sheet */}
      <Modal
        visible={showFAQModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFAQModal(false)}
      >
        <View style={styles.faqModalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowFAQModal(false)}
          />
          <View style={[styles.faqBottomSheet, { paddingBottom: insets.bottom > 0 ? insets.bottom + 16 : 24 }]}>
            <View style={styles.dragBar} />

            <View style={styles.faqHeader}>
              <View style={styles.faqHeaderTitleRow}>
                <View style={styles.faqRedIconBox}>
                  <Ionicons name="help-circle" size={17} color="#EF4444" />
                </View>
                <Text style={styles.faqTitle}>Help Center & FAQ</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowFAQModal(false)}
                style={styles.faqCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Close Help Center"
              >
                <Ionicons name="close" size={20} color="#9A9A9A" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.faqScrollView}
              contentContainerStyle={styles.faqScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {FAQ_ITEMS.map((item, idx) => {
                const isExpanded = expandedFAQ === idx;
                return (
                  <View key={idx} style={styles.faqItem}>
                    <TouchableOpacity
                      style={styles.faqQuestionRow}
                      onPress={() => setExpandedFAQ(isExpanded ? null : idx)}
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityLabel={item.question}
                    >
                      <Text style={styles.faqQuestionText}>{item.question}</Text>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={17}
                        color={isExpanded ? '#EF4444' : '#8A8A8E'}
                      />
                    </TouchableOpacity>
                    {isExpanded && (
                      <Text style={styles.faqAnswerText}>{item.answer}</Text>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
    paddingTop: Platform.OS === 'ios' ? 52 : 40,
    paddingBottom: 10,
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
  headerAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#262628',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 18,
  },
  heroIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F5F5F5',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#9A9A9A',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  sectionGroup: {
    marginBottom: 18,
  },
  sectionGroupTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#777777',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  liveSupportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202022',
    borderRadius: 18,
    padding: 15,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.40)',
    marginBottom: 10,
  },
  liveSupportIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  liveSupportContent: {
    flex: 1,
  },
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  liveSupportTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#F5F5F5',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  onlineDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  onlineBadgeText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#10B981',
  },
  liveSupportSubtitle: {
    fontSize: 12,
    color: '#9A9A9A',
    marginBottom: 3,
  },
  replyTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyTimeText: {
    fontSize: 11,
    fontWeight: '600',
    color: APP_COLORS.primary,
  },
  compactRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202022',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#2E2E32',
    marginBottom: 8,
  },
  compactIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F5F5F5',
    marginBottom: 1,
  },
  compactSubtitle: {
    fontSize: 12,
    color: '#9A9A9A',
  },
  versionFooter: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  versionFooterTitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#8A8A8E',
    marginBottom: 2,
  },
  versionFooterCopy: {
    fontSize: 11,
    color: '#666666',
  },

  // Compact Direct Email Card
  directEmailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202022',
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: '#2E2E32',
    marginBottom: 14,
  },
  directEmailIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  directEmailContent: {
    flex: 1,
  },
  directEmailTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#F5F5F5',
  },
  directEmailAddress: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  tapToEmailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  tapToEmailText: {
    fontSize: 11.5,
    color: '#8A8A8E',
    fontWeight: '500',
  },

  // Form Section Card
  formSection: {
    backgroundColor: '#202022',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2E2E32',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F5F5F5',
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#D0D0D0',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#171717',
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 14,
    color: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#2C2C30',
  },
  textArea: {
    height: 125,
    paddingTop: 10,
  },
  submitButton: {
    backgroundColor: APP_COLORS.primary,
    borderRadius: 13,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  submitButtonLoading: {
    opacity: 0.75,
  },
  submitButtonSuccess: {
    backgroundColor: '#10B981',
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },

  // Live Chat
  chatContainer: {
    flex: 1,
    backgroundColor: '#171717',
  },
  chatMessagesArea: {
    flex: 1,
  },
  chatContentContainer: {
    padding: 16,
    gap: 12,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  userMessageWrapper: {
    justifyContent: 'flex-end',
  },
  botMessageWrapper: {
    justifyContent: 'flex-start',
  },
  botAvatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#DC2626',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#202022',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#2E2E32',
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 19,
    color: '#F5F5F5',
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  typingBubble: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  typingText: {
    fontSize: 12,
    color: '#9A9A9A',
    fontStyle: 'italic',
  },
  promptsSection: {
    maxHeight: 44,
    backgroundColor: '#171717',
    borderTopWidth: 1,
    borderTopColor: '#242424',
  },
  promptsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  promptChip: {
    backgroundColor: '#202022',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2E2E32',
  },
  promptText: {
    fontSize: 12,
    color: '#9A9A9A',
    fontWeight: '500',
  },
  chatInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#1C1C1E',
    borderTopWidth: 1,
    borderTopColor: '#28282A',
  },
  chatInput: {
    flex: 1,
    height: 38,
    backgroundColor: '#171717',
    borderRadius: 19,
    paddingHorizontal: 14,
    fontSize: 13.5,
    color: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#2E2E32',
    marginRight: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },

  // FAQ Bottom Sheet
  faqModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.40)',
    justifyContent: 'flex-end',
  },
  faqBottomSheet: {
    backgroundColor: '#1E1E22',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    maxHeight: '75%',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  dragBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#444448',
    alignSelf: 'center',
    marginBottom: 14,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#28282C',
    marginBottom: 4,
  },
  faqHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  faqRedIconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F5F5F5',
  },
  faqCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#26262A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqScrollView: {
    maxHeight: 380,
  },
  faqScrollContent: {
    paddingVertical: 4,
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#26262A',
    paddingVertical: 12,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 46,
    paddingVertical: 4,
  },
  faqQuestionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F5F5F5',
    flex: 1,
    marginRight: 12,
    lineHeight: 19,
  },
  faqAnswerText: {
    fontSize: 13,
    color: '#A0A0A5',
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 4,
  },
});
