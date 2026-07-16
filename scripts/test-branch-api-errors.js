import { createBranchValidationSchema, updateBranchValidationSchema } from '../src/modules/branches/branches.validation.js';

const results = [];
const pass = (name, details = '') => results.push({ status: 'PASS', name, details });
const fail = (name, details = '') => {
  results.push({ status: 'FAIL', name, details });
  throw new Error(`${name}${details ? `: ${details}` : ''}`);
};
const assert = (condition, name, details = '') => {
  if (!condition) fail(name, details);
  pass(name, details);
};

const fieldErrors = (result) => result.error.flatten().fieldErrors;

try {
  const missingName = createBranchValidationSchema.safeParse({
    body: { code: 'B-01', status: 'active' },
    params: {},
    query: {},
  });
  assert(!missingName.success, 'Missing branch name is rejected');
  assert(fieldErrors(missingName).body?.length || fieldErrors(missingName).name?.length, 'Missing branch name returns validation details');

  const missingCode = createBranchValidationSchema.safeParse({
    body: { name: 'Main Branch', status: 'active' },
    params: {},
    query: {},
  });
  assert(!missingCode.success, 'Missing branch code is rejected');

  const invalidStatus = createBranchValidationSchema.safeParse({
    body: { name: 'Main Branch', code: 'B-01', status: 'wrong' },
    params: {},
    query: {},
  });
  assert(!invalidStatus.success, 'Invalid branch status is rejected');
  assert(JSON.stringify(fieldErrors(invalidStatus)).includes('برانچ کی حالت درست منتخب کریں'), 'Invalid branch status has readable Urdu message');

  const invalidId = updateBranchValidationSchema.safeParse({
    body: { name: 'Main Branch', code: 'B-01', status: 'active' },
    params: { id: 'abc' },
    query: {},
  });
  assert(!invalidId.success, 'Invalid branch id is rejected');

  const valid = createBranchValidationSchema.safeParse({
    body: { name: 'Main Branch', code: 'B-01', status: 'inactive', address: '', contact: '' },
    params: {},
    query: {},
  });
  assert(valid.success, 'Valid branch payload passes validation');
} finally {
  console.table(results);
}
