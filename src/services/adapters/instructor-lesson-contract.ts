import type { ApiResponse } from '../../types/api';
import type { Lesson, LessonType } from '../../types/course';

type LessonDraft = {
  title: string;
  type: LessonType;
  isRequired?: boolean;
  textContent?: string;
  youtubeUrl?: string;
  imageMediaId?: string;
  audioMediaId?: string;
};

const ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const ALLOWED_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']);

/** Accept an official YouTube URL or a bare 11-character ID; return a canonical HTTPS watch URL. */
export function normalizeInstructorYouTubeUrl(raw: string): string {
  const value = raw.trim();
  if (ID_PATTERN.test(value)) return `https://www.youtube.com/watch?v=${value}`;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Masukkan URL YouTube resmi atau ID video 11 karakter.');
  }
  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname)) {
    throw new Error('URL YouTube harus HTTPS dan berasal dari youtube.com atau youtu.be.');
  }
  let id: string | null = null;
  if (url.hostname === 'youtu.be') {
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length === 1) id = parts[0];
  } else if (url.pathname === '/watch') {
    id = url.searchParams.get('v');
  } else if (url.pathname.startsWith('/embed/')) {
    const parts = url.pathname.slice('/embed/'.length).split('/').filter(Boolean);
    if (parts.length === 1) id = parts[0];
  }
  if (!id || !ID_PATTERN.test(id)) {
    throw new Error('ID video YouTube tidak valid (harus 11 karakter).');
  }
  return `https://www.youtube.com/watch?v=${id}`;
}

/** Explicit whitelist: never send UI-only fields such as youtubeVideoId/order/durationSeconds. */
export function buildInstructorLessonBody(draft: LessonDraft): {
  title: string; type: LessonType; isRequired?: boolean;
  textContent?: string; youtubeUrl?: string; imageMediaId?: string; audioMediaId?: string;
} {
  const title = draft.title.trim();
  if (!title) throw new Error('Judul pelajaran wajib diisi.');
  const body: {
    title: string; type: LessonType; isRequired?: boolean;
    textContent?: string; youtubeUrl?: string; imageMediaId?: string; audioMediaId?: string;
  } = { title, type: draft.type };
  if (typeof draft.isRequired === 'boolean') body.isRequired = draft.isRequired;
  if (draft.textContent?.trim()) body.textContent = draft.textContent.trim();
  if (draft.type === 'YOUTUBE_VIDEO') {
    if (!draft.youtubeUrl?.trim()) throw new Error('URL atau ID video YouTube wajib diisi.');
    body.youtubeUrl = normalizeInstructorYouTubeUrl(draft.youtubeUrl);
  }
  if (draft.type === 'MIXED' && draft.youtubeUrl?.trim()) {
    body.youtubeUrl = normalizeInstructorYouTubeUrl(draft.youtubeUrl);
  }
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if ((draft.type === 'IMAGE' || draft.type === 'MIXED') && draft.imageMediaId) {
    if (!uuid.test(draft.imageMediaId)) throw new Error('ID media gambar tidak valid.');
    body.imageMediaId = draft.imageMediaId;
  }
  if ((draft.type === 'AUDIO' || draft.type === 'MIXED') && draft.audioMediaId) {
    if (!uuid.test(draft.audioMediaId)) throw new Error('ID media audio tidak valid.');
    body.audioMediaId = draft.audioMediaId;
  }
  return body;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

/** Backend returns data.lesson, not data:Lesson. Never show false success for a malformed response. */
export function adaptCreatedLessonEnvelope(response: ApiResponse<unknown>, expectedChapterId: string): ApiResponse<Lesson> {
  if (!response.success) throw new Error(response.message || 'Gagal membuat pelajaran.');
  const payload = asRecord(response.data);
  const lesson = asRecord(payload?.lesson);
  if (!lesson || typeof lesson.id !== 'string' || !lesson.id.trim() ||
      lesson.chapterId !== expectedChapterId ||
      typeof lesson.title !== 'string' || !lesson.title.trim() ||
      !['TEXT','IMAGE','AUDIO','YOUTUBE_VIDEO','MIXED'].includes(String(lesson.type)) ||
      typeof lesson.position !== 'number' || !Number.isInteger(lesson.position) || lesson.position < 1) {
    throw new Error('Kontrak respons Lesson backend tidak sesuai; periksa daftar sebelum mencoba lagi.');
  }
  const minutes = typeof lesson.estimatedDurationMinutes === 'number' && lesson.estimatedDurationMinutes >= 0
    ? lesson.estimatedDurationMinutes : 0;
  return {
    ...response,
    data: {
      id: lesson.id,
      chapterId: expectedChapterId,
      title: lesson.title,
      type: lesson.type as LessonType,
      order: lesson.position,
      isRequired: lesson.isRequired !== false,
      durationSeconds: minutes * 60,
      textContent: typeof lesson.textContent === 'string' ? lesson.textContent : null,
      youtubeVideoId: typeof lesson.youtubeVideoId === 'string' ? lesson.youtubeVideoId : null,
    },
  };
}
