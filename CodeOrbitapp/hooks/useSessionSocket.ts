import { useCallback } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { useAuthStore } from '../store/authStore';
import { useEditorStore } from '../store/editorStore';
import { api } from '../services/api';
import {
  getSocket,
  connectSocket,
  disconnectSocket,
  approveJoinRequest,
  declineJoinRequest,
  sendCursorPosition,
  sendChatMessage,
  sendCodeChange,
  sendCreateTab,
  sendDeleteTab,
  sendRenameTab,
  requestEditPermission,
  respondEditPermission,
  revokeEditPermission,
} from '../services/socket';
import { FileTab, Participant, ChatMessage, RunLog } from '../types';

export const useSessionSocket = () => {
  const { user } = useAuthStore();
  const {
    setCurrentSession,
    setParticipants,
    addParticipant,
    removeParticipant,
    updateParticipant,
    setFileTabs,
    updateFileTab,
    addChatMessage,
    addRunLog,
    setShowParticipants,
    setIsHost,
    addEditPermissionRequest,
    removeEditPermissionRequest,
    setHasRequestedEditPermission,
  } = useSessionStore();
  const { updateRemoteCursor, removeRemoteCursor } = useEditorStore();

  const initializeSocket = useCallback(() => {
    if (!user) return;

    const socket = getSocket();

    // Clean up any existing listeners before attaching to prevent memory leaks / duplicate events
    socket.off('connect');
    socket.off('session_created');
    socket.off('session_joined');
    socket.off('participants_updated');
    socket.off('join_request');
    socket.off('participant_joined');
    socket.off('participant_left');
    socket.off('participant_updated');
    socket.off('files_updated');
    socket.off('code_update');
    socket.off('cursor_update');
    socket.off('chat_message');
    socket.off('run_result');
    socket.off('session_ended');
    socket.off('edit_permission_requested');
    socket.off('edit_permission_response');
    socket.off('edit_permission_revoked');
    socket.off('disconnect');

    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('connect_error', (err: any) => {
      console.warn('Socket connect_error in hook:', err?.message || err);
    });

    socket.on('error', (err: any) => {
      console.warn('Socket error in hook:', err);
    });

    socket.on('session_created', (data: any) => {
      const sessionObj = data.session || data;
      useSessionStore.getState().hydrateSessionSnapshot({
        session: sessionObj,
        fileTabs: data.fileTabs || sessionObj.fileTabs,
        participants: data.participants || sessionObj.participants,
        version: data.version || sessionObj.version || 1,
      });
      setIsHost(true);
    });

    socket.on('session_error', (data: { code: string; message: string }) => {
      const { Alert } = require('react-native');
      Alert.alert('Session Error', data.message || 'Unable to complete room operation.');
    });

    socket.on('session_joined', (data: any) => {
      const sessionObj = data.session || data;
      useSessionStore.getState().hydrateSessionSnapshot({
        session: sessionObj,
        fileTabs: data.fileTabs || sessionObj.fileTabs,
        participants: data.participants || sessionObj.participants,
        version: data.version || sessionObj.version || 1,
      });
      setIsHost(false);
    });

    socket.on('participants_updated', (participants: Participant[]) => {
      setParticipants(participants);
    });

    socket.on('join_request', (data: { participant: Participant }) => {
      if (data?.participant) {
        addParticipant(data.participant);
      }
      setShowParticipants(true);
    });

    socket.on('participant_joined', (participant: Participant) => {
      addParticipant(participant);
      try {
        const { useNotificationStore } = require('../store/notificationStore');
        useNotificationStore.getState().addNotification({
          sender: (participant as any).name || participant.guest_name || 'Developer',
          action: 'joined session room',
          subtitle: `Code: ${useSessionStore.getState().currentSession?.code || ''}`,
          icon: 'person-add-outline',
          color: '#3B82F6',
          type: 'session_invite',
        });
      } catch (e) {}
    });

    socket.on('participant_left', (participantId: string) => {
      removeParticipant(participantId);
      removeRemoteCursor(participantId);
    });

    socket.on('participant_updated', (data: { participantId: string; updates: Partial<Participant> }) => {
      updateParticipant(data.participantId, data.updates);
    });

    socket.on('files_updated', (files: FileTab[]) => {
      setFileTabs(files);
    });

    socket.on('code_update', (data: { tabId: string; content: string; participantId?: string }) => {
      updateFileTab(data.tabId, { content: data.content });
    });

    socket.on('cursor_update', (data: any) => {
      updateRemoteCursor(data);
    });

    socket.on('chat_message', (message: ChatMessage) => {
      addChatMessage(message);
      if (message && (message as any).senderId !== user?.id) {
        try {
          const { useNotificationStore } = require('../store/notificationStore');
          useNotificationStore.getState().addNotification({
            sender: (message as any).senderName || 'Participant',
            action: 'sent a room message',
            subtitle: message.text || 'New message in session chat',
            icon: 'chatbubble-ellipses-outline',
            color: '#8B5CF6',
            type: 'chat_message',
          });
        } catch (e) {}
      }
    });

    socket.on('run_result', (result: RunLog) => {
      addRunLog(result);
    });

    socket.on('session_ended', (data?: any) => {
      const code = useSessionStore.getState().currentSession?.code;
      if (code) {
        try {
          const { useSessionHistoryStore } = require('../store/sessionHistoryStore');
          useSessionHistoryStore.getState().updateSessionStatus(code, 'ended', new Date().toISOString());
        } catch (e) {}
      }
      const cur = useSessionStore.getState().currentSession;
      if (cur) {
        setCurrentSession({ ...cur, status: 'ended', endedAt: new Date().toISOString() });
      }
    });

    socket.on('edit_permission_requested', (data: { participantId: string; participantName: string }) => {
      addEditPermissionRequest(data);
      try {
        const { useNotificationStore } = require('../store/notificationStore');
        useNotificationStore.getState().addNotification({
          sender: data.participantName || 'Participant',
          action: 'requested permission to edit host code',
          subtitle: 'Allow or decline permission in room header',
          icon: 'key-outline',
          color: '#F59E0B',
          type: 'permission_request',
        });
      } catch (e) {}
    });

    socket.on('edit_permission_response', (data: { participantId: string; approved: boolean; role: string }) => {
      removeEditPermissionRequest(data.participantId);
      const currentParticipants = useSessionStore.getState().participants;
      const me = currentParticipants.find((p) => (user?.id && (p.user_id === user.id || (p as any).userId === user.id)) || p.id === data.participantId);
      if (me && me.id === data.participantId) {
        setHasRequestedEditPermission(false);
        const { Alert } = require('react-native');
        if (data.approved) {
          Alert.alert('Permission Granted', 'The host has granted you edit permission. You can now type code!');
        } else {
          Alert.alert('Permission Rejected', 'The host has declined your edit request.');
        }
      }
      try {
        const { useNotificationStore } = require('../store/notificationStore');
        useNotificationStore.getState().addNotification({
          sender: 'Host Permission',
          action: data.approved ? 'granted edit permission' : 'declined edit request',
          subtitle: data.approved ? 'You can now type code in the editor' : 'Your session is read-only',
          icon: data.approved ? 'checkmark-circle-outline' : 'close-circle-outline',
          color: data.approved ? '#22C55E' : '#EF4444',
          type: 'permission_response',
        });
      } catch (e) {}
    });

    socket.on('chat_message', (msg: any) => {
      if (msg) {
        addChatMessage(msg);
      }
    });

    socket.on('edit_permission_revoked', (data: { participantId: string }) => {
      removeEditPermissionRequest(data.participantId);
      const currentParticipants = useSessionStore.getState().participants;
      const me = currentParticipants.find((p) => (user?.id && (p.user_id === user.id || (p as any).userId === user.id)) || p.id === data.participantId);
      if (me && me.id === data.participantId) {
        const { Alert } = require('react-native');
        Alert.alert('Permission Revoked', 'Your edit permission has been revoked by the host.');
      }
      try {
        const { useNotificationStore } = require('../store/notificationStore');
        useNotificationStore.getState().addNotification({
          sender: 'Host Permission',
          action: 'revoked code edit permission',
          subtitle: 'Your session has reverted to read-only viewer mode',
          icon: 'lock-closed-outline',
          color: '#EF4444',
          type: 'permission_response',
        });
      } catch (e) {}
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    return () => {
      socket.off('connect');
      socket.off('session_created');
      socket.off('session_joined');
      socket.off('participants_updated');
      socket.off('join_request');
      socket.off('participant_joined');
      socket.off('participant_left');
      socket.off('participant_updated');
      socket.off('files_updated');
      socket.off('code_update');
      socket.off('cursor_update');
      socket.off('chat_message');
      socket.off('run_result');
      socket.off('session_ended');
      socket.off('edit_permission_requested');
      socket.off('edit_permission_response');
      socket.off('edit_permission_revoked');
      socket.off('disconnect');
    };
  }, [user]);

  const createNewSession = useCallback(
    async (languagePreset: string, approvalMode: string, maxParticipants: number) => {
      try {
        // Fast HTTP creation with guaranteed fresh room code
        const res = await api.sessions.create({
          languagePreset,
          approvalMode,
          maxParticipants,
        });

        if (res?.session) {
          const sessionObj = res.session;
          useSessionStore.getState().hydrateSessionSnapshot({
            session: sessionObj,
            fileTabs: res.fileTabs || sessionObj.fileTabs,
            participants: res.participants || sessionObj.participants,
            version: res.version || sessionObj.version || 1,
          });
          useSessionStore.getState().setIsHost(true);

          // Connect socket and join the created room
          const socket = await connectSocket(user?.id, user?.name);
          const emitJoin = () => {
            socket.emit('join_session', { sessionCode: sessionObj.code });
          };
          if (socket.connected) {
            emitJoin();
          } else {
            socket.once('connect', emitJoin);
            socket.connect();
          }

          return sessionObj;
        }
      } catch (err: any) {
        console.warn('API session create fallback to socket:', err);
        // Fallback to socket create
        const socket = await connectSocket(user?.id, user?.name);
        const emitCreate = () => {
          socket.emit('create_session', {
            languagePreset,
            approvalMode,
            maxParticipants,
          });
        };
        if (socket.connected) {
          emitCreate();
        } else {
          socket.once('connect', emitCreate);
          socket.connect();
        }
      }
    },
    [user]
  );

  const joinExistingSession = useCallback(
    async (sessionCode: string) => {
      const socket = await connectSocket(user?.id, user?.name);
      const emitJoin = () => {
        socket.emit('join_session', { sessionCode });
      };
      if (socket.connected) {
        emitJoin();
      } else {
        socket.once('connect', emitJoin);
        socket.connect();
      }
    },
    [user]
  );

  const approveJoin = useCallback(
    (sessionCode: string, participantId: string) => {
      approveJoinRequest(sessionCode, participantId);
    },
    []
  );

  const declineJoin = useCallback(
    (sessionCode: string, participantId: string) => {
      declineJoinRequest(sessionCode, participantId);
    },
    []
  );

  const updateCursorPosition = useCallback(
    (sessionCode: string, position: { line: number; column: number; participant_id: string; participant_name: string; color: string }) => {
      sendCursorPosition(sessionCode, position);
    },
    []
  );

  const sendMessage = useCallback(
    (sessionCode: string, text: string) => {
      sendChatMessage(sessionCode, text);
    },
    []
  );

  const updateCode = useCallback(
    (sessionCode: string, tabId: string, content: string) => {
      sendCodeChange(sessionCode, tabId, content);
    },
    []
  );

  const createTab = useCallback(
    (sessionCode: string, filename: string, language: string) => {
      sendCreateTab(sessionCode, filename, language);
    },
    []
  );

  const deleteTab = useCallback(
    (sessionCode: string, tabId: string) => {
      sendDeleteTab(sessionCode, tabId);
    },
    []
  );

  const renameTab = useCallback(
    (sessionCode: string, tabId: string, newFilename: string) => {
      sendRenameTab(sessionCode, tabId, newFilename);
    },
    []
  );

  const requestEdit = useCallback(
    (sessionCode: string) => {
      requestEditPermission(sessionCode);
    },
    []
  );

  const respondEdit = useCallback(
    (sessionCode: string, participantId: string, approved: boolean) => {
      respondEditPermission(sessionCode, participantId, approved);
    },
    []
  );

  const revokeEdit = useCallback(
    (sessionCode: string, participantId: string) => {
      revokeEditPermission(sessionCode, participantId);
    },
    []
  );

  return {
    initializeSocket,
    createNewSession,
    joinExistingSession,
    approveJoin,
    declineJoin,
    updateCursorPosition,
    sendMessage,
    updateCode,
    createTab,
    deleteTab,
    renameTab,
    requestEdit,
    respondEdit,
    revokeEdit,
  };
};

