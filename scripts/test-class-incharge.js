import { prisma } from '../src/config/prisma.js';
import { classesService } from '../src/modules/classes/classes.service.js';
import {
  bulkCreateClassesValidationSchema,
  createClassValidationSchema,
  updateClassValidationSchema,
} from '../src/modules/classes/classes.validation.js';

if (!createClassValidationSchema.safeParse({ body: { name: 'Optional Test' }, params: {}, query: {} }).success) {
  throw new Error('Create validation still requires an incharge');
}
if (!bulkCreateClassesValidationSchema.safeParse({ body: { classes: [{ name: 'Optional Bulk Test' }] }, params: {}, query: {} }).success) {
  throw new Error('Bulk create validation still requires an incharge');
}
if (!updateClassValidationSchema.safeParse({ body: { name: 'Optional Edit Test', inchargeTeacherId: null }, params: { id: 1 }, query: {} }).success) {
  throw new Error('Update validation does not allow removing an incharge');
}
console.log('PASS validation: create, bulk create, and edit accept an optional incharge');

const teacher = await prisma.teacher.findFirst({
  where: { status: 'active', staffType: 'teacher', branchId: { not: null } },
  select: { id: true, tenantId: true, branchId: true, fullName: true },
});
if (!teacher?.branchId) throw new Error('No active branch teacher available for isolated class-incharge test');

const tenantId = teacher.tenantId;
const branchId = teacher.branchId;
const branchScope = { branchId, resolvedBranchId: branchId, requestedBranchId: branchId, isBranchScoped: true };
const suffix = Date.now();
let classId = null;

try {
  const created = await classesService.createClass(tenantId, {
    branchId,
    name: `Incharge Test ${suffix}`,
    inchargeTeacherId: null,
  }, branchScope);
  classId = created.id;
  if (created.inchargeTeacherId !== null || created.inchargeTeacher !== null) {
    throw new Error('Class without an incharge was not created safely');
  }
  console.log('PASS create: class saved without an incharge');

  const list = await classesService.getClasses(tenantId, {
    branchId,
    status: 'active',
    page: 1,
    limit: 100,
  }, branchScope);
  const listed = list.items.find((item) => item.id === classId);
  if (!listed || listed.inchargeTeacher !== null) throw new Error('List did not handle a null class incharge');
  console.log('PASS list: null incharge is handled safely');

  const detail = await classesService.getClassById(tenantId, classId, branchScope);
  if (detail.inchargeTeacher !== null) throw new Error('Detail did not handle a null class incharge');
  console.log('PASS detail: null incharge is handled safely');

  const updated = await classesService.updateClass(tenantId, classId, {
    branchId,
    name: `Incharge Updated ${suffix}`,
    inchargeTeacherId: teacher.id,
    status: 'active',
  }, branchScope);
  if (updated.inchargeTeacherId !== teacher.id || updated.inchargeTeacher?.fullName !== teacher.fullName) {
    throw new Error('Edit response did not preserve the class incharge');
  }
  console.log('PASS edit: teacher ID and display relation preserved');

  const removed = await classesService.updateClass(tenantId, classId, {
    branchId,
    name: updated.name,
    inchargeTeacherId: null,
    status: 'active',
  }, branchScope);
  if (removed.inchargeTeacherId !== null || removed.inchargeTeacher !== null) {
    throw new Error('Edit did not remove the class incharge');
  }
  console.log('PASS remove: assigned incharge can be cleared later');

  const otherBranchTeacher = await prisma.teacher.findFirst({
    where: {
      tenantId,
      branchId: { not: branchId },
      status: 'active',
      staffType: 'teacher',
    },
    select: { id: true },
  });
  if (otherBranchTeacher) {
    let rejected = false;
    try {
      await classesService.updateClass(tenantId, classId, {
        branchId,
        name: updated.name,
        inchargeTeacherId: otherBranchTeacher.id,
      }, branchScope);
    } catch (error) {
      rejected = error.statusCode === 400;
    }
    if (!rejected) throw new Error('Cross-branch teacher assignment was not rejected');
    console.log('PASS scope: cross-branch teacher assignment rejected');
  } else {
    console.log('SKIP scope fixture: no second-branch active teacher exists; service scope predicate was inspected');
  }
} finally {
  if (classId) await prisma.academicClass.deleteMany({ where: { id: classId, tenantId, branchId } });
  await prisma.$disconnect();
}
