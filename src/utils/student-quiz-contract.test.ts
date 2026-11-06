import assert from 'node:assert/strict';
import test from 'node:test';
import { adaptEnrolledQuiz } from './student-learning-contract.ts';

const C = 'course-demo';
const V = 'published-version-demo';
const Q = 'quiz-demo';
const raw = () => ({
  courseId: C,
  courseVersionId: V,
  quiz: {
    id: Q, chapterId: 'chapter-demo', title: 'Kuis Bab 2', description: null,
    passingGrade: 75, isRequired: true, shuffleQuestions: false, shuffleOptions: false,
    questions: [
      { id: 'question-1', questionText: 'Apa itu REST?', position: 1, options: [
        { id: 'option-1', optionText: 'Gaya arsitektur API', position: 1 },
        { id: 'option-2', optionText: 'Bahasa pemrograman', position: 2 },
      ] },
    ],
  },
});

test('maps real nested B31 Student quiz, questions, options, and passing grade', () => {
  const quiz = adaptEnrolledQuiz(raw(), C, Q);
  assert.equal(quiz.title, 'Kuis Bab 2');
  assert.equal(quiz.passingGrade, 75);
  assert.equal(quiz.totalQuestions, 1);
  assert.equal(quiz.questions?.[0].prompt, 'Apa itu REST?');
  assert.equal(quiz.questions?.[0].options[0].text, 'Gaya arsitektur API');
  assert.equal(quiz.questions?.[0].options[0].questionId, 'question-1');
});

test('never exposes correct answers or explanations to Student', () => {
  const quiz = adaptEnrolledQuiz(raw(), C, Q);
  assert.equal('isCorrect' in quiz.questions![0].options[0], false);
  assert.equal('explanation' in quiz.questions![0], false);
});

test('fail-closed if backend quiz detail is missing or malformed', () => {
  assert.throws(() => adaptEnrolledQuiz({ courseId: C, courseVersionId: V }, C, Q), /tidak sesuai/);
  assert.throws(() => adaptEnrolledQuiz({ ...raw(), quiz: null }, C, Q), /tidak sesuai/);
  assert.throws(() => adaptEnrolledQuiz({ ...raw(), quiz: { ...raw().quiz, passingGrade: undefined } }, C, Q), /kelulusan/);
});

test('fail-closed on identity mismatch to prevent cross-course quiz mixups', () => {
  assert.throws(() => adaptEnrolledQuiz(raw(), 'other-course', Q), /tidak cocok/);
  assert.throws(() => adaptEnrolledQuiz(raw(), C, 'other-quiz'), /tidak cocok/);
});

test('published enrollment quiz with zero questions must show an explicit error, not 0/0', () => {
  const r = raw();
  assert.throws(() => adaptEnrolledQuiz({ ...r, quiz: { ...r.quiz, questions: [] } }, C, Q), /belum memiliki soal/);
});

test('invalid question options must fail closed', () => {
  const r = raw();
  assert.throws(() => adaptEnrolledQuiz({ ...r, quiz: { ...r.quiz, questions: [{ ...r.quiz.questions[0], options: [] }] } }, C, Q), /opsi jawaban/);
});

test('do not leak an answer key if backend accidentally includes one', () => {
  const r = raw();
  const q = r.quiz.questions[0];
  assert.throws(() => adaptEnrolledQuiz({ ...r, quiz: { ...r.quiz, questions: [{ ...q, options: [{ ...q.options[0], isCorrect: true }, q.options[1]] }] } }, C, Q), /membocorkan/);
});

test('does not accept incorrect text field names as real questions', () => {
  const r = raw();
  const q = r.quiz.questions[0];
  assert.throws(() => adaptEnrolledQuiz({ ...r, quiz: { ...r.quiz, questions: [{ ...q, questionText: undefined }] } }, C, Q), /Teks soal/);
});
