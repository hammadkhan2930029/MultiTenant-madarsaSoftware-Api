import { prisma } from '../../config/prisma.js';

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'authorization',
  'accessToken',
  'refreshToken',
  'hashedPassword',
]);

const redact = (value) => {
  if (!value) return value;

  if (Array.isArray(value)) {
    return value.map((item) => redact(item));
  }

  if (typeof value !== 'object') return value;

  return {
    ...Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        SENSITIVE_KEYS.has(key) ? '[REDACTED]' : redact(item),
      ])
    ),
  };
};

const toJson = (value) => {
  if (value === undefined || value === null) return null;
  return JSON.stringify(redact(value));
};

const normalizeTenantId = (value) => (value === null || value === undefined || value === '' ? null : Number(value));
const normalizeActorId = (value) => (value === null || value === undefined || value === '' ? null : Number(value));
const normalizeTargetId = (value) => (value === null || value === undefined || value === '' ? null : Number(value));

const buildAuditPayload = (eventType, req, details = {}) => ({
  eventType,
  timestamp: new Date().toISOString(),
  requestId: req.headers?.['x-request-id'] || null,
  method: req.method,
  path: req.originalUrl,
  tenantId: req.auth?.tenantId ?? req.tenantId ?? null,
  actorId: req.auth?.admin?.id ?? null,
  roleName: req.auth?.roleName ?? null,
  ip: req.ip,
  details: redact(details),
});

export const auditService = {
  async recordAuditLog(client = prisma, entry = {}) {
    try {
      const tenantId = normalizeTenantId(entry.tenantId);
      const actorUserId = normalizeActorId(entry.actorUserId);
      const targetId = normalizeTargetId(entry.targetId);
      const oldValue = toJson(entry.oldValue);
      const newValue = toJson(entry.newValue);

      await client.$executeRaw`
        INSERT INTO audit_logs
          (tenant_id, actor_user_id, action, module, target_type, target_id, old_value, new_value, ip_address, user_agent)
        VALUES
          (${tenantId}, ${actorUserId}, ${entry.action}, ${entry.module}, ${entry.targetType}, ${targetId},
           ${oldValue}, ${newValue}, ${entry.ipAddress || null}, ${entry.userAgent || null})
      `;
    } catch (error) {
      console.warn(`[audit] failed_to_persist ${JSON.stringify({ action: entry.action, module: entry.module, reason: error.message })}`);
    }
  },

  buildRequestAuditContext(req) {
    return {
      ipAddress: req.ip || req.headers?.['x-forwarded-for'] || null,
      userAgent: req.headers?.['user-agent'] || null,
    };
  },

  logSecurityEvent(eventType, req, details = {}) {
    const payload = buildAuditPayload(eventType, req, details);
    console.info(`[audit] ${JSON.stringify(payload)}`);
  },

  logAuthorizationDenied(req, details = {}) {
    const payload = buildAuditPayload('authorization.denied', req, details);
    console.warn(`[audit] ${JSON.stringify(payload)}`);
  },
};
