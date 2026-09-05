import { prisma } from '../src/config/prisma.js';
import { parentsService } from '../src/modules/parents/parents.service.js';
import { studentsService } from '../src/modules/students/students.service.js';

const tenant = await prisma.tenant.findFirst({
  where: { status: 'active' },
  select: { id: true, branches: { where: { status: 'active' }, take: 1, select: { id: true } } },
});
if (!tenant?.branches?.length) throw new Error('No active tenant/branch available for isolated test');

const tenantId = tenant.id;
const branchId = tenant.branches[0].id;
const branchScope = { branchId, resolvedBranchId: branchId, requestedBranchId: branchId, isBranchScoped: true };
const suffix = Date.now();
const ids = { parents: [], students: [] };

const studentData = (number, fullName, fatherName) => ({
  tenantId,
  branchId,
  admissionNumber: `PARENT-SYNC-${suffix}-${number}`,
  admissionDate: new Date('2026-09-04'),
  admissionFee: 0,
  fullName,
  fatherName,
  gender: 'male',
  dob: new Date('2015-01-01'),
  currentAddress: 'Test current address',
  permanentAddress: 'Test permanent address',
  monthlyFee: 0,
});

try {
  const [sharedParent, sameNameParent] = await Promise.all([
    prisma.parent.create({ data: { tenantId, branchId, fullName: `Old Parent ${suffix}`, familyNumber: `PS-${suffix}` } }),
    prisma.parent.create({ data: { tenantId, branchId, fullName: `Old Parent ${suffix}`, familyNumber: `PS-OTHER-${suffix}` } }),
  ]);
  ids.parents.push(sharedParent.id, sameNameParent.id);

  const [studentOne, studentTwo, unrelatedStudent] = await Promise.all([
    prisma.student.create({ data: studentData(1, 'Linked Student One', sharedParent.fullName) }),
    prisma.student.create({ data: studentData(2, 'Linked Student Two', sharedParent.fullName) }),
    prisma.student.create({ data: studentData(3, 'Same Name Parent Student', sameNameParent.fullName) }),
  ]);
  ids.students.push(studentOne.id, studentTwo.id, unrelatedStudent.id);

  await prisma.studentParent.createMany({
    data: [
      { tenantId, studentId: studentOne.id, parentId: sharedParent.id, relationship: 'والد', isPrimary: true },
      { tenantId, studentId: studentTwo.id, parentId: sharedParent.id, relationship: 'والد', isPrimary: true },
      { tenantId, studentId: unrelatedStudent.id, parentId: sameNameParent.id, relationship: 'والد', isPrimary: true },
    ],
  });

  const parentManagementName = `Updated Parent ${suffix}`;
  await parentsService.updateParent(tenantId, sharedParent.id, {
    fullName: parentManagementName,
    familyNumber: sharedParent.familyNumber,
  }, branchScope);

  const afterParentEdit = await prisma.student.findMany({
    where: { id: { in: ids.students } },
    select: { id: true, fatherName: true },
  });
  const linkedAfterParentEdit = afterParentEdit.filter((item) => item.id !== unrelatedStudent.id);
  if (linkedAfterParentEdit.some((item) => item.fatherName !== parentManagementName)) {
    throw new Error('Parent Management edit did not sync every linked student');
  }
  if (afterParentEdit.find((item) => item.id === unrelatedStudent.id)?.fatherName !== sameNameParent.fullName) {
    throw new Error('Different parent with same name was modified');
  }
  console.log('PASS Parent Management edit syncs all students by parent ID only');

  const admissionEditName = `Admission Updated Parent ${suffix}`;
  await studentsService.updateStudent(tenantId, studentOne.id, {
    branchScope,
    body: {
      branchId,
      admissionNumber: studentOne.admissionNumber,
      admissionDate: new Date('2026-09-04'),
      admissionFee: 0,
      fullName: studentOne.fullName,
      fatherName: admissionEditName,
      gender: 'male',
      dob: new Date('2015-01-01'),
      currentAddress: 'Test current address',
      permanentAddress: 'Test permanent address',
      monthlyFee: 0,
      parents: [{ parentId: sharedParent.id, fullName: admissionEditName, relationship: 'والد', isPrimary: true }],
    },
  });

  const linkedStudent = await studentsService.getStudentById(tenantId, studentTwo.id, branchScope);
  const linkedParentName = linkedStudent.parents.find((item) => item.isPrimary)?.parent?.fullName;
  if (linkedParentName !== admissionEditName || linkedStudent.fatherName !== admissionEditName) {
    throw new Error('Admission edit did not update the other linked student');
  }
  if (linkedStudent.parents.find((item) => item.isPrimary)?.parent?.id !== sharedParent.id) {
    throw new Error('Stable parent ID relationship was not preserved');
  }
  console.log('PASS Admission edit updates other linked students and preserves parent ID');

  const searchedStudents = await studentsService.getStudents(tenantId, {
    branchId,
    search: admissionEditName,
    status: 'active',
    page: 1,
    limit: 100,
  }, branchScope);
  const matchedIds = new Set(searchedStudents.items.map((item) => item.id));
  if (!matchedIds.has(studentOne.id) || !matchedIds.has(studentTwo.id)) {
    throw new Error('Student list did not search by the current relational parent name');
  }
  if (searchedStudents.items.some((item) => item.fatherName !== admissionEditName)) {
    throw new Error('Student API did not expose the current relational parent name');
  }
  console.log('PASS student list/search returns the current linked parent name');
} finally {
  if (ids.students.length) await prisma.studentParent.deleteMany({ where: { studentId: { in: ids.students } } });
  if (ids.students.length) await prisma.student.deleteMany({ where: { id: { in: ids.students }, tenantId } });
  if (ids.parents.length) await prisma.parent.deleteMany({ where: { id: { in: ids.parents }, tenantId } });
  await prisma.$disconnect();
}
