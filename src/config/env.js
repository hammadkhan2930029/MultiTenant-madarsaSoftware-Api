import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = [
  'PORT',
  'NODE_ENV',
  'APP_NAME',
  'APP_ORIGIN',
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
];

for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const parseCsv = (value = '') =>
  value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const parseOrigins = (value = '') =>
  value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

export const env = {
  port: Number(process.env.PORT),
  nodeEnv: process.env.NODE_ENV,
  appName: process.env.APP_NAME,
  appOrigin: process.env.APP_ORIGIN,
  appOrigins: parseOrigins(process.env.APP_ORIGIN),
  tenantBaseDomains: parseCsv(process.env.TENANT_BASE_DOMAINS || 'localhost,lvh.me,localtest.me'),
  tenantSystemHosts: parseCsv(process.env.TENANT_SYSTEM_HOSTS || 'localhost,127.0.0.1,::1'),
  tenantSystemSubdomains: parseCsv(process.env.TENANT_SYSTEM_SUBDOMAINS || 'api,app,admin,www,demoapi'),
  defaultTenantCode: process.env.DEFAULT_TENANT_CODE || 'default',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN,
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || process.env.SMTP_USER || '',
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpRejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false',
  suggestionsRecipientEmail: process.env.SUGGESTIONS_RECIPIENT_EMAIL || 'info@cogentdevs.com',
  supportRecipientEmail: process.env.SUPPORT_RECIPIENT_EMAIL || 'info@cogentdevs.com',
};
