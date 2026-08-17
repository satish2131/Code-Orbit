export interface User {
  id: string;
  email?: string;
  username?: string;
  name: string;
  avatar_url?: string;
  auth_provider?: 'email' | 'google' | 'apple' | 'guest';
  created_at: string;
}

export interface Session {
  id: string;
  code: string;
  hostId?: string;
  host_id?: string;
  status: 'waiting' | 'active' | 'ended';
  languagePreset?: string;
  language_preset?: string;
  approvalMode?: 'open' | 'approval_required';
  approval_mode?: 'open' | 'approval_required';
  maxParticipants?: number;
  max_participants?: number;
  version?: number;
  createdAt?: string;
  created_at?: string;
  endedAt?: string;
  ended_at?: string;
}

export interface SessionSnapshot {
  schemaVersion: number;
  session: Session;
  fileTabs: FileTab[];
  participants: Participant[];
  version: number;
}

export interface Participant {
  id: string;
  session_id: string;
  user_id?: string;
  guest_name?: string;
  role: 'host' | 'co_editor' | 'viewer';
  status: 'pending' | 'active' | 'left' | 'kicked';
  joined_at: string;
  left_at?: string;
}

export interface FileTab {
  id: string;
  session_id: string;
  filename: string;
  language: string;
  content: string;
  order_index: number;
}

export interface RunLog {
  id: string;
  session_id: string;
  triggered_by: string;
  language: string;
  stdin?: string;
  stdout: string;
  stderr: string;
  exit_code: number;
  duration_ms: number;
  created_at: string;
}

export type MessageType =
  | 'user'
  | 'system'
  | 'execution'
  | 'annotation'
  | 'join'
  | 'leave';

export interface BaseMessage {
  id: string;
  senderId?: string;
  senderName?: string;
  text: string;
  type: MessageType;
  createdAt: number;
  editedAt?: number;
  deletedAt?: number;
}

export interface AIWorkspaceContext {
  languagePreset?: string;
  currentFilename?: string;
  selectedCode?: string;
  consoleError?: string;
}

export interface AIMessage extends BaseMessage {
  role: 'user' | 'assistant' | 'system';
  conversationId?: string;
  model?: string;
  tokensUsed?: number;
}

export interface ChatMessage extends BaseMessage {
  session_id: string;
  participant_id: string;
  created_at: string;
}

export interface LanguagePreset {
  id: string;
  name: string;
  icon: string;
  initialFiles: string[];
  tabs: string[];
  runner: 'webview' | 'piston';
  fileExtension: string;
  executionLanguage: string;
  pistonLanguage?: string;
  allowAddFile?: boolean;
  starterCode?: Record<string, string>;
}

export interface EditorTheme {
  id: string;
  name: string;
  background: string;
  text: string;
  keywords: string;
  strings: string;
  numbers: string;
  comments: string;
  functions: string;
}

export interface CursorPosition {
  participant_id: string;
  participant_name: string;
  color: string;
  line: number;
  column: number;
  selection?: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
}
