import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { generateAdminToken } from '../src/utils/jwt.js';

const admins = await prisma.admin.findMany({ where: { status: 'active' }, include: { assignedRole: true, tenant: true }, orderBy: { id: 'asc' } });
const personas = {
  superAdmin: admins.find((row) => row.tenantId === null && row.branchId === null),
  tenantAdmin: admins.find((row) => row.tenantId !== null && row.branchId === null && row.assignedRole?.branchId === null),
  branchUser: admins.find((row) => row.tenantId !== null && row.branchId !== null),
};
const missing = Object.entries(personas).filter(([, row]) => !row).map(([name]) => name);
let failure = missing.length ? `Missing active test persona(s): ${missing.join(', ')}` : null;
const results = [];
const server = app.listen(0, '127.0.0.1');
const originalConsoleError = console.error;
console.error = () => {};
const recordCounts = () => Promise.all([
  prisma.affiliatePaymentAccount.count(), prisma.affiliateWithdrawalRequest.count(), prisma.affiliatePayment.count(),
]);
try {
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  if (!failure) {
    const before = await recordCounts();
    const port = server.address().port;
    const tokens = Object.fromEntries(Object.entries(personas).map(([name, admin]) => [name, generateAdminToken({ ...admin, roleDetails: admin.assignedRole })]));
    const origin = (admin) => admin.tenant ? (admin.tenant.customDomain ? `https://${admin.tenant.customDomain}` : `http://${admin.tenant.subdomain || admin.tenant.tenantCode}.localhost:3000`) : null;
    const cases = [
      ['Tenant Admin reaches account validation', 'tenantAdmin', 'POST', '/api/affiliate/wallet/accounts', 400],
      ['Branch user cannot create payment account', 'branchUser', 'POST', '/api/affiliate/wallet/accounts', 403],
      ['Super Admin cannot create tenant payment account', 'superAdmin', 'POST', '/api/affiliate/wallet/accounts', 403],
      ['Tenant Admin reaches withdrawal validation', 'tenantAdmin', 'POST', '/api/affiliate/wallet/withdrawals', 400],
      ['Branch user cannot request withdrawal', 'branchUser', 'POST', '/api/affiliate/wallet/withdrawals', 403],
      ['Super Admin cannot request tenant withdrawal', 'superAdmin', 'POST', '/api/affiliate/wallet/withdrawals', 403],
      ['Super Admin reaches payment validation', 'superAdmin', 'POST', '/api/affiliate/withdrawals/1/pay', 400],
      ['Tenant Admin cannot record withdrawal payment', 'tenantAdmin', 'POST', '/api/affiliate/withdrawals/1/pay', 403],
      ['Branch user cannot record withdrawal payment', 'branchUser', 'POST', '/api/affiliate/withdrawals/1/pay', 403],
      ['Super Admin reaches rejection validation', 'superAdmin', 'PATCH', '/api/affiliate/withdrawals/1/reject', 400],
      ['Tenant Admin cannot reject withdrawal', 'tenantAdmin', 'PATCH', '/api/affiliate/withdrawals/1/reject', 403],
      ['Branch user cannot reject withdrawal', 'branchUser', 'PATCH', '/api/affiliate/withdrawals/1/reject', 403],
    ];
    for (const [name, persona, method, path, expected] of cases) {
      const requestOrigin = origin(personas[persona]);
      const response = await fetch(`http://127.0.0.1:${port}${path}`, { method, headers: { Authorization: `Bearer ${tokens[persona]}`, 'Content-Type': 'application/json', ...(requestOrigin ? { Origin: requestOrigin } : {}) }, body: '{}' });
      const body = await response.json().catch(() => null);
      results.push({ name, expected, actual: response.status, passed: response.status === expected, ...(response.status === expected ? {} : { message: body?.message || null }) });
    }
    const after = await recordCounts();
    results.push({ name: 'Invalid/denied writes create no financial records', expected: before.join(','), actual: after.join(','), passed: before.every((count, index) => count === after[index]) });
    const failed = results.filter((row) => !row.passed);
    if (failed.length) failure = `${failed.length} authenticated write-boundary check(s) failed.`;
  }
} catch (error) { failure = error.message; } finally {
  await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
  console.error = originalConsoleError;
}
console.log(JSON.stringify({ success: !failure, summary: { checks: results.length, passed: results.filter((row) => row.passed).length, failed: results.filter((row) => !row.passed).length }, results, ...(failure ? { failure } : {}) }, null, 2));
if (failure) process.exitCode = 1;
