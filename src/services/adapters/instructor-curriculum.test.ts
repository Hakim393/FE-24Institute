import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { adaptInstructorCurriculumEnvelope } from './instructor-curriculum';

const courseId = 'course-demo';
const versionId = 'version-demo';
const base = (chapters: unknown[]) => ({
  curriculum: {
    course: { id: courseId, draftVersionId: versionId },
    version: { id: versionId, courseId },
    chapters,
  },
});

const chapter = {
  id: 'chapter-demo', courseVersionId: versionId,
  title: 'Bab 1: Fondasi Fullstack', description: 'Ringkasan', position: 1, isRequired: true,
  lessons: [{
    id: 'lesson-demo', chapterId: 'chapter-demo', title: 'Cara kerja web',
    type: 'TEXT', position: 1, isRequired: true, isPreview: false,
    estimatedDurationMinutes: 10, textContent: 'HTTP dan client server',
    youtubeVideoId: null, imageMedia: null, audioMedia: null,
  }],
  quiz: {
    id: 'quiz-demo', chapterId: 'chapter-demo', title: 'Tes Fondasi',
    description: null, passingGrade: 70, isRequired: true,
    questions: [{
      id: 'question-demo', quizId: 'quiz-demo', questionText: 'Apa itu HTTP?',
      position: 1, explanation: 'Protokol aplikasi',
      options: [
        { id: 'opt1', questionId: 'question-demo', optionText: 'Protokol', isCorrect: true, position: 1 },
        { id: 'opt2', questionId: 'question-demo', optionText: 'Database', isCorrect: false, position: 2 },
      ],
    }],
  },
};

test('real data.curriculum.chapters renders chapter/lesson/quiz/question/option', () => {
  const converted = adaptInstructorCurriculumEnvelope(base([chapter]), courseId);
  assert.equal(converted.chapters.length, 1);
  const c = converted.chapters[0];
  assert.equal(c.order, 1);
  assert.equal(c.lessons[0].durationSeconds, 600);
  assert.equal(c.lessons[0].isPreview, false);
  assert.equal(c.quizzes[0].questions?.[0].prompt, 'Apa itu HTTP?');
  assert.equal(c.quizzes[0].questions?.[0].options[0].text, 'Protokol');
});

test('empty real curriculum is an allowed empty list', () => {
  assert.deepEqual(adaptInstructorCurriculumEnvelope(base([]), courseId).chapters, []);
});

test('missing data.curriculum must fail closed', () => {
  assert.throws(() => adaptInstructorCurriculumEnvelope({ chapters: [chapter] }, courseId), /data.curriculum/);
});

test('wrong course identity must fail closed', () => {
  assert.throws(() => adaptInstructorCurriculumEnvelope(base([chapter]), 'different-course'), /mismatch/);
});

test('chapters must never silently convert to empty list when malformed', () => {
  assert.throws(() => adaptInstructorCurriculumEnvelope(base(null as unknown as unknown[]), courseId), /chapters/);
});

test('one backend quiz object is converted into a frontend quiz array', () => {
  const c = {...chapter, quiz: null};
  assert.deepEqual(adaptInstructorCurriculumEnvelope(base([c]), courseId).chapters[0].quizzes, []);
});


test('missing lesson.isPreview must be rejected, never inferred from other fields', () => {
  const invalidChapter = {
    ...chapter,
    lessons: chapter.lessons.map(({ isPreview: _ignored, ...rest }) => rest),
  };
  assert.throws(() => adaptInstructorCurriculumEnvelope(base([invalidChapter]), courseId), /lesson\.isPreview/);
});
