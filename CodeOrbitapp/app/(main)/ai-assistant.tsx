import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Clipboard,
  Alert,
  Modal,
  Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { APP_COLORS } from '../../constants';
import { aiService } from '../../services/aiService';

// AI Theme Design Tokens
const AI_THEME = {
  background: '#171717',
  surface: '#242424',
  surfaceSubtle: '#1C1C1E',
  border: '#303030',
  borderSubtle: '#262626',
  aiPurple: '#9B4DFF',
  aiPurpleBorder: 'rgba(155, 77, 255, 0.45)',
  aiPurpleSubtle: 'rgba(155, 77, 255, 0.12)',
  primaryRed: '#FF3B3B',
  textPrimary: '#F5F5F5',
  textSecondary: '#9A9A9A',
  codeBackground: '#121212',
  codeBorder: '#2A2A2A',
  success: '#22C55E',
};

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const QUICK_SUGGESTIONS = [
  { id: '1', label: 'Explain code', prompt: 'Can you explain how this code or algorithm works step-by-step?' },
  { id: '2', label: 'Debug error', prompt: 'Help me debug this error: ' },
  { id: '3', label: 'Optimize code', prompt: 'How can I optimize this function for better time and memory complexity?' },
];

export default function AIAssistantScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const handleBack = useCallback(() => {
    Keyboard.dismiss();
    if (from === 'profile') {
      router.replace('/(main)/profile');
    } else {
      router.replace('/(main)/home');
    }
  }, [from, router]);

  const handleNewChat = useCallback(() => {
    Keyboard.dismiss();
    if (messages.length === 0) return;

    Alert.alert(
      'New Conversation',
      'Start a new coding conversation? Your current session will be cleared.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'New Chat',
          style: 'destructive',
          onPress: () => {
            setMessages([]);
            setInputText('');
          },
        },
      ]
    );
  }, [messages.length]);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, isTyping]);

  const handleCopyCode = useCallback((codeContent: string, blockId: string) => {
    try {
      Clipboard.setString(codeContent.trim());
      setCopiedCodeId(blockId);
      setTimeout(() => {
        setCopiedCodeId(null);
      }, 2000);
    } catch {}
  }, []);

  const handleSend = useCallback(
    async (textToSend?: string) => {
      const prompt = (textToSend || inputText).trim();
      if (!prompt || isTyping) return;

      const userMsg: Message = {
        id: 'msg_user_' + Date.now(),
        text: prompt,
        isUser: true,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputText('');
      setIsTyping(true);

      try {
        const responseText = await aiService.generateResponse(prompt, []);
        const aiMsg: Message = {
          id: 'msg_ai_' + Date.now(),
          text: responseText,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } catch (err) {
        const errorMsg: Message = {
          id: 'msg_err_' + Date.now(),
          text: "I couldn't complete that request. Please check your network connection and try again.",
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsTyping(false);
      }
    },
    [inputText, isTyping]
  );

  const handleSelectSuggestion = useCallback(
    (promptText: string) => {
      handleSend(promptText);
    },
    [handleSend]
  );

  const handleInsertTemplate = useCallback((template: string) => {
    setShowOptionsModal(false);
    setInputText((prev) => (prev ? `${prev}\n${template}` : template));
    inputRef.current?.focus();
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
    >
      {/* 1. Minimal Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={22} color={AI_THEME.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>CodeOrbit AI</Text>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleNewChat}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="New Chat"
        >
          <Ionicons name="add" size={24} color={AI_THEME.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* 2. Messages / Welcome Area */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.feed}
        contentContainerStyle={styles.feedContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 ? (
          /* Minimal Initial Welcome Presentation */
          <View style={styles.welcomeContainer}>
            {/* AI Identifier Header */}
            <View style={styles.welcomeAiRow}>
              <Ionicons name="sparkles" size={18} color={AI_THEME.aiPurple} style={{ marginRight: 8 }} />
              <Text style={styles.welcomeAiTitle}>CodeOrbit AI</Text>
            </View>

            {/* Conversational Greeting Typography */}
            <Text style={styles.welcomeHeading}>Hey! I'm your coding assistant.</Text>
            <Text style={styles.welcomeSubtext}>
              I can help you explain, debug, refactor, and write code.
            </Text>
            <Text style={styles.welcomeQuestion}>What are we working on?</Text>

            {/* Minimal Suggestions Section */}
            <View style={styles.suggestionsSection}>
              <Text style={styles.suggestionsLabel}>Try asking</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestionsScrollContent}
              >
                {QUICK_SUGGESTIONS.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.suggestionChip}
                    onPress={() => handleSelectSuggestion(item.prompt)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name="code-slash"
                      size={13}
                      color={AI_THEME.aiPurple}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.suggestionChipText}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        ) : (
          /* Active Chat Thread */
          messages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              copiedCodeId={copiedCodeId}
              onCopyCode={handleCopyCode}
            />
          ))
        )}

        {/* Subtle Typing Indicator */}
        {isTyping && (
          <View style={styles.aiMessageWrapper}>
            <View style={styles.aiHeaderRow}>
              <Ionicons name="sparkles" size={13} color={AI_THEME.aiPurple} style={{ marginRight: 6 }} />
              <Text style={styles.aiHeaderTitle}>CodeOrbit AI</Text>
            </View>
            <View style={styles.typingContainer}>
              <View style={styles.typingDot} />
              <View style={[styles.typingDot, styles.typingDotMiddle]} />
              <View style={styles.typingDot} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* 3. Hero Composer Interaction */}
      <View style={styles.composerWrapper}>
        <View style={styles.composerCard}>
          {/* Plus Action for Templates/Snippets */}
          <TouchableOpacity
            style={styles.composerAddButton}
            onPress={() => setShowOptionsModal(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Add code snippet"
          >
            <Ionicons name="add" size={20} color={AI_THEME.textSecondary} />
          </TouchableOpacity>

          {/* Text Input */}
          <TextInput
            ref={inputRef}
            style={styles.composerInput}
            placeholder="Ask a coding question..."
            placeholderTextColor={AI_THEME.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            autoCapitalize="sentences"
            autoCorrect={false}
          />

          {/* Purple Send Button */}
          <TouchableOpacity
            style={[
              styles.sendButton,
              inputText.trim().length === 0 || isTyping ? styles.sendButtonDisabled : styles.sendButtonActive,
            ]}
            onPress={() => handleSend()}
            disabled={inputText.trim().length === 0 || isTyping}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            <Ionicons
              name="arrow-up"
              size={18}
              color={inputText.trim().length > 0 && !isTyping ? '#FFFFFF' : '#737373'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Options & Snippets Sheet */}
      <Modal
        visible={showOptionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Quick Snippet Actions</Text>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleInsertTemplate('```typescript\n// Paste your code here\n\n```')}
            >
              <Ionicons name="code" size={18} color={AI_THEME.aiPurple} style={{ marginRight: 12 }} />
              <Text style={styles.modalOptionText}>Insert TypeScript/JS Block</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleInsertTemplate('```python\n# Paste Python function\n\n```')}
            >
              <Ionicons name="logo-python" size={18} color={AI_THEME.aiPurple} style={{ marginRight: 12 }} />
              <Text style={styles.modalOptionText}>Insert Python Block</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalOption, { borderBottomWidth: 0 }]}
              onPress={() => {
                setShowOptionsModal(false);
                setMessages([]);
              }}
            >
              <Ionicons name="trash-outline" size={18} color={AI_THEME.primaryRed} style={{ marginRight: 12 }} />
              <Text style={[styles.modalOptionText, { color: AI_THEME.primaryRed }]}>Clear Conversation</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ----------------------------------------------------
// Message Item Component with Minimal Code Block Layout
// ----------------------------------------------------
interface MessageItemProps {
  message: Message;
  copiedCodeId: string | null;
  onCopyCode: (code: string, blockId: string) => void;
}

const MessageItem = React.memo(function MessageItem({
  message,
  copiedCodeId,
  onCopyCode,
}: MessageItemProps) {
  if (message.isUser) {
    return (
      <View style={styles.userMessageRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.text}</Text>
        </View>
      </View>
    );
  }

  // Parse markdown code blocks in AI message
  const segments = useMemo(() => {
    const raw = message.text;
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const parts: Array<{ type: 'text' | 'code'; content: string; language?: string; id?: string }> = [];

    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let blockIndex = 0;

    while ((match = codeBlockRegex.exec(raw)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: raw.substring(lastIndex, match.index),
        });
      }
      parts.push({
        type: 'code',
        language: match[1] || 'code',
        content: match[2] || '',
        id: `${message.id}_block_${blockIndex++}`,
      });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < raw.length) {
      parts.push({
        type: 'text',
        content: raw.substring(lastIndex),
      });
    }

    return parts.length > 0 ? parts : [{ type: 'text' as const, content: raw }];
  }, [message.text, message.id]);

  return (
    <View style={styles.aiMessageWrapper}>
      {/* Minimal Header */}
      <View style={styles.aiHeaderRow}>
        <Ionicons name="sparkles" size={13} color={AI_THEME.aiPurple} style={{ marginRight: 6 }} />
        <Text style={styles.aiHeaderTitle}>CodeOrbit AI</Text>
      </View>

      {/* Unboxed Content Body */}
      <View style={styles.aiBody}>
        {segments.map((seg, idx) => {
          if (seg.type === 'code' && seg.id) {
            const isCopied = copiedCodeId === seg.id;
            return (
              <View key={seg.id || idx} style={styles.codeBlock}>
                {/* Code Block Header */}
                <View style={styles.codeBlockHeader}>
                  <Text style={styles.codeLanguageLabel}>{(seg.language || 'code').toUpperCase()}</Text>
                  <TouchableOpacity
                    style={styles.codeCopyButton}
                    onPress={() => onCopyCode(seg.content, seg.id!)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isCopied ? 'checkmark' : 'copy-outline'}
                      size={13}
                      color={isCopied ? AI_THEME.success : AI_THEME.textSecondary}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.codeCopyText,
                        isCopied && { color: AI_THEME.success, fontWeight: '700' },
                      ]}
                    >
                      {isCopied ? 'Copied' : 'Copy'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Code Content */}
                <Text style={styles.codeText}>{seg.content.replace(/\n$/, '')}</Text>
              </View>
            );
          }

          // Format bullet points and text cleanly
          const cleanText = seg.content.trim();
          if (!cleanText) return null;

          return (
            <Text key={idx} style={styles.aiText}>
              {cleanText}
            </Text>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AI_THEME.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 14,
    backgroundColor: AI_THEME.background,
    borderBottomWidth: 1,
    borderBottomColor: AI_THEME.borderSubtle,
  },
  headerButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: AI_THEME.surface,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: AI_THEME.textPrimary,
    letterSpacing: -0.2,
  },

  // Feed Area
  feed: {
    flex: 1,
  },
  feedContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },

  // Welcome State
  welcomeContainer: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  welcomeAiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeAiTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: AI_THEME.aiPurple,
    letterSpacing: 0.2,
  },
  welcomeHeading: {
    fontSize: 22,
    fontWeight: '700',
    color: AI_THEME.textPrimary,
    lineHeight: 28,
    marginBottom: 8,
  },
  welcomeSubtext: {
    fontSize: 15,
    color: AI_THEME.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  welcomeQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: AI_THEME.textPrimary,
    marginBottom: 28,
  },

  // Suggestions
  suggestionsSection: {
    marginTop: 8,
  },
  suggestionsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: AI_THEME.textSecondary,
    marginBottom: 12,
  },
  suggestionsScrollContent: {
    paddingRight: 28,
    gap: 10,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: AI_THEME.surface,
    borderWidth: 1,
    borderColor: AI_THEME.aiPurpleBorder,
  },
  suggestionChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: AI_THEME.textPrimary,
  },

  // User Message Bubble
  userMessageRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  userBubble: {
    maxWidth: '82%',
    backgroundColor: AI_THEME.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderTopRightRadius: 4,
    borderWidth: 1,
    borderColor: AI_THEME.border,
  },
  userText: {
    fontSize: 15,
    color: AI_THEME.textPrimary,
    lineHeight: 21,
  },

  // AI Message Container
  aiMessageWrapper: {
    marginBottom: 24,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: AI_THEME.aiPurple,
  },
  aiBody: {
    paddingLeft: 2,
  },
  aiText: {
    fontSize: 15,
    color: AI_THEME.textPrimary,
    lineHeight: 23,
    marginBottom: 12,
  },

  // Code Block Container
  codeBlock: {
    backgroundColor: AI_THEME.codeBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AI_THEME.codeBorder,
    marginVertical: 10,
    overflow: 'hidden',
  },
  codeBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1C1C1E',
    borderBottomWidth: 1,
    borderBottomColor: AI_THEME.codeBorder,
  },
  codeLanguageLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: AI_THEME.textSecondary,
    letterSpacing: 0.5,
  },
  codeCopyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: AI_THEME.surface,
  },
  codeCopyText: {
    fontSize: 12,
    color: AI_THEME.textSecondary,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 19,
    padding: 14,
  },

  // Typing Dots
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AI_THEME.aiPurple,
    opacity: 0.4,
  },
  typingDotMiddle: {
    opacity: 0.8,
  },

  // Composer Wrapper & Card (Hero Interaction)
  composerWrapper: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    backgroundColor: AI_THEME.background,
  },
  composerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AI_THEME.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: AI_THEME.border,
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 6,
    minHeight: 56,
  },
  composerAddButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    backgroundColor: 'transparent',
  },
  composerInput: {
    flex: 1,
    fontSize: 15,
    color: AI_THEME.textPrimary,
    paddingVertical: 8,
    paddingHorizontal: 4,
    maxHeight: 100,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  sendButtonActive: {
    backgroundColor: AI_THEME.aiPurple,
  },
  sendButtonDisabled: {
    backgroundColor: '#303030',
  },

  // Options Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: AI_THEME.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderWidth: 1,
    borderColor: AI_THEME.border,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: AI_THEME.textPrimary,
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: AI_THEME.borderSubtle,
  },
  modalOptionText: {
    fontSize: 15,
    color: AI_THEME.textPrimary,
    fontWeight: '500',
  },
});
