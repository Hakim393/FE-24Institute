import type { QuizSubmitResult } from '../types/course';

export function requireCompletedLesson(data: unknown, courseId: string, lessonId: string): void {
  if (!data || typeof data !== 'object') throw new Error('Respons penyelesaian lesson tidak lengkap.');
  const value = data as Record<string, unknown>;
  if (value.status !== 'COMPLETED' || value.courseId !== courseId || value.lessonId !== lessonId) {
    throw new Error('Konfirmasi lesson dari backend tidak cocok.');
  }
}

/** Only a server-scored result is accepted; the optional `passed` flag is not authoritative. */
export function requireQuizScore(data: unknown): QuizSubmitResult {
  if (!data || typeof data !== 'object') throw new Error('Hasil kuis dari backend tidak lengkap.');
  const value = data as Record<string, unknown>;
  const validNumber = (x: unknown, lo: number, hi: number) =>
    typeof x === 'number' && Number.isFinite(x) && x >= lo && x <= hi;
  if ((value.status !== 'PASSED' && value.status !== 'FAILED') ||
      !validNumber(value.score, 0, 100) ||
      !validNumber(value.passingGrade, 0, 100) ||
      (typeof value.totalQuestions !== 'number' || !Number.isInteger(value.totalQuestions)) || value.totalQuestions < 1 ||
      (typeof value.correctAnswers !== 'number' || !Number.isInteger(value.correctAnswers)) ||
      (value.correctAnswers as number) < 0 ||
      (value.correctAnswers as number) > (value.totalQuestions as number)) {
    throw new Error('Hasil penilaian kuis tidak sesuai kontrak backend.');
  }
  return { ...(data as QuizSubmitResult), passed: value.status === 'PASSED' };
}

function safeHttpsUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

/** In real sessions, never fall back from private signed media to public lesson URLs. */
export function resolveLessonMediaUrl(signed: unknown, preview: unknown, previewActive: boolean): string | null {
  return safeHttpsUrl(signed) ?? (previewActive ? safeHttpsUrl(preview) : null);
}

/** A missing/invalid YouTube ID should show an unavailable state, never a demo video. */
export function youtubeEmbedUrl(videoId: unknown): string | null {
  if (typeof videoId !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}
