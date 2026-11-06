import type { Chapter, Lesson, LessonType, StudentProgress, Quiz, QuizQuestion, QuizOption } from '../types/course';

/** Bridge the actual B31 Student Learning API contract to the existing frontend models.
 * Accept only server-provided entitlement-scoped fields. Never expose raw private media IDs/URLs.
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

function record(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${label}: respons backend tidak sesuai kontrak.`);
  return value;
}
function string(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label}: identitas backend tidak tersedia.`);
  return value;
}
function sameId(value: unknown, expected: string, label: string): void {
  if (value !== expected) throw new Error(`${label}: identitas respons backend tidak cocok.`);
}
function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
const allowedTypes: LessonType[] = ['TEXT', 'YOUTUBE_VIDEO', 'IMAGE', 'AUDIO', 'MIXED'];
function adaptLessonMetadata(value: unknown, chapterId: string, fallbackPosition: number, includeBody = false): Lesson {
  const item = record(value, 'Lesson');
  const type = item.type;
  if (!allowedTypes.includes(type as LessonType)) throw new Error('Format materi backend tidak dikenal.');
  const estimatedMinutes = numberOr(item.estimatedDurationMinutes, 0);
  let media: Lesson['media'];
  if (includeBody && item.media != null) {
    const flags = record(item.media, 'Media lesson');
    if (type === 'MIXED' && (typeof flags.hasImage !== 'boolean' || typeof flags.hasAudio !== 'boolean')) {
      throw new Error('Metadata media MIXED tidak sesuai kontrak backend.');
    }
    const hasImage = flags.hasImage === true;
    const hasAudio = flags.hasAudio === true;
    media = {
      hasImage,
      hasAudio,
      delivery: hasImage || hasAudio ? 'REQUEST_VIA_STUDENT_MEDIA_ENDPOINT' : 'NONE',
    };
  }
  if (includeBody && type === 'MIXED' && !media) {
    throw new Error('Metadata media MIXED tidak tersedia dari backend.');
  }
  return {
    id: string(item.id, 'Lesson'),
    chapterId,
    title: string(item.title, 'Judul lesson'),
    type: type as LessonType,
    order: numberOr(item.position, fallbackPosition),
    isRequired: item.isRequired === true,
    durationSeconds: estimatedMinutes >= 0 ? Math.floor(estimatedMinutes * 60) : null,
    textContent: includeBody && typeof item.textContent === 'string' ? item.textContent : null,
    youtubeVideoId: typeof item.youtubeVideoId === 'string' ? item.youtubeVideoId : null,
    // Public media URLs must never be copied from the private student lesson response.
    imageUrl: null,
    audioUrl: null,
    ...(media ? { media } : {}),
  };
}

/** Only the backend may determine the latest attempt and its PASSED/FAILED status. */
function adaptLatestQuizResult(value: unknown): Quiz['latestResult'] {
  if (value == null) return null;
  const result = record(value, 'Hasil kuis');
  const score = result.score;
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 100) {
    throw new Error('Nilai kuis backend tidak valid.');
  }
  if (result.status !== 'PASSED' && result.status !== 'FAILED') {
    throw new Error('Status hasil kuis backend tidak valid.');
  }
  if (!Number.isInteger(result.attemptNumber) || (result.attemptNumber as number) < 1) {
    throw new Error('Nomor percobaan kuis backend tidak valid.');
  }
  return { score, status: result.status, attemptNumber: result.attemptNumber as number };
}

/** Require explicit server cooldown metadata; never derive permission from a client-side attempt count. */
function adaptQuizRetry(value: unknown, latestResult: Quiz['latestResult']): Quiz['retry'] {
  const retry = record(value, 'Aturan remedial kuis');
  if (typeof retry.canRetry !== 'boolean' ||
      !Number.isSafeInteger(retry.failedAttemptCount) || (retry.failedAttemptCount as number) < 0 ||
      !Number.isSafeInteger(retry.remainingSeconds) || (retry.remainingSeconds as number) < 0 ||
      (retry.nextAllowedAt !== null &&
       (typeof retry.nextAllowedAt !== 'string' || !Number.isFinite(Date.parse(retry.nextAllowedAt))))) {
    throw new Error('Data cooldown remedial dari backend tidak valid.');
  }
  const seconds = retry.remainingSeconds as number;
  const locked = seconds > 0;
  if ((latestResult === null && (retry.failedAttemptCount !== 0 || locked || retry.canRetry !== true)) ||
      (latestResult?.status === 'PASSED' && (retry.canRetry || locked)) ||
      (latestResult?.status === 'FAILED' && (retry.canRetry !== !locked)) ||
      (locked && retry.nextAllowedAt === null) ||
      (!locked && retry.nextAllowedAt !== null)) {
    throw new Error('Status cooldown remedial backend tidak konsisten.');
  }
  return {
    canRetry: retry.canRetry as boolean,
    failedAttemptCount: retry.failedAttemptCount as number,
    remainingSeconds: seconds,
    nextAllowedAt: retry.nextAllowedAt as string | null,
  };
}

