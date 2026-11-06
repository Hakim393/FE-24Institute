export type PublicPreviewLessonType = 'TEXT' | 'IMAGE' | 'AUDIO' | 'YOUTUBE_VIDEO' | 'MIXED';
export interface PublicPreviewLesson {
  id: string;
  title: string;
  description: string | null;
  type: PublicPreviewLessonType;
  textContent: string | null;
  youtubeVideoId: string | null;
  privateMediaPreviewAvailable: false;
}

/** Reject malformed/mismatched server data before opening the preview player. */
export const parsePublicPreviewLesson = (raw: unknown, requestedId: string): PublicPreviewLesson => {
  if (!raw || typeof raw !== 'object' || !('lesson' in raw)) {
    throw new Error('Respons materi preview tidak lengkap.');
  }
  const lesson = raw.lesson;
  if (!lesson || typeof lesson !== 'object') {
    throw new Error('Respons materi preview tidak lengkap.');
  }
  const v = lesson as Record<string, unknown>;
  if (v.id !== requestedId || typeof v.title !== 'string' || !v.title.trim()) {
    throw new Error('ID atau judul materi preview tidak sesuai.');
  }
  if (!['TEXT', 'IMAGE', 'AUDIO', 'YOUTUBE_VIDEO', 'MIXED'].includes(String(v.type))) {
    throw new Error('Format materi preview tidak valid.');
  }
  if (v.textContent !== null && v.textContent !== undefined && typeof v.textContent !== 'string') {
    throw new Error('Format teks preview tidak valid.');
  }
  if (v.description !== null && v.description !== undefined && typeof v.description !== 'string') {
    throw new Error('Format deskripsi preview tidak valid.');
  }
  if (v.youtubeVideoId !== null && v.youtubeVideoId !== undefined &&
      (typeof v.youtubeVideoId !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(v.youtubeVideoId))) {
    throw new Error('ID YouTube preview tidak valid.');
  }
  const type = v.type as PublicPreviewLessonType;
  const allowText = type === 'TEXT' || type === 'MIXED';
  const allowYoutube = type === 'YOUTUBE_VIDEO' || type === 'MIXED';
  return {
    id: v.id as string,
    title: v.title as string,
    description: typeof v.description === 'string' ? v.description : null,
    type,
    textContent: allowText && typeof v.textContent === 'string' ? v.textContent : null,
    youtubeVideoId: allowYoutube && typeof v.youtubeVideoId === 'string' ? v.youtubeVideoId : null,
    privateMediaPreviewAvailable: false,
  };
};
