import type { Chapter } from '../types/course';

/** F34-R7P. Enrollment-scoped read-only quiz attempt display. Never uses local mock score. */
export interface AttemptedQuizView {
  title: string;
  score: number;
  passingGrade: number;
  status: 'PASSED' | 'FAILED';
  attemptNumber: number;
}

export function resolveAttemptedQuizView(chapters: readonly Chapter[], quizId: string): AttemptedQuizView | null {
  if (!quizId || !Array.isArray(chapters)) throw new Error('Identitas kuis tidak valid.');
  const matches = chapters.flatMap(chapter => chapter.quizzes ?? []).filter(quiz => quiz.id === quizId);
  if (matches.length !== 1) throw new Error('Kuis tidak ditemukan pada kurikulum Student yang terdaftar.');
  const quiz = matches[0];
  if (quiz.latestResult == null) return null;
  const attempt = quiz.latestResult;
  if (typeof quiz.title !== 'string' || !quiz.title.trim() ||
      typeof quiz.passingGrade !== 'number' || !Number.isFinite(quiz.passingGrade) ||
      quiz.passingGrade < 0 || quiz.passingGrade > 100 ||
      typeof attempt.score !== 'number' || !Number.isFinite(attempt.score) ||
      attempt.score < 0 || attempt.score > 100 ||
      (attempt.status !== 'PASSED' && attempt.status !== 'FAILED') ||
      !Number.isInteger(attempt.attemptNumber) || attempt.attemptNumber < 1) {
    throw new Error('Hasil ujian dari backend tidak valid.');
  }
  return {
    title: quiz.title,
    score: attempt.score,
    passingGrade: quiz.passingGrade,
    status: attempt.status,
    attemptNumber: attempt.attemptNumber,
  };
}
