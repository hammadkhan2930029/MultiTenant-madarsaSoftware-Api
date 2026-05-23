import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';

const buildImageUrl = (file) => (file ? `/uploads/teachers/${file.filename}` : null);
const optionalString = (value) => (value ? value : null);

const teacherSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  cnic: true,
  subject: true,
  qualification: true,
  address: true,
  imageUrl: true,
  basicSalary: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

const buildDuplicateWhere = (payload, excludeId) => {
  const conditions = [];

  if (payload.phone) {
    conditions.push({ phone: payload.phone });
  }

  if (payload.cnic) {
    conditions.push({ cnic: payload.cnic });
  }

  return {
    ...(excludeId ? { id: { not: excludeId } } : {}),
    OR: conditions,
  };
};

export const teachersService = {
  async createTeacher({ body, file }) {
    if (body.phone || body.cnic) {
      const duplicateTeacher = await prisma.teacher.findFirst({
        where: buildDuplicateWhere(body),
      });

      if (duplicateTeacher) {
        throw new AppError('اسی فون نمبر یا شناختی کارڈ کے ساتھ استاد پہلے سے موجود ہے۔', 409);
      }
    }

    return prisma.teacher.create({
      data: {
        fullName: body.fullName,
        email: optionalString(body.email),
        phone: optionalString(body.phone),
        cnic: optionalString(body.cnic),
        subject: body.subject,
        qualification: optionalString(body.qualification),
        address: optionalString(body.address),
        imageUrl: buildImageUrl(file),
        basicSalary: body.basicSalary,
      },
      select: teacherSelect,
    });
  },

  async getTeachers(query) {
    const { page, limit, skip } = getPagination(query.page, query.limit);

    const where = {
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search } },
              { phone: { contains: query.search } },
              { subject: { contains: query.search } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
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

  async getTeacherById(id) {
    const teacher = await prisma.teacher.findUnique({
      where: { id },
      select: teacherSelect,
    });

    if (!teacher) {
      throw new AppError('استاد نہیں ملا۔', 404);
    }

    return teacher;
  },

  async updateTeacher(id, { body, file }) {
    const existingTeacher = await prisma.teacher.findUnique({
      where: { id },
    });

    if (!existingTeacher) {
      throw new AppError('استاد نہیں ملا۔', 404);
    }

    if (body.phone || body.cnic) {
      const duplicateTeacher = await prisma.teacher.findFirst({
        where: buildDuplicateWhere(body, id),
      });

      if (duplicateTeacher) {
        throw new AppError('اسی فون نمبر یا شناختی کارڈ کے ساتھ کوئی دوسرا استاد پہلے سے موجود ہے۔', 409);
      }
    }

    return prisma.teacher.update({
      where: { id },
      data: {
        fullName: body.fullName,
        email: optionalString(body.email),
        phone: optionalString(body.phone),
        cnic: optionalString(body.cnic),
        subject: body.subject,
        qualification: optionalString(body.qualification),
        address: optionalString(body.address),
        imageUrl: file ? buildImageUrl(file) : existingTeacher.imageUrl,
        basicSalary: body.basicSalary,
        status: body.status || existingTeacher.status,
      },
      select: teacherSelect,
    });
  },

  async updateTeacherStatus(id, status) {
    const teacher = await prisma.teacher.findUnique({
      where: { id },
    });

    if (!teacher) {
      throw new AppError('استاد نہیں ملا۔', 404);
    }

    if (teacher.status === status) {
      throw new AppError('استاد کی حالت پہلے ہی یہی ہے۔', 400);
    }

    return prisma.teacher.update({
      where: { id },
      data: { status },
      select: teacherSelect,
    });
  },

  async deleteTeacher(id) {
    const teacher = await prisma.teacher.findUnique({
      where: { id },
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
      where: { id },
      select: teacherSelect,
    });
  },
};
