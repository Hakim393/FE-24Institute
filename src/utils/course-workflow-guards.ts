import type { Course } from '../types/course';

/** Only server-derived, nonempty published IDs may be used for a revision. */
export function requirePublishedVersionId(course: Course | null): string {
  const candidate = course?.publishedVersionId || course?.publishedVersion?.id;
  if (typeof candidate !== 'string' || !candidate.trim()) {
    throw new Error('ID versi kursus terbit belum tersedia. Muat ulang kursus sebelum membuat revisi.');
  }
  return candidate.trim();
}

/** Submission must identify the current server-side draft, not an invented ID. */
export function requireDraftVersionId(course: Course | null): string {
  const candidate = course?.currentDraftVersionId;
  if (typeof candidate !== 'string' || !candidate.trim()) {
    throw new Error('ID versi draf belum tersedia. Muat ulang Course Builder sebelum mengajukan review.');
  }
  return candidate.trim();
}

/** Published courses intentionally have no active authoring draft after publication. */
export type InstructorCourseBuilderMode = 'DRAFT_AVAILABLE' | 'PUBLISHED_NO_DRAFT' | 'MISSING_VERSION';

export function getInstructorCourseBuilderMode(course: Course): InstructorCourseBuilderMode {
  if (course.currentDraftVersionId && course.currentDraftVersionId.trim()) return 'DRAFT_AVAILABLE';
  if (course.publishedVersionId && course.publishedVersionId.trim() &&
      course.publishedVersion?.status === 'PUBLISHED') return 'PUBLISHED_NO_DRAFT';
  return 'MISSING_VERSION';
}
