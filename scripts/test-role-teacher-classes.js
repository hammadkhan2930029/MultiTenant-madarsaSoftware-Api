import { prisma } from '../src/config/prisma.js';
import { rolesService } from '../src/modules/roles/roles.service.js';

const teacher = await prisma.teacher.findFirst({
  where: { status: 'active', staffType: 'teacher', branchId: { not: null } },
  select: { id: true, tenantId: true, branchId: true },
});
if (!teacher?.branchId) throw new Error('No active branch teacher available for isolated test');

const classes = await prisma.academicClass.findMany({
  where: { tenantId: teacher.tenantId, branchId: teacher.branchId, status: 'active' },
  take: 2,
  select: { id: true },
});
if (!classes.length) throw new Error('No active class exists in the teacher branch');

const requester = {
  tenantId: teacher.tenantId,
  isTenantAdmin: true,
  isSuperAdmin: false,
  admin: { id: null },
  classScopeMode: 'all',
  classIds: [],
};
const suffix = Date.now();
let roleId = null;

try {
  const created = await rolesService.createRole({
    roleName: `Teacher Class Role ${suffix}`,
    branchId: teacher.branchId,
    classScopeMode: 'selected',
    classIds: classes.map((item) => item.id),
    teacherId: teacher.id,
    permissionKeys: ['students.view'],
  }, requester);
  roleId = created.id;
  if (created.teacherId !== teacher.id || created.classTeacherAssignments.length !== classes.length) {
    throw new Error('Role teacher/class mappings were not returned after create');
  }
  console.log('PASS create: selected classes mapped to the selected teacher');

  const fetched = await rolesService.getRoleById(roleId, requester);
  if (fetched.teacherId !== teacher.id || fetched.classIds.length !== classes.length) {
    throw new Error('Role edit/detail preload data is incomplete');
  }
  console.log('PASS read: class and teacher selections preload from API');

  const updated = await rolesService.updateRole(roleId, {
    classScopeMode: 'selected',
    classIds: [classes[0].id],
    teacherId: teacher.id,
  }, requester);
  if (updated.classTeacherAssignments.length !== 1 || updated.classTeacherAssignments[0].classId !== classes[0].id) {
    throw new Error('Role teacher/class mappings were not replaced on edit');
  }
  console.log('PASS edit: mapping updated without stale class assignments');

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
    let rejected = false;
    try {
      await rolesService.updateRole(roleId, {
        classScopeMode: 'selected',
        classIds: [classes[0].id],
        teacherId: otherBranchTeacher.id,
      }, requester);
    } catch (error) {
      rejected = error.statusCode === 403;
    }
    if (!rejected) throw new Error('Cross-branch teacher mapping was accepted');
    console.log('PASS authorization: cross-branch teacher rejected');
  }

  const allClasses = await rolesService.updateRole(roleId, {
    classScopeMode: 'all',
    classIds: [],
    teacherId: null,
  }, requester);
  if (allClasses.teacherId !== null || allClasses.classTeacherAssignments.length) {
    throw new Error('All Classes mode retained teacher/class mappings');
  }
  console.log('PASS all classes: specific teacher mappings cleared safely');
} finally {
  if (roleId) await prisma.role.deleteMany({ where: { id: roleId, tenantId: teacher.tenantId } });
  await prisma.$disconnect();
}
