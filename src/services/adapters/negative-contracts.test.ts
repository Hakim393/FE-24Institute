import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adaptStudentEnrollment, adaptStudentOrderCheckout } from './index';

const sampleEnrollment = {
  id: 'enr-1', status: 'ACTIVE', progressPercentage: '65.00',
  course: { id: 'course-1', enrolledVersion: { title: 'Kursus', thumbnailUrl: null } },
  enrolledAt: '2026-11-01T00:00:00Z', completedAt: null,
};
const sampleCheckout = {
  orderId: 'order-1', token: 'sandbox-snap-token',
  redirectUrl: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/token',
  expiresAt: '2026-11-04T00:00:00Z',
};

test('enrollment valid tetap diparsing', () => {
  assert.equal(adaptStudentEnrollment(sampleEnrollment).progressPercentage, 65);
});
test('missing/unknown enrollment status must fail closed', () => {
  for (const status of [undefined, '', 'EXPIRED', 'REVOKED']) {
    assert.throws(() => adaptStudentEnrollment({ ...sampleEnrollment, status }));
  }
});
test('missing/malformed enrollment progress must not silently become zero', () => {
  for (const progressPercentage of [undefined, 'abc', '-1.00', '200.00', null]) {
    assert.throws(() => adaptStudentEnrollment({ ...sampleEnrollment, progressPercentage }));
  }
});
test('valid checkout response is retained unchanged', () => {
  assert.deepEqual(adaptStudentOrderCheckout(sampleCheckout), sampleCheckout);
});
test('missing Snap token, redirectUrl, or expiresAt must fail closed', () => {
  for (const change of [
    { token: '' }, { token: undefined }, { redirectUrl: '' },
    { redirectUrl: 'http://insecure.example/token' },
    { expiresAt: undefined }, { expiresAt: 'not-a-date' },
  ]) {
    assert.throws(() => adaptStudentOrderCheckout({ ...sampleCheckout, ...change }));
  }
});