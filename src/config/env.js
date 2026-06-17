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

export const env = {
  port: Number(process.env.PORT),
  nodeEnv: process.env.NODE_ENV,
  appName: process.env.APP_NAME,
  appOrigin: process.env.APP_ORIGIN,
  appOrigins: process.env.APP_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
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
