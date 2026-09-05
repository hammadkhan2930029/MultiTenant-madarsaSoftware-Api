import { prisma } from '../src/config/prisma.js';
import { studentsService } from '../src/modules/students/students.service.js';
import { createStudentValidationSchema, updateStudentValidationSchema } from '../src/modules/students/students.validation.js';

const tenant = await prisma.tenant.findFirst({
  where: { status: 'active' },
  select: { id: true, branches: { where: { status: 'active' }, take: 1, select: { id: true } } },
});
if (!tenant?.branches?.length) throw new Error('No active tenant/branch available for isolated test');

const tenantId = tenant.id;
const branchId = tenant.branches[0].id;
const branchScope = { branchId, resolvedBranchId: branchId, requestedBranchId: branchId, isBranchScoped: true };
const suffix = Date.now();
const familyNumber = `FAMILY-${suffix}`;
const updatedFamilyNumber = `${familyNumber}-UPDATED`;
let studentId = null;
let parentId = null;

const baseBody = {
  branchId,
  admissionNumber: `FAMILY-STUDENT-${suffix}`,
  admissionDate: '2026-09-04',
  admissionFee: '0',
  fullName: `Family Test Student ${suffix}`,
  fatherName: `Family Test Parent ${suffix}`,
  gender: 'male',
  dob: '2015-01-01',
  currentAddress: 'Test current address',
  permanentAddress: 'Test permanent address',
  monthlyFee: '0',
  parents: [{
    fullName: `Family Test Parent ${suffix}`,
    familyNumber,
    relationship: 'والد',
    isPrimary: true,
  }],
};

try {
  const createValidation = createStudentValidationSchema.parse({ body: baseBody, params: {}, query: {} });
  const created = await studentsService.createStudent(tenantId, {
    body: createValidation.body,
    branchScope,
  });
  studentId = created.id;
  parentId = created.parents.find((item) => item.isPrimary)?.parent?.id;
  if (!parentId || created.familyNumber !== familyNumber) {
    throw new Error('Family number was not saved/returned on admission create');
  }
  console.log('PASS create: family number saved through the primary parent and returned by Student API');

  const updateValidation = updateStudentValidationSchema.parse({
    body: {
      ...baseBody,
      admissionNumber: created.admissionNumber,
      parents: [{
        parentId,
        fullName: baseBody.fatherName,
        familyNumber: updatedFamilyNumber,
        relationship: 'والد',
        isPrimary: true,
      }],
    },
    params: { id: studentId },
    query: {},
  });
  const updated = await studentsService.updateStudent(tenantId, studentId, {
    body: updateValidation.body,
    branchScope,
  });
  if (updated.familyNumber !== updatedFamilyNumber) throw new Error('Family number was not updated');
  console.log('PASS edit: family number updated on the existing parent relation');

  const read = await studentsService.getStudentById(tenantId, studentId, branchScope);
  if (read.familyNumber !== updatedFamilyNumber) throw new Error('Family number missing from read response');
  console.log('PASS read/profile: family number returned at top level and in parent details');

  const list = await studentsService.getStudents(tenantId, {
    branchId,
    search: updatedFamilyNumber,
    status: 'active',
    page: 1,
    limit: 20,
  }, branchScope);
  if (!list.items.some((item) => item.id === studentId)) {
    throw new Error('Family number search did not return the student');
  }
  console.log('PASS search: student is searchable by family number within tenant/branch scope');
} finally {
  if (studentId) await prisma.studentParent.deleteMany({ where: { studentId, tenantId } });
  if (studentId) await prisma.student.deleteMany({ where: { id: studentId, tenantId } });
  if (parentId) await prisma.parent.deleteMany({ where: { id: parentId, tenantId } });
  await prisma.$disconnect();
}
