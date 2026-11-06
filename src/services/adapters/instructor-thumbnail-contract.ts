/** Backend COURSE_THUMBNAIL contract, distinct from LESSON_IMAGE. */
export function validateInstructorThumbnail(file: File): void {
  const extension = file.name.split('.').at(-1)?.toLowerCase() || '';
  if (file.size <= 0 || file.size > 5 * 1024 * 1024 ||
      !['jpg', 'jpeg', 'png', 'webp'].includes(extension) ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type.toLowerCase())) {
    throw new Error('Thumbnail wajib JPEG/PNG/WebP dengan ukuran maksimal 5 MiB.');
  }
}

/** Reject mismatched media purpose, type, URL or UUID. */
export function parseInstructorThumbnailUpload(response: { success: boolean; data?: unknown }): { mediaId: string } {
  const record = (v: unknown): Record<string, unknown> | null =>
    v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null;
  const media = record(record(response.data)?.media);
  if (!response.success || !media || media.purpose !== 'COURSE_THUMBNAIL' ||
      media.resourceType !== 'IMAGE' ||
      typeof media.id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(media.id) ||
      typeof media.secureUrl !== 'string' || !media.secureUrl.startsWith('https://')) {
    throw new Error('Respons upload thumbnail tidak valid. Periksa Media sebelum upload ulang.');
  }
  return { mediaId: media.id };
}
