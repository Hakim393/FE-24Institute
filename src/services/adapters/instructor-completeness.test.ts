import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptInstructorCompletenessEnvelope } from './instructor-completeness';

const courseId = '68415d96-38ae-46ce-a0b2-8a28deb6a84c';
const valid = {
  completeness: {
    courseId,
    isComplete: false,
    canSubmit: false,
    content: { chapterCount: 2, lessonCount: 5, quizCount: 1, questionCount: 1 },
    issues: [
      { code: 'COURSE_THUMBNAIL_REQUIRED', entityType: 'COURSE_VERSION', entityId: null, message: 'Thumbnail course wajib tersedia' },
    ],
  },
};

test('unwraps real backend data.completeness.content counters', () => {
  const result = adaptInstructorCompletenessEnvelope(valid, courseId);
  assert.deepEqual([result.totalChapters, result.totalLessons, result.totalQuizzes, result.totalQuestions], [2,5,1,1]);
  assert.equal(result.canSubmit, false);
});
test('preserves backend issue messages and extended entity types', () => {
  const result = adaptInstructorCompletenessEnvelope(valid, courseId);
  assert.equal(result.issues[0].message, 'Thumbnail course wajib tersedia');
  assert.equal(result.issues[0].entityType, 'COURSE_VERSION');
  assert.equal(result.issues[0].entityId, undefined);
});
test('accepts real zero counters when backend explicitly provides them', () => {
  const raw = { completeness: { ...valid.completeness, content: { chapterCount: 0, lessonCount: 0, quizCount: 0, questionCount: 0 } } };
  assert.equal(adaptInstructorCompletenessEnvelope(raw, courseId).totalChapters, 0);
});
test('rejects missing data.completeness rather than falsely rendering zeros', () => {
  assert.throws(() => adaptInstructorCompletenessEnvelope({ ...valid.completeness }, courseId), /data.completeness/);
});
test('rejects missing content field rather than falsely rendering zeros', () => {
  const raw = { completeness: { ...valid.completeness, content: { chapterCount: 2, lessonCount: 5 } } };
  assert.throws(() => adaptInstructorCompletenessEnvelope(raw, courseId), /content.quizCount/);
});
test('rejects negative and fractional counters', () => {
  for (const count of [-1, 1.5, NaN]) {
    const raw = { completeness: { ...valid.completeness, content: { ...valid.completeness.content, chapterCount: count } } };
    assert.throws(() => adaptInstructorCompletenessEnvelope(raw, courseId), /content.chapterCount/);
  }
});
test('rejects course mismatch; cannot borrow another course completeness', () => {
  assert.throws(() => adaptInstructorCompletenessEnvelope(valid, 'unrelated-id'), /Course ID/);
});
test('rejects invalid issues and inconsistent submit booleans', () => {
  const badIssue = { completeness: { ...valid.completeness, issues: [{ code: 'X', message: '', entityType: 'COURSE' }] } };
  assert.throws(() => adaptInstructorCompletenessEnvelope(badIssue, courseId), /issues\[0\]/);
  const mismatch = { completeness: { ...valid.completeness, canSubmit: true } };
  assert.throws(() => adaptInstructorCompletenessEnvelope(mismatch, courseId), /tidak konsisten/);
});
test('complete backend result enables submit in normalized object', () => {
  const raw = { completeness: { ...valid.completeness, isComplete: true, canSubmit: true, issues: [] } };
  const result = adaptInstructorCompletenessEnvelope(raw, courseId);
  assert.equal(result.canSubmit, true);
  assert.equal(result.isComplete, true);
});
