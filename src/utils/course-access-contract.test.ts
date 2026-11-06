import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adaptCourseAccessCheck } from './course-access-contract';

const courseId = '13305877-618c-45a1-abae-af4d8b9f1d6a';
test('backend allowed:true grants the UI a valid entitlement response', () => {
  assert.deepEqual(adaptCourseAccessCheck({ courseId, allowed: true }, courseId), { courseId, allowed: true });
});
test('backend allowed:false remains locked, even when order is PAID', () => {
  assert.deepEqual(adaptCourseAccessCheck({ courseId, allowed: false }, courseId), { courseId, allowed: false });
});
test('obsolete frontend hasAccess alias cannot be silently accepted', () => {
  assert.throws(() => adaptCourseAccessCheck({ courseId, hasAccess: true }, courseId));
});
test('wrong course identity is rejected, even with allowed:true', () => {
  assert.throws(() => adaptCourseAccessCheck({ courseId: 'another-course', allowed: true }, courseId));
});
test('string and missing allowed values are rejected', () => {
  for (const data of [{courseId,allowed:'true'}, {courseId}, null, {}, []]) {
    assert.throws(() => adaptCourseAccessCheck(data,courseId));
  }
});
