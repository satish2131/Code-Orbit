export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.55.105:3000';
export const PISTON_API_URL = process.env.EXPO_PUBLIC_PISTON_URL || 'https://emkc.org/api/v2/piston';
export const WS_URL = process.env.EXPO_PUBLIC_WS_URL || API_URL;


export const PISTON_LANGUAGES: Record<string, string> = {
  python: 'python',
  javascript: 'javascript',
  typescript: 'typescript',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  go: 'go',
  rust: 'rust',
  php: 'php',
  ruby: 'ruby',
  swift: 'swift',
  kotlin: 'kotlin',
};

export const SESSION_TIMEOUT = 30 * 60 * 1000;
export const JOIN_REQUEST_TIMEOUT = 60 * 1000;
export const MAX_OUTPUT_LENGTH = 10000;
export const RECONNECT_GRACE_PERIOD = 2 * 60 * 1000;
