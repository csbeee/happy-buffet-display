const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('tablet meal entry does not depend on Firebase Functions', () => {
  const source = read('meal-management/meal-entry.js');
  assert.equal(/getFunctions|httpsCallable|verifyCompanyCodeCall|submitMealEntryCall/.test(source), false);
  assert.ok(source.includes('runTransaction(db'));
  assert.ok(source.includes('companies'));
  assert.ok(source.includes('ledgerNumber'));
  assert.ok(source.includes('mealEntries'));
});

test('tablet meal entry preserves three-digit on-site ledger code validation', () => {
  const source = read('meal-management/meal-entry.js');
  assert.ok(source.includes('/^\\d{3}$/'));
  assert.ok(source.includes('selectedCompany.ledgerNumber'));
  assert.ok(source.includes('현장 확인용 3자리 번호'));
});

test('meal entry writes visit counter and entry atomically', () => {
  const source = read('meal-management/meal-entry.js');
  assert.ok(source.includes('mealEntryCounters'));
  assert.ok(source.includes('transaction.set(counterRef'));
  assert.ok(source.includes('transaction.set(entryRef'));
  assert.ok(source.includes('signatureDataUrl'));
  assert.ok(source.includes('rosterIds'));
});

test('meal entry and admin JavaScript parse successfully', () => {
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