/** A missing/old response MUST be treated as locked, never as available. */
function adaptQuizAccess(value: unknown): Quiz['access'] {
  if (value == null) return null;
  const gate = record(value, 'Akses kuis');
  const all = [gate.totalRequiredLessons, gate.completedRequiredLessons, gate.remainingRequiredLessons,
    gate.totalPriorQuizzes, gate.passedPriorQuizzes, gate.remainingPriorQuizzes];
  if (typeof gate.canAttempt !== 'boolean' || all.some(n => !Number.isInteger(n) || (n as number) < 0)) {
    throw new Error('Status prasyarat kuis dari backend tidak valid.');
  }
  const [total, completed, remaining, totalPrior, passedPrior, remainingPrior] = all as number[];
  const blocked = gate.blockedByQuizId;
  if (completed > total || remaining !== total - completed ||
      passedPrior > totalPrior || remainingPrior !== totalPrior - passedPrior ||
      gate.canAttempt !== (remaining === 0 && remainingPrior === 0) ||
      (remainingPrior === 0 && blocked !== null) ||
      (remainingPrior > 0 && (typeof blocked !== 'string' || blocked.trim() === ''))) {
    throw new Error('Status prasyarat kuis tidak konsisten.');
  }
  return {
    canAttempt: gate.canAttempt,
    totalRequiredLessons: total, completedRequiredLessons: completed, remainingRequiredLessons: remaining,
    totalPriorQuizzes: totalPrior, passedPriorQuizzes: passedPrior, remainingPriorQuizzes: remainingPrior,
    blockedByQuizId: blocked as string | null,
  };
}

/** Only entitlement-gated signed endpoints may serve image/audio; MIXED needs both separately. */
export function requestedStudentMediaKinds(lesson: Lesson): Array<'image' | 'audio'> {
  const image = lesson.type === 'IMAGE' || (lesson.type === 'MIXED' && lesson.media?.hasImage === true);
  const audio = lesson.type === 'AUDIO' || (lesson.type === 'MIXED' && lesson.media?.hasAudio === true);
  return [...(image ? ['image' as const] : []), ...(audio ? ['audio' as const] : [])];
}

export function adaptEnrolledCurriculum(value: unknown, courseId: string): { courseId: string; chapters: Chapter[] } {
  const payload = record(value, 'Kurikulum');
  sameId(payload.courseId, courseId, 'Kurikulum');
  const versionId = string(payload.courseVersionId, 'Course version');
  if (!Array.isArray(payload.chapters)) throw new Error('Daftar bab backend tidak tersedia.');
  const chapters = payload.chapters.map((value, index): Chapter => {
    const ch = record(value, 'Bab');
    const id = string(ch.id, 'Bab');
    if (!Array.isArray(ch.lessons)) throw new Error('Daftar materi bab tidak sesuai kontrak.');
    const rawQuizzes = ch.quiz == null ? [] : [ch.quiz];
    return {
      id,
      courseVersionId: versionId,
      title: string(ch.title, 'Judul bab'),
      order: numberOr(ch.position, index + 1),
      isRequired: ch.isRequired === true,
      lessons: ch.lessons.map((lesson, lessonIndex) => adaptLessonMetadata(lesson, id, lessonIndex + 1)),
      quizzes: rawQuizzes.map((value, quizIndex) => {
        const q = record(value, 'Kuis');
        return {
          id: string(q.id, 'Kuis'), chapterId: id, title: string(q.title, 'Judul kuis'),
          order: numberOr(q.position, quizIndex + 1), isRequired: q.isRequired === true,
          // Curriculum intentionally omits grade; the authorized quiz detail determines it.
          passingGrade: typeof q.passingGrade === 'number' ? q.passingGrade : Number.NaN,
          latestResult: adaptLatestQuizResult(q.latestResult),
          retry: adaptQuizRetry(q.retry, adaptLatestQuizResult(q.latestResult)),
          access: adaptQuizAccess(q.access),
        };
      }),
    };
  });
  return { courseId, chapters };
}

export function adaptEnrolledLesson(value: unknown, courseId: string, lessonId: string): Lesson {
  const payload = record(value, 'Konten materi');
  sameId(payload.courseId, courseId, 'Konten materi');
  string(payload.courseVersionId, 'Versi materi');
  const item = record(payload.lesson, 'Detail lesson');
  sameId(item.id, lessonId, 'Lesson');
  return adaptLessonMetadata(item, string(item.chapterId, 'Bab lesson'), 0, true);
}

