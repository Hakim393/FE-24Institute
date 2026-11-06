import assert from 'node:assert/strict';
import test from 'node:test';
import { adaptEnrolledCurriculum } from './student-learning-contract.ts';
const C = 'course1';
const curriculum = (quiz: Record<string, unknown>) => ({
  courseId: C, courseVersionId: 'published-v1',
  chapters: [{ id: 'chapter1', title: 'Bab 1', position: 1, isRequired: true,
    lessons: [], quiz: { id: 'quiz1', title: 'Evaluasi', isRequired: true, passingGrade: 75, ...quiz } }],
});

test('unattempted quiz shows no invented grade', () => {
  const q = adaptEnrolledCurriculum(curriculum({ latestResult: null }), C).chapters[0].quizzes[0];
  assert.equal(q.latestResult, null);
  assert.equal(q.passingGrade, 75);
});
test('passed score and configured KKM are preserved separately', () => {
  const q = adaptEnrolledCurriculum(curriculum({ latestResult: { score: 85.5, status: 'PASSED', attemptNumber: 2 } }), C).chapters[0].quizzes[0];
  assert.deepEqual(q.latestResult, { score: 85.5, status: 'PASSED', attemptNumber: 2 });
  assert.equal(q.passingGrade, 75);
});
test('failed score can be shown without classifying as passed', () => {
  const q = adaptEnrolledCurriculum(curriculum({ latestResult: { score: 60, status: 'FAILED', attemptNumber: 1 } }), C).chapters[0].quizzes[0];
  assert.equal(q.latestResult?.status, 'FAILED');
  assert.equal(q.latestResult?.score, 60);
});
test('bad or forged server result fails closed', () => {
  for (const bad of [
    { score: 101, status: 'PASSED', attemptNumber: 1 },
    { score: -1, status: 'FAILED', attemptNumber: 1 },
    { score: '100', status: 'PASSED', attemptNumber: 1 },
    { score: 60, status: 'COMPLETED', attemptNumber: 1 },
    { score: 60, status: 'FAILED', attemptNumber: 0 },
  ]) {
    assert.throws(() => adaptEnrolledCurriculum(curriculum({ latestResult: bad }), C), /tidak valid/);
  }
});
test('old curriculum response does not claim the student attempted the quiz', () => {
  const q = adaptEnrolledCurriculum(curriculum({}), C).chapters[0].quizzes[0];
  assert.equal(q.latestResult, null);
});
test('wrong course identity is refused', () => {
  assert.throws(() => adaptEnrolledCurriculum(curriculum({ latestResult: null }), 'wrong-course'), /tidak cocok/);
});
