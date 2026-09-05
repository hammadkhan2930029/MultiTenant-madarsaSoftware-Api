import { prisma } from '../src/config/prisma.js';
import { authService } from '../src/modules/auth/auth.service.js';
import { rolesService } from '../src/modules/roles/roles.service.js';
import { usersService } from '../src/modules/users/users.service.js';

const teacher = await prisma.teacher.findFirst({
  where: { status: 'active', staffType: 'teacher', branchId: { not: null }, linkedUser: null },
  select: { id: true, tenantId: true, branchId: true, fullName: true },
});
if (!teacher?.branchId) throw new Error('No unlinked active branch teacher available for isolated test');

const academicClass = await prisma.academicClass.findFirst({
  where: { tenantId: teacher.tenantId, branchId: teacher.branchId, status: 'active' },
  select: { id: true },
});
if (!academicClass) throw new Error('No active class exists in the teacher branch');

const requester = {
  tenantId: teacher.tenantId,
  isTenantAdmin: true,
  isSuperAdmin: false,
  admin: { id: null },
  classScopeMode: 'all',
  classIds: [],
};
const suffix = Date.now();
const password = 'TeacherUser@123';
let roleId = null;
const userIds = [];

try {
  const role = await rolesService.createRole({
    roleName: `Linked Teacher Role ${suffix}`,
    branchId: teacher.branchId,
    classScopeMode: 'selected',
    classIds: [academicClass.id],
    teacherId: teacher.id,
    permissionKeys: ['students.view'],
  }, requester);
  roleId = role.id;

  const created = await usersService.createUser({
    name: `Linked Teacher User ${suffix}`,
    email: `linked-teacher-${suffix}@example.test`,
    username: `linked_teacher_${suffix}`,
    password,
    roleId,
    branchId: teacher.branchId,
    teacherId: teacher.id,
    status: 'active',
  }, requester);
  userIds.push(created.id);
  if (created.teacherId !== teacher.id || created.teacher?.fullName !== teacher.fullName) {
    throw new Error('Create response did not include linked teacher');
  }
  console.log('PASS create: existing teacher linked one-to-one with new user');

  const fetched = await usersService.getUserById(created.id, requester);
  if (fetched.teacherId !== teacher.id) throw new Error('Edit/detail preload omitted teacher link');
  console.log('PASS read/edit preload: linked teacher returned');

  const list = await usersService.getUsers({ page: 1, limit: 100, search: created.username }, requester);
  if (!list.items.some((item) => item.id === created.id && item.teacherId === teacher.id)) {
    throw new Error('User list omitted the linked teacher');
  }
  console.log('PASS list: linked teacher included in user list response');

  const updated = await usersService.updateUser(created.id, {
    name: `Updated Linked Teacher User ${suffix}`,
    teacherId: teacher.id,
  }, requester);
  if (updated.teacherId !== teacher.id || updated.name !== `Updated Linked Teacher User ${suffix}`) {
    throw new Error('User edit did not preserve the teacher relation');
  }
  console.log('PASS edit: user updated while teacher relation remained stable');

  const otherBranchTeacher = await prisma.teacher.findFirst({
    where: {
      tenantId: teacher.tenantId,
      branchId: { not: teacher.branchId },
      status: 'active',
      staffType: 'teacher',
    },
    select: { id: true },
  });
  if (otherBranchTeacher) {
    let crossBranchBlocked = false;
    try {
      await usersService.updateUser(created.id, { teacherId: otherBranchTeacher.id }, requester);
    } catch (error) {
      crossBranchBlocked = error.statusCode === 403;
    }
    if (!crossBranchBlocked) throw new Error('Cross-branch teacher link was accepted');
    console.log('PASS scope: cross-branch teacher link rejected');
  }

  const login = await authService.loginAdmin(
    { identity: created.username, password },
    { tenantId: teacher.tenantId, isSystemHost: false },
  );
  if (!login?.token) throw new Error('Linked teacher user could not log in');
  console.log('PASS login: authentication remains in admins table');

  let duplicateBlocked = false;
  try {
    const duplicate = await usersService.createUser({
      name: `Duplicate Teacher User ${suffix}`,
      email: `duplicate-linked-teacher-${suffix}@example.test`,
      username: `duplicate_linked_teacher_${suffix}`,
      password,
      roleId,
      branchId: teacher.branchId,
      teacherId: teacher.id,
      status: 'active',
    }, requester);
    userIds.push(duplicate.id);
  } catch (error) {
    duplicateBlocked = error.statusCode === 409;
  }
  if (!duplicateBlocked) throw new Error('Same teacher was linked to multiple users');
  console.log('PASS uniqueness: duplicate teacher/user link rejected');

  const beforeDeactivate = await prisma.teacher.count({ where: { id: teacher.id } });
  await usersService.deactivateUser(created.id, requester);
  const afterDeactivate = await prisma.teacher.count({ where: { id: teacher.id } });
  if (beforeDeactivate !== 1 || afterDeactivate !== 1) throw new Error('Teacher was removed when user was deactivated');
  console.log('PASS delete/deactivate safety: teacher record preserved');
} finally {
  if (userIds.length) await prisma.admin.deleteMany({ where: { id: { in: userIds } } });
  if (roleId) await prisma.role.deleteMany({ where: { id: roleId, tenantId: teacher.tenantId } });
  await prisma.$disconnect();
}
