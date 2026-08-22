import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { generateAdminToken } from '../src/utils/jwt.js';

const admins = await prisma.admin.findMany({
  where: { status: 'active' },
  include: { assignedRole: true, tenant: true },
  orderBy: { id: 'asc' },
});
const superAdmin = admins.find((row) => row.tenantId === null && row.branchId === null);
const tenantAdmin = admins.find((row) => row.tenantId !== null && row.branchId === null && row.assignedRole?.branchId === null);
const branchUser = admins.find((row) => row.tenantId !== null && row.branchId !== null);
const personas = { superAdmin, tenantAdmin, branchUser };
const missingPersonas = Object.entries(personas).filter(([, value]) => !value).map(([key]) => key);

let failure = missingPersonas.length ? `Missing active test persona(s): ${missingPersonas.join(', ')}` : null;
const results = [];
const server = app.listen(0, '127.0.0.1');
const originalConsoleError = console.error;
console.error = () => {};
try {
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  if (!failure) {
    const port = server.address().port;
    const tokens = Object.fromEntries(Object.entries(personas).map(([name, admin]) => [name, generateAdminToken({ ...admin, roleDetails: admin.assignedRole })]));
    const tenantOrigin = (admin) => {
      if (!admin.tenant) return null;
      if (admin.tenant.customDomain) return `https://${admin.tenant.customDomain}`;
      return `http://${admin.tenant.subdomain || admin.tenant.tenantCode}.localhost:3000`;
    };
    const cases = [
      ['Super Admin can view Affiliate overview', 'superAdmin', '/api/affiliate/overview', 200],
      ['Tenant Admin cannot view Super Admin overview', 'tenantAdmin', '/api/affiliate/overview', 403],
      ['Branch user cannot view Super Admin overview', 'branchUser', '/api/affiliate/overview', 403],
      ['Tenant Admin can view own wallet', 'tenantAdmin', '/api/affiliate/wallet', 200],
      ['Super Admin cannot use a tenant wallet', 'superAdmin', '/api/affiliate/wallet', 403],
      ['Branch user cannot use the tenant wallet', 'branchUser', '/api/affiliate/wallet', 403],
      ['Tenant Admin cannot manage withdrawals as Super Admin', 'tenantAdmin', '/api/affiliate/withdrawals', 403],
      ['Branch user cannot manage withdrawals as Super Admin', 'branchUser', '/api/affiliate/withdrawals', 403],
    ];
    for (const [name, persona, path, expected] of cases) {
      const origin = tenantOrigin(personas[persona]);
      const response = await fetch(`http://127.0.0.1:${port}${path}`, { headers: { Authorization: `Bearer ${tokens[persona]}`, ...(origin ? { Origin: origin } : {}) } });
      const body = await response.json().catch(() => null);
      results.push({ name, expected, actual: response.status, passed: response.status === expected, ...(response.status === expected ? {} : { message: body?.message || null }) });
    }
    const failed = results.filter((row) => !row.passed);
    if (failed.length) failure = `${failed.length} authenticated role-boundary check(s) failed.`;
  }
} catch (error) {
  failure = error.message;
} finally {
  await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
  console.error = originalConsoleError;
}

console.log(JSON.stringify({ success: !failure, summary: { checks: results.length, passed: results.filter((row) => row.passed).length, failed: results.filter((row) => !row.passed).length }, results, ...(failure ? { failure } : {}) }, null, 2));
if (failure) process.exitCode = 1;
