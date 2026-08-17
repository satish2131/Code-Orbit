import { create } from 'zustand';
import { Session, Participant, FileTab, ChatMessage, RunLog, SessionSnapshot } from '../types';
import { useAuthStore } from './authStore';

export interface EditPermissionRequest {
  participantId: string;
  participantName: string;
}

interface SessionState {
  currentSession: Session | null;
  currentVersion: number;
  participants: Participant[];
  fileTabs: FileTab[];
  activeTabId: string | null;
  chatMessages: ChatMessage[];
  runLogs: RunLog[];
  isHost: boolean;
  showAnnotationMode: boolean;
  showChat: boolean;
  showParticipants: boolean;
  showConsole: boolean;
  editPermissionRequests: EditPermissionRequest[];
  hasRequestedEditPermission: boolean;
  hydrateSessionSnapshot: (snapshot: { session: Session; fileTabs?: FileTab[]; participants?: Participant[]; version?: number }) => void;
  setCurrentSession: (session: Session | null) => void;
  setParticipants: (participants: Participant[]) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (participantId: string) => void;
  updateParticipant: (participantId: string, updates: Partial<Participant>) => void;
  setFileTabs: (tabs: FileTab[]) => void;
  addFileTab: (tab: FileTab) => void;
  removeFileTab: (tabId: string) => void;
  updateFileTab: (tabId: string, updates: Partial<FileTab>) => void;
  setActiveTabId: (tabId: string) => void;
  setChatMessages: (messages: ChatMessage[]) => void;
  addChatMessage: (message: ChatMessage) => void;
  setRunLogs: (logs: RunLog[]) => void;
  addRunLog: (log: RunLog) => void;
  setIsHost: (isHost: boolean) => void;
  setShowAnnotationMode: (show: boolean) => void;
  setShowChat: (show: boolean) => void;
  setShowParticipants: (show: boolean) => void;
  setShowConsole: (show: boolean) => void;
  addEditPermissionRequest: (req: EditPermissionRequest) => void;
  removeEditPermissionRequest: (participantId: string) => void;
  setHasRequestedEditPermission: (requested: boolean) => void;
  resetSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  currentSession: null,
  currentVersion: 0,
  participants: [],
  fileTabs: [],
  activeTabId: null,
  chatMessages: [],
  runLogs: [],
  isHost: false,
  showAnnotationMode: false,
  showChat: false,
  showParticipants: false,
  showConsole: false,
  editPermissionRequests: [],
  hasRequestedEditPermission: false,
  hydrateSessionSnapshot: (snapshot) => {
    set((state) => {
      const incomingVersion = snapshot.version || snapshot.session.version || 1;
      const isSameSession = state.currentSession?.id === snapshot.session.id;

      // Strict Monotonic Versioning: ignore equal or older snapshots ONLY if same session
      if (isSameSession && incomingVersion <= state.currentVersion) {
        return state;
      }

      const preset =
        snapshot.session.languagePreset ||
        snapshot.session.language_preset ||
        (isSameSession ? state.currentSession?.languagePreset || state.currentSession?.language_preset : undefined);

      const mergedSession: Session = {
        ...snapshot.session,
        languagePreset: preset,
        language_preset: preset,
        version: isSameSession ? Math.max(incomingVersion, state.currentVersion) : incomingVersion,
      };

      const updatedTabs =
        snapshot.fileTabs && snapshot.fileTabs.length > 0
          ? snapshot.fileTabs
          : isSameSession
          ? state.fileTabs
          : [];

      const updatedParticipants =
        snapshot.participants || (isSameSession ? state.participants : []);

      let hostFlag = state.isHost;
      try {
        const currentUserId = useAuthStore.getState().user?.id;
        if (
          currentUserId &&
          (snapshot.session.hostId === currentUserId ||
            (snapshot.session as any).host_id === currentUserId)
        ) {
          hostFlag = true;
        }
      } catch {}

      return {
        currentSession: mergedSession,
        currentVersion: mergedSession.version || incomingVersion,
        fileTabs: updatedTabs,
        participants: updatedParticipants,
        isHost: hostFlag,
      };
    });
  },
  setCurrentSession: (session) =>
    set((state) => ({
      currentSession: session
        ? {
            ...session,
            languagePreset: state.currentSession?.languagePreset || session.languagePreset,
          }
        : null,
    })),
  setParticipants: (participants) => set({ participants }),
  addParticipant: (participant) =>
    set((state) => ({
      participants: state.participants.some((p) => p.id === participant.id)
        ? state.participants.map((p) => (p.id === participant.id ? participant : p))
        : [...state.participants, participant],
    })),
  removeParticipant: (participantId) =>
    set((state) => ({
      participants: state.participants.filter((p) => p.id !== participantId),
    })),
  updateParticipant: (participantId, updates) =>
    set((state) => ({
      participants: state.participants.map((p) =>
        p.id === participantId ? { ...p, ...updates } : p
      ),
    })),
  setFileTabs: (tabs) => set({ fileTabs: tabs, activeTabId: tabs[0]?.id || null }),
  addFileTab: (tab) =>
    set((state) => ({ fileTabs: [...state.fileTabs, tab] })),
  removeFileTab: (tabId) =>
    set((state) => ({
      fileTabs: state.fileTabs.filter((t) => t.id !== tabId),
      activeTabId: state.activeTabId === tabId ? state.fileTabs[0]?.id || null : state.activeTabId,
    })),
  updateFileTab: (tabId, updates) =>
    set((state) => ({
      fileTabs: state.fileTabs.map((t) =>
        t.id === tabId ? { ...t, ...updates } : t
      ),
    })),
  setActiveTabId: (tabId) => set({ activeTabId: tabId }),
  setChatMessages: (messages) => set({ chatMessages: messages }),
  addChatMessage: (message) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),
  setRunLogs: (logs) => set({ runLogs: logs }),
  addRunLog: (log) =>
    set((state) => ({ runLogs: [...state.runLogs, log] })),
  setIsHost: (isHost) => set({ isHost }),
  setShowAnnotationMode: (show) => set({ showAnnotationMode: show }),
  setShowChat: (show) => set({ showChat: show }),
  setShowParticipants: (show) => set({ showParticipants: show }),
  setShowConsole: (show) => set({ showConsole: show }),
  addEditPermissionRequest: (req) =>
    set((state) => ({
      editPermissionRequests: state.editPermissionRequests.some((r) => r.participantId === req.participantId)
        ? state.editPermissionRequests
        : [...state.editPermissionRequests, req],
    })),
  removeEditPermissionRequest: (participantId) =>
    set((state) => ({
      editPermissionRequests: state.editPermissionRequests.filter((r) => r.participantId !== participantId),
    })),
  setHasRequestedEditPermission: (requested) => set({ hasRequestedEditPermission: requested }),
  resetSession: () =>
    set({
      currentSession: null,
      currentVersion: 0,
      participants: [],
      fileTabs: [],
      activeTabId: null,
      chatMessages: [],
      runLogs: [],
      isHost: false,
      showAnnotationMode: false,
      showChat: false,
      showParticipants: false,
      showConsole: false,
      editPermissionRequests: [],
      hasRequestedEditPermission: false,
    }),
}));

