import { prisma } from '../../config/prisma.js';
import { env } from '../../config/env.js';
import { sendEmail } from '../../utils/smtpMailer.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';
import { normalizeTenantId } from '../../utils/tenantGuard.js';

const suggestionTableSql = `
CREATE TABLE IF NOT EXISTS suggestions (
  id INT NOT NULL AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(180) NOT NULL,
  priority VARCHAR(50) NOT NULL DEFAULT 'normal',
  description TEXT NOT NULL,
  submitterName VARCHAR(150) NULL,
  submitterEmail VARCHAR(150) NULL,
  adminId INT NULL,
  emailRecipient VARCHAR(150) NULL,
  emailStatus VARCHAR(50) NOT NULL DEFAULT 'pending',
  emailError VARCHAR(500) NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'new',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX suggestions_tenant_id_idx (tenant_id),
  INDEX suggestions_status_idx (status),
  INDEX suggestions_priority_idx (priority),
  INDEX suggestions_adminId_idx (adminId),
  CONSTRAINT suggestions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES Tenant(id),
  CONSTRAINT suggestions_adminId_fkey FOREIGN KEY (adminId) REFERENCES admins(id) ON DELETE SET NULL
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
`;

let suggestionTablePromise = null;

const ensureSuggestionsTable = () => {
  if (!suggestionTablePromise) {
    suggestionTablePromise = prisma.$executeRawUnsafe(suggestionTableSql);
  }

  return suggestionTablePromise;
};

const mapSuggestion = (row) => ({
  id: row.id,
  tenantId: row.tenant_id ?? row.tenantId,
  type: row.type,
  title: row.title,
  priority: row.priority,
  description: row.description,
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

const priorityLabels = {
  normal: 'عام',
  important: 'اہم',
  urgent: 'فوری',
};

const buildSuggestionEmail = (suggestion) => {
  const rows = [
    ['نام', suggestion.submitterName || 'نام دستیاب نہیں'],
    ['ای میل', suggestion.submitterEmail || 'ای میل دستیاب نہیں'],
    ['قسم', suggestion.type],
    ['ترجیح', priorityLabels[suggestion.priority] || suggestion.priority],
    ['عنوان', suggestion.title],
    ['تفصیل', suggestion.description],
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
      <h2 style="margin:0 0 16px;">نئی تجویز موصول ہوئی</h2>
      <table style="border-collapse:collapse;width:100%;max-width:720px;">${htmlRows}</table>
    </div>
  `;

  return { text, html };
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const markEmailStatus = async ({ id, emailStatus, emailError = null }) => {
  await prisma.$executeRaw`
    UPDATE suggestions
    SET emailStatus = ${emailStatus}, emailError = ${emailError}, updatedAt = NOW()
    WHERE id = ${id}
  `;
};

export const suggestionsService = {
  async createSuggestion(tenantId, payload, admin) {
    await ensureSuggestionsTable();
    const resolvedTenantId = normalizeTenantId(tenantId);

    const submitterName = admin?.name || admin?.username || null;
    const submitterEmail = admin?.email || null;
    const emailRecipient = env.suggestionsRecipientEmail;

    const [suggestion] = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO suggestions (
          tenant_id,
          type,
          title,
          priority,
          description,
          submitterName,
          submitterEmail,
          adminId,
          emailRecipient,
          emailStatus,
          status
        )
        VALUES (
          ${resolvedTenantId},
          ${payload.type},
          ${payload.title},
          ${payload.priority || 'normal'},
          ${payload.description},
          ${submitterName},
          ${submitterEmail},
          ${admin?.id || null},
          ${emailRecipient},
          'pending',
          'new'
        )
      `;

      const idRows = await tx.$queryRaw`SELECT LAST_INSERT_ID() AS id`;
      return tx.$queryRaw`SELECT * FROM suggestions WHERE id = ${Number(idRows[0]?.id)}`;
    }).then((rows) => rows.map(mapSuggestion));

    try {
      const email = buildSuggestionEmail(suggestion);
      await sendEmail({
        to: emailRecipient,
        subject: `New Suggestion: ${suggestion.title}`,
        text: email.text,
        html: email.html,
      });
      await markEmailStatus({ id: suggestion.id, emailStatus: 'sent' });
      suggestion.emailStatus = 'sent';
    } catch (error) {
      const message = String(error?.message || 'Email could not be sent.').slice(0, 500);
      await markEmailStatus({ id: suggestion.id, emailStatus: 'failed', emailError: message });
      suggestion.emailStatus = 'failed';
      suggestion.emailError = message;
      console.warn('[suggestions] email failed:', message);
    }

    return suggestion;
  },

  async getSuggestions(tenantId, query) {
    await ensureSuggestionsTable();
    const resolvedTenantId = normalizeTenantId(tenantId);

    const { page, limit, skip } = getPagination(query.page, query.limit);
    const search = query.search ? `%${query.search}%` : null;

    const items = await prisma.$queryRaw`
      SELECT *
      FROM suggestions
      WHERE tenant_id = ${resolvedTenantId}
        AND (${search} IS NULL OR title LIKE ${search} OR description LIKE ${search} OR submitterName LIKE ${search} OR submitterEmail LIKE ${search})
        AND (${query.status || null} IS NULL OR status = ${query.status || null})
        AND (${query.priority || null} IS NULL OR priority = ${query.priority || null})
      ORDER BY createdAt DESC, id DESC
      LIMIT ${limit} OFFSET ${skip}
    `;

    const totalRows = await prisma.$queryRaw`
      SELECT COUNT(*) AS total
      FROM suggestions
      WHERE tenant_id = ${resolvedTenantId}
        AND (${search} IS NULL OR title LIKE ${search} OR description LIKE ${search} OR submitterName LIKE ${search} OR submitterEmail LIKE ${search})
        AND (${query.status || null} IS NULL OR status = ${query.status || null})
        AND (${query.priority || null} IS NULL OR priority = ${query.priority || null})
    `;

    return {
      items: items.map(mapSuggestion),
      meta: buildPaginationMeta({ totalItems: Number(totalRows[0]?.total || 0), page, limit }),
    };
  },
};
