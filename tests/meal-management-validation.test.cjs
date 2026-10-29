const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('callable functions do not require App Check in this branch', () => {
  const source = read('functions/index.js');
  assert.ok(source.includes('exports.verifyCompanyCode = onCall'));
  assert.ok(source.includes('exports.submitMealEntry = onCall'));
  assert.equal(source.includes('enforceAppCheck: true'), false);
  assert.ok(source.includes('enforceAppCheck: false'));
});

test('company code verification issues short-lived, one-time server tickets with attempt limiting', () => {
  const source = read('functions/index.js');
  assert.ok(source.includes('CODE_ATTEMPT_LIMIT = 8'));
  assert.ok(source.includes('CODE_ATTEMPT_WINDOW_MS'));
  assert.ok(source.includes('tx.create(ticketRef'));
  assert.ok(source.includes('TICKET_TTL_MS'));
  assert.ok(source.includes('timingSafeEqual'));
});

test('meal submission validates signature, headcount, ticket and idempotency record', () => {
  const source = read('functions/index.js');
  assert.ok(source.includes('headcount < 1'));
  assert.ok(source.includes('signatureDataUrl.length > 200000'));
  assert.ok(source.includes('ticketData.usedAt'));
  assert.ok(source.includes('expiresAt <= now'));
  assert.ok(source.includes('tx.create(entryRef'));
  assert.ok(source.includes('existingEntry.exists'));
});

test('selected roster records must belong to the billed company and be active', () => {
  const source = read('functions/index.js');
  assert.ok(source.includes('rawRosterIds.length > 500'));
  assert.ok(source.includes('snap.data().companyId === companyId'));
  assert.ok(source.includes('snap.data().active !== false'));
  assert.ok(source.includes('if (!rosterIsValid)'));
});

test('meal entry, admin auth and Firebase config JavaScript parse successfully', () => {
  const commonJsFiles = ['functions/index.js'];
  for (const file of commonJsFiles) {
    const result = spawnSync(process.execPath, ['--check', path.join(root, file)], { encoding: 'utf8' });
    assert.equal(result.status, 0, file + ': ' + result.stderr);
  }

  const moduleFiles = [
    'meal-management/meal-entry.js',
    'admin/auth.js',
    'admin/company-management.js',
    'firebase/firebase-config.js'
  ];
  for (const file of moduleFiles) {
    const result = spawnSync(process.execPath, ['--input-type=module', '--check'], {
      input: read(file),
      encoding: 'utf8'
    });
    assert.equal(result.status, 0, file + ': ' + result.stderr);
  }
});
