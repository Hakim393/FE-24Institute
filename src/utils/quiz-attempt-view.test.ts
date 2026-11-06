import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAttemptedQuizView } from './quiz-attempt-view.ts';

const base = (result: unknown, overrides: Record<string, unknown> = {}) => [{
  id: 'chapter-1',
  quizzes: [{ id: 'quiz-1', title: 'Kuis Bab 2', passingGrade: 70, latestResult: result, ...overrides }],
}];
const view = (v: unknown, id = 'quiz-1') => resolveAttemptedQuizView(v as Parameters<typeof resolveAttemptedQuizView>[0], id);

test('not yet attempted: quiz remains accessible', () => {
  assert.equal(view(base(null)), null);
});
test('PASSED: display persisted score, KKM, and attempt number', () => {
  assert.deepEqual(view(base({ status: 'PASSED', score: 85, attemptNumber: 1 })), {
    title: 'Kuis Bab 2', score: 85, passingGrade: 70, status: 'PASSED', attemptNumber: 1,
  });
});
test('FAILED: prior submission still counts as attempted', () => {
  assert.equal(view(base({ status: 'FAILED', score: 50, attemptNumber: 2 }))?.status, 'FAILED');
});
test('quiz identity mismatch cannot show another quiz result', () => {
  assert.throws(() => view(base({ status: 'PASSED', score: 100, attemptNumber: 1 }), 'quiz-other'), /tidak ditemukan/);
});
test('duplicate quiz IDs fail closed', () => {
  const rows = [...base(null), ...base(null)];
  assert.throws(() => view(rows), /tidak ditemukan/);
});
test('corrupt score fails closed', () => {
  assert.throws(() => view(base({ status: 'PASSED', score: 140, attemptNumber: 1 })), /tidak valid/);
});
test('corrupt status fails closed', () => {
  assert.throws(() => view(base({ status: 'IN_PROGRESS', score: 75, attemptNumber: 1 })), /tidak valid/);
});
test('missing or invalid KKM with attempted result fails closed', () => {
  assert.throws(() => view(base({ status: 'PASSED', score: 75, attemptNumber: 1 }, { passingGrade: Number.NaN })), /tidak valid/);
});
