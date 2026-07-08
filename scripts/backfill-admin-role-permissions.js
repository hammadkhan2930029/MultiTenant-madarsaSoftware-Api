import { prisma } from '../src/config/prisma.js';

const backfillAdminRolePermissions = async () => {
  const result = await prisma.$executeRaw`
    INSERT IGNORE INTO role_permissions (tenant_id, role_id, permission_id)
    SELECT r.tenant_id, r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.tenant_id IS NOT NULL
      AND r.role_name = 'admin'
      AND r.status = 'active'
  `;

  console.log(JSON.stringify({ ok: true, insertedOrIgnored: Number(result) }));
};

backfillAdminRolePermissions()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
