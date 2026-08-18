import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Clipboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { APP_COLORS } from '../../constants';
import { useMessageStore, ThreadMessage } from '../../store/messageStore';

export default function ChatThreadScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    avatar?: string;
    color?: string;
    status?: string;
  }>();

  const chatId = params.id || '5';
  const contactName = params.name || 'Kathy Gomez';
  const contactAvatar = params.avatar || 'K';
  const contactColor = params.color || '#FF453A';
  const contactStatus = params.status || 'Online';

  const {
    messagesByChat,
    sendMessage,
    editMessage,
    unsendMessage,
    markAsRead,
    clearChatHistory,
    deleteChat,
    initializeStore,
  } = useMessageStore();

  const [inputText, setInputText] = useState('');
  const [editingMessage, setEditingMessage] = useState<ThreadMessage | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<ThreadMessage | null>(null);
  const [showOptionsSheet, setShowOptionsSheet] = useState(false);
  const [showAttachSheet, setShowAttachSheet] = useState(false);
  const [showCodeSnippetModal, setShowCodeSnippetModal] = useState(false);
  const [snippetLanguage, setSnippetLanguage] = useState('javascript');
  const [snippetCode, setSnippetCode] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const swipeableMsgRefs = useRef<Map<string, Swipeable>>(new Map());
  const botTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeStore();
    markAsRead(chatId);
  }, [chatId, initializeStore, markAsRead]);

  const messages: ThreadMessage[] = messagesByChat[chatId] || [];

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages.length, messagesByChat]);

  useEffect(() => {
    return () => {
      if (botTimerRef.current) {
        clearTimeout(botTimerRef.current);
      }
    };
  }, []);

  const handleSendOrSaveMessage = () => {
    const text = inputText.trim();
    if (!text) return;

    if (editingMessage) {
      editMessage(chatId, editingMessage.id, text);
      setEditingMessage(null);
      setInputText('');
      return;
    }

    const replyData = replyToMessage
      ? {
          id: replyToMessage.id,
          text: replyToMessage.text,
          senderName: replyToMessage.isUser ? 'You' : contactName,
        }
      : undefined;

    sendMessage(chatId, text, true, replyData, 'text');
    setInputText('');
    setReplyToMessage(null);

    // Simulate contact typing & automated response
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    botTimerRef.current = setTimeout(() => {
      const replies = [
        'Awesome, let me know when you get here!',
        'Got it! Looking forward to working together.',
        'Sounds good to me 👍',
        'Let me check and get back to you in a minute.',
        'Thanks for reaching out! I will review this shortly.',
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      sendMessage(chatId, randomReply, false);
    }, 1200);
  };

  const handleSendCodeSnippet = () => {
    const code = snippetCode.trim();
    if (!code) return;

    sendMessage(chatId, code, true, undefined, 'code', snippetLanguage);
    setSnippetCode('');
    setShowCodeSnippetModal(false);
  };

  const handleCopyCode = (id: string, code: string) => {
    try {
      Clipboard.setString(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const handleBack = () => {
    router.replace('/(main)/messages');
  };

  // Safe Options Modal Actions with confirmations
  const handleConfirmClearMessages = () => {
    setShowOptionsSheet(false);
    Alert.alert(
      'Clear messages?',
      'All messages in this conversation will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => clearChatHistory(chatId),
        },
      ]
    );
  };

  const handleConfirmDeleteConversation = () => {
    setShowOptionsSheet(false);
    Alert.alert(
      'Delete conversation?',
      'This will remove the conversation and history from your chat list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteChat(chatId);
            router.replace('/(main)/messages');
          },
        },
      ]
    );
  };

  const handleMessageLongPress = (msg: ThreadMessage) => {
    const options: any[] = [
      {
        text: 'Reply',
        onPress: () => {
          setEditingMessage(null);
          setReplyToMessage(msg);
        },
      },
    ];

    if (msg.type === 'code') {
      options.push({
        text: 'Copy Code',
        onPress: () => handleCopyCode(msg.id, msg.text),
      });
    }

    if (msg.isUser) {
      options.push(
        {
          text: 'Edit Message',
          onPress: () => {
            setReplyToMessage(null);
            setEditingMessage(msg);
            setInputText(msg.text);
          },
        },
        {
          text: 'Unsend Message',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Unsend Message', 'Are you sure you want to unsend this message?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Unsend',
                style: 'destructive',
                onPress: () => unsendMessage(chatId, msg.id),
              },
            ]);
          },
        }
      );
    }

    options.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert('Message Options', msg.type === 'code' ? 'Code snippet' : msg.text, options, {
      cancelable: true,
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* 1. Header Bar */}
      <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + 8 : (Platform.OS === 'ios' ? 52 : 20) }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={21} color="#E0E0E0" />
        </TouchableOpacity>

        <View style={styles.headerContactBox}>
          <View style={[styles.avatarBox, { backgroundColor: contactColor }]}>
            <Text style={styles.avatarText}>{contactAvatar}</Text>
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactName} numberOfLines={1}>
              {contactName}
            </Text>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: contactStatus === 'Online' ? '#22C55E' : '#6E6E73' },
                ]}
              />
              <Text style={styles.contactStatus}>{contactStatus}</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={() => Alert.alert('Voice Call', `Calling ${contactName}...`)}
            activeOpacity={0.8}
            accessibilityLabel="Voice Call"
          >
            <Ionicons name="call-outline" size={19} color="#E0E0E0" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={() => setShowOptionsSheet(true)}
            activeOpacity={0.8}
            accessibilityLabel="Conversation Options"
          >
            <Ionicons name="ellipsis-vertical" size={19} color="#E0E0E0" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Chat Messages Stream */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dateDivider}>
          <Text style={styles.dateDividerText}>TODAY</Text>
        </View>

        {messages.length === 0 ? (
          <View style={styles.emptyMessagesBox}>
            <Text style={styles.emptyMessagesText}>No messages yet. Send a message to start!</Text>
          </View>
        ) : (
          messages.map((msg) => (
            <MessageBubbleItem
              key={msg.id}
              msg={msg}
              isEditing={editingMessage?.id === msg.id}
              onLongPress={handleMessageLongPress}
              onCopyCode={handleCopyCode}
              isCopied={copiedId === msg.id}
              registerSwipeable={(ref) => {
                if (ref) swipeableMsgRefs.current.set(msg.id, ref);
                else swipeableMsgRefs.current.delete(msg.id);
              }}
              onSwipeReply={() => {
                swipeableMsgRefs.current.get(msg.id)?.close();
                setEditingMessage(null);
                setReplyToMessage(msg);
              }}
            />
          ))
        )}
      </ScrollView>

      {/* 3. Editing/Replying State Banners */}
      {editingMessage && (
        <View style={styles.bannerContainer}>
          <View style={styles.bannerContent}>
            <Ionicons name="create-outline" size={16} color={APP_COLORS.primary} />
            <Text style={styles.bannerTitle}>Editing message</Text>
          </View>
          <TouchableOpacity onPress={() => setEditingMessage(null)}>
            <Ionicons name="close-circle" size={20} color={APP_COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {replyToMessage && (
        <View style={styles.bannerContainer}>
          <View style={styles.bannerContent}>
            <Ionicons name="arrow-undo" size={16} color={APP_COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>
                Replying to {replyToMessage.isUser ? 'You' : contactName}
              </Text>
              <Text style={styles.bannerSubtitle} numberOfLines={1}>
                {replyToMessage.text}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setReplyToMessage(null)}>
            <Ionicons name="close-circle" size={20} color={APP_COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* 4. Developer Composer */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : (Platform.OS === 'ios' ? 24 : 12) }]}>
        <View style={styles.inputBarWrapper}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={() => setShowAttachSheet(true)}
            activeOpacity={0.75}
            accessibilityLabel="Attachments and code"
          >
            <Ionicons name="add" size={22} color="#F5F5F5" />
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder={
              editingMessage
                ? 'Edit your message...'
                : replyToMessage
                ? 'Write a reply...'
                : 'Type a message...'
            }
            placeholderTextColor="#777777"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              inputText.trim() ? styles.sendButtonActive : styles.sendButtonDisabled,
            ]}
            onPress={handleSendOrSaveMessage}
            disabled={!inputText.trim()}
            activeOpacity={0.85}
          >
            <Ionicons
              name={editingMessage ? 'checkmark' : 'arrow-up'}
              size={18}
              color={inputText.trim() ? '#FFFFFF' : '#777777'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* 5. Conversation Options Bottom Sheet */}
      <Modal
        visible={showOptionsSheet}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOptionsSheet(false)}
      >
        <View style={styles.transparentRoot}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setShowOptionsSheet(false)}
          />
          <View style={[styles.bottomSheet, { paddingBottom: insets.bottom > 0 ? insets.bottom + 16 : 24 }]}>
            <View style={styles.dragBar} />

            <View style={styles.optionsHeader}>
              <View style={[styles.optionsAvatar, { backgroundColor: contactColor }]}>
                <Text style={styles.optionsAvatarText}>{contactAvatar}</Text>
              </View>
              <Text style={styles.optionsContactName}>{contactName}</Text>
              <Text style={styles.optionsSubTitle}>Conversation options</Text>
            </View>

            <TouchableOpacity
              style={styles.optionRow}
              onPress={handleConfirmClearMessages}
              activeOpacity={0.75}
            >
              <View style={styles.optionIconCircle}>
                <Ionicons name="refresh-outline" size={20} color="#F5F5F5" />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Clear messages</Text>
                <Text style={styles.optionDescription}>
                  Remove all messages from this conversation
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionRow}
              onPress={handleConfirmDeleteConversation}
              activeOpacity={0.75}
            >
              <View style={[styles.optionIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: '#EF4444' }]}>Delete conversation</Text>
                <Text style={styles.optionDescription}>
                  Remove this conversation from your chats
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionsCancelBtn}
              onPress={() => setShowOptionsSheet(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.optionsCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 6. Attachments Sheet (+ Button) */}
      <Modal
        visible={showAttachSheet}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAttachSheet(false)}
      >
        <View style={styles.transparentRoot}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setShowAttachSheet(false)}
          />
          <View style={[styles.bottomSheet, { paddingBottom: insets.bottom > 0 ? insets.bottom + 16 : 24 }]}>
            <View style={styles.dragBar} />
            <Text style={styles.attachHeading}>Share to conversation</Text>

            <View style={styles.attachGrid}>
              <TouchableOpacity
                style={styles.attachGridItem}
                onPress={() => {
                  setShowAttachSheet(false);
                  setShowCodeSnippetModal(true);
                }}
              >
                <View style={[styles.attachGridIcon, { backgroundColor: 'rgba(155, 77, 255, 0.15)' }]}>
                  <Ionicons name="code-slash" size={24} color="#9B4DFF" />
                </View>
                <Text style={styles.attachGridLabel}>Code Snippet</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.attachGridItem}
                onPress={() => {
                  setShowAttachSheet(false);
                  Alert.alert('Send File', 'File browser integration ready.');
                }}
              >
                <View style={[styles.attachGridIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                  <Ionicons name="document-text" size={24} color="#3B82F6" />
                </View>
                <Text style={styles.attachGridLabel}>File</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.attachGridItem}
                onPress={() => {
                  setShowAttachSheet(false);
                  Alert.alert('Send Photo', 'Photo gallery integration ready.');
                }}
              >
                <View style={[styles.attachGridIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Ionicons name="image" size={24} color="#10B981" />
                </View>
                <Text style={styles.attachGridLabel}>Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 7. Code Snippet Modal */}
      <Modal
        visible={showCodeSnippetModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCodeSnippetModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.snippetOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.snippetCard}>
            <View style={styles.snippetHeader}>
              <View style={styles.snippetTitleGroup}>
                <Ionicons name="code-slash" size={18} color="#9B4DFF" />
                <Text style={styles.snippetTitle}>Send Code Snippet</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCodeSnippetModal(false)}>
                <Ionicons name="close" size={20} color={APP_COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Language Selector Chips */}
            <View style={styles.langSelectorRow}>
              {['javascript', 'python', 'typescript', 'html'].map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={[styles.langChip, snippetLanguage === lang && styles.langChipActive]}
                  onPress={() => setSnippetLanguage(lang)}
                >
                  <Text style={[styles.langChipText, snippetLanguage === lang && styles.langChipTextActive]}>
                    {lang}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.snippetInput}
              placeholder="// Paste or write code snippet here..."
              placeholderTextColor="#666666"
              value={snippetCode}
              onChangeText={setSnippetCode}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.snippetActionsRow}>
              <TouchableOpacity
                style={styles.snippetCancelBtn}
                onPress={() => setShowCodeSnippetModal(false)}
              >
                <Text style={styles.snippetCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.snippetSendBtn, !snippetCode.trim() && styles.snippetSendBtnDisabled]}
                onPress={handleSendCodeSnippet}
                disabled={!snippetCode.trim()}
              >
                <Text style={styles.snippetSendText}>Send Code</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

