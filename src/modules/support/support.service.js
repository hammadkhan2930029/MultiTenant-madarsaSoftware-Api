import { prisma } from '../../config/prisma.js';
import { env } from '../../config/env.js';
import { sendEmail } from '../../utils/smtpMailer.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';
import { normalizeTenantId } from '../../utils/tenantGuard.js';
import { branchScopeService } from '../security/index.js';

const supportRequestTableSql = `
CREATE TABLE IF NOT EXISTS support_requests (
  id INT NOT NULL AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  branch_id INT NULL,
  topic VARCHAR(120) NOT NULL,
  priority VARCHAR(50) NOT NULL DEFAULT 'normal',
  message TEXT NOT NULL,
  submitterName VARCHAR(150) NULL,
  submitterEmail VARCHAR(150) NULL,
  adminId INT NULL,
  emailRecipient VARCHAR(150) NULL,
  emailStatus VARCHAR(50) NOT NULL DEFAULT 'pending',
  emailError VARCHAR(500) NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX support_requests_tenant_id_idx (tenant_id),
  INDEX support_requests_branch_id_idx (branch_id),
  INDEX support_requests_status_idx (status),
  INDEX support_requests_priority_idx (priority),
  INDEX support_requests_adminId_idx (adminId),
  CONSTRAINT support_requests_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES Tenant(id),
  CONSTRAINT support_requests_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  CONSTRAINT support_requests_adminId_fkey FOREIGN KEY (adminId) REFERENCES admins(id) ON DELETE SET NULL
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
`;

const supportRequestBranchMigrationSql = `
ALTER TABLE support_requests
  ADD COLUMN IF NOT EXISTS branch_id INT NULL AFTER tenant_id;
`;

let supportRequestTablePromise = null;

const ensureSupportRequestTable = () => {
  if (!supportRequestTablePromise) {
    supportRequestTablePromise = prisma
      .$executeRawUnsafe(supportRequestTableSql)
      .then(() => prisma.$executeRawUnsafe(supportRequestBranchMigrationSql));
  }

  return supportRequestTablePromise;
};

