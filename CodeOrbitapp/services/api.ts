import { API_URL } from '../constants/config';
import * as SecureStore from 'expo-secure-store';

const fetchApi = async (endpoint: string, options?: RequestInit, timeoutMs = 45000) => {
  let token: string | null = null;
  try {
    token = await SecureStore.getItemAsync('auth_token');
  } catch (err) {
    console.warn('SecureStore getItemAsync error:', err);
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${API_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...headers,
        ...(options?.headers as Record<string, string>),
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const msg = errorData?.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(msg);
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request to ${endpoint} timed out after ${timeoutMs / 1000}s. Please check your network.`);
    }
    console.error(`API Fetch Error [${endpoint}]:`, error);
    if (error.message === 'Network request failed' || error.name === 'TypeError') {
      throw new Error(
        `Unable to reach backend server at ${API_URL}. Please check your connection.`
      );
    }
    throw error;
  }
};

export const api = {
  auth: {
    login: (email: string, password: string) =>
      fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    signup: (email: string, username: string, password: string, name: string) =>
      fetchApi('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, username, password, name }),
      }),
    checkUsername: (username: string) =>
      fetchApi(`/auth/check-username?username=${encodeURIComponent(username)}`),
    searchUsers: (username: string) =>
      fetchApi(`/auth/users?username=${encodeURIComponent(username)}`),
    logout: () => fetchApi('/auth/logout', { method: 'POST' }),
    getMe: () => fetchApi('/auth/me'),
    updateProfile: (data: { name?: string; avatarUrl?: string }) =>
      fetchApi('/auth/me', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    forgotPassword: (email: string) =>
      fetchApi('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    verifyOtp: (email: string, otp: string) =>
      fetchApi('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, otp }),
      }),
    resetPassword: (email: string, otp: string, newPassword: string) =>
      fetchApi('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, otp, newPassword }),
      }),
  },
  sessions: {
    create: (data: { languagePreset: string; approvalMode: string; maxParticipants: number }) =>
      fetchApi('/sessions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getByCode: (code: string) => fetchApi(`/sessions/${code}`),
    getHistory: () => fetchApi('/sessions/history'),
    clearHistory: () => fetchApi('/sessions/history', { method: 'DELETE' }),
    deleteHistory: (idOrCode: string) => fetchApi(`/sessions/history/${encodeURIComponent(idOrCode)}`, { method: 'DELETE' }),
    start: (code: string) =>
      fetchApi(`/sessions/${code}/start`, { method: 'POST' }),
    end: (sessionId: string) =>
      fetchApi(`/sessions/${sessionId}/end`, { method: 'POST' }),
  },
  execution: {
    run: (language: string, code: string, stdin?: string) =>
      fetchApi('/execution/run', {
        method: 'POST',
        body: JSON.stringify({ language, code, stdin }),
      }),
  },
  contact: {
    submit: (data: { name: string; email: string; subject?: string; message: string }) =>
      fetchApi('/contact/submit', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    reportBug: (data: { bugTitle: string; bugSteps: string; platform?: string }) =>
      fetchApi('/contact/bug-report', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
};
