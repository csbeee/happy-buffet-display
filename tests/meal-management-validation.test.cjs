const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('both callable functions enforce App Check', () => {
  const source = read('functions/index.js');
  assert.ok(source.includes('exports.verifyCompanyCode = onCall'));
  assert.ok(source.includes('exports.submitMealEntry = onCall'));
  assert.ok(source.includes('enforceAppCheck: true'));
});

test('submission has server-side count, signature and ticket checks', () => {
  const source = read('functions/index.js');
  assert.ok(source.includes('headcount < 1'));
  assert.ok(source.includes('signatureDataUrl.length > 200000'));
  assert.ok(source.includes('ticketData.usedAt'));
  assert.ok(source.includes('expiresAt <= now'));
  assert.ok(source.includes('tx.create(entryRef'));
});
