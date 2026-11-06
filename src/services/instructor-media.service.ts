import { api } from './api';
import { adaptInstructorMediaUpload, validateInstructorLessonFile } from './adapters/instructor-media-contract';

export { validateInstructorLessonFile } from './adapters/instructor-media-contract';

async function upload(file: File, kind: 'IMAGE' | 'AUDIO'): Promise<{ mediaId: string }> {
  validateInstructorLessonFile(file, kind);
  const body = new FormData();
  // Actual Multer field names on the backend; never use the legacy generic 'file' field.
  body.append(kind === 'IMAGE' ? 'image' : 'audio', file, file.name);
  const result = await api.request<unknown>(kind === 'IMAGE' ? '/media/lesson-images' : '/media/lesson-audios', {
    method: 'POST', body, isFormData: true,
  });
  return adaptInstructorMediaUpload(result, kind);
}

export const instructorMediaService = {
  uploadLessonImage: (file: File) => upload(file, 'IMAGE'),
  uploadLessonAudio: (file: File) => upload(file, 'AUDIO'),
};

/** Thumbnail contract is independent from Lesson image upload. */
export { validateInstructorThumbnail } from './adapters/instructor-thumbnail-contract';
import { validateInstructorThumbnail, parseInstructorThumbnailUpload } from './adapters/instructor-thumbnail-contract';

export async function uploadInstructorCourseThumbnail(file: File): Promise<{ mediaId: string }> {
  validateInstructorThumbnail(file);
  const form = new FormData();
  form.append('thumbnail', file, file.name);
  const response = await api.request<unknown>('/media/course-thumbnails', {
    method: 'POST', body: form, isFormData: true,
  });
  return parseInstructorThumbnailUpload(response);
}
