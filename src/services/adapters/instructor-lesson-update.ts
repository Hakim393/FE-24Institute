import type { ApiResponse } from '../../types/api';
import type { Lesson, LessonType } from '../../types/course';
import { normalizeInstructorYouTubeUrl } from './instructor-lesson-contract';

export type InstructorLessonPatch = {
  title?: string;
  textContent?: string | null;
  youtubeUrl?: string | null;
  imageMediaId?: string;
  audioMediaId?: string;
};

type LessonEditingDraft = {
  title: string;
  type: LessonType;
  textContent: string;
  youtubeUrl: string;
  imageMediaId?: string | null;
  audioMediaId?: string | null;
};

const mediaUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Strict whitelist and PATCH semantics: untouched lesson fields, IDs, and media stay intact. */
export function buildInstructorLessonUpdatePatch(original: Lesson, draft: LessonEditingDraft): InstructorLessonPatch {
  if (draft.type !== original.type) {
    throw new Error('Format materi tidak bisa diubah dalam editor revisi. Buat revisi draft yang sesuai.');
  }
  const title = draft.title.trim().replace(/\s+/g, ' ');
  if (!title) throw new Error('Judul pelajaran wajib diisi.');
  const patch: InstructorLessonPatch = {};
  if (title !== original.title.trim().replace(/\s+/g, ' ')) patch.title = title;

  const text = draft.textContent.trim();
  if (text !== (original.textContent ?? '').trim()) patch.textContent = text || null;

  if (draft.type === 'YOUTUBE_VIDEO' || draft.type === 'MIXED') {
    const url = draft.youtubeUrl.trim() ? normalizeInstructorYouTubeUrl(draft.youtubeUrl) : null;
    const originalUrl = original.youtubeVideoId
      ? normalizeInstructorYouTubeUrl(original.youtubeVideoId) : null;
    if (url !== originalUrl) patch.youtubeUrl = url;
  }

  if (draft.imageMediaId) {
    if (draft.type !== 'IMAGE' && draft.type !== 'MIXED') throw new Error('Format tidak mendukung gambar.');
    if (!mediaUuid.test(draft.imageMediaId)) throw new Error('ID upload gambar tidak valid.');
    patch.imageMediaId = draft.imageMediaId;
  }
  if (draft.audioMediaId) {
    if (draft.type !== 'AUDIO' && draft.type !== 'MIXED') throw new Error('Format tidak mendukung audio.');
    if (!mediaUuid.test(draft.audioMediaId)) throw new Error('ID upload audio tidak valid.');
    patch.audioMediaId = draft.audioMediaId;
  }
  return patch;
}

/** The HTTP backend returns nested data.lesson. Do not accept a success with a different lesson identity. */
export function requireConfirmedUpdatedLesson(
  response: ApiResponse<unknown>, expectedLessonId: string, expectedChapterId: string,
): void {
  if (response.success !== true) throw new Error(response.message || 'Gagal memperbarui materi.');
  const data = response.data;
  const nested = data !== null && typeof data === 'object' && !Array.isArray(data)
    ? (data as Record<string, unknown>).lesson : null;
  if (!nested || typeof nested !== 'object' || Array.isArray(nested)) {
    throw new Error('Respons edit materi tidak memiliki data lesson yang terkonfirmasi.');
  }
  const lesson = nested as Record<string, unknown>;
  if (lesson.id !== expectedLessonId || lesson.chapterId !== expectedChapterId ||
      typeof lesson.title !== 'string' || lesson.title.trim().length === 0) {
    throw new Error('Identitas lesson pada respons edit tidak cocok. Muat ulang sebelum mencoba lagi.');
  }
}
