import { LanguagePreset, EditorTheme } from '../types';

export const LANGUAGE_PRESETS: Record<string, LanguagePreset> = {
  web: {
    id: 'web',
    name: 'Web (HTML/CSS/JS)',
    icon: 'globe-outline',
    initialFiles: ['index.html', 'style.css', 'script.js'],
    tabs: ['index.html', 'style.css', 'script.js'],
    runner: 'webview',
    fileExtension: 'html',
    executionLanguage: 'html',
  },
  python: {
    id: 'python',
    name: 'Python',
    icon: 'terminal-outline',
    initialFiles: ['main.py'],
    tabs: ['main.py'],
    runner: 'piston',
    fileExtension: 'py',
    executionLanguage: 'python',
    pistonLanguage: 'python',
    allowAddFile: true,
  },
  javascript: {
    id: 'javascript',
    name: 'JavaScript (Node.js)',
    icon: 'logo-nodejs',
    initialFiles: ['index.js'],
    tabs: ['index.js'],
    runner: 'piston',
    fileExtension: 'js',
    executionLanguage: 'javascript',
    pistonLanguage: 'javascript',
    allowAddFile: true,
  },
  typescript: {
    id: 'typescript',
    name: 'TypeScript',
    icon: 'code-slash-outline',
    initialFiles: ['index.ts'],
    tabs: ['index.ts'],
    runner: 'piston',
    fileExtension: 'ts',
    executionLanguage: 'typescript',
    pistonLanguage: 'typescript',
    allowAddFile: true,
  },
  java: {
    id: 'java',
    name: 'Java',
    icon: 'cafe-outline',
    initialFiles: ['Main.java'],
    tabs: ['Main.java'],
    runner: 'piston',
    fileExtension: 'java',
    executionLanguage: 'java',
    pistonLanguage: 'java',
  },
  cpp: {
    id: 'cpp',
    name: 'C++',
    icon: 'hardware-chip-outline',
    initialFiles: ['main.cpp'],
    tabs: ['main.cpp'],
    runner: 'piston',
    fileExtension: 'cpp',
    executionLanguage: 'cpp',
    pistonLanguage: 'cpp',
  },
  c: {
    id: 'c',
    name: 'C',
    icon: 'hardware-chip-outline',
    initialFiles: ['main.c'],
    tabs: ['main.c'],
    runner: 'piston',
    fileExtension: 'c',
    executionLanguage: 'c',
    pistonLanguage: 'c',
  },
  go: {
    id: 'go',
    name: 'Go',
    icon: 'fish-outline',
    initialFiles: ['main.go'],
    tabs: ['main.go'],
    runner: 'piston',
    fileExtension: 'go',
    executionLanguage: 'go',
    pistonLanguage: 'go',
  },
  rust: {
    id: 'rust',
    name: 'Rust',
    icon: 'shield-checkmark-outline',
    initialFiles: ['main.rs'],
    tabs: ['main.rs'],
    runner: 'piston',
    fileExtension: 'rs',
    executionLanguage: 'rust',
    pistonLanguage: 'rust',
  },
  php: {
    id: 'php',
    name: 'PHP',
    icon: 'server-outline',
    initialFiles: ['index.php'],
    tabs: ['index.php'],
    runner: 'piston',
    fileExtension: 'php',
    executionLanguage: 'php',
    pistonLanguage: 'php',
  },
  ruby: {
    id: 'ruby',
    name: 'Ruby',
    icon: 'diamond-outline',
    initialFiles: ['main.rb'],
    tabs: ['main.rb'],
    runner: 'piston',
    fileExtension: 'rb',
    executionLanguage: 'ruby',
    pistonLanguage: 'ruby',
  },
  swift: {
    id: 'swift',
    name: 'Swift',
    icon: 'logo-apple',
    initialFiles: ['main.swift'],
    tabs: ['main.swift'],
    runner: 'piston',
    fileExtension: 'swift',
    executionLanguage: 'swift',
    pistonLanguage: 'swift',
  },
  kotlin: {
    id: 'kotlin',
    name: 'Kotlin',
    icon: 'logo-android',
    initialFiles: ['Main.kt'],
    tabs: ['Main.kt'],
    runner: 'piston',
    fileExtension: 'kt',
    executionLanguage: 'kotlin',
    pistonLanguage: 'kotlin',
  },
};

/**
 * Data-Driven Preset Resolver.
 * Returns the exact registered LanguagePreset object for a given preset ID.
 * Returns null if the preset is missing or invalid (no silent default fallbacks).
 */
export const getLanguagePreset = (presetId?: string): LanguagePreset | null => {
  if (!presetId) return null;
  const key = presetId.toLowerCase().trim();
  return LANGUAGE_PRESETS[key] || null;
};

/**
 * Resolves editor language syntax highlighting mode directly from a file extension.
 */
export const getLanguageFromFilename = (filename?: string): string | null => {
  if (!filename) return null;
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return null;

  for (const preset of Object.values(LANGUAGE_PRESETS)) {
    if (preset.fileExtension.toLowerCase() === ext) {
      return preset.id;
    }
  }

  return ext;
};

export const EDITOR_THEMES: EditorTheme[] = [
  {
    id: 'dark',
    name: 'Dark+',
    background: '#1e1e1e',
    text: '#d4d4d4',
    keywords: '#569cd6',
    strings: '#ce9178',
    numbers: '#b5cea8',
    comments: '#6a9955',
    functions: '#dcdcaa',
  },
  {
    id: 'light',
    name: 'Light',
    background: '#ffffff',
    text: '#000000',
    keywords: '#0000ff',
    strings: '#a31515',
    numbers: '#098658',
    comments: '#008000',
    functions: '#795e26',
  },
  {
    id: 'monokai',
    name: 'Monokai',
    background: '#272822',
    text: '#f8f8f2',
    keywords: '#f92672',
    strings: '#e6db74',
    numbers: '#ae81ff',
    comments: '#75715e',
    functions: '#a6e22e',
  },
  {
    id: 'dracula',
    name: 'Dracula',
    background: '#282a36',
    text: '#f8f8f2',
    keywords: '#ff79c6',
    strings: '#f1fa8c',
    numbers: '#bd93f9',
    comments: '#6272a4',
    functions: '#50fa7b',
  },
];

export const APP_COLORS = {
  primary: '#EF4444',
  secondary: '#a855f7',
  accent: '#ec4899',
  background: '#1A1A1A',
  surface: '#262626',
  surfaceLight: '#333333',
  text: '#f8fafc',
  textSecondary: '#a3a3a3',
  textPlaceholder: '#737373',
  border: '#333333',
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
};

export const AUTH_COLORS = {
  ...APP_COLORS,
  inputBackground: '#262626',
  inputBorder: '#333333',
  textPrimary: '#f8fafc',
  socialBg: '#2A2A2A',
  socialBorder: '#404040',
  textMuted: '#a3a3a3',
};
