const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('dated menu schedules are readable by display and writable by the admin only', () => {
  const firestore = read('firebase/firestore.js');
  const rules = read('firestore.rules');
  assert.ok(firestore.includes('doc(db, "menuSchedules", date)'));
  assert.ok(firestore.includes('export async function importMenuSchedules(records)'));
  assert.ok(firestore.includes('export async function saveMenuSchedule(record)'));
  assert.ok(rules.includes('match /menuSchedules/{date}'));
  assert.ok(rules.includes('allow read: if true;'));
  assert.ok(rules.includes('allow write: if isAdmin();'));
});

test('bundled 2026 menu history contains 192 Monday-to-Saturday dates without duplicates', () => {
  const compressed = fs.readFileSync(path.join(root, 'data/menu-schedules-2026.json.gz'));
  const payload = JSON.parse(zlib.gunzipSync(compressed).toString('utf8'));
  assert.equal(payload.records.length, 192);
  assert.equal(payload.records[0].date, '2026-04-20');
  assert.equal(payload.records.at(-1).date, '2026-11-28');
  assert.equal(new Set(payload.records.map(record => record.date)).size, 192);
  for (const record of payload.records) {
    const day = new Date(record.date + 'T12:00:00+09:00').getDay();
    assert.ok(day >= 1 && day <= 6, record.date + ' must be Monday to Saturday');
    assert.ok(Array.isArray(record.lunch?.sourceItems));
    assert.ok(Array.isArray(record.dinner?.sourceItems));
  }
});

test('admin page exposes bulk import and per-date editing', () => {
  const html = read('admin/menu-schedules.html');
  const source = read('admin/menu-schedules.js');
  assert.ok(html.includes('id="importBtn"'));
  assert.ok(html.includes('id="dateSelect"'));
  assert.ok(html.includes('id="lunchMain"'));
  assert.ok(html.includes('id="dinnerMain"'));
  assert.ok(source.includes('importMenuSchedules(records)'));
  assert.ok(source.includes('saveMenuSchedule(updated)'));
  assert.ok(source.includes('menu-schedules-2026.json.gz'));
});

test('menu schedule browser and Firestore modules pass JavaScript syntax checks', () => {
  for (const file of ['admin/menu-schedules.js', 'firebase/firestore.js']) {
    const result = spawnSync(process.execPath, ['--input-type=module', '--check'], {
      input: read(file),
      encoding: 'utf8'
    });
    assert.equal(result.status, 0, file + ': ' + result.stderr);
  }
});
