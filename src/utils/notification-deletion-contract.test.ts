import assert from 'node:assert/strict';
import test from 'node:test';
import { requireNotificationDeleteAll, requireNotificationDeleteOne, notificationDestination } from './notification-center-contract';
const id = 'a143f59c-3d15-4d70-b2b2-3494f58334a7';

test('single deletion accepts only exact id and server confirmation', () => {
  assert.doesNotThrow(() => requireNotificationDeleteOne({ success: true, data: { id, deleted: true } }, id));
  assert.throws(() => requireNotificationDeleteOne({ success: true, data: { id: 'other', deleted: true } }, id));
  assert.throws(() => requireNotificationDeleteOne({ success: true, data: { id, deleted: false } }, id));
  assert.throws(() => requireNotificationDeleteOne({ success: false, data: { id, deleted: true } }, id));
});
test('delete all rejects malformed and negative counts', () => {
  assert.equal(requireNotificationDeleteAll({ success: true, data: { deletedCount: 0 } }), 0);
  assert.equal(requireNotificationDeleteAll({ success: true, data: { deletedCount: 7 } }), 7);
  for (const deletedCount of [-1, 1.2, '1', null]) {
    assert.throws(() => requireNotificationDeleteAll({ success: true, data: { deletedCount } }));
  }
});
test('SUPER_ADMIN has safe in-app destination equivalent to ADMIN', () => {
  assert.equal(notificationDestination({ type: 'COURSE_SUBMITTED', data: null }, 'SUPER_ADMIN'), '/admin/course-reviews');
  assert.equal(notificationDestination({ type: 'PAYMENT_SUCCESS', data: null }, 'SUPER_ADMIN'), '/admin/orders');
});
