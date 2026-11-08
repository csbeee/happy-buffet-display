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

test('tablet meal entry searches by company name, aliases and ledger number without a second code step', () => {
  const source = read('meal-management/meal-entry.js');
  const html = read('meal-management/index.html');
  assert.ok(source.includes('company.ledgerNumber'));
  assert.ok(source.includes('companySearchText'));
  assert.equal(html.includes('codePanel'), false);
  assert.equal(html.includes('companyCode'), false);
});

test('meal entry writes visit counter and entry atomically', () => {
  const source = read('meal-management/meal-entry.js');
  assert.ok(source.includes('mealEntryCounters'));
  assert.ok(source.includes('transaction.set(counterRef'));
  assert.ok(source.includes('transaction.set(entryRef'));
  assert.ok(source.includes('signatureDataUrl'));
  assert.ok(source.includes('representativeName: ""'));
  assert.ok(source.includes('rosterIds'));
});

test('meal entry and admin JavaScript parse successfully', () => {
  const moduleFiles = [
    'meal-management/meal-entry.js',
    'admin/auth.js',
    'admin/company-management.js',
    'admin/meal-entries.js',
    'admin/reports.js',
    'admin/statements.js',
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

test('admin meal ledger page supports filters, totals, details and edits with audit history', () => {
  const html = read('admin/meal-entries.html');
  const source = read('admin/meal-entries.js');
  assert.ok(read('admin/index.html').includes('./meal-entries.html'));
  assert.ok(html.includes('startDate') && html.includes('companyFilter') && html.includes('periodFilter'));
  assert.ok(source.includes('mealEntryEditHistory'));
  assert.ok(source.includes('runTransaction(db'));
  assert.ok(source.includes('signatureDataUrl'));
  assert.ok(source.includes('before,after:{...next}'));
  assert.ok(source.includes('const auditValue='), 'audit history formats roster IDs for display');
  assert.ok(source.includes('rosterById.get(id)'), 'audit history resolves roster IDs to member names');
  assert.ok(source.includes('auditValue(f.key,h.before?.[f.key])'), 'audit history formats both before and after values');
});


test('sales reports are separated from the meal ledger page', () => {
  const ledgerHtml = read('admin/meal-entries.html');
  const reportHtml = read('admin/reports.html');
  const reportSource = read('admin/reports.js');
  assert.ok(read('admin/index.html').includes('./reports.html'));
  assert.ok(ledgerHtml.includes('./reports.html'));
  assert.equal(ledgerHtml.includes('dailyReportRows'), false);
  for (const id of ['dailyReportRows', 'companyReportRows', 'monthlyReportRows']) assert.ok(reportHtml.includes(id));
  assert.ok(reportSource.includes('function renderReports'));
  assert.ok(reportSource.includes('function aggregate'));
  assert.ok(reportSource.includes('totalAmount'));
});


test('company management uses one selected company for details and roster workflow', () => {
  const html = read('admin/index.html');
  const source = read('admin/company-management.js');
  assert.ok(html.includes('id="companyEditSelect"'));
  assert.ok(html.includes('id="rosterCompanySelect" hidden'));
  assert.ok(html.includes('id="rosterManagerPanel"'));
  assert.ok(html.includes('id="companyNewButton"'));
  assert.equal(html.includes('rosterManagerModal'), false);
  assert.ok(source.includes('const companyId = editSelect.value;'));
  assert.ok(source.includes('newCompanyButton?.addEventListener'));
  assert.ok(source.includes('$("rosterCompanyCaption").textContent'));
});


test('monthly transaction statement groups existing meal entries by date and supports one-page A4 preview/print', () => {
  const html = read('admin/statements.html');
  const source = read('admin/statements.js');
  const style = read('admin/statements.css');
  assert.ok(read('admin/index.html').includes('./statements.html'));
  assert.ok(read('admin/reports.html').includes('./statements.html'));
  assert.ok(html.includes('id="companySelect"') && html.includes('id="monthSelect"'));
  assert.ok(html.includes('id="statementRows"') && html.includes('id="printBtn"'));
  assert.ok(source.includes('collection(db,"mealEntries")'));
  assert.ok(source.includes('buildMonthlyStatementRows'));
  assert.ok(read('admin/settlement-utils.mjs').includes('entry?.companyId !== companyId'));
  assert.ok(source.includes('tax:Math.round(day.amount*0.1)'));
  assert.ok(source.includes('recipientTotal'));
  assert.ok(html.includes('사업자번호') && html.includes('대표자명') && html.includes('도장/서명'));
  for (const id of ['supplierBusinessNo','supplierName','supplierRepresentative','supplierAddress','supplierBusinessType','supplierBusinessItem','supplierPhone','saveSupplierBtn']) assert.ok(html.includes(`id="${id}"`));
  assert.ok(source.includes('localStorage.setItem(supplierStorageKey'));
  assert.ok(source.includes('loadSupplierProfile()'));
  assert.ok(html.includes('공급가액') && html.includes('세액') && html.includes('일자(요일)'));
  assert.ok(source.includes('window.print()'));
  assert.ok(style.includes('@page{size:A4 portrait'));
  assert.ok(style.includes('@media print'));
});


test('monthly settlement filters company and month, preserves explicit zero amounts, and reconciles VAT', async () => {
  const { buildMonthlyStatementRows, entrySupplyAmount } = await import(
    require('node:url').pathToFileURL(path.join(root, 'admin/settlement-utils.mjs')).href
  );
  assert.equal(entrySupplyAmount({ headcount: 3, mealPrice: 7000, totalAmount: 0 }), 0);
  assert.equal(entrySupplyAmount({ headcount: 3, mealPrice: 7000 }), 21000);

  const rows = buildMonthlyStatementRows([
    { companyId: 'A', serviceDate: '2026-10-01', mealPeriod: 'lunch', headcount: 1, mealPrice: 1, totalAmount: 1 },
    { companyId: 'A', serviceDate: '2026-10-02', mealPeriod: 'dinner', headcount: 1, mealPrice: 1, totalAmount: 1 },
    { companyId: 'A', serviceDate: '2026-10-03', mealPeriod: 'lunch', headcount: 1, mealPrice: 3, totalAmount: 3 },
    { companyId: 'B', serviceDate: '2026-10-03', mealPeriod: 'lunch', headcount: 10, mealPrice: 7000, totalAmount: 70000 },
    { companyId: 'A', serviceDate: '2026-11-01', mealPeriod: 'lunch', headcount: 5, mealPrice: 7000, totalAmount: 35000 },
    { companyId: 'A', serviceDate: '2026-10-04', mealPeriod: 'snack', headcount: 2, mealPrice: 1000, totalAmount: 2000 },
    { companyId: 'A', serviceDate: '2026-10-05', mealPeriod: 'lunch', headcount: 0, mealPrice: 7000, totalAmount: 0 }
  ], 'A', '2026-10-01', '2026-10-31');

  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map(row => row.tax), [0, 0, 1]);
  assert.equal(rows.reduce((sum, row) => sum + row.amount, 0), 5);
  assert.equal(rows.reduce((sum, row) => sum + row.tax, 0), Math.round(5 * 0.1));
  assert.equal(rows.reduce((sum, row) => sum + row.people, 0), 3);
});