const mapSupportRequest = (row) => ({
  id: row.id,
  tenantId: row.tenant_id ?? row.tenantId,
  branchId: row.branch_id ?? row.branchId ?? null,
  topic: row.topic,
  priority: row.priority,
  message: row.message,
  submitterName: row.submitterName,
  submitterEmail: row.submitterEmail,
  adminId: row.adminId,
  emailRecipient: row.emailRecipient,
  emailStatus: row.emailStatus,
  emailError: row.emailError,
  status: row.status,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const getScopedBranchId = (branchScope) => branchScope?.branchId || branchScope?.resolvedBranchId || null;

const resolveBranchId = async (tenantId, queryOrPayload = {}, branchScope = null) => {
  const branchId = getScopedBranchId(branchScope) || queryOrPayload.branchId || null;
  if (branchId) {
    await branchScopeService.validateBranchBelongsToTenant({ tenantId, branchId, requireActive: true });
  }
  return branchId;
};

const priorityLabels = {
  normal: 'عام',
  urgent: 'فوری',
  critical: 'انتہائی ضروری',
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const buildSupportEmail = (supportRequest) => {
  const rows = [
    ['نام', supportRequest.submitterName || 'نام دستیاب نہیں'],
    ['ای میل', supportRequest.submitterEmail || 'ای میل دستیاب نہیں'],
    ['موضوع', supportRequest.topic],
    ['اہمیت', priorityLabels[supportRequest.priority] || supportRequest.priority],
    ['تفصیل', supportRequest.message],
  ];

  const text = rows.map(([label, value]) => `${label}: ${value}`).join('\n\n');
  const htmlRows = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:10px;border:1px solid #d8e3ea;font-weight:700;white-space:nowrap;">${escapeHtml(label)}</td>
          <td style="padding:10px;border:1px solid #d8e3ea;">${escapeHtml(value).replace(/\n/g, '<br />')}</td>
        </tr>`
    )
    .join('');

  const html = `
    <div dir="rtl" style="font-family:Arial,Tahoma,sans-serif;line-height:1.8;color:#102033;">
      <h2 style="margin:0 0 16px;">نئی سپورٹ درخواست موصول ہوئی</h2>
      <table style="border-collapse:collapse;width:100%;max-width:720px;">${htmlRows}</table>
    </div>
  `;

  return { text, html };
};

const markEmailStatus = async ({ id, emailStatus, emailError = null }) => {
  await prisma.$executeRaw`
    UPDATE support_requests
    SET emailStatus = ${emailStatus}, emailError = ${emailError}, updatedAt = NOW()
    WHERE id = ${id}
  `;
};

export const supportService = {
  async createSupportRequest(tenantId, payload, admin, branchScope = null) {
    await ensureSupportRequestTable();
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, payload, branchScope);

    const submitterName = admin?.name || admin?.username || null;
    const submitterEmail = admin?.email || null;
    const emailRecipient = env.supportRecipientEmail;

    const [supportRequest] = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO support_requests (
          tenant_id,
          branch_id,
          topic,
          priority,
          message,
          submitterName,
          submitterEmail,
          adminId,
          emailRecipient,
          emailStatus,
          status
        )
        VALUES (
          ${resolvedTenantId},
          ${branchId},
          ${payload.topic},
          ${payload.priority || 'normal'},
          ${payload.message},
          ${submitterName},
          ${submitterEmail},
          ${admin?.id || null},
          ${emailRecipient},
          'pending',
          'open'
        )
      `;

      const idRows = await tx.$queryRaw`SELECT LAST_INSERT_ID() AS id`;
      return tx.$queryRaw`SELECT * FROM support_requests WHERE id = ${Number(idRows[0]?.id)}`;
    }).then((rows) => rows.map(mapSupportRequest));

    try {
      const email = buildSupportEmail(supportRequest);
      await sendEmail({
        to: emailRecipient,
        subject: `New Support Request: ${supportRequest.topic}`,
        text: email.text,
        html: email.html,
      });
      await markEmailStatus({ id: supportRequest.id, emailStatus: 'sent' });
      supportRequest.emailStatus = 'sent';
    } catch (error) {
      const message = String(error?.message || 'Email could not be sent.').slice(0, 500);
      await markEmailStatus({ id: supportRequest.id, emailStatus: 'failed', emailError: message });
      supportRequest.emailStatus = 'failed';
      supportRequest.emailError = message;
      console.warn('[support] email failed:', message);
    }

    return supportRequest;
  },

  async getSupportRequests(tenantId, query, branchScope = null) {
    await ensureSupportRequestTable();
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, query, branchScope);

    const { page, limit, skip } = getPagination(query.page, query.limit);
    const search = query.search ? `%${query.search}%` : null;

    const items = await prisma.$queryRaw`
      SELECT *
      FROM support_requests
      WHERE tenant_id = ${resolvedTenantId}
        AND (${branchId} IS NULL OR branch_id = ${branchId})
        AND (${search} IS NULL OR topic LIKE ${search} OR message LIKE ${search} OR submitterName LIKE ${search} OR submitterEmail LIKE ${search})
        AND (${query.status || null} IS NULL OR status = ${query.status || null})
        AND (${query.priority || null} IS NULL OR priority = ${query.priority || null})
      ORDER BY createdAt DESC, id DESC
      LIMIT ${limit} OFFSET ${skip}
    `;

    const totalRows = await prisma.$queryRaw`
      SELECT COUNT(*) AS total
      FROM support_requests
      WHERE tenant_id = ${resolvedTenantId}
        AND (${branchId} IS NULL OR branch_id = ${branchId})
        AND (${search} IS NULL OR topic LIKE ${search} OR message LIKE ${search} OR submitterName LIKE ${search} OR submitterEmail LIKE ${search})
        AND (${query.status || null} IS NULL OR status = ${query.status || null})
        AND (${query.priority || null} IS NULL OR priority = ${query.priority || null})
    `;

    return {
      items: items.map(mapSupportRequest),
      meta: buildPaginationMeta({ totalItems: Number(totalRows[0]?.total || 0), page, limit }),
    };
  },
};
