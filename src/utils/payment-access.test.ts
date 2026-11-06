import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCoursePaymentAccess } from './payment-access';

test('PAID without backend entitlement MUST NOT open paid course', () => {
  assert.equal(resolveCoursePaymentAccess('PAID', false), 'PAID_AWAITING_ENTITLEMENT');
});
test('course opens only after explicit entitlement success', () => {
  assert.equal(resolveCoursePaymentAccess('PAID', true), 'GRANTED');
  assert.equal(resolveCoursePaymentAccess('PENDING', true), 'GRANTED');
});
test('PENDING / UNKNOWN / missing payment status does not open course', () => {
  for (const status of ['PENDING', 'UNKNOWN', 'FAILED', undefined]) {
    assert.equal(resolveCoursePaymentAccess(status, false), 'WAITING');
  }
});