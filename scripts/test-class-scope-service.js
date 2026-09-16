import assert from 'node:assert/strict';
import { classScopeService } from '../src/modules/security/class-scope.service.js';

const selectedScope = { classScopeMode: 'selected', classIds: [8, '8', 9, null, -1] };

assert.deepEqual(classScopeService.normalizeClassIds(selectedScope), [8, 9]);
assert.equal(classScopeService.assertClassAccess(8, selectedScope), 8);
assert.throws(
  () => classScopeService.assertClassAccess(10, selectedScope),
  (error) => error?.statusCode === 403,
);
assert.throws(
  () => classScopeService.assertClassAccess('invalid', { classScopeMode: 'all' }),
  (error) => error?.statusCode === 400,
);

assert.deepEqual(
  classScopeService.buildStudentClassScopeWhere({ classScopeMode: 'selected', classIds: [] }),
  { assignments: { some: { status: 'active', classId: { in: [] } } } },
);

assert.deepEqual(
  classScopeService.buildActiveAssignmentWhere(selectedScope, {
    tenantId: 8,
    branchId: 3,
    classId: 9,
    sectionId: 4,
    sessionId: 2,
  }),
  {
    status: 'active',
    tenantId: 8,
    branchId: 3,
    classId: 9,
    sectionId: 4,
    sessionId: 2,
  },
);

assert.throws(
  () => classScopeService.buildActiveAssignmentWhere(selectedScope, { classId: 99 }),
  (error) => error?.statusCode === 403,
);

assert.deepEqual(
  classScopeService.buildTeacherClassScopeWhere({ classScopeMode: 'selected', classIds: [8] }),
  {
    OR: [
      { teachingAssignments: { some: { status: 'active', classId: { in: [8] } } } },
      { inchargeClasses: { some: { status: 'active', id: { in: [8] } } } },
      { roleClassAssignments: { some: { classId: { in: [8] } } } },
    ],
  },
);

assert.deepEqual(
  classScopeService.buildTeacherClassScopeWhere({ classScopeMode: 'all', classIds: [] }),
  {},
);

console.log('Class-scope service checks passed.');
