import type { Chapter, Lesson, LessonType, Quiz, QuizQuestion, QuizOption } from '../../types/course';

/** Backend response: data.curriculum.chapters, NOT data.chapters. */
function record(value: unknown, where: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Kontrak kurikulum backend tidak sesuai: ${where}`);
  }
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, where: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Kontrak kurikulum backend tidak sesuai: ${where}`);
  }
  return value;
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function validPosition(value: unknown, where: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new Error(`Kontrak kurikulum backend tidak sesuai: ${where}`);
  }
  return value;
}

function validArray(value: unknown, where: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Kontrak kurikulum backend tidak sesuai: ${where}`);
  }
  return value;
}

function validLessonType(value: unknown): LessonType {
  const allowed: LessonType[] = ['TEXT', 'IMAGE', 'AUDIO', 'YOUTUBE_VIDEO', 'MIXED'];
  if (!allowed.includes(value as LessonType)) {
    throw new Error('Kontrak kurikulum backend tidak sesuai: lesson.type');
  }
  return value as LessonType;
}

function mapOption(value: unknown): QuizOption {
  const o = record(value, 'quiz.option');
  return {
    id: requiredString(o.id, 'quiz.option.id'),
    questionId: requiredString(o.questionId, 'quiz.option.questionId'),
    text: requiredString(o.optionText, 'quiz.option.optionText'),
    isCorrect: o.isCorrect === true,
    order: validPosition(o.position, 'quiz.option.position'),
  };
}

function mapQuestion(value: unknown): QuizQuestion {
  const q = record(value, 'quiz.question');
  return {
    id: requiredString(q.id, 'quiz.question.id'),
    quizId: requiredString(q.quizId, 'quiz.question.quizId'),
    prompt: requiredString(q.questionText, 'quiz.question.questionText'),
    explanation: optionalString(q.explanation),
    order: validPosition(q.position, 'quiz.question.position'),
    options: validArray(q.options, 'quiz.question.options').map(mapOption),
  };
}

function mapQuiz(value: unknown): Quiz {
  const q = record(value, 'chapter.quiz');
  if (typeof q.passingGrade !== 'number' || q.passingGrade < 0 || q.passingGrade > 100) {
    throw new Error('Kontrak kurikulum backend tidak sesuai: quiz.passingGrade');
  }
  return {
    id: requiredString(q.id, 'quiz.id'),
    chapterId: requiredString(q.chapterId, 'quiz.chapterId'),
    title: requiredString(q.title, 'quiz.title'),
    description: optionalString(q.description),
    passingGrade: q.passingGrade,
    isRequired: q.isRequired === true,
    order: 1, // Backend permits one quiz per chapter; no quiz.position field.
    questions: validArray(q.questions, 'quiz.questions').map(mapQuestion),
  };
}

function mapLesson(value: unknown): Lesson {
  const l = record(value, 'chapter.lesson');
  const imageMedia = l.imageMedia == null ? null : record(l.imageMedia, 'lesson.imageMedia');
  const audioMedia = l.audioMedia == null ? null : record(l.audioMedia, 'lesson.audioMedia');
  const minutes = l.estimatedDurationMinutes;
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 0) {
    throw new Error('Kontrak kurikulum backend tidak sesuai: lesson.estimatedDurationMinutes');
  }
  return {
    id: requiredString(l.id, 'lesson.id'),
    chapterId: requiredString(l.chapterId, 'lesson.chapterId'),
    title: requiredString(l.title, 'lesson.title'),
    type: validLessonType(l.type),
    order: validPosition(l.position, 'lesson.position'),
    isRequired: l.isRequired === true,
    isPreview: typeof l.isPreview === 'boolean'
      ? l.isPreview
      : (() => { throw new Error('Kontrak kurikulum backend tidak sesuai: lesson.isPreview'); })(),
    durationSeconds: minutes * 60,
    textContent: optionalString(l.textContent),
    youtubeVideoId: optionalString(l.youtubeVideoId),
    imageUrl: imageMedia ? optionalString(imageMedia.secureUrl) : null,
    audioUrl: audioMedia ? optionalString(audioMedia.secureUrl) : null,
  };
}

function mapChapter(value: unknown, versionId: string): Chapter {
  const c = record(value, 'chapter');
  const chapterVersionId = requiredString(c.courseVersionId, 'chapter.courseVersionId');
  if (chapterVersionId !== versionId) {
    throw new Error('Kontrak kurikulum backend tidak sesuai: chapter berada pada versi lain.');
  }
  return {
    id: requiredString(c.id, 'chapter.id'),
    courseVersionId: chapterVersionId,
    title: requiredString(c.title, 'chapter.title'),
    description: optionalString(c.description),
    order: validPosition(c.position, 'chapter.position'),
    isRequired: c.isRequired === true,
    lessons: validArray(c.lessons, 'chapter.lessons').map(mapLesson),
    quizzes: c.quiz == null ? [] : [mapQuiz(c.quiz)],
  };
}

export function adaptInstructorCurriculumEnvelope(
  input: unknown,
  expectedCourseId: string,
): { courseId: string; chapters: Chapter[] } {
  const data = record(input, 'data');
  const curriculum = record(data.curriculum, 'data.curriculum');
  const course = record(curriculum.course, 'data.curriculum.course');
  const version = record(curriculum.version, 'data.curriculum.version');
  const courseId = requiredString(course.id, 'data.curriculum.course.id');
  const versionId = requiredString(version.id, 'data.curriculum.version.id');
  if (courseId !== expectedCourseId || version.courseId !== expectedCourseId ||
      course.draftVersionId !== versionId) {
    throw new Error('Kontrak kurikulum backend tidak sesuai: course/version mismatch.');
  }
  return {
    courseId,
    chapters: validArray(curriculum.chapters, 'data.curriculum.chapters')
      .map((chapter) => mapChapter(chapter, versionId)),
  };
}
