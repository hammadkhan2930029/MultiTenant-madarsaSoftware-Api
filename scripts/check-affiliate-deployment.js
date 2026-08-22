import { prisma } from '../src/config/prisma.js';

const requiredTables = [
  'affiliate_commission_tiers',
  'affiliate_settings',
  'affiliate_commissions',
  'affiliate_payment_accounts',
  'affiliate_withdrawal_requests',
  'affiliate_payments',
];
const requiredTenantColumns = ['referral_code', 'referred_by_tenant_id', 'referred_at', 'sale_amount', 'sale_currency'];
const requiredUniqueIndexes = [
  ['affiliate_commissions', 'affiliate_commissions_referred_tenant_id_key'],
  ['affiliate_payments', 'affiliate_payments_withdrawal_request_id_key'],
  ['affiliate_settings', 'affiliate_settings_scope_key_key'],
];
const requiredMigrations = [
  '20260820000100_add_affiliate_commission_tiers',
  '20260820000200_add_affiliate_settings',
  '20260820000300_add_affiliate_wallet_ledger',
];

const report = { success: true, checks: {}, missing: {} };
try {
  const [tables, columns, indexes, migrations] = await Promise.all([
    prisma.$queryRawUnsafe("SELECT TABLE_NAME AS tableName FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'affiliate_%'"),
    prisma.$queryRawUnsafe("SELECT COLUMN_NAME AS columnName FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant'"),
    prisma.$queryRawUnsafe("SELECT TABLE_NAME AS tableName, INDEX_NAME AS indexName, NON_UNIQUE AS nonUnique FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'affiliate_%'"),
    prisma.$queryRawUnsafe("SELECT migration_name AS migrationName, finished_at AS finishedAt, rolled_back_at AS rolledBackAt FROM _prisma_migrations WHERE migration_name LIKE '20260820000%'"),
  ]);
  const tableSet = new Set(tables.map((row) => row.tableName || row.TABLE_NAME));
  const columnSet = new Set(columns.map((row) => row.columnName || row.COLUMN_NAME));
  const uniqueIndexSet = new Set(indexes.filter((row) => Number(row.nonUnique ?? row.NON_UNIQUE) === 0).map((row) => `${row.tableName || row.TABLE_NAME}:${row.indexName || row.INDEX_NAME}`));
  const appliedMigrationSet = new Set(migrations.filter((row) => (row.finishedAt || row.finished_at) && !(row.rolledBackAt || row.rolled_back_at)).map((row) => row.migrationName || row.migration_name));

  report.missing.tables = requiredTables.filter((name) => !tableSet.has(name));
  report.missing.tenantColumns = requiredTenantColumns.filter((name) => !columnSet.has(name));
  report.missing.uniqueIndexes = requiredUniqueIndexes.filter(([table, index]) => !uniqueIndexSet.has(`${table}:${index}`)).map(([table, index]) => `${table}.${index}`);
  report.missing.migrations = requiredMigrations.filter((name) => !appliedMigrationSet.has(name));
  report.checks = {
    requiredTables: `${requiredTables.length - report.missing.tables.length}/${requiredTables.length}`,
    tenantColumns: `${requiredTenantColumns.length - report.missing.tenantColumns.length}/${requiredTenantColumns.length}`,
    uniqueIndexes: `${requiredUniqueIndexes.length - report.missing.uniqueIndexes.length}/${requiredUniqueIndexes.length}`,
    appliedMigrations: `${requiredMigrations.length - report.missing.migrations.length}/${requiredMigrations.length}`,
  };
  report.success = Object.values(report.missing).every((items) => items.length === 0);
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.success = false;
  report.error = error.message;
  console.error(JSON.stringify(report, null, 2));
} finally {
  await prisma.$disconnect();
}
if (!report.success) process.exitCode = 1;
