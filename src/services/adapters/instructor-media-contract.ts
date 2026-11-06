import type { ApiResponse } from '../../types/api';

export type InstructorMediaKind = 'IMAGE' | 'AUDIO';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const extensions: Record<InstructorMediaKind, readonly string[]> = {
  IMAGE: ['jpg', 'jpeg', 'png', 'webp'],
  AUDIO: ['mp3', 'm4a', 'wav', 'ogg', 'webm', 'flac'],
};
const mimeTypes: Record<InstructorMediaKind, readonly string[]> = {
  IMAGE: ['image/jpeg', 'image/png', 'image/webp'],
  AUDIO: ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm', 'audio/flac', 'audio/x-flac'],
};

export function validateInstructorLessonFile(file: File, kind: InstructorMediaKind): void {
  const max = (kind === 'IMAGE' ? 10 : 50) * 1024 * 1024;
  const ext = file.name.split('.').at(-1)?.toLowerCase() || '';
  if (file.size <= 0 || file.size > max || !extensions[kind].includes(ext) ||
      !mimeTypes[kind].includes(file.type.toLowerCase())) {
    throw new Error(kind === 'IMAGE'
      ? 'Gambar harus JPEG/PNG/WebP, maksimal 10 MiB.'
      : 'Audio harus MP3/M4A/WAV/OGG/WebM/FLAC, maksimal 50 MiB.');
  }
}

export function adaptInstructorMediaUpload(result: ApiResponse<unknown>, kind: InstructorMediaKind): { mediaId: string } {
  const record = (value: unknown): Record<string, unknown> | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  const data = record(result.data);
  const media = record(data?.media);
  const expectedPurpose = kind === 'IMAGE' ? 'LESSON_IMAGE' : 'LESSON_AUDIO';
  if (result.success !== true || !media || typeof media.id !== 'string' || !uuid.test(media.id) ||
      media.resourceType !== kind || media.purpose !== expectedPurpose ||
      typeof media.secureUrl !== 'string' || !media.secureUrl.startsWith('https://')) {
    throw new Error('Respons upload media tidak sesuai kontrak backend. Periksa Media sebelum retry.');
  }
  return { mediaId: media.id };
}
