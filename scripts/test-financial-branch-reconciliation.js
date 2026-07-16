import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const results = [];

const pass = (name, details = '') => results.push({ status: 'PASS', name, details });
const fail = (name, details = '') => {
  results.push({ status: 'FAIL', name, details });
  throw new Error(`${name}${details ? `: ${details}` : ''}`);
};
const assert = (condition, name, details = '') => {
  if (!condition) fail(name, details);
  pass(name, details);
};

const amount = (value) => {
  const next = Number(value || 0);
  return Number.isFinite(next) ? next : 0;
};

const branchMatches = (record, branchId) => !branchId || record.branchId === branchId;
const dateMatches = (record, fromDate, toDate) => {
  const time = new Date(record.date).getTime();
  return (!fromDate || time >= new Date(fromDate).getTime()) && (!toDate || time <= new Date(toDate).getTime());
};

const summarizeFinance = ({ records, branchId = null, fromDate = null, toDate = null }) => {
  const scoped = records.filter((record) => branchMatches(record, branchId) && dateMatches(record, fromDate, toDate) && record.status === 'active');
  const income = scoped.filter((record) => record.type === 'income').reduce((sum, record) => sum + amount(record.amount), 0);
  const expense = scoped.filter((record) => record.type === 'expense').reduce((sum, record) => sum + amount(record.amount), 0);
  return { income, expense, balance: income - expense, count: scoped.length };
};

const summarizeStock = ({ purchases, issues, returns, damages, adjustments, branchId = null }) => {
  const inQty = purchases.filter((row) => branchMatches(row, branchId) && row.status === 'active' && row.approvalStatus === 'approved').reduce((sum, row) => sum + amount(row.quantity), 0);
  const outQty = issues.filter((row) => branchMatches(row, branchId) && row.status === 'active' && row.approvalStatus === 'approved').reduce((sum, row) => sum + amount(row.quantity), 0);
  const returnQty = returns.filter((row) => branchMatches(row, branchId) && row.status === 'active' && row.condition === 'good' && row.addToStock).reduce((sum, row) => sum + amount(row.quantity), 0);
  const damagedQty = damages.filter((row) => branchMatches(row, branchId) && row.status === 'active' && row.approvalStatus === 'approved' && !row.returnId).reduce((sum, row) => sum + amount(row.quantity), 0);
  const adjustmentQty = adjustments.filter((row) => branchMatches(row, branchId) && row.status === 'active' && row.approvalStatus === 'approved').reduce((sum, row) => sum + amount(row.adjustedStock) - amount(row.previousStock), 0);
  return inQty - outQty + returnQty - damagedQty + adjustmentQty;
};

const runFormulaChecks = () => {
  const financeRecords = [
    { branchId: 1, type: 'income', amount: 1000, date: '2026-07-01', status: 'active' },
    { branchId: 1, type: 'expense', amount: 250, date: '2026-07-02', status: 'active' },
    { branchId: 2, type: 'income', amount: 500, date: '2026-07-02', status: 'active' },
    { branchId: 2, type: 'expense', amount: 50, date: '2026-07-03', status: 'active' },
    { branchId: 1, type: 'income', amount: 300, date: '2026-06-30', status: 'active' },
    { branchId: 1, type: 'income', amount: 900, date: '2026-07-03', status: 'inactive' },
  ];

  assert(summarizeFinance({ records: financeRecords, branchId: 1, fromDate: '2026-07-01', toDate: '2026-07-31' }).income === 1000, 'Branch income respects branch/date/status filters');
  assert(summarizeFinance({ records: financeRecords, branchId: 1, fromDate: '2026-07-01', toDate: '2026-07-31' }).expense === 250, 'Branch expense respects branch/date/status filters');
  assert(summarizeFinance({ records: financeRecords, fromDate: '2026-07-01', toDate: '2026-07-31' }).income === 1500, 'Tenant consolidated income includes all scoped branches once');
  assert(summarizeFinance({ records: financeRecords, fromDate: '2026-07-01', toDate: '2026-07-31' }).expense === 300, 'Tenant consolidated expense includes all scoped branches once');

  const stockRows = {
    purchases: [
      { branchId: 1, quantity: 10, status: 'active', approvalStatus: 'approved' },
      { branchId: 2, quantity: 7, status: 'active', approvalStatus: 'approved' },
      { branchId: 1, quantity: 3, status: 'active', approvalStatus: 'pending' },
    ],
    issues: [
      { branchId: 1, quantity: 4, status: 'active', approvalStatus: 'approved' },
      { branchId: 2, quantity: 2, status: 'active', approvalStatus: 'approved' },
    ],
    returns: [
      { branchId: 1, quantity: 1, status: 'active', condition: 'good', addToStock: true },
      { branchId: 2, quantity: 5, status: 'active', condition: 'damaged', addToStock: false },
    ],
    damages: [
      { branchId: 1, quantity: 2, status: 'active', approvalStatus: 'approved', returnId: null },
    ],
    adjustments: [
      { branchId: 1, previousStock: 5, adjustedStock: 8, status: 'active', approvalStatus: 'approved' },
      { branchId: 2, previousStock: 9, adjustedStock: 6, status: 'active', approvalStatus: 'approved' },
    ],
  };

  assert(summarizeStock({ ...stockRows, branchId: 1 }) === 8, 'Branch stock valuation quantity is branch-ledger based');
  assert(summarizeStock({ ...stockRows, branchId: 2 }) === 2, 'Other branch stock quantity is isolated');
  assert(summarizeStock(stockRows) === 10, 'Tenant stock reconciliation consolidates branch ledgers once');
};

const runStaticChecks = () => {
  const root = join(__dirname, '..');
  const storeService = readFileSync(join(root, 'src/modules/store/store.service.js'), 'utf8');
  const financialService = readFileSync(join(root, 'src/modules/finance/financial/financial.service.js'), 'utf8');
  const financeReports = readFileSync(join(root, 'src/modules/finance/reports/reports.service.js'), 'utf8');

  assert(storeService.includes('getBranchStockQuantitySql'), 'Store reports include branch stock quantity helper');
  assert(storeService.includes('SELECT SUM(pi.quantity)') && storeService.includes('SELECT SUM(si.quantity)'), 'Store branch stock helper reconciles purchase and issue ledgers');
  assert(storeService.includes("condition = 'good'") && storeService.includes('addToStock = true'), 'Store branch stock helper includes good returns only');
  assert(storeService.includes('adjustedStock - sa.previousStock'), 'Store branch stock helper includes adjustment delta');
  assert(storeService.includes('store_supplier_payments sp') && storeService.includes('sp.branch_id = ${branchId}'), 'Supplier report calculates branch balance from branch payments');
  assert(financialService.includes('...(branchId ? { branchId } : {})'), 'Financial service applies branch filter to direct finance records');
  assert(financialService.includes('paidAmount: { gt: 0 }'), 'Financial service counts only paid/partial fee income');
  assert(financeReports.includes("status: 'active'") && financeReports.includes("status: { in: ['paid', 'partial'] }"), 'Finance reports preserve active/status filters');
};

try {
  runFormulaChecks();
  runStaticChecks();
} finally {
  console.table(results);
}
