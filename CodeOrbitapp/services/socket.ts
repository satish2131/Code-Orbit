import { io, Socket } from 'socket.io-client';
import { WS_URL } from '../constants/config';
import * as SecureStore from 'expo-secure-store';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(WS_URL, {
      transports: ['websocket'],
      autoConnect: false,
    });
  }
  return socket;
};

export const connectSocket = async (userId?: string, guestName?: string) => {
  const s = getSocket();
  if (!s.connected) {
    const token = await SecureStore.getItemAsync('auth_token');
    const userDataStr = await SecureStore.getItemAsync('user_data');
    let effectiveUserId = userId;
    let effectiveGuestName = guestName;
    if (!effectiveUserId && userDataStr) {
      try {
        const u = JSON.parse(userDataStr);
        effectiveUserId = u.id;
        effectiveGuestName = u.name;
      } catch {}
    }
    s.auth = { userId: effectiveUserId, guestName: effectiveGuestName, token };
    s.connect();
  }
  return s;
};

export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
    socket = null;
  }
};

export const sendCursorPosition = (sessionCode: string, position: { line: number; column: number; participant_id: string; participant_name: string; color: string }) => {
  socket?.emit('cursor_position', { sessionCode, position });
};

export const sendChatMessage = (sessionCode: string, text: string) => {
  socket?.emit('chat_message', { sessionCode, text });
};

export const sendCodeChange = (sessionCode: string, tabId: string, content: string) => {
  socket?.emit('code_change', { sessionCode, tabId, content });
};

export const sendCreateTab = (sessionCode: string, filename: string, language: string) => {
  socket?.emit('create_tab', { sessionCode, filename, language });
};

export const sendDeleteTab = (sessionCode: string, tabId: string) => {
  socket?.emit('delete_tab', { sessionCode, tabId });
};

export const sendRenameTab = (sessionCode: string, tabId: string, newFilename: string) => {
  socket?.emit('rename_tab', { sessionCode, tabId, newFilename });
};

export const approveJoinRequest = (sessionCode: string, participantId: string) => {
  socket?.emit('approve_participant', { sessionCode, participantId });
};

export const declineJoinRequest = (sessionCode: string, participantId: string) => {
  socket?.emit('decline_participant', { sessionCode, participantId });
};

export const requestEditPermission = (sessionCode: string) => {
  socket?.emit('request_edit_permission', { sessionCode });
};

export const respondEditPermission = (sessionCode: string, participantId: string, approved: boolean) => {
  socket?.emit('respond_edit_permission', { sessionCode, participantId, approved });
};

export const revokeEditPermission = (sessionCode: string, participantId: string) => {
  socket?.emit('revoke_edit_permission', { sessionCode, participantId });
};

