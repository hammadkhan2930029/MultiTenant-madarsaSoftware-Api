import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';

const buildImageUrl = (file) => (file ? `/uploads/teachers/${file.filename}` : null);
const optionalString = (value) => (value ? value : null);
const optionalNumber = (value) => (value ? Number(value) : null);
const normalizeTenantId = (tenantId) => {
  const resolvedTenantId = Number(tenantId);

  if (!Number.isInteger(resolvedTenantId) || resolvedTenantId <= 0) {
    throw new AppError('Tenant context is required.', 403);
  }

  return resolvedTenantId;
};

const teacherIncrementTableSql = `
CREATE TABLE IF NOT EXISTS teacher_salary_increments (
  id INT NOT NULL AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  teacherId INT NOT NULL,
  previousSalary DECIMAL(10, 2) NOT NULL,
  incrementAmount DECIMAL(10, 2) NOT NULL,
  newSalary DECIMAL(10, 2) NOT NULL,
  effectiveDate VARCHAR(20) NOT NULL,
  reason VARCHAR(255) NULL,
  createdById INT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX teacher_salary_increments_tenant_id_idx (tenant_id),
  INDEX teacher_salary_increments_teacherId_idx (teacherId),
  INDEX teacher_salary_increments_effectiveDate_idx (effectiveDate),
  INDEX teacher_salary_increments_createdById_idx (createdById),
  CONSTRAINT teacher_salary_increments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES Tenant(id),
  CONSTRAINT teacher_salary_increments_teacherId_fkey FOREIGN KEY (teacherId) REFERENCES teachers(id) ON DELETE CASCADE,
  CONSTRAINT teacher_salary_increments_createdById_fkey FOREIGN KEY (createdById) REFERENCES admins(id) ON DELETE SET NULL
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
`;

let teacherIncrementTablePromise = null;

const ensureTeacherIncrementTenantColumn = async () => {
  const columns = await prisma.$queryRaw`
    SHOW COLUMNS FROM teacher_salary_increments LIKE 'tenant_id'
  `;

  if (columns.length) return;

  await prisma.$executeRawUnsafe(`
    ALTER TABLE teacher_salary_increments
    ADD COLUMN tenant_id INT NULL AFTER id
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE teacher_salary_increments increment
    INNER JOIN teachers teacher ON teacher.id = increment.teacherId
    SET increment.tenant_id = teacher.tenant_id
    WHERE increment.tenant_id IS NULL
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE teacher_salary_increments
    MODIFY tenant_id INT NOT NULL
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX teacher_salary_increments_tenant_id_idx
    ON teacher_salary_increments (tenant_id)
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE teacher_salary_increments
    ADD CONSTRAINT teacher_salary_increments_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES Tenant(id)
  `);
};

const ensureTeacherIncrementTable = () => {
  if (!teacherIncrementTablePromise) {
    teacherIncrementTablePromise = prisma
      .$executeRawUnsafe(teacherIncrementTableSql)
      .then(() => ensureTeacherIncrementTenantColumn());
  }

  return teacherIncrementTablePromise;
};

