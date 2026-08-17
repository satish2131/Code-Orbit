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

export type UsernameUnavailabilityReason = 'available' | 'taken' | 'reserved' | 'invalid';

export interface UsernameValidationResult {
  isValid: boolean;
  reason: UsernameUnavailabilityReason;
  error?: string;
  normalized?: string;
}

export const validateUsernameRules = (username?: string): UsernameValidationResult => {
  if (!username || username.trim().length === 0) {
    return { isValid: false, reason: 'invalid', error: 'Username is required' };
  }

  const trimmed = username.trim().normalize('NFKC').toLowerCase();

  if (trimmed.length < 3) {
    return { isValid: false, reason: 'invalid', error: 'Username must be at least 3 characters' };
  }

  if (trimmed.length > 30) {
    return { isValid: false, reason: 'invalid', error: 'Username must be at most 30 characters' };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return { isValid: false, reason: 'invalid', error: 'Username can only contain letters, numbers, and underscores' };
  }

  if (trimmed.startsWith('_') || trimmed.endsWith('_')) {
    return { isValid: false, reason: 'invalid', error: 'Username cannot start or end with an underscore' };
  }

  if (/__/.test(trimmed)) {
    return { isValid: false, reason: 'invalid', error: 'Username cannot contain consecutive underscores' };
  }

  if (RESERVED_USERNAMES.has(trimmed)) {
    return { isValid: false, reason: 'reserved', error: 'This username is reserved' };
  }

  return { isValid: true, reason: 'available', normalized: trimmed };
};
