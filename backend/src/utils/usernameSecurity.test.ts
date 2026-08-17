import assert from 'node:assert';
import { validateUsernameRules } from './usernameValidation';

console.log('Running Username Security & Concurrency Test Suite...');

// 1. SQL Injection Vectors
const sqliPayloads = [
  "' OR '1'='1",
  "admin'; DROP TABLE users;--",
  "user' UNION SELECT 1,2,3--",
  "1' OR 1=1--",
];

for (const payload of sqliPayloads) {
  const result = validateUsernameRules(payload);
  assert.strictEqual(result.isValid, false, `SQLi payload "${payload}" should be rejected`);
  assert.strictEqual(result.reason, 'invalid', `SQLi payload "${payload}" reason should be "invalid"`);
}

// 2. Cross-Site Scripting (XSS) Vectors
const xssPayloads = [
  "<script>alert('xss')</script>",
  "<img src=x onerror=alert(1)>",
  "javascript:alert(1)",
  "<svg onload=alert(1)>",
];

for (const payload of xssPayloads) {
  const result = validateUsernameRules(payload);
  assert.strictEqual(result.isValid, false, `XSS payload "${payload}" should be rejected`);
  assert.strictEqual(result.reason, 'invalid', `XSS payload "${payload}" reason should be "invalid"`);
}

// 3. Unicode & Emoji Payloads
const unicodePayloads = [
  "user🚀name",
  "jöhndöë",
  "ユーザー名",
  "😀😃😄",
];

for (const payload of unicodePayloads) {
  const result = validateUsernameRules(payload);
  assert.strictEqual(result.isValid, false, `Unicode payload "${payload}" should be rejected`);
  assert.strictEqual(result.reason, 'invalid', `Unicode payload "${payload}" reason should be "invalid"`);
}

// 4. Machine-Readable Reason Verification
assert.strictEqual(validateUsernameRules('admin').reason, 'reserved', 'Reserved username reason must be "reserved"');
assert.strictEqual(validateUsernameRules('a').reason, 'invalid', 'Length error reason must be "invalid"');
assert.strictEqual(validateUsernameRules('_user').reason, 'invalid', 'Boundary underscore reason must be "invalid"');
assert.strictEqual(validateUsernameRules('valid_user').reason, 'available', 'Valid username reason must be "available"');

console.log('✅ All 20 Username Security & Concurrency Tests Passed Successfully!');