function percentage(value: unknown): number {
  if (typeof value !== 'string' && typeof value !== 'number') throw new Error('Persentase progres belum tersedia.');
  if (typeof value === 'string' && (!value.trim() || !/^\d+(?:\.\d+)?$/.test(value))) {
    throw new Error('Format progres backend tidak valid.');
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) throw new Error('Nilai progres backend di luar rentang 0–100.');
  return parsed;
}

export function adaptEnrolledProgress(value: unknown, courseId: string): StudentProgress {
  const raw = record(value, 'Progres');
  sameId(raw.courseId, courseId, 'Progres');
  const percent = percentage(raw.progressPercentage ?? raw.calculatedProgressPercentage ?? raw.storedProgressPercentage);
  const total = numberOr(raw.requiredLessons, 0) + numberOr(raw.requiredQuizzes, 0);
  const done = numberOr(raw.completedRequiredLessons, 0) + numberOr(raw.passedRequiredQuizzes, 0);
  return {
    courseId,
    totalRequiredItems: total,
    completedItems: done,
    completionPercentage: percent,
    // Server eligibility is a separate endpoint; never infer it from percent.
    isEligibleForCertificate: false,
    completedLessonIds: [],
    passedQuizIds: [],
  };
}

/** B31 student quiz detail is nested under data.quiz. Never expose answer keys.
 * Reject incomplete or mismatched published snapshots rather than rendering 0/0.
 */
export function adaptEnrolledQuiz(value: unknown, courseId: string, quizId: string): Quiz {
  const payload = record(value, 'Detail kuis');
  sameId(payload.courseId, courseId, 'Course kuis');
  string(payload.courseVersionId, 'Versi kuis');

  const rawQuiz = record(payload.quiz, 'Kuis');
  sameId(rawQuiz.id, quizId, 'Kuis');
  const chapterId = string(rawQuiz.chapterId, 'Bab kuis');
  const title = string(rawQuiz.title, 'Judul kuis');
  const passingGrade = rawQuiz.passingGrade;
  if (typeof passingGrade !== 'number' || !Number.isInteger(passingGrade) || passingGrade < 0 || passingGrade > 100) {
    throw new Error('Standar kelulusan kuis tidak sesuai kontrak backend.');
  }
  if (typeof rawQuiz.isRequired !== 'boolean') {
    throw new Error('Status wajib kuis tidak sesuai kontrak backend.');
  }
  if (!Array.isArray(rawQuiz.questions) || rawQuiz.questions.length === 0) {
    throw new Error('Kuis pada versi course Student ini belum memiliki soal. Periksa versi publish dan enrollment.');
  }
  if (rawQuiz.questions.length > 100) {
    throw new Error('Jumlah soal kuis melebihi batas yang diizinkan.');
  }

  const questionIds = new Set<string>();
  const questions: QuizQuestion[] = rawQuiz.questions.map((item: unknown): QuizQuestion => {
    const q = record(item, 'Soal kuis');
    const id = string(q.id, 'ID soal');
    if (questionIds.has(id)) throw new Error('ID soal kuis duplikat.');
    questionIds.add(id);
    const prompt = string(q.questionText, 'Teks soal kuis');
    const position = q.position;
    if (typeof position !== 'number' || !Number.isInteger(position) || position < 1) {
      throw new Error('Urutan soal kuis tidak valid.');
    }
    if ('explanation' in q || 'isCorrect' in q) {
      throw new Error('Respons kuis Student mengandung field jawaban yang tidak diizinkan.');
    }
    if (!Array.isArray(q.options) || q.options.length < 2) {
      throw new Error('Kuis pada versi course Student ini belum memiliki opsi jawaban yang lengkap.');
    }
    const optionIds = new Set<string>();
    const options: QuizOption[] = q.options.map((option: unknown): QuizOption => {
      const o = record(option, 'Opsi jawaban');
      const optionId = string(o.id, 'ID opsi');
      if (optionIds.has(optionId)) throw new Error('ID opsi jawaban duplikat.');
      optionIds.add(optionId);
      if ('isCorrect' in o || 'explanation' in o) {
        throw new Error('Respons opsi Student membocorkan jawaban kuis.');
      }
      const order = o.position;
      if (typeof order !== 'number' || !Number.isInteger(order) || order < 1) {
        throw new Error('Urutan opsi kuis tidak valid.');
      }
      return { id: optionId, questionId: id, text: string(o.optionText, 'Teks opsi'), order };
    });
    return { id, quizId, prompt, order: position, options };
  });

  return {
    id: quizId,
    chapterId,
    title,
    description: rawQuiz.description == null ? null : string(rawQuiz.description, 'Deskripsi kuis'),
    passingGrade,
    isRequired: rawQuiz.isRequired,
    order: 1,
    questions,
    totalQuestions: questions.length,
  };
}