const teacherSelect = {
  id: true,
  tenantId: true,
  staffType: true,
  fullName: true,
  email: true,
  phone: true,
  cnic: true,
  subject: true,
  qualification: true,
  educationInstitute: true,
  educationYear: true,
  specialization: true,
  address: true,
  shiftId: true,
  shift: {
    select: {
      id: true,
      name: true,
      startTime: true,
      endTime: true,
      type: true,
      status: true,
    },
  },
  imageUrl: true,
  basicSalary: true,
  bankName: true,
  accountTitle: true,
  accountNumber: true,
  iban: true,
  jobTitle: true,
  department: true,
  employmentType: true,
  appointmentDate: true,
  joiningDate: true,
  experienceSummary: true,
  notes: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

const mapTeacherIncrement = (row) => ({
  id: row.id,
  teacherId: row.teacherId,
  teacherName: row.teacherName,
  staffType: row.staffType,
  department: row.department,
  jobTitle: row.jobTitle,
  currentSalary: row.currentSalary,
  previousSalary: row.previousSalary,
  incrementAmount: row.incrementAmount,
  newSalary: row.newSalary,
  effectiveDate: row.effectiveDate,
  reason: row.reason,
  createdById: row.createdById,
  createdByName: row.createdByName,
  status: row.status,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const buildDuplicateWhere = (tenantId, payload, excludeId) => {
  const conditions = [];

  if (payload.phone) {
    conditions.push({ phone: payload.phone });
  }

  if (payload.cnic) {
    conditions.push({ cnic: payload.cnic });
  }

  return {
    tenantId,
    ...(excludeId ? { id: { not: excludeId } } : {}),
    OR: conditions,
  };
};

const ensureShiftExists = async (shiftId) => {
  if (!shiftId) return;

  const shift = await prisma.shift.findUnique({
    where: { id: Number(shiftId) },
    select: { id: true },
  });

  if (!shift) {
    throw new AppError('Shift not found.', 404);
  }
};

export const teachersService = {
  async createTeacher(tenantId, { body, file }) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await ensureShiftExists(body.shiftId);

    if (body.phone || body.cnic) {
      const duplicateTeacher = await prisma.teacher.findFirst({
        where: buildDuplicateWhere(resolvedTenantId, body),
      });

      if (duplicateTeacher) {
        throw new AppError('اسی فون نمبر یا شناختی کارڈ کے ساتھ استاد پہلے سے موجود ہے۔', 409);
      }
    }

    return prisma.teacher.create({
      data: {
        tenantId: resolvedTenantId,
        staffType: optionalString(body.staffType) || 'teacher',
        fullName: body.fullName,
        email: optionalString(body.email),
        phone: optionalString(body.phone),
        cnic: optionalString(body.cnic),
        subject: optionalString(body.subject),
        qualification: optionalString(body.qualification),
        educationInstitute: optionalString(body.educationInstitute),
        educationYear: optionalString(body.educationYear),
        specialization: optionalString(body.specialization),
        address: optionalString(body.address),
        shiftId: optionalNumber(body.shiftId),
        imageUrl: buildImageUrl(file),
        basicSalary: body.basicSalary,
        bankName: optionalString(body.bankName),
        accountTitle: optionalString(body.accountTitle),
        accountNumber: optionalString(body.accountNumber),
        iban: optionalString(body.iban),
        jobTitle: optionalString(body.jobTitle),
        department: optionalString(body.department),
        employmentType: optionalString(body.employmentType),
        appointmentDate: optionalString(body.appointmentDate),
        joiningDate: optionalString(body.joiningDate),
        experienceSummary: optionalString(body.experienceSummary),
        notes: optionalString(body.notes),
      },
      select: teacherSelect,
    });
  },

  async getTeachers(tenantId, query) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const { page, limit, skip } = getPagination(query.page, query.limit);

    const where = {
      tenantId: resolvedTenantId,
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search } },
              { phone: { contains: query.search } },
              { subject: { contains: query.search } },
              { shift: { name: { contains: query.search } } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.staffType ? { staffType: query.staffType } : {}),
      ...(query.subject ? { subject: { contains: query.subject } } : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.teacher.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: teacherSelect,
      }),
      prisma.teacher.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async getTeacherById(tenantId, id) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const teacher = await prisma.teacher.findFirst({
      where: { id, tenantId: resolvedTenantId },
      select: teacherSelect,
    });

    if (!teacher) {
      throw new AppError('استاد نہیں ملا۔', 404);
    }

    return teacher;
  },

  async getAllTeacherIncrements(tenantId, query) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await ensureTeacherIncrementTable();

    const { page, limit, skip } = getPagination(query.page, query.limit);
    const search = query.search ? `%${query.search}%` : null;
    const staffType = query.staffType || null;

    const items = await prisma.$queryRaw`
      SELECT
        increment.*,
        teacher.fullName AS teacherName,
        teacher.staffType,
        teacher.department,
        teacher.jobTitle,
        teacher.basicSalary AS currentSalary,
        admin.name AS createdByName
      FROM teacher_salary_increments increment
      INNER JOIN teachers teacher ON teacher.id = increment.teacherId
      LEFT JOIN admins admin ON admin.id = increment.createdById
      WHERE increment.tenant_id = ${resolvedTenantId}
        AND teacher.tenant_id = ${resolvedTenantId}
        AND (${search} IS NULL OR teacher.fullName LIKE ${search} OR teacher.department LIKE ${search} OR teacher.jobTitle LIKE ${search} OR increment.reason LIKE ${search})
        AND (${staffType} IS NULL OR teacher.staffType = ${staffType})
      ORDER BY increment.effectiveDate DESC, increment.createdAt DESC, increment.id DESC
      LIMIT ${limit} OFFSET ${skip}
    `;

    const totalRows = await prisma.$queryRaw`
      SELECT COUNT(*) AS total
      FROM teacher_salary_increments increment
      INNER JOIN teachers teacher ON teacher.id = increment.teacherId
      WHERE increment.tenant_id = ${resolvedTenantId}
        AND teacher.tenant_id = ${resolvedTenantId}
        AND (${search} IS NULL OR teacher.fullName LIKE ${search} OR teacher.department LIKE ${search} OR teacher.jobTitle LIKE ${search} OR increment.reason LIKE ${search})
        AND (${staffType} IS NULL OR teacher.staffType = ${staffType})
    `;

    return {
      items: items.map(mapTeacherIncrement),
      meta: buildPaginationMeta({ totalItems: Number(totalRows[0]?.total || 0), page, limit }),
    };
  },

  async getTeacherIncrements(tenantId, id) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await ensureTeacherIncrementTable();

    const teacher = await prisma.teacher.findFirst({
      where: { id, tenantId: resolvedTenantId },
      select: { id: true },
    });

    if (!teacher) {
      throw new AppError('استاد نہیں ملا۔', 404);
    }

    const rows = await prisma.$queryRaw`
      SELECT increment.*, admin.name AS createdByName
      FROM teacher_salary_increments increment
      LEFT JOIN admins admin ON admin.id = increment.createdById
      WHERE increment.tenant_id = ${resolvedTenantId}
        AND increment.teacherId = ${id}
      ORDER BY increment.effectiveDate DESC, increment.createdAt DESC, increment.id DESC
    `;

    return rows.map(mapTeacherIncrement);
  },

  async createTeacherIncrement(tenantId, id, payload, admin) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await ensureTeacherIncrementTable();

    const teacher = await prisma.teacher.findFirst({
      where: { id, tenantId: resolvedTenantId },
      select: { id: true, basicSalary: true },
    });

    if (!teacher) {
      throw new AppError('استاد نہیں ملا۔', 404);
    }

    const previousSalary = Number(teacher.basicSalary || 0);
    const incrementAmount = Number(payload.incrementAmount || 0);
    const newSalary = previousSalary + incrementAmount;

    const [increment] = await prisma.$transaction(async (tx) => {
      await tx.teacher.update({
        where: { id, tenantId: resolvedTenantId },
        data: { basicSalary: newSalary },
        select: { id: true },
      });

      await tx.$executeRaw`
        INSERT INTO teacher_salary_increments (
          tenant_id,
          teacherId,
          previousSalary,
          incrementAmount,
          newSalary,
          effectiveDate,
          reason,
          createdById,
          status
        )
        VALUES (
          ${resolvedTenantId},
          ${id},
          ${previousSalary},
          ${incrementAmount},
          ${newSalary},
          ${payload.effectiveDate},
          ${optionalString(payload.reason)},
          ${admin?.id || null},
          'active'
        )
      `;

      const idRows = await tx.$queryRaw`SELECT LAST_INSERT_ID() AS id`;
      return tx.$queryRaw`
        SELECT increment.*, admin.name AS createdByName
        FROM teacher_salary_increments increment
        LEFT JOIN admins admin ON admin.id = increment.createdById
        WHERE increment.id = ${Number(idRows[0]?.id)}
          AND increment.tenant_id = ${resolvedTenantId}
      `;
    }).then((rows) => rows.map(mapTeacherIncrement));

    return {
      increment,
      teacher: await prisma.teacher.findUnique({
        where: { id },
        select: teacherSelect,
      }),
    };
  },

  async updateTeacher(tenantId, id, { body, file }) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const existingTeacher = await prisma.teacher.findFirst({
      where: { id, tenantId: resolvedTenantId },
    });

    if (!existingTeacher) {
      throw new AppError('استاد نہیں ملا۔', 404);
    }

    await ensureShiftExists(body.shiftId);

    if (body.phone || body.cnic) {
      const duplicateTeacher = await prisma.teacher.findFirst({
        where: buildDuplicateWhere(resolvedTenantId, body, id),
      });

      if (duplicateTeacher) {
        throw new AppError('اسی فون نمبر یا شناختی کارڈ کے ساتھ کوئی دوسرا استاد پہلے سے موجود ہے۔', 409);
      }
    }

    return prisma.teacher.update({
      where: { id, tenantId: resolvedTenantId },
      data: {
        staffType: optionalString(body.staffType) || existingTeacher.staffType,
        fullName: body.fullName,
        email: optionalString(body.email),
        phone: optionalString(body.phone),
        cnic: optionalString(body.cnic),
        subject: optionalString(body.subject),
        qualification: optionalString(body.qualification),
        educationInstitute: optionalString(body.educationInstitute),
        educationYear: optionalString(body.educationYear),
        specialization: optionalString(body.specialization),
        address: optionalString(body.address),
        shiftId: optionalNumber(body.shiftId),
        imageUrl: file ? buildImageUrl(file) : existingTeacher.imageUrl,
        basicSalary: body.basicSalary,
        bankName: optionalString(body.bankName),
        accountTitle: optionalString(body.accountTitle),
        accountNumber: optionalString(body.accountNumber),
        iban: optionalString(body.iban),
        jobTitle: optionalString(body.jobTitle),
        department: optionalString(body.department),
        employmentType: optionalString(body.employmentType),
        appointmentDate: optionalString(body.appointmentDate),
        joiningDate: optionalString(body.joiningDate),
        experienceSummary: optionalString(body.experienceSummary),
        notes: optionalString(body.notes),
        status: body.status || existingTeacher.status,
      },
      select: teacherSelect,
    });
  },

  async updateTeacherStatus(tenantId, id, status) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const teacher = await prisma.teacher.findFirst({
      where: { id, tenantId: resolvedTenantId },
    });

    if (!teacher) {
      throw new AppError('استاد نہیں ملا۔', 404);
    }

    if (teacher.status === status) {
      throw new AppError('استاد کی حالت پہلے ہی یہی ہے۔', 400);
    }

    return prisma.teacher.update({
      where: { id, tenantId: resolvedTenantId },
      data: { status },
      select: teacherSelect,
    });
  },

  async deleteTeacher(tenantId, id) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const teacher = await prisma.teacher.findFirst({
      where: { id, tenantId: resolvedTenantId },
      include: {
        _count: {
          select: {
            attendances: true,
            salaryEntries: true,
          },
        },
      },
    });

    if (!teacher) {
      throw new AppError('استاد نہیں ملا۔', 404);
    }

    if (teacher._count.attendances || teacher._count.salaryEntries) {
      throw new AppError('اس استاد کا حاضری یا تنخواہ ریکارڈ موجود ہے، حذف نہیں ہو سکتا۔', 400);
    }

    return prisma.teacher.delete({
      where: { id, tenantId: resolvedTenantId },
      select: teacherSelect,
    });
  },
};
