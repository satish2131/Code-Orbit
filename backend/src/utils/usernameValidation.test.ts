import assert from 'node:assert';
import { validateUsernameRules } from './usernameValidation';

console.log('Running Username Validation Unit Tests...');

// 1. Valid Usernames
assert.strictEqual(validateUsernameRules('johndoe').isValid, true, 'johndoe should be valid');
assert.strictEqual(validateUsernameRules('user_123').isValid, true, 'user_123 should be valid');
assert.strictEqual(validateUsernameRules('CODE_SYNC').isValid, true, 'CODE_SYNC should be valid');
assert.strictEqual(validateUsernameRules('CODE_SYNC').normalized, 'code_sync', 'CODE_SYNC should normalize to code_sync');

// 2. Case-Insensitive Normalization
assert.strictEqual(validateUsernameRules('JohnDoe').normalized, 'johndoe', 'JohnDoe should normalize to johndoe');
assert.strictEqual(validateUsernameRules('JOHNDOE').normalized, 'johndoe', 'JOHNDOE should normalize to johndoe');

// 3. Missing or Empty Usernames
assert.strictEqual(validateUsernameRules('').isValid, false, 'Empty string should be invalid');
assert.strictEqual(validateUsernameRules('   ').isValid, false, 'Whitespace string should be invalid');
assert.strictEqual(validateUsernameRules(undefined).isValid, false, 'Undefined should be invalid');

// 4. Minimum / Maximum Length Rules
assert.strictEqual(validateUsernameRules('jo').isValid, false, 'Under 3 chars should be invalid');
assert.strictEqual(validateUsernameRules('a'.repeat(31)).isValid, false, 'Over 30 chars should be invalid');
assert.strictEqual(validateUsernameRules('abc').isValid, true, '3 chars should be valid');
assert.strictEqual(validateUsernameRules('a'.repeat(30)).isValid, true, '30 chars should be valid');

// 5. Reserved Usernames
assert.strictEqual(validateUsernameRules('admin').isValid, false, 'admin should be reserved');
assert.strictEqual(validateUsernameRules('ADMIN').isValid, false, 'ADMIN should be reserved');
assert.strictEqual(validateUsernameRules('support').isValid, false, 'support should be reserved');
assert.strictEqual(validateUsernameRules('root').isValid, false, 'root should be reserved');
assert.strictEqual(validateUsernameRules('api').isValid, false, 'api should be reserved');

// 6. Invalid Characters & Spaces
assert.strictEqual(validateUsernameRules('john doe').isValid, false, 'Space should be invalid');
assert.strictEqual(validateUsernameRules('john@doe').isValid, false, 'Special char @ should be invalid');
assert.strictEqual(validateUsernameRules('john!sync').isValid, false, 'Special char ! should be invalid');

// 7. Underscore Boundaries & Consecutive Underscores
assert.strictEqual(validateUsernameRules('_johndoe').isValid, false, 'Leading underscore should be invalid');
assert.strictEqual(validateUsernameRules('johndoe_').isValid, false, 'Trailing underscore should be invalid');
assert.strictEqual(validateUsernameRules('john__doe').isValid, false, 'Consecutive underscores should be invalid');
assert.strictEqual(validateUsernameRules('john_doe_sync').isValid, true, 'Single non-consecutive underscores should be valid');

console.log('✅ All 20 Username Validation Unit Tests Passed Successfully!');
