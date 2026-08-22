import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

const cases = [
  ['GET', '/api/affiliate/commission-tiers'],
  ['GET', '/api/affiliate/settings'],
  ['GET', '/api/affiliate/overview'],
  ['GET', '/api/affiliate/overview/1'],
  ['GET', '/api/affiliate/wallet'],
  ['POST', '/api/affiliate/wallet/accounts'],
  ['POST', '/api/affiliate/wallet/withdrawals'],
  ['GET', '/api/affiliate/withdrawals'],
  ['GET', '/api/affiliate/withdrawals/1'],
  ['PATCH', '/api/affiliate/withdrawals/1/reject'],
  ['POST', '/api/affiliate/withdrawals/1/pay'],
  ['GET', '/api/affiliate/commission-reconciliation/preview'],
  ['POST', '/api/affiliate/commission-reconciliation/run'],
];

const server = app.listen(0, '127.0.0.1');
const results = [];
let failure = null;
const originalConsoleError = console.error;
console.error = () => {};
try {
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const { port } = server.address();
  for (const [method, path] of cases) {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(method === 'GET' ? {} : { body: '{}' }),
    });
    await response.text();
    results.push({ method, path, status: response.status, passed: response.status === 401 });
  }
  const failed = results.filter((row) => !row.passed);
  if (failed.length) failure = `${failed.length} protected Affiliate endpoint(s) did not return HTTP 401.`;
  console.log(JSON.stringify({ success: !failure, summary: { checks: results.length, passed: results.filter((row) => row.passed).length, failed: failed.length }, results, ...(failure ? { failure } : {}) }, null, 2));
} catch (error) {
  failure = error.message;
  originalConsoleError(JSON.stringify({ success: false, failure }, null, 2));
} finally {
  await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
  console.error = originalConsoleError;
}
if (failure) process.exitCode = 1;
