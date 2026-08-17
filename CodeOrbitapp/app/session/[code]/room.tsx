import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSessionStore } from '../../../store/sessionStore';
import { useAuthStore } from '../../../store/authStore';
import { useEditorStore } from '../../../store/editorStore';
import { useCodeExecution } from '../../../hooks/useCodeExecution';
import { useSessionSocket } from '../../../hooks/useSessionSocket';
import { getSocket } from '../../../services/socket';
import { api } from '../../../services/api';
import { ParticipantAvatar } from '../../../components/ui/ParticipantAvatar';
import { CodeEditor, CodeEditorRef } from '../../../components/editor/CodeEditor';
import {
  APP_COLORS,
  EDITOR_THEMES,
  getLanguagePreset,
  getLanguageFromFilename,
} from '../../../constants';
import { FileTab } from '../../../types';

const COMMON_SHORTCUTS = ['tab', '()', '{}', '[]', ':', '=', '""', "''", ';', '#', '=>'];

export default function SessionRoomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const { user } = useAuthStore();
  const {
    currentSession,
    fileTabs,
    activeTabId,
    participants,
    isHost,
    showAnnotationMode,
    showChat,
    showParticipants,
    showConsole,
    chatMessages,
    editPermissionRequests,
    hasRequestedEditPermission,
    setActiveTabId,
    setFileTabs,
    addFileTab,
    updateFileTab,
    removeFileTab,
    setShowAnnotationMode,
    setShowChat,
    setShowParticipants,
    setShowConsole,
    setHasRequestedEditPermission,
    resetSession,
  } = useSessionStore();
  const { currentTheme, setTheme } = useEditorStore();
  const { isRunning, output, error, exitCode, runCode } = useCodeExecution();
  const {
    updateCode,
    createTab,
    deleteTab,
    renameTab,
    approveJoin,
    declineJoin,
    requestEdit,
    respondEdit,
    revokeEdit,
    sendMessage,
  } = useSessionSocket();

  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showAddTabModal, setShowAddTabModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showRenameTabModal, setShowRenameTabModal] = useState(false);
  const [editingTab, setEditingTab] = useState<FileTab | null>(null);
  const [renameFilename, setRenameFilename] = useState('');
  const [renameError, setRenameError] = useState('');
  const [newFilename, setNewFilename] = useState('');
  const [filenameError, setFilenameError] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [endingPhase, setEndingPhase] = useState<'saving' | 'saved'>('saving');
  const hasNavigatedToEndedRef = useRef(false);
  const editorRef = useRef<CodeEditorRef>(null);

  const handleSendChatMessage = useCallback(() => {
    const text = chatInput.trim();
    if (!text) return;
    const sessionCode = currentSession?.code || params.code;
    if (sessionCode) {
      sendMessage(sessionCode, text);
    }
    setChatInput('');
  }, [chatInput, currentSession?.code, params.code, sendMessage]);

  // Auto-fetch session from API if room navigated directly with ?code=
  useEffect(() => {
    if (!currentSession && params.code) {
      api.sessions
        .getByCode(params.code)
        .then((res) => {
          if (res.session) {
            if (res.session.status === 'ended') {
              if (!hasNavigatedToEndedRef.current) {
                hasNavigatedToEndedRef.current = true;
                router.replace({
                  pathname: '/session/[code]/ended',
                  params: { code: params.code },
                });
              }
              return;
            }
            useSessionStore.getState().hydrateSessionSnapshot(res);
          }
        })
        .catch((err) => {
          console.error('Failed to load session:', err);
        });
    }
  }, [params.code, currentSession]);

  // Derive preset from stored session data, file tabs, or route params
  const sessionPresetKey =
    currentSession?.languagePreset ||
    currentSession?.language_preset ||
    fileTabs[0]?.language ||
    (params as any)?.lang;

  const currentLanguagePreset = getLanguagePreset(sessionPresetKey);

  // Hydrate initial file tabs strictly from verified preset configuration
  useEffect(() => {
    if (fileTabs.length === 0 && currentLanguagePreset) {
      const initialTabs = currentLanguagePreset.initialFiles.map((file, idx) => ({
        id: `tab-${idx + 1}`,
        session_id: currentSession?.id || 'session-local',
        filename: file,
        language: currentLanguagePreset.id,
        content: currentLanguagePreset.starterCode?.[file] || '',
        order_index: idx,
      }));
      setFileTabs(initialTabs);
    }
  }, [fileTabs.length, currentLanguagePreset, currentSession?.id]);

  const activeTab = fileTabs.find((t) => t.id === activeTabId) || fileTabs[0];
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const activeEditorLang = activeTab
    ? getLanguageFromFilename(activeTab.filename) || currentLanguagePreset?.id || 'text'
    : 'text';

  const handleRun = async () => {
    Keyboard.dismiss();
    editorRef.current?.dismissKeyboard();
    if (!activeTab || !currentLanguagePreset) return;
    const files: Record<string, string> = {};
    fileTabs.forEach((tab) => {
      files[tab.filename] = tab.content;
    });
    await runCode(currentLanguagePreset.id, files);
    setShowConsole(true);
  };

  const handleCodeChange = useCallback(
    (content: string) => {
      const currentTab = activeTabRef.current;
      if (!currentTab) return;

      if (currentTab.id === 'default') {
        const tabId = `tab-main`;
        const newTab = { ...currentTab, id: tabId, content };
        addFileTab(newTab);
        setActiveTabId(tabId);
        if (currentSession) {
          updateCode(currentSession.code, tabId, content);
        }
      } else {
        updateFileTab(currentTab.id, { content });
        if (currentSession) {
          updateCode(currentSession.code, currentTab.id, content);
        }
      }
    },
    [currentSession?.code, addFileTab, setActiveTabId, updateFileTab, updateCode]
  );

  const handleInsertShortcut = useCallback((symbol: string) => {
    editorRef.current?.insertSnippet(symbol);
  }, []);

  const handleAddTab = () => {
    const name = newFilename.trim();
    if (!name) {
      setFilenameError('Please enter a filename.');
      return;
    }
    setFilenameError('');
    const lang = sessionPresetKey || currentLanguagePreset?.id || 'text';

    if (currentSession) {
      createTab(currentSession.code, name, lang);
    } else {
      const newTab: FileTab = {
        id: `tab-${Date.now()}`,
        session_id: '',
        filename: name,
        language: lang,
        content: '',
        order_index: fileTabs.length,
      };
      addFileTab(newTab);
      setActiveTabId(newTab.id);
    }
    setNewFilename('');
    setShowAddTabModal(false);
  };

  const handleDeleteTab = (tabId: string) => {
    if (fileTabs.length <= 1) return;
    if (currentSession) {
      deleteTab(currentSession.code, tabId);
    }
    removeFileTab(tabId);
  };

  useEffect(() => {
    return () => {
      Keyboard.dismiss();
      editorRef.current?.dismissKeyboard();
    };
  }, []);

  const hostParticipant = participants.find((p) => p.role === 'host');
  const isHostById = Boolean(
    user?.id &&
      (currentSession?.hostId === user.id ||
        currentSession?.host_id === user.id ||
        hostParticipant?.user_id === user.id ||
        (hostParticipant as any)?.userId === user.id)
  );

  const amIHost = isHost || isHostById || Boolean(user?.id && hostParticipant?.user_id === user.id);

  // Record session in history ONLY when user enters into the actual room (status becomes active)
  useEffect(() => {
    const sessionCode = currentSession?.code || params.code;
    if (sessionCode && currentSession?.status !== 'ended') {
      try {
        const { useSessionHistoryStore } = require('../../../store/sessionHistoryStore');
        useSessionHistoryStore.getState().addHistoryEntry({
          id: currentSession?.id || sessionCode,
          code: sessionCode,
          languagePreset:
            currentSession?.languagePreset ||
            currentSession?.language_preset ||
            currentLanguagePreset?.id ||
            'python',
          approvalMode: currentSession?.approvalMode || 'open',
          maxParticipants: currentSession?.maxParticipants || 4,
          status: 'active',
          createdAt: currentSession?.createdAt || new Date().toISOString(),
          hostName:
            hostParticipant?.guest_name ||
            (hostParticipant as any)?.name ||
            user?.name ||
            'Host',
          participantCount: participants.length || 1,
          isHost: amIHost,
        });
      } catch (e) {}

      // Tell backend to mark session status as active
      api.sessions.start(sessionCode).catch(() => {});
    }
  }, [
    currentSession?.code,
    params.code,
    currentSession?.id,
    currentSession?.status,
    currentLanguagePreset?.id,
    amIHost,
    user?.name,
    hostParticipant,
    participants.length,
  ]);

  const terminateAndNavigateToEnded = useCallback(
    (reason: string = 'host_ended') => {
      if (hasNavigatedToEndedRef.current) return;
      hasNavigatedToEndedRef.current = true;

      setIsEndingSession(true);
      setEndingPhase('saving');

      const sessionCode = currentSession?.code || params.code;
      if (sessionCode) {
        // Sync final code snapshot & stats to history before navigation
        try {
          const { useSessionHistoryStore } = require('../../../store/sessionHistoryStore');
          useSessionHistoryStore
            .getState()
            .updateSessionStatus(sessionCode, 'ended', new Date().toISOString());
        } catch (e) {}

        // If host, inform socket and backend API
        if (amIHost) {
          try {
            const socket = getSocket();
            socket.emit('end_session', { sessionCode });
          } catch {}

          try {
            api.sessions.end(sessionCode).catch(() => {});
          } catch {}
        }

        // Progression: 'saving' (550ms) -> 'saved' (350ms) -> navigate to ended screen
        setTimeout(() => {
          setEndingPhase('saved');
          setTimeout(() => {
            router.replace({
              pathname: '/session/[code]/ended',
              params: { code: sessionCode, reason },
            });
          }, 350);
        }, 550);
      } else {
        setTimeout(() => {
          router.replace('/(main)/home');
        }, 400);
      }
    },
    [amIHost, currentSession?.code, params.code, router]
  );

  // Handle room termination gracefully via dedicated ended screen
  useEffect(() => {
    const socket = getSocket();
    const handleEnded = (data?: { reason?: any }) => {
      terminateAndNavigateToEnded(data?.reason || 'host_ended');
    };

    socket.on('session_ended', handleEnded);

    return () => {
      socket.off('session_ended', handleEnded);
    };
  }, [terminateAndNavigateToEnded]);

  // Do not render a stale, ended room as an active workspace.
  useEffect(() => {
    const session = currentSession;
    if (session && session.code === params.code && session.status === 'ended') {
      terminateAndNavigateToEnded('host_ended');
    }
  }, [currentSession?.code, currentSession?.status, params.code, terminateAndNavigateToEnded]);

  const socketInstance = getSocket();
  const socketUserId = (socketInstance as any)?.auth?.userId;
  const myParticipant = participants.find(
    (p) =>
      (user?.id && (p.user_id === user.id || (p as any).userId === user.id)) ||
      (socketUserId && (p.user_id === socketUserId || (p as any).userId === socketUserId))
  );

  const canIEdit = amIHost || myParticipant?.role === 'co_editor';

  const handleTabLongPress = (tab: any) => {
    if (!amIHost) {
      Alert.alert('Permission Denied', 'Only the session creator can edit file names.');
      return;
    }
    setEditingTab(tab);
    setRenameFilename(tab.filename);
    setRenameError('');
    setShowRenameTabModal(true);
  };

  const handleSaveTabRename = () => {
    if (!editingTab) return;
    const name = renameFilename.trim();
    if (!name) {
      setRenameError('Please enter a filename.');
      return;
    }
    setRenameError('');

    updateFileTab(editingTab.id, { filename: name });
    if (currentSession) {
      renameTab(currentSession.code, editingTab.id, name);
    }
    setShowRenameTabModal(false);
    setEditingTab(null);
    setRenameFilename('');
  };

  const handleClose = () => {
    Keyboard.dismiss();
    editorRef.current?.dismissKeyboard();

    if (currentSession?.status === 'ended') {
      terminateAndNavigateToEnded('host_ended');
      return;
    }

    if (amIHost) {
      Alert.alert(
        'End Live Session?',
        'Are you sure you want to end this live coding workspace? All participants will be disconnected.',
        [
          { text: 'Stay', style: 'cancel' },
          {
            text: 'End Session',
            style: 'destructive',
            onPress: () => {
              setShowParticipants(false);
              setShowChat(false);
              setShowThemeSelector(false);
              setShowAddTabModal(false);
              setShowMenuModal(false);
              terminateAndNavigateToEnded('host_ended');
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Leave Live Session?',
        'Are you sure you want to leave this workspace?',
        [
          { text: 'Stay', style: 'cancel' },
          {
            text: 'Leave Session',
            style: 'destructive',
            onPress: () => {
              setShowParticipants(false);
              setShowChat(false);
              setShowThemeSelector(false);
              setShowAddTabModal(false);
              setShowMenuModal(false);
              const sessionCode = currentSession?.code;
              if (sessionCode) {
                try {
                  const socket = getSocket();
                  socket.emit('leave_session', { sessionCode });
                } catch {}
              }
              resetSession();
              router.replace('/(main)/home');
            },
          },
        ]
      );
    }
  };

  if (!currentLanguagePreset) {
    return (
      <View style={styles.errorScreenContainer}>
        <ActivityIndicator size="large" color={APP_COLORS.primary} style={{ marginBottom: 16 }} />
        <Text style={styles.errorScreenTitle}>Loading Workspace...</Text>
        <Text style={styles.errorScreenSubtitle}>
          Synchronizing session environment configuration...
        </Text>
      </View>
    );
  }

  const roomCodeDisplay = currentSession?.code || params.code || '';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* 1. Minimal Top Toolbar (3-Zone Flex Layout) */}
      <View style={styles.toolbar}>
        {/* Zone 1: Flexible Truncating Title */}
        <View style={styles.toolbarLeft}>
          <TouchableOpacity
            style={styles.toolbarIconBtn}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Leave workspace"
          >
            <Ionicons name="arrow-back" size={20} color={APP_COLORS.text} />
          </TouchableOpacity>

          <View style={styles.sessionMetaBox}>
            <Text style={styles.sessionPresetName} numberOfLines={1} ellipsizeMode="tail">
              {currentLanguagePreset?.name}
            </Text>
            {roomCodeDisplay ? (
              <Text style={styles.sessionCodeSub} numberOfLines={1}>
                · {roomCodeDisplay}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Zone 2 & 3: Fixed-width Action Controls (Always in view) */}
        <View style={styles.toolbarRight}>
          {/* Participant count button */}
          <TouchableOpacity
            style={styles.participantsPillBtn}
            onPress={() => setShowParticipants(true)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`Participants: ${participants.length}`}
          >
            <Ionicons name="people" size={13} color={APP_COLORS.textSecondary} />
            <Text style={styles.participantsPillText}>{participants.length}</Text>
          </TouchableOpacity>

          {/* Semantic Green Run CTA */}
          <TouchableOpacity
            style={[styles.runButton, isRunning && styles.runButtonRunning]}
            onPress={handleRun}
            disabled={isRunning}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={isRunning ? 'Running code' : 'Run code'}
          >
            {isRunning ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 4 }} />
            ) : (
              <Ionicons name="play" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
            )}
            <Text style={styles.runButtonText}>{isRunning ? 'Running...' : 'Run'}</Text>
          </TouchableOpacity>

          {/* Three-Dot Workspace Menu */}
          <TouchableOpacity
            style={styles.toolbarIconBtn}
            onPress={() => setShowMenuModal(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Workspace tools"
          >
            <Ionicons name="ellipsis-vertical" size={18} color={APP_COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. File Tabs System (Horizontal Scroll) */}
      <View style={styles.tabBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarScroll}
        >
          {fileTabs.map((tab) => {
            const isActive = tab.id === activeTab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTabId(tab.id)}
                onLongPress={() => handleTabLongPress(tab)}
                delayLongPress={350}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="document-text-outline"
                  size={13}
                  color={isActive ? APP_COLORS.primary : APP_COLORS.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.filename}
                </Text>
                {fileTabs.length > 1 && (
                  <TouchableOpacity
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.tabCloseButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteTab(tab.id);
                    }}
                  >
                    <Ionicons
                      name="close"
                      size={12}
                      color={isActive ? APP_COLORS.text : APP_COLORS.textSecondary}
                    />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Add New File Tab Action */}
          <TouchableOpacity
            style={styles.addTabButton}
            onPress={() => setShowAddTabModal(true)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel="Add new file"
          >
            <Ionicons name="add" size={16} color={APP_COLORS.textSecondary} />
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Floating Host Join Request Approval Banner */}
      {amIHost && participants.some((p) => p.status === 'pending') && (
        <View style={styles.pendingApprovalBanner}>
          <View style={styles.pendingApprovalInfo}>
            <Ionicons name="person-add" size={18} color={APP_COLORS.primary} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.pendingApprovalTitle}>
                {participants.find((p) => p.status === 'pending')?.guest_name ||
                  (participants.find((p) => p.status === 'pending') as any)?.guestName ||
                  'Participant'}{' '}
                wants to join
              </Text>
            </View>
          </View>

          <View style={styles.pendingApprovalActions}>
            <TouchableOpacity
              style={[styles.approvalBtn, { backgroundColor: APP_COLORS.success }]}
              onPress={() => {
                const target = participants.find((p) => p.status === 'pending');
                if (target && currentSession) {
                  approveJoin(currentSession.code, target.id);
                }
              }}
            >
              <Ionicons name="checkmark" size={14} color="#fff" />
              <Text style={styles.approvalBtnText}>Accept</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.approvalBtn, { backgroundColor: APP_COLORS.error }]}
              onPress={() => {
                const target = participants.find((p) => p.status === 'pending');
                if (target && currentSession) {
                  declineJoin(currentSession.code, target.id);
                }
              }}
            >
              <Ionicons name="close" size={14} color="#fff" />
              <Text style={styles.approvalBtnText}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Floating Host Code Edit Permission Banner */}
      {amIHost && editPermissionRequests.length > 0 && (
        <View style={styles.pendingApprovalBanner}>
          <View style={styles.pendingApprovalInfo}>
            <Ionicons name="key" size={18} color="#F59E0B" />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.pendingApprovalTitle}>
                {editPermissionRequests[0].participantName} requested edit access
              </Text>
            </View>
          </View>

          <View style={styles.pendingApprovalActions}>
            <TouchableOpacity
              style={[styles.approvalBtn, { backgroundColor: APP_COLORS.success }]}
              onPress={() => {
                const req = editPermissionRequests[0];
                if (req && currentSession) {
                  respondEdit(currentSession.code, req.participantId, true);
                }
              }}
            >
              <Ionicons name="checkmark" size={14} color="#fff" />
              <Text style={styles.approvalBtnText}>Allow</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.approvalBtn, { backgroundColor: APP_COLORS.error }]}
              onPress={() => {
                const req = editPermissionRequests[0];
                if (req && currentSession) {
                  respondEdit(currentSession.code, req.participantId, false);
                }
              }}
            >
              <Ionicons name="close" size={14} color="#fff" />
              <Text style={styles.approvalBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Participant Edit Request Banner */}
      {!amIHost && !canIEdit && (
        <View style={styles.pendingApprovalBanner}>
          {hasRequestedEditPermission ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <ActivityIndicator
                size="small"
                color={APP_COLORS.primary}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.pendingApprovalTitle}>
                Waiting for host to grant edit permission...
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.approvalBtn,
                {
                  backgroundColor: APP_COLORS.primary,
                  flex: 1,
                  justifyContent: 'center',
                  paddingVertical: 8,
                },
              ]}
              onPress={() => {
                if (currentSession) {
                  requestEdit(currentSession.code);
                  setHasRequestedEditPermission(true);
                }
              }}
            >
              <Ionicons name="hand-right-outline" size={15} color="#fff" />
              <Text style={styles.approvalBtnText}>Request Host Permission to Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 3. Main Code Editor Area */}
      <View style={styles.editorContainer}>
        <CodeEditor
          ref={editorRef}
          code={activeTab?.content || ''}
          language={activeEditorLang}
          theme={currentTheme}
          onChangeCode={handleCodeChange}
          readOnly={!canIEdit}
        />
      </View>

      {/* 4. Mobile Coding Shortcut Toolbar */}
      {canIEdit && (
        <View style={styles.shortcutBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.shortcutScrollContent}
            keyboardShouldPersistTaps="always"
          >
            {COMMON_SHORTCUTS.map((symbol) => (
              <TouchableOpacity
                key={symbol}
                style={styles.shortcutKey}
                onPress={() => handleInsertShortcut(symbol)}
                activeOpacity={0.7}
              >
                <Text style={styles.shortcutKeyText}>
                  {symbol === 'tab' ? 'Tab' : symbol}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 5. Console Output Bottom Sheet */}
      <Modal
        visible={showConsole}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConsole(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.consoleSheet}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleBox}>
                <Ionicons name="terminal-outline" size={16} color={APP_COLORS.text} />
                <Text style={styles.sheetTitle}>Console Output</Text>
                {exitCode !== null && (
                  <View
                    style={[
                      styles.exitCodeBadge,
                      exitCode === 0 ? styles.exitCodeSuccess : styles.exitCodeError,
                    ]}
                  >
                    <Text style={styles.exitCodeBadgeText}>
                      {exitCode === 0 ? '✓ Success' : `Exit ${exitCode}`}
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                onPress={() => setShowConsole(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color={APP_COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.consoleContent} showsVerticalScrollIndicator={true}>
              {output ? <Text style={styles.consoleText}>{output}</Text> : null}
              {error ? (
                <Text style={[styles.consoleText, styles.consoleError]}>{error}</Text>
              ) : null}
              {!output && !error && (
                <Text style={styles.consoleEmptyText}>No output recorded.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 6. Theme Selector Modal */}
      <Modal visible={showThemeSelector} transparent animationType="slide">
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.compactSheet}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleBox}>
                <Ionicons name="color-palette-outline" size={18} color={APP_COLORS.primary} />
                <Text style={styles.sheetTitle}>Editor Theme</Text>
              </View>
              <TouchableOpacity onPress={() => setShowThemeSelector(false)}>
                <Ionicons name="close" size={20} color={APP_COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {EDITOR_THEMES.map((theme) => (
                <TouchableOpacity
                  key={theme.id}
                  style={[
                    styles.themeOption,
                    currentTheme.id === theme.id && styles.themeOptionSelected,
                  ]}
                  onPress={() => {
                    setTheme(theme);
                    setShowThemeSelector(false);
                  }}
                >
                  <View style={[styles.themePreview, { backgroundColor: theme.background }]}>
                    <Text style={[styles.themePreviewText, { color: theme.text }]}>Aa</Text>
                  </View>
                  <Text style={styles.themeName}>{theme.name}</Text>
                  {currentTheme.id === theme.id && (
                    <Ionicons name="checkmark-circle" size={18} color={APP_COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 7. Participants Bottom Sheet */}
      <Modal
        visible={showParticipants}
        transparent
        animationType="slide"
        onRequestClose={() => setShowParticipants(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.compactSheet}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleBox}>
                <Ionicons name="people-outline" size={18} color={APP_COLORS.primary} />
                <Text style={styles.sheetTitle}>Participants ({participants.length})</Text>
              </View>
              <TouchableOpacity onPress={() => setShowParticipants(false)}>
                <Ionicons name="close" size={20} color={APP_COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {participants.length === 0 ? (
              <View style={styles.emptyParticipantsBox}>
                <Ionicons name="people-outline" size={28} color={APP_COLORS.textSecondary} />
                <Text style={styles.emptyParticipantsTitle}>No collaborators yet</Text>
                <Text style={styles.emptyParticipantsSub}>
                  Share room code: {roomCodeDisplay}
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 320 }}>
                {participants.map((participant) => (
                  <View key={participant.id} style={styles.participantItem}>
                    <ParticipantAvatar
                      name={
                        participant.guest_name ||
                        (participant as any).guestName ||
                        'Participant'
                      }
                      size={36}
                    />
                    <View style={styles.participantInfo}>
                      <Text style={styles.participantName}>
                        {participant.guest_name ||
                          (participant as any).guestName ||
                          'Participant'}
                      </Text>
                      <Text style={styles.participantRole}>
                        {participant.role === 'host'
                          ? 'Host'
                          : participant.role === 'co_editor'
                          ? 'Can Edit Code'
                          : 'Viewer (Read-Only)'}
                      </Text>
                    </View>
                    {amIHost && participant.role !== 'host' && (
                      <TouchableOpacity
                        style={[
                          styles.approvalBtn,
                          {
                            backgroundColor:
                              participant.role === 'co_editor'
                                ? APP_COLORS.error
                                : APP_COLORS.success,
                          },
                        ]}
                        onPress={() => {
                          if (currentSession) {
                            if (participant.role === 'co_editor') {
                              revokeEdit(currentSession.code, participant.id);
                            } else {
                              respondEdit(currentSession.code, participant.id, true);
                            }
                          }
                        }}
                      >
                        <Text style={styles.approvalBtnText}>
                          {participant.role === 'co_editor' ? 'Revoke Edit' : 'Grant Edit'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* 8. Keyboard-Aware Chat Bottom Sheet */}
      <Modal
        visible={showChat}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChat(false)}
      >
        <KeyboardAvoidingView
          style={styles.chatModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.chatBackdropDismiss}
            activeOpacity={1}
            onPress={() => setShowChat(false)}
          />
          <View style={styles.chatSheetContainer}>
            {/* Header */}
            <View style={styles.chatSheetHeader}>
              <View style={styles.chatHeaderLeft}>
                <Ionicons name="chatbubble-ellipses-outline" size={17} color={APP_COLORS.primary} />
                <Text style={styles.chatSheetTitle}>Chat & Messages</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowChat(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.chatCloseBtn}
              >
                <Ionicons name="close" size={20} color={APP_COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Message Stream */}
            <ScrollView
              style={styles.chatMessagesScroll}
              contentContainerStyle={styles.chatMessagesContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              {chatMessages.length === 0 ? (
                <View style={styles.chatEmptyContainer}>
                  <View style={styles.chatEmptyIconBox}>
                    <Ionicons name="chatbubble-outline" size={24} color={APP_COLORS.textSecondary} />
                  </View>
                  <Text style={styles.chatEmptyHeading}>No messages yet</Text>
                  <Text style={styles.chatEmptySub}>
                    Start a conversation with your collaborators.
                  </Text>
                </View>
              ) : (
                chatMessages.map((msg, idx) => {
                  const isMe =
                    (msg.senderId && (msg.senderId === user?.id || (user as any)?.id === msg.senderId)) ||
                    msg.senderName === user?.name;
                  return (
                    <View
                      key={msg.id || idx}
                      style={[styles.messageBubbleRow, isMe ? styles.bubbleRowRight : styles.bubbleRowLeft]}
                    >
                      {!isMe && (
                        <Text style={styles.bubbleSenderName}>{msg.senderName || 'Collaborator'}</Text>
                      )}
                      <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleOther]}>
                        <Text style={[styles.messageBubbleText, isMe && styles.messageBubbleTextMe]}>
                          {msg.text}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>

            {/* Multiline Developer-Friendly Composer */}
            <View style={styles.chatComposerContainer}>
              <TextInput
                style={styles.chatComposerInput}
                placeholder="Message..."
                placeholderTextColor="#777777"
                value={chatInput}
                onChangeText={setChatInput}
                multiline={true}
                maxLength={1000}
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[
                  styles.chatSendButton,
                  chatInput.trim() ? styles.chatSendButtonActive : styles.chatSendButtonDisabled,
                ]}
                onPress={handleSendChatMessage}
                disabled={!chatInput.trim()}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="arrow-up"
                  size={17}
                  color={chatInput.trim() ? '#FFFFFF' : '#777777'}
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 9. Add New Tab Modal */}
      <Modal visible={showAddTabModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.bottomSheetOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.compactSheet, { paddingBottom: 24 }]}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleBox}>
                <Ionicons name="document-text-outline" size={18} color={APP_COLORS.primary} />
                <Text style={styles.sheetTitle}>New File</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowAddTabModal(false);
                  setFilenameError('');
                  setNewFilename('');
                }}
              >
                <Ionicons name="close" size={20} color={APP_COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.filenameHintText}>Enter filename (e.g. helper.js, utils.py):</Text>
            <TextInput
              style={[styles.addTabInput, filenameError ? styles.addTabInputError : null]}
              placeholder="Filename..."
              placeholderTextColor={APP_COLORS.textPlaceholder}
              value={newFilename}
              onChangeText={(t) => {
                setNewFilename(t);
                setFilenameError('');
              }}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            {filenameError ? (
              <Text style={styles.filenameErrorText}>{filenameError}</Text>
            ) : null}
            <TouchableOpacity style={styles.createTabConfirmButton} onPress={handleAddTab}>
              <Ionicons name="add-circle" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.createTabConfirmText}>Create File</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 10. Rename Tab Modal */}
      <Modal visible={showRenameTabModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.bottomSheetOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.compactSheet, { paddingBottom: 24 }]}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleBox}>
                <Ionicons name="create-outline" size={18} color={APP_COLORS.primary} />
                <Text style={styles.sheetTitle}>Rename File</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowRenameTabModal(false);
                  setRenameError('');
                }}
              >
                <Ionicons name="close" size={20} color={APP_COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.filenameHintText}>Enter new filename:</Text>
            <TextInput
              style={[styles.addTabInput, renameError ? styles.addTabInputError : null]}
              placeholder="e.g. index.html, main.py"
              placeholderTextColor={APP_COLORS.textPlaceholder}
              value={renameFilename}
              onChangeText={(t) => {
                setRenameFilename(t);
                setRenameError('');
              }}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            {renameError ? (
              <Text style={styles.filenameErrorText}>{renameError}</Text>
            ) : null}
            <TouchableOpacity
              style={styles.createTabConfirmButton}
              onPress={handleSaveTabRename}
            >
              <Ionicons name="checkmark-circle" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.createTabConfirmText}>Save Filename</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 11. WORKSPACE Three-Dot Menu Modal */}
      <Modal
        visible={showMenuModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenuModal(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenuModal(false)}
        >
          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>WORKSPACE</Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenuModal(false);
                setShowChat(true);
              }}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={APP_COLORS.primary} />
              <Text style={styles.menuItemText}>Chat & Messages</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenuModal(false);
                setShowParticipants(true);
              }}
            >
              <Ionicons name="people-outline" size={18} color={APP_COLORS.primary} />
              <Text style={styles.menuItemText}>Participants ({participants.length})</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenuModal(false);
                setShowAnnotationMode(!showAnnotationMode);
              }}
            >
              <Ionicons
                name="pencil-outline"
                size={18}
                color={showAnnotationMode ? APP_COLORS.success : APP_COLORS.primary}
              />
              <Text style={styles.menuItemText}>
                Whiteboard {showAnnotationMode ? '(Active)' : ''}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenuModal(false);
                setShowConsole(true);
              }}
            >
              <Ionicons name="terminal-outline" size={18} color={APP_COLORS.primary} />
              <Text style={styles.menuItemText}>Console Output</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenuModal(false);
                setShowThemeSelector(true);
              }}
            >
              <Ionicons name="color-palette-outline" size={18} color={APP_COLORS.textSecondary} />
              <Text style={styles.menuItemText}>Editor Theme</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 12. Calm, Focused Session Ending State Overlay */}
      {isEndingSession && (
        <View style={styles.endingSessionOverlay}>
          <View style={styles.endingSessionCard}>
            <View style={styles.endingIndicatorBox}>
              {endingPhase === 'saved' ? (
                <View style={styles.endingSuccessCircle}>
                  <Ionicons name="checkmark" size={16} color="#10B981" />
                </View>
              ) : (
                <ActivityIndicator size="small" color={APP_COLORS.primary} />
              )}
            </View>

            <Text style={styles.endingSessionTitle}>
              {endingPhase === 'saved' ? 'Session ended' : 'Ending session'}
            </Text>
            <Text style={styles.endingSessionSubtitle}>
              {endingPhase === 'saved'
                ? 'Your workspace has been saved'
                : 'Saving your workspace and session data…'}
            </Text>

            <View
              style={[
                styles.endingProgressBadge,
                endingPhase === 'saved' && styles.endingProgressBadgeSuccess,
              ]}
            >
              <View
                style={[
                  styles.endingPulseDot,
                  endingPhase === 'saved' && styles.endingPulseDotSuccess,
                ]}
              />
              <Text
                style={[
                  styles.endingProgressText,
                  endingPhase === 'saved' && styles.endingProgressTextSuccess,
                ]}
              >
                {endingPhase === 'saved' ? 'Workspace saved' : 'Saving workspace & stats…'}
              </Text>
            </View>
          </View>
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

  // Minimal Top Toolbar (3-Zone Flex Layout)
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 52 : 42,
    paddingBottom: 10,
    backgroundColor: APP_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
    gap: 8,
  },
  toolbarLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolbarIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sessionMetaBox: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionPresetName: {
    flexShrink: 1,
    fontSize: 14.5,
    fontWeight: '700',
    color: APP_COLORS.text,
  },
  sessionCodeSub: {
    flexShrink: 0,
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  participantsPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#262626',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#333333',
    flexShrink: 0,
  },
  participantsPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: APP_COLORS.textSecondary,
  },
  runButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    flexShrink: 0,
  },
  runButtonRunning: {
    opacity: 0.75,
  },
  runButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // File Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#18181A',
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  tabBarScroll: {
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: APP_COLORS.primary,
    backgroundColor: '#201F22',
  },
  tabText: {
    color: APP_COLORS.textSecondary,
    fontSize: 13,
  },
  tabTextActive: {
    color: APP_COLORS.text,
    fontWeight: '600',
  },
  tabCloseButton: {
    marginLeft: 6,
    padding: 2,
  },
  addTabButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },

  // Editor Area
  editorContainer: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },

  // Mobile Coding Shortcuts
  shortcutBar: {
    backgroundColor: '#161618',
    borderTopWidth: 1,
    borderTopColor: '#262626',
    paddingTop: 7,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
  },
  shortcutScrollContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  shortcutKey: {
    minWidth: 38,
    height: 34,
    backgroundColor: '#242426',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  shortcutKeyText: {
    color: '#F5F5F5',
    fontSize: 13.5,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.2,
  },

  // Approval Banners
  pendingApprovalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#242424',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#303030',
  },
  pendingApprovalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pendingApprovalTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: APP_COLORS.text,
  },
  pendingApprovalActions: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 8,
  },
  approvalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  approvalBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Bottom Sheets
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  consoleSheet: {
    backgroundColor: '#18181A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    minHeight: 240,
    borderWidth: 1,
    borderColor: '#303030',
  },
  compactSheet: {
    backgroundColor: APP_COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#303030',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  sheetTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: APP_COLORS.text,
  },
  exitCodeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  exitCodeSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  exitCodeError: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  exitCodeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  consoleContent: {
    backgroundColor: '#121212',
    padding: 14,
    minHeight: 180,
  },
  consoleText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    color: '#10B981',
    lineHeight: 19,
  },
  consoleError: {
    color: '#EF4444',
  },
  consoleEmptyText: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    fontStyle: 'italic',
  },

  // Participants Sheet List
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  participantInfo: {
    flex: 1,
    marginLeft: 10,
  },
  participantName: {
    fontSize: 14,
    fontWeight: '600',
    color: APP_COLORS.text,
  },
  participantRole: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
  },
  emptyParticipantsBox: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  emptyParticipantsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: APP_COLORS.text,
  },
  emptyParticipantsSub: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
  },

  // Theme List
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  themeOptionSelected: {
    backgroundColor: '#262626',
  },
  themePreview: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#3A3A3E',
  },
  themePreviewText: {
    fontSize: 12,
    fontWeight: '700',
  },
  themeName: {
    fontSize: 14,
    color: APP_COLORS.text,
    flex: 1,
  },

  // WORKSPACE Menu
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 96 : 84,
    paddingHorizontal: 16,
    alignItems: 'flex-end',
  },
  menuContainer: {
    width: 230,
    backgroundColor: '#242424',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#303030',
  },
  menuTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: APP_COLORS.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 10,
  },
  menuItemText: {
    fontSize: 14,
    color: APP_COLORS.text,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#303030',
    marginVertical: 6,
  },

  // Add/Rename Tab Modal
  filenameHintText: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    marginBottom: 10,
    marginTop: 6,
  },
  addTabInput: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#303030',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: APP_COLORS.text,
    fontSize: 14,
    marginBottom: 12,
  },
  addTabInputError: {
    borderColor: APP_COLORS.error,
  },
  filenameErrorText: {
    color: APP_COLORS.error,
    fontSize: 12,
    marginBottom: 10,
  },
  createTabConfirmButton: {
    backgroundColor: APP_COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  createTabConfirmText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Keyboard-Aware Chat Bottom Sheet
  chatModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  chatBackdropDismiss: {
    flex: 1,
  },
  chatSheetContainer: {
    backgroundColor: '#1E1E22',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#303030',
    maxHeight: '65%',
    minHeight: 280,
  },
  chatSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatSheetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F5F5F5',
  },
  chatCloseBtn: {
    padding: 4,
  },
  chatMessagesScroll: {
    flex: 1,
    minHeight: 130,
  },
  chatMessagesContent: {
    padding: 14,
    gap: 10,
  },
  chatEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  chatEmptyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#26262A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  chatEmptyHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F5F5F5',
    marginBottom: 4,
  },
  chatEmptySub: {
    fontSize: 12.5,
    color: '#9A9A9A',
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 17,
  },
  messageBubbleRow: {
    marginVertical: 2,
    maxWidth: '82%',
  },
  bubbleRowRight: {
    alignSelf: 'flex-end',
  },
  bubbleRowLeft: {
    alignSelf: 'flex-start',
  },
  bubbleSenderName: {
    fontSize: 11,
    color: APP_COLORS.primary,
    fontWeight: '600',
    marginBottom: 2,
    marginLeft: 4,
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  messageBubbleMe: {
    backgroundColor: APP_COLORS.primary,
    borderBottomRightRadius: 2,
  },
  messageBubbleOther: {
    backgroundColor: '#2A2A2E',
    borderBottomLeftRadius: 2,
  },
  messageBubbleText: {
    fontSize: 13.5,
    color: '#F5F5F5',
    lineHeight: 18,
  },
  messageBubbleTextMe: {
    color: '#FFFFFF',
  },
  chatComposerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#161618',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#303030',
    marginHorizontal: 14,
    marginBottom: Platform.OS === 'ios' ? 24 : 14,
    marginTop: 6,
  },
  chatComposerInput: {
    flex: 1,
    color: '#F5F5F5',
    fontSize: 14,
    maxHeight: 90,
    paddingTop: Platform.OS === 'ios' ? 6 : 4,
    paddingBottom: Platform.OS === 'ios' ? 6 : 4,
    marginRight: 8,
  },
  chatSendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatSendButtonActive: {
    backgroundColor: APP_COLORS.primary,
  },
  chatSendButtonDisabled: {
    backgroundColor: '#262628',
  },

  // Error/Loading Screen
  errorScreenContainer: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorScreenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: APP_COLORS.text,
    marginBottom: 6,
  },
  errorScreenSubtitle: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
  },

  // Session Ending Loading Overlay (Calm, Focused & Soft Backdrop)
  endingSessionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    paddingHorizontal: 20,
  },
  endingSessionCard: {
    width: '84%',
    maxWidth: 320,
    backgroundColor: '#1F1F23',
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2E2E34',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  endingIndicatorBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  endingSuccessCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endingSessionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F5F5F5',
    marginBottom: 4,
    textAlign: 'center',
  },
  endingSessionSubtitle: {
    fontSize: 13,
    color: '#9A9AA0',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 18,
  },
  endingProgressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#26262B',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#34343C',
  },
  endingProgressBadgeSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  endingPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8A8A92',
  },
  endingPulseDotSuccess: {
    backgroundColor: '#10B981',
  },
  endingProgressText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#A0A0A8',
  },
  endingProgressTextSuccess: {
    color: '#10B981',
    fontWeight: '600',
  },
});
