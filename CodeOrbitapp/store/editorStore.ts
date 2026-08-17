import { create } from 'zustand';
import { EditorTheme, CursorPosition } from '../types';
import { EDITOR_THEMES } from '../constants';

interface EditorState {
  currentTheme: EditorTheme;
  fontSize: number;
  fontFamily: string;
  showMinimap: boolean;
  remoteCursors: CursorPosition[];
  setTheme: (theme: EditorTheme) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
  setShowMinimap: (show: boolean) => void;
  updateRemoteCursor: (cursor: CursorPosition) => void;
  removeRemoteCursor: (participantId: string) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  currentTheme: EDITOR_THEMES[0],
  fontSize: 14,
  fontFamily: 'monospace',
  showMinimap: false,
  remoteCursors: [],
  setTheme: (theme) => set({ currentTheme: theme }),
  setFontSize: (size) => set({ fontSize: size }),
  setFontFamily: (family) => set({ fontFamily: family }),
  setShowMinimap: (show) => set({ showMinimap: show }),
  updateRemoteCursor: (cursor) =>
    set((state) => {
      const existingIndex = state.remoteCursors.findIndex(
        (c) => c.participant_id === cursor.participant_id
      );
      if (existingIndex >= 0) {
        const newCursors = [...state.remoteCursors];
        newCursors[existingIndex] = cursor;
        return { remoteCursors: newCursors };
      }
      return { remoteCursors: [...state.remoteCursors, cursor] };
    }),
  removeRemoteCursor: (participantId) =>
    set((state) => ({
      remoteCursors: state.remoteCursors.filter(
        (c) => c.participant_id !== participantId
      ),
    })),
}));
