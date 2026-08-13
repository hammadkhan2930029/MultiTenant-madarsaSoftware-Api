import dotenv from 'dotenv';

dotenv.config();

const port = Number(process.env.PORT || 5002);
const baseUrl = process.env.HEALTH_BASE_URL || `http://127.0.0.1:${port}`;
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000);

try {
  const response = await fetch(`${baseUrl}/api/health`, { signal: controller.signal });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.data?.database !== 'connected') {
    throw new Error(`Health check failed with HTTP ${response.status}.`);
  }
  console.log(JSON.stringify({ healthy: true, baseUrl, ...result.data }, null, 2));
} catch (error) {
  console.error(`[health] ${baseUrl} is unavailable: ${error.message}`);
  process.exitCode = 1;
} finally {
  clearTimeout(timeout);
}
