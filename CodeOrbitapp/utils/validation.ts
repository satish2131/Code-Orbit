export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'root',
  'system',
  'support',
  'api',
  'www',
  'login',
  'signup',
  'help',
  'settings',
  'profile',
  'me',
  'dashboard',
  'auth',
  'user',
  'guest',
  'null',
  'undefined',
]);

export const validateEmail = (email: string): ValidationResult => {
  if (!email || email.trim().length === 0) {
    return { isValid: false, error: 'Email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }
  
  if (email.length > 254) {
    return { isValid: false, error: 'Email is too long' };
  }
  
  return { isValid: true };
};

export const validateUsername = (username?: string): ValidationResult => {
  if (!username || username.trim().length === 0) {
    return { isValid: false, error: 'Username is required' };
  }

  const trimmed = username.trim().normalize('NFKC').toLowerCase();

  if (trimmed.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters' };
  }

  if (trimmed.length > 30) {
    return { isValid: false, error: 'Username must be at most 30 characters' };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }

  if (trimmed.startsWith('_') || trimmed.endsWith('_')) {
    return { isValid: false, error: 'Username cannot start or end with an underscore' };
  }

  if (/__/.test(trimmed)) {
    return { isValid: false, error: 'Username cannot contain consecutive underscores' };
  }

  if (RESERVED_USERNAMES.has(trimmed)) {
    return { isValid: false, error: 'This username is reserved' };
  }

  return { isValid: true };
};

export const validatePassword = (password: string): ValidationResult => {
  if (!password || password.length === 0) {
    return { isValid: false, error: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters' };
  }
  
  if (password.length > 128) {
    return { isValid: false, error: 'Password is too long' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }
  
  return { isValid: true };
};

export const validateName = (name: string): ValidationResult => {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'Name is required' };
  }
  
  if (name.trim().length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters' };
  }
  
  if (name.trim().length > 50) {
    return { isValid: false, error: 'Name is too long' };
  }
  
  return { isValid: true };
};

export const validateSessionCode = (code: string): ValidationResult => {
  if (!code || code.trim().length === 0) {
    return { isValid: false, error: 'Session code is required' };
  }
  
  if (code.trim().length !== 6) {
    return { isValid: false, error: 'Session code must be 6 characters' };
  }
  
  return { isValid: true };
};
