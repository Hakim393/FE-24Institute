import type { ApiResponse } from '../../types/api';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

/** Explicit whitelist: backend uses questionText, not UI-only prompt/order. */
export function buildInstructorQuizQuestionBody(draft: { prompt: string; explanation?: string; order?: number }): {
  questionText: string; explanation?: string;
} {
  const questionText = draft.prompt.trim();
  if (!questionText) throw new Error('Pertanyaan kuis wajib diisi.');
  const body: { questionText: string; explanation?: string } = { questionText };
  if (typeof draft.explanation === 'string' && draft.explanation.trim()) {
    body.explanation = draft.explanation.trim();
  }
  return body;
}

/** Backend uses optionText, not UI-only text/order. */
export function buildInstructorQuizOptionBody(draft: { text: string; isCorrect: boolean; order?: number }): {
  optionText: string; isCorrect: boolean;
} {
  const optionText = draft.text.trim();
  if (!optionText) throw new Error('Pilihan jawaban tidak boleh kosong.');
  if (typeof draft.isCorrect !== 'boolean') throw new Error('Status jawaban benar harus boolean.');
  return { optionText, isCorrect: draft.isCorrect };
}

/** Backend: data.question.id. Dev preview may use data.id. Always check quiz relation. */
export function requireCreatedQuizQuestionId(response: ApiResponse<unknown> | null | undefined, quizId: string): string {
  if (!response?.success) throw new Error(response?.message || 'Soal kuis gagal dibuat.');
  const payload = asRecord(response.data);
  const question = asRecord(payload?.question) || (payload && typeof payload.id === 'string' ? payload : null);
  if (!question || typeof question.id !== 'string' || !question.id.trim() || question.quizId !== quizId) {
    throw new Error('Backend tidak mengembalikan ID Question yang cocok. Periksa kuis sebelum mencoba lagi.');
  }
  return question.id;
}

/** Backend: data.option. Reject false success if option belongs to a different question. */
export function requireCreatedQuizOption(response: ApiResponse<unknown> | null | undefined, questionId: string): void {
  if (!response?.success) throw new Error(response?.message || 'Opsi kuis gagal dibuat.');
  const payload = asRecord(response.data);
  const wrapped = asRecord(payload?.option);
  const option = wrapped || (payload && typeof payload.id === 'string' ? payload : null);
  const text = wrapped ? option?.optionText : (option?.text ?? option?.optionText);
  if (!option || typeof option.id !== 'string' || !option.id.trim() ||
      option.questionId !== questionId || typeof text !== 'string' || !text.trim() ||
      typeof option.isCorrect !== 'boolean') {
    throw new Error('Kontrak respons pilihan kuis tidak sesuai; periksa soal sebelum mencoba lagi.');
  }
}