interface MessageBubbleItemProps {
  msg: ThreadMessage;
  isEditing: boolean;
  onLongPress: (msg: ThreadMessage) => void;
  onCopyCode: (id: string, code: string) => void;
  isCopied: boolean;
  registerSwipeable: (ref: Swipeable | null) => void;
  onSwipeReply: () => void;
}

const MessageBubbleItem = React.memo(function MessageBubbleItem({
  msg,
  isEditing,
  onLongPress,
  onCopyCode,
  isCopied,
  registerSwipeable,
  onSwipeReply,
}: MessageBubbleItemProps) {
  const isCode = msg.type === 'code';

  return (
    <Swipeable
      ref={registerSwipeable}
      friction={1.5}
      leftThreshold={25}
      rightThreshold={25}
      overshootLeft={false}
      overshootRight={false}
      onSwipeableWillOpen={onSwipeReply}
      renderLeftActions={
        !msg.isUser
          ? () => (
              <View style={styles.replySwipeAction}>
                <Ionicons name="arrow-undo" size={18} color={APP_COLORS.primary} />
              </View>
            )
          : undefined
      }
      renderRightActions={
        msg.isUser
          ? () => (
              <View style={styles.replySwipeAction}>
                <Ionicons name="arrow-undo" size={18} color={APP_COLORS.primary} />
              </View>
            )
          : undefined
      }
    >
      <View style={[styles.messageRow, msg.isUser ? styles.userRow : styles.otherRow]}>
        <TouchableOpacity
          activeOpacity={0.9}
          onLongPress={() => onLongPress(msg)}
          style={[
            styles.messageBubble,
            msg.isUser ? styles.userBubble : styles.otherBubble,
            isCode && styles.codeMessageBubble,
            isEditing && styles.editingMessageBubble,
          ]}
        >
          {msg.replyTo && (
            <View
              style={[
                styles.replyQuotedBox,
                msg.isUser ? styles.userReplyQuotedBox : styles.otherReplyQuotedBox,
              ]}
            >
              <Text style={styles.replySenderText}>{msg.replyTo.senderName}</Text>
              <Text style={styles.replyContentText} numberOfLines={2}>
                {msg.replyTo.text}
              </Text>
            </View>
          )}

          {isCode ? (
            <View style={styles.codeSnippetContainer}>
              <View style={styles.codeSnippetHeader}>
                <Text style={styles.codeSnippetLang}>{(msg.codeLanguage || 'code').toUpperCase()}</Text>
                <TouchableOpacity
                  onPress={() => onCopyCode(msg.id, msg.text)}
                  style={styles.codeCopyBtn}
                >
                  <Ionicons
                    name={isCopied ? 'checkmark' : 'copy-outline'}
                    size={14}
                    color={isCopied ? '#22C55E' : '#9A9A9A'}
                  />
                  <Text style={[styles.codeCopyText, isCopied && { color: '#22C55E' }]}>
                    {isCopied ? 'Copied' : 'Copy'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.codeSnippetText}>{msg.text}</Text>
            </View>
          ) : (
            <Text
              style={[
                styles.messageText,
                msg.isUser ? styles.userMessageText : styles.otherMessageText,
              ]}
            >
              {msg.text}
            </Text>
          )}

          <Text
            style={[styles.timestamp, msg.isUser ? styles.userTimestamp : styles.otherTimestamp]}
          >
            {msg.time}
            {msg.isEdited ? ' • edited' : ''}
          </Text>
        </TouchableOpacity>
      </View>
    </Swipeable>
  );
});

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
    paddingTop: Platform.OS === 'ios' ? 54 : 42,
    paddingBottom: 10,
    backgroundColor: '#1C1C1E',
    borderBottomWidth: 1,
    borderBottomColor: '#28282A',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#262628',
  },
  headerContactBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    marginRight: 10,
  },
  avatarBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#F5F5F5',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  contactStatus: {
    fontSize: 12,
    color: '#9A9A9A',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#262628',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Message Scroll Stream
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dateDivider: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateDividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#777777',
    letterSpacing: 0.8,
  },
  emptyMessagesBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyMessagesText: {
    color: '#777777',
    fontSize: 13,
  },
  messageRow: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  otherRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#DC2626',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#242426',
    borderBottomLeftRadius: 4,
  },
  codeMessageBubble: {
    backgroundColor: '#1A1A1D',
    borderWidth: 1,
    borderColor: '#303030',
    minWidth: 240,
  },
  editingMessageBubble: {
    borderWidth: 1.5,
    borderColor: APP_COLORS.primary,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 19,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#F5F5F5',
  },
  timestamp: {
    fontSize: 10.5,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherTimestamp: {
    color: '#777777',
  },

  // Code Snippet in Bubble
  codeSnippetContainer: {
    width: '100%',
  },
  codeSnippetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#28282B',
    paddingBottom: 6,
    marginBottom: 6,
  },
  codeSnippetLang: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9B4DFF',
    letterSpacing: 0.5,
  },
  codeCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  codeCopyText: {
    fontSize: 11,
    color: '#9A9A9A',
    fontWeight: '600',
  },
  codeSnippetText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12.5,
    color: '#E0E0E0',
    lineHeight: 17,
  },

  // Reply Quoted
  replyQuotedBox: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
    borderLeftWidth: 3,
  },
  userReplyQuotedBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderLeftColor: '#FFFFFF',
  },
  otherReplyQuotedBox: {
    backgroundColor: '#1E1E20',
    borderLeftColor: APP_COLORS.primary,
  },
  replySenderText: {
    fontSize: 11,
    fontWeight: '700',
    color: APP_COLORS.primary,
    marginBottom: 2,
  },
  replyContentText: {
    fontSize: 12,
    color: '#D0D0D0',
  },
  replySwipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
  },

  // Banner Container
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#242426',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#303030',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  bannerTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#F5F5F5',
  },
  bannerSubtitle: {
    fontSize: 11.5,
    color: '#9A9A9A',
  },

  // Composer
  inputContainer: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#171717',
    borderTopWidth: 1,
    borderTopColor: '#242424',
  },
  inputBarWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#202022',
    borderRadius: 22,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#303030',
  },
  attachButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2C2C30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    marginBottom: 1,
  },
  textInput: {
    flex: 1,
    color: '#F5F5F5',
    fontSize: 14,
    maxHeight: 90,
    paddingTop: Platform.OS === 'ios' ? 7 : 5,
    paddingBottom: Platform.OS === 'ios' ? 7 : 5,
    paddingHorizontal: 6,
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    marginBottom: 1,
  },
  sendButtonActive: {
    backgroundColor: APP_COLORS.primary,
  },
  sendButtonDisabled: {
    backgroundColor: '#2A2A2E',
  },

  // 100% Transparent Root + Single Translucent Backdrop Bottom Sheet
  transparentRoot: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  bottomSheet: {
    backgroundColor: '#1F1F21',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
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
  optionsHeader: {
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2E',
    marginBottom: 10,
  },
  optionsAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  optionsAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  optionsContactName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F5F5F5',
    marginBottom: 2,
  },
  optionsSubTitle: {
    fontSize: 12.5,
    color: '#9A9A9A',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 14,
  },
  optionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#26262A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#F5F5F5',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 12,
    color: '#8A8A8E',
  },
  optionsCancelBtn: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#26262A',
    borderRadius: 14,
  },
  optionsCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9A9A9A',
  },

  // Attachments Content
  attachHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F5F5F5',
    marginBottom: 16,
    marginLeft: 2,
  },
  attachGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  attachGridItem: {
    alignItems: 'center',
    gap: 8,
  },
  attachGridIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachGridLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E0E0E0',
  },

  // Code Snippet Modal
  snippetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  snippetCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1E1E22',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#303030',
  },
  snippetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  snippetTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  snippetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F5F5F5',
  },
  langSelectorRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  langChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#26262A',
  },
  langChipActive: {
    backgroundColor: '#9B4DFF',
  },
  langChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9A9A9A',
  },
  langChipTextActive: {
    color: '#FFFFFF',
  },
  snippetInput: {
    height: 140,
    backgroundColor: '#141416',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2E',
    padding: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12.5,
    color: '#F5F5F5',
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  snippetActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  snippetCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#26262A',
  },
  snippetCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9A9A9A',
  },
  snippetSendBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: APP_COLORS.primary,
  },
  snippetSendBtnDisabled: {
    backgroundColor: '#303030',
  },
  snippetSendText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
