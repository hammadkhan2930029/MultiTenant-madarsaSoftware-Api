import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';
import { normalizeStatusFilter } from '../../utils/statusFilter.js';
import { branchScopeService } from '../security/index.js';

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
  branchId: true,
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
  branch: {
    select: {
      id: true,
      name: true,
      code: true,
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

const resolveTeacherBranchId = (tenantId, queryOrPayload = {}, branchScope = null) =>
  branchScopeService.resolveOperationalBranchId(tenantId, queryOrPayload, branchScope, {
    requireActive: true,
  });

const mapTeacherIncrement = (row) => ({
  id: row.id,
  teacherId: row.teacherId,
  teacherName: row.teacherName,
  staffType: row.staffType,
  department: row.department,
  jobTitle: row.jobTitle,
  primaryAssignment: row.primaryAssignment,
  assignedLabels: row.assignedLabels,
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
  async createTeacher(tenantId, { body, file, branchScope = null }) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveTeacherBranchId(resolvedTenantId, body, branchScope);

    await ensureShiftExists(body.shiftId);

    if (body.phone || body.cnic) {
      const duplicateTeacher = await prisma.teacher.findFirst({
        where: buildDuplicateWhere(resolvedTenantId, body),
      });

      if (duplicateTeacher) {
        throw new AppError('Ø§Ø³ÛŒ ÙÙˆÙ† Ù†Ù…Ø¨Ø± ÛŒØ§ Ø´Ù†Ø§Ø®ØªÛŒ Ú©Ø§Ø±Úˆ Ú©Û’ Ø³Ø§ØªÚ¾ Ø§Ø³ØªØ§Ø¯ Ù¾ÛÙ„Û’ Ø³Û’ Ù…ÙˆØ¬ÙˆØ¯ ÛÛ’Û”', 409);
      }
    }

    return prisma.teacher.create({
      data: {
        tenantId: resolvedTenantId,
        branchId,
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

  async getTeachers(tenantId, query, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const branchId = await resolveTeacherBranchId(resolvedTenantId, query, branchScope);
    const status = normalizeStatusFilter(query.status);

    const where = {
      tenantId: resolvedTenantId,
      ...(branchId ? { branchId } : {}),
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
      status,
      ...(query.staffType ? { staffType: query.staffType } : {}),
      ...(query.subject ? { subject: { contains: query.subject } } : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.teacher.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: teacherSelect,
      }),
      prisma.teacher.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async getTeacherById(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveTeacherBranchId(resolvedTenantId, {}, branchScope);
    const teacher = await prisma.teacher.findFirst({
      where: { id, tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}) },
      select: teacherSelect,
    });

    if (!teacher) {
      throw new AppError('Ø§Ø³ØªØ§Ø¯ Ù†ÛÛŒÚº Ù…Ù„Ø§Û”', 404);
    }

    return teacher;
  },

  async getAllTeacherIncrements(tenantId, query, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveTeacherBranchId(resolvedTenantId, query, branchScope);
    await ensureTeacherIncrementTable();

    const { page, limit, skip } = getPagination(query.page, query.limit);
    const search = query.search ? `%${query.search}%` : null;
    const staffType = query.staffType || null;
    const assignment = query.assignment || null;
    const month = query.month || null;
    const year = query.year || null;
    const status = normalizeStatusFilter(query.status);

    const items = await prisma.$queryRaw`
      SELECT
        increment.*,
        teacher.fullName AS teacherName,
        teacher.staffType,
        teacher.department,
        teacher.jobTitle,
        teacher.subject AS primaryAssignment,
        (
          SELECT GROUP_CONCAT(DISTINCT CASE
            WHEN teacher.staffType = 'staff' THEN responsibility.name
            ELSE subject.name
          END SEPARATOR ', ')
          FROM teacher_assignments assignmentRow
          LEFT JOIN subjects subject ON subject.id = assignmentRow.subject_id
          LEFT JOIN teacher_responsibilities responsibility ON responsibility.id = assignmentRow.responsibility_id
          WHERE assignmentRow.teacher_id = teacher.id
            AND assignmentRow.tenant_id = ${resolvedTenantId}
            AND assignmentRow.status = 'active'
        ) AS assignedLabels,
        teacher.basicSalary AS currentSalary,
        admin.name AS createdByName
      FROM teacher_salary_increments increment
      INNER JOIN teachers teacher ON teacher.id = increment.teacherId
      LEFT JOIN admins admin ON admin.id = increment.createdById
      WHERE increment.tenant_id = ${resolvedTenantId}
        AND teacher.tenant_id = ${resolvedTenantId}
        AND increment.status = ${status}
        AND (${branchId} IS NULL OR teacher.branch_id = ${branchId})
        AND (${search} IS NULL OR teacher.fullName LIKE ${search} OR teacher.department LIKE ${search} OR teacher.jobTitle LIKE ${search} OR increment.reason LIKE ${search})
        AND (${staffType} IS NULL OR teacher.staffType = ${staffType})
        AND (
          ${assignment} IS NULL
          OR teacher.subject = ${assignment}
          OR EXISTS (
            SELECT 1
            FROM teacher_assignments assignmentFilter
            LEFT JOIN subjects subjectFilter ON subjectFilter.id = assignmentFilter.subject_id
            LEFT JOIN teacher_responsibilities responsibilityFilter ON responsibilityFilter.id = assignmentFilter.responsibility_id
            WHERE assignmentFilter.teacher_id = teacher.id
              AND assignmentFilter.tenant_id = ${resolvedTenantId}
              AND assignmentFilter.status = 'active'
              AND (
                (teacher.staffType = 'teacher' AND subjectFilter.name = ${assignment})
                OR (teacher.staffType = 'staff' AND responsibilityFilter.name = ${assignment})
              )
          )
        )
        AND (${month} IS NULL OR MONTH(increment.effectiveDate) = ${month})
        AND (${year} IS NULL OR YEAR(increment.effectiveDate) = ${year})
      ORDER BY increment.effectiveDate DESC, increment.createdAt DESC, increment.id DESC
      LIMIT ${limit} OFFSET ${skip}
    `;

    const totalRows = await prisma.$queryRaw`
      SELECT COUNT(*) AS total, COALESCE(SUM(increment.incrementAmount), 0) AS totalIncrement
      FROM teacher_salary_increments increment
      INNER JOIN teachers teacher ON teacher.id = increment.teacherId
      WHERE increment.tenant_id = ${resolvedTenantId}
        AND teacher.tenant_id = ${resolvedTenantId}
        AND increment.status = ${status}
        AND (${branchId} IS NULL OR teacher.branch_id = ${branchId})
        AND (${search} IS NULL OR teacher.fullName LIKE ${search} OR teacher.department LIKE ${search} OR teacher.jobTitle LIKE ${search} OR increment.reason LIKE ${search})
        AND (${staffType} IS NULL OR teacher.staffType = ${staffType})
        AND (
          ${assignment} IS NULL
          OR teacher.subject = ${assignment}
          OR EXISTS (
            SELECT 1
            FROM teacher_assignments assignmentFilter
            LEFT JOIN subjects subjectFilter ON subjectFilter.id = assignmentFilter.subject_id
            LEFT JOIN teacher_responsibilities responsibilityFilter ON responsibilityFilter.id = assignmentFilter.responsibility_id
            WHERE assignmentFilter.teacher_id = teacher.id
              AND assignmentFilter.tenant_id = ${resolvedTenantId}
              AND assignmentFilter.status = 'active'
              AND (
                (teacher.staffType = 'teacher' AND subjectFilter.name = ${assignment})
                OR (teacher.staffType = 'staff' AND responsibilityFilter.name = ${assignment})
              )
          )
        )
        AND (${month} IS NULL OR MONTH(increment.effectiveDate) = ${month})
        AND (${year} IS NULL OR YEAR(increment.effectiveDate) = ${year})
    `;

    return {
      items: items.map(mapTeacherIncrement),
      meta: buildPaginationMeta({ totalItems: Number(totalRows[0]?.total || 0), page, limit }),
      stats: {
        totalRecords: Number(totalRows[0]?.total || 0),
        totalIncrement: Number(totalRows[0]?.totalIncrement || 0),
      },
    };
  },

  async getTeacherIncrements(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveTeacherBranchId(resolvedTenantId, {}, branchScope);
    await ensureTeacherIncrementTable();

    const teacher = await prisma.teacher.findFirst({
      where: { id, tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}) },
      select: { id: true },
    });

    if (!teacher) {
      throw new AppError('Ø§Ø³ØªØ§Ø¯ Ù†ÛÛŒÚº Ù…Ù„Ø§Û”', 404);
    }

    const rows = await prisma.$queryRaw`
      SELECT increment.*, admin.name AS createdByName
      FROM teacher_salary_increments increment
      LEFT JOIN admins admin ON admin.id = increment.createdById
      WHERE increment.tenant_id = ${resolvedTenantId}
        AND increment.teacherId = ${id}
        AND increment.status = 'active'
      ORDER BY increment.effectiveDate DESC, increment.createdAt DESC, increment.id DESC
    `;

    return rows.map(mapTeacherIncrement);
  },

  async createTeacherIncrement(tenantId, id, payload, admin, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveTeacherBranchId(resolvedTenantId, payload, branchScope);
    await ensureTeacherIncrementTable();

    const teacher = await prisma.teacher.findFirst({
      where: { id, tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}) },
      select: { id: true, basicSalary: true },
    });

    if (!teacher) {
      throw new AppError('Ø§Ø³ØªØ§Ø¯ Ù†ÛÛŒÚº Ù…Ù„Ø§Û”', 404);
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

  async updateTeacherIncrement(tenantId, incrementId, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveTeacherBranchId(resolvedTenantId, payload, branchScope);
    await ensureTeacherIncrementTable();

    const rows = await prisma.$queryRaw`
      SELECT increment.*, teacher.branch_id AS teacherBranchId
      FROM teacher_salary_increments increment
      INNER JOIN teachers teacher ON teacher.id = increment.teacherId
      WHERE increment.id = ${incrementId}
        AND increment.tenant_id = ${resolvedTenantId}
        AND teacher.tenant_id = ${resolvedTenantId}
        AND (${branchId} IS NULL OR teacher.branch_id = ${branchId})
      LIMIT 1
    `;

    const existing = rows[0];
    if (!existing) {
      throw new AppError('Increment record not found.', 404);
    }

    const previousSalary = Number(existing.previousSalary || 0);
    const oldIncrementAmount = Number(existing.incrementAmount || 0);
    const incrementAmount = Number(payload.incrementAmount || 0);
    const newSalary = previousSalary + incrementAmount;
    const currentStatus = existing.status || 'active';
    const nextStatus = normalizeStatusFilter(payload.status, currentStatus);
    let salaryDifference = 0;
    if (currentStatus === 'active' && nextStatus === 'active') {
      salaryDifference = incrementAmount - oldIncrementAmount;
    } else if (currentStatus === 'active' && nextStatus === 'inactive') {
      salaryDifference = -oldIncrementAmount;
    } else if (currentStatus === 'inactive' && nextStatus === 'active') {
      salaryDifference = incrementAmount;
    }

    const [increment] = await prisma.$transaction(async (tx) => {
      if (salaryDifference !== 0) {
        await tx.teacher.update({
          where: { id: Number(existing.teacherId), tenantId: resolvedTenantId },
          data: { basicSalary: { increment: salaryDifference } },
          select: { id: true },
        });
      }

      await tx.$executeRaw`
        UPDATE teacher_salary_increments
        SET incrementAmount = ${incrementAmount},
            newSalary = ${newSalary},
            effectiveDate = ${payload.effectiveDate},
            reason = ${optionalString(payload.reason)},
            status = ${nextStatus}
        WHERE id = ${incrementId}
          AND tenant_id = ${resolvedTenantId}
      `;

      return tx.$queryRaw`
        SELECT increment.*, admin.name AS createdByName, teacher.fullName AS teacherName, teacher.staffType, teacher.department, teacher.jobTitle, teacher.basicSalary AS currentSalary
        FROM teacher_salary_increments increment
        INNER JOIN teachers teacher ON teacher.id = increment.teacherId
        LEFT JOIN admins admin ON admin.id = increment.createdById
        WHERE increment.id = ${incrementId}
          AND increment.tenant_id = ${resolvedTenantId}
      `;
    }).then((items) => items.map(mapTeacherIncrement));

    return increment;
  },

  async deleteTeacherIncrement(tenantId, incrementId, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveTeacherBranchId(resolvedTenantId, {}, branchScope);
    await ensureTeacherIncrementTable();

    const rows = await prisma.$queryRaw`
      SELECT increment.*, teacher.branch_id AS teacherBranchId
      FROM teacher_salary_increments increment
      INNER JOIN teachers teacher ON teacher.id = increment.teacherId
      WHERE increment.id = ${incrementId}
        AND increment.tenant_id = ${resolvedTenantId}
        AND increment.status = 'active'
        AND teacher.tenant_id = ${resolvedTenantId}
        AND (${branchId} IS NULL OR teacher.branch_id = ${branchId})
      LIMIT 1
    `;

    const existing = rows[0];
    if (!existing) {
      throw new AppError('Increment record not found.', 404);
    }

    await prisma.$transaction(async (tx) => {
      await tx.teacher.update({
        where: { id: Number(existing.teacherId), tenantId: resolvedTenantId },
        data: { basicSalary: { decrement: Number(existing.incrementAmount || 0) } },
        select: { id: true },
      });

      await tx.$executeRaw`
        UPDATE teacher_salary_increments
        SET status = 'inactive'
        WHERE id = ${incrementId}
          AND tenant_id = ${resolvedTenantId}
          AND status = 'active'
      `;
    });

    return mapTeacherIncrement({ ...existing, status: 'inactive' });
  },

  async updateTeacher(tenantId, id, { body, file, branchScope = null }) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const scopedBranchId = await resolveTeacherBranchId(resolvedTenantId, body, branchScope);
    const existingTeacher = await prisma.teacher.findFirst({
      where: { id, tenantId: resolvedTenantId, ...(scopedBranchId ? { branchId: scopedBranchId } : {}) },
    });

    if (!existingTeacher) {
      throw new AppError('Ø§Ø³ØªØ§Ø¯ Ù†ÛÛŒÚº Ù…Ù„Ø§Û”', 404);
    }

    const branchId = scopedBranchId || existingTeacher.branchId || null;

    await ensureShiftExists(body.shiftId);

    if (body.phone || body.cnic) {
      const duplicateTeacher = await prisma.teacher.findFirst({
        where: buildDuplicateWhere(resolvedTenantId, body, id),
      });

      if (duplicateTeacher) {
        throw new AppError('Ø§Ø³ÛŒ ÙÙˆÙ† Ù†Ù…Ø¨Ø± ÛŒØ§ Ø´Ù†Ø§Ø®ØªÛŒ Ú©Ø§Ø±Úˆ Ú©Û’ Ø³Ø§ØªÚ¾ Ú©ÙˆØ¦ÛŒ Ø¯ÙˆØ³Ø±Ø§ Ø§Ø³ØªØ§Ø¯ Ù¾ÛÙ„Û’ Ø³Û’ Ù…ÙˆØ¬ÙˆØ¯ ÛÛ’Û”', 409);
      }
    }

    return prisma.teacher.update({
      where: { id, tenantId: resolvedTenantId },
      data: {
        staffType: optionalString(body.staffType) || existingTeacher.staffType,
        branchId,
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

  async updateTeacherStatus(tenantId, id, status, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveTeacherBranchId(resolvedTenantId, {}, branchScope);
    const teacher = await prisma.teacher.findFirst({
      where: { id, tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}) },
    });

    if (!teacher) {
      throw new AppError('Ø§Ø³ØªØ§Ø¯ Ù†ÛÛŒÚº Ù…Ù„Ø§Û”', 404);
    }

    if (teacher.status === status) {
      throw new AppError('Ø§Ø³ØªØ§Ø¯ Ú©ÛŒ Ø­Ø§Ù„Øª Ù¾ÛÙ„Û’ ÛÛŒ ÛŒÛÛŒ ÛÛ’Û”', 400);
    }

    return prisma.teacher.update({
      where: { id, tenantId: resolvedTenantId },
      data: { status },
      select: teacherSelect,
    });
  },

  async deleteTeacher(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveTeacherBranchId(resolvedTenantId, {}, branchScope);
    const teacher = await prisma.teacher.findFirst({
      where: { id, tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}) },
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
      throw new AppError('Ø§Ø³ØªØ§Ø¯ Ù†ÛÛŒÚº Ù…Ù„Ø§Û”', 404);
    }

    if (teacher._count.attendances || teacher._count.salaryEntries) {
      throw new AppError('Ø§Ø³ Ø§Ø³ØªØ§Ø¯ Ú©Ø§ Ø­Ø§Ø¶Ø±ÛŒ ÛŒØ§ ØªÙ†Ø®ÙˆØ§Û Ø±ÛŒÚ©Ø§Ø±Úˆ Ù…ÙˆØ¬ÙˆØ¯ ÛÛ’ØŒ Ø­Ø°Ù Ù†ÛÛŒÚº ÛÙˆ Ø³Ú©ØªØ§Û”', 400);
    }

    return prisma.teacher.delete({
      where: { id, tenantId: resolvedTenantId },
      select: teacherSelect,
    });
  },
};
