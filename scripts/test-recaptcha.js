import assert from 'node:assert/strict';
import { verifyRecaptchaToken } from '../src/modules/auth/recaptcha.service.js';

const expectStatus = async (work, statusCode) => {
  await assert.rejects(work, (error) => error?.statusCode === statusCode);
};

await assert.doesNotReject(() => verifyRecaptchaToken('', null, { enabled: false }));

await expectStatus(
  () => verifyRecaptchaToken('', null, { enabled: true, secretKey: 'test-secret' }),
  400,
);

await expectStatus(
  () => verifyRecaptchaToken('expired-token', null, {
    enabled: true,
    secretKey: 'test-secret',
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ success: false, 'error-codes': ['timeout-or-duplicate'] }),
    }),
  }),
  400,
);

let submittedBody;
const validResult = await verifyRecaptchaToken('valid-token', '127.0.0.1', {
  enabled: true,
  secretKey: 'test-secret',
  fetchImpl: async (_url, request) => {
    submittedBody = request.body;
    return {
      ok: true,
      json: async () => ({ success: true, hostname: 'localhost' }),
    };
  },
});

assert.equal(validResult.success, true);
assert.equal(submittedBody.get('secret'), 'test-secret');
assert.equal(submittedBody.get('response'), 'valid-token');
assert.equal(submittedBody.get('remoteip'), '127.0.0.1');

console.log('reCAPTCHA tests passed: disabled development, missing, expired, and valid token flows.');
