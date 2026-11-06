import type { CourseCompleteness, CourseCompletenessIssue } from '../../types/course';

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function nonnegativeInteger(object: JsonRecord, key: string): number {
  const value = object[key];
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Kontrak Completeness backend tidak valid: content.${key}.`);
  }
  return value;
}

/**
 * Connected backend: data.completeness.content.{chapterCount,lessonCount,quizCount,questionCount}.
 * Do not silently report zero if backend shape changes: this is a submission gate.
 */
export function adaptInstructorCompletenessEnvelope(
  payload: unknown,
  expectedCourseId: string,
): CourseCompleteness {
  const body = asRecord(payload);
  const completeness = asRecord(body?.completeness);
  if (!completeness) throw new Error('Kontrak validasi backend tidak sesuai: data.completeness tidak tersedia.');
  if (completeness.courseId !== expectedCourseId) {
    throw new Error('Kontrak validasi backend tidak sesuai: Course ID berbeda.');
  }
  if (typeof completeness.isComplete !== 'boolean' || typeof completeness.canSubmit !== 'boolean') {
    throw new Error('Kontrak validasi backend tidak sesuai: status validasi wajib boolean.');
  }
  const content = asRecord(completeness.content);
  if (!content) throw new Error('Kontrak validasi backend tidak sesuai: content tidak tersedia.');
  const chapterCount = nonnegativeInteger(content, 'chapterCount');
  const lessonCount = nonnegativeInteger(content, 'lessonCount');
  const quizCount = nonnegativeInteger(content, 'quizCount');
  const questionCount = nonnegativeInteger(content, 'questionCount');

  if (!Array.isArray(completeness.issues)) {
    throw new Error('Kontrak validasi backend tidak sesuai: issues bukan array.');
  }
  const issues: CourseCompletenessIssue[] = completeness.issues.map((item: unknown, i: number) => {
    const issue = asRecord(item);
    if (!issue || typeof issue.code !== 'string' || !issue.code.trim() ||
        typeof issue.message !== 'string' || !issue.message.trim() ||
        typeof issue.entityType !== 'string' || !issue.entityType.trim()) {
      throw new Error(`Kontrak validasi backend tidak sesuai: issues[${i}] tidak valid.`);
    }
    if (issue.entityId !== null && issue.entityId !== undefined && typeof issue.entityId !== 'string') {
      throw new Error(`Kontrak validasi backend tidak sesuai: issues[${i}].entityId.`);
    }
    return {
      code: issue.code,
      message: issue.message,
      entityType: issue.entityType,
      ...(typeof issue.entityId === 'string' ? { entityId: issue.entityId } : {}),
    };
  });

  // Fail closed: never label submit ready if the service reports conflicting booleans.
  if (completeness.isComplete !== completeness.canSubmit) {
    throw new Error('Kontrak validasi backend tidak konsisten: isComplete/canSubmit berbeda.');
  }
  return {
    isComplete: completeness.isComplete,
    canSubmit: completeness.canSubmit,
    totalChapters: chapterCount,
    totalLessons: lessonCount,
    totalQuizzes: quizCount,
    totalQuestions: questionCount,
    issues,
  };
}
