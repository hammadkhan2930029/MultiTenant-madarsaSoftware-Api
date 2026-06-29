import { prisma } from '../src/config/prisma.js';

const DEFAULT_TENANT = {
  tenantCode: 'default',
  name: 'Default Madrassa',
  status: 'active',
};

const ensureDefaultTenant = async () => {
  const existingTenant = await prisma.tenant.findUnique({
    where: { tenantCode: DEFAULT_TENANT.tenantCode },
  });

  if (existingTenant) {
    return { tenant: existingTenant, created: false };
  }

  const tenant = await prisma.tenant.create({
    data: DEFAULT_TENANT,
  });

  return { tenant, created: true };
};

const linkExistingAdmins = async (tenantId) => {
  const updated = await prisma.$executeRaw`
    UPDATE admins a
    LEFT JOIN roles r ON r.id = a.role_id
    SET a.tenant_id = ${tenantId}
    WHERE a.tenant_id IS NULL
      AND COALESCE(r.role_name, a.role) <> 'super_admin'
  `;

  return Number(updated || 0);
};

const main = async () => {
  const { tenant, created } = await ensureDefaultTenant();
  const linkedAdmins = await linkExistingAdmins(tenant.id);

  console.log(
    JSON.stringify(
      {
        message: 'Default tenant ensured successfully.',
        tenant: {
          id: tenant.id,
          tenantCode: tenant.tenantCode,
          name: tenant.name,
          status: tenant.status,
        },
        created,
        linkedAdmins,
      },
      null,
      2,
    ),
  );
};

main()
  .catch((error) => {
    console.error(
      JSON.stringify(
        {
          message: 'Default tenant setup failed.',
          error: error.message,
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
