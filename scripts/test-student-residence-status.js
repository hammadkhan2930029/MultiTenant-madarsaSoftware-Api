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
let studentId = null;

const baseBody = {
  branchId,
  admissionNumber: `RES-${suffix}`,
  admissionDate: '2026-09-04',
  admissionFee: '0',
  fullName: `Residence Test ${suffix}`,
  fatherName: 'Test Father',
  gender: 'male',
  dob: '2015-01-01',
  currentAddress: 'Test current address',
  permanentAddress: 'Test permanent address',
  monthlyFee: '0',
  reside: 'رہائشی',
};

try {
  const createValidation = createStudentValidationSchema.parse({ body: baseBody, params: {}, query: {} });
  const created = await studentsService.createStudent(tenantId, {
    body: createValidation.body,
    branchScope,
  });
  studentId = created.id;
  if (created.reside !== 'رہائشی') throw new Error('Residence status was not saved on create');
  console.log('PASS create: رہائشی saved and returned');

  const updateValidation = updateStudentValidationSchema.parse({
    body: { ...baseBody, admissionNumber: created.admissionNumber, reside: 'غیر رہائشی' },
    params: { id: studentId },
    query: {},
  });
  const updated = await studentsService.updateStudent(tenantId, studentId, {
    body: updateValidation.body,
    branchScope,
  });
  if (updated.reside !== 'غیر رہائشی') throw new Error('Residence status was not updated');
  console.log('PASS edit: غیر رہائشی saved and returned');

  const legacyValidation = createStudentValidationSchema.parse({
    body: { ...baseBody, admissionNumber: `LEGACY-${suffix}`, reside: 'ہاں' },
    params: {},
    query: {},
  });
  if (legacyValidation.body.reside !== 'رہائشی') throw new Error('Legacy residence value was not normalized');
  console.log('PASS compatibility: legacy ہاں normalized to رہائشی');

  const invalidValidation = createStudentValidationSchema.safeParse({
    body: { ...baseBody, admissionNumber: `INVALID-${suffix}`, reside: 'invalid' },
    params: {},
    query: {},
  });
  if (invalidValidation.success) throw new Error('Invalid residence status was accepted');
  console.log('PASS validation: invalid residence status rejected');
} finally {
  if (studentId) await prisma.student.deleteMany({ where: { id: studentId, tenantId } });
  await prisma.$disconnect();
}
