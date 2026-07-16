import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');
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

const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8');

const migration = read('prisma/migrations/20260716000600_add_branch_performance_indexes/migration.sql');
const schema = read('prisma/schema.prisma');
const tenantsService = read('src/modules/tenants/tenants.service.js');
const storeService = read('src/modules/store/store.service.js');

try {
  assert(migration.includes('finance_tx_tenant_branch_status_date_idx'), 'Finance transaction branch/date/status index migration exists');
  assert(migration.includes('fee_vouchers_tenant_status_paid_date_idx'), 'Fee paid-date report index migration exists');
  assert(migration.includes('purchases_tenant_branch_status_date_idx'), 'Store purchase branch/date/status index migration exists');
  assert(migration.includes('purchase_items_tenant_branch_item_idx'), 'Store purchase item branch/item ledger index migration exists');
  assert(migration.includes('stock_issues_tenant_branch_item_date_idx'), 'Stock issue branch/item/date index migration exists');
  assert(migration.includes('student_att_tenant_branch_date_idx'), 'Student attendance branch/date index migration exists');
  assert(schema.includes('@@index([tenantId, branchId, status, transactionDate])'), 'Prisma schema tracks finance branch/date/status index');
  assert(schema.includes('@@index([tenantId, branchId, status, purchaseDate])'), 'Prisma schema tracks store purchase branch/date/status index');
  assert(schema.includes('@@index([tenantId, status, paidDate])'), 'Prisma schema tracks fee paid-date index');
  assert(tenantsService.includes('getBranchStatsMap') && tenantsService.includes('branch.groupBy'), 'Tenant branch summary uses grouped branch stats');
  assert(tenantsService.includes('getTenantAdminDetailsMap') && tenantsService.includes('ROW_NUMBER() OVER'), 'Tenant branch summary bulk-loads tenant admins');
  assert(!tenantsService.includes('tenants.map(async (tenant)'), 'Tenant branch summary avoids per-tenant async N+1 map');
  assert(storeService.includes('getBranchStockQuantitySql'), 'Store branch stock report uses branch-aware quantity expression');
} finally {
  console.table(results);
}
