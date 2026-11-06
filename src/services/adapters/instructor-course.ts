import type { ApiResponse } from '../../types/api';
import type { Course, CourseVersion, CourseVersionStatus } from '../../types/course';

// Backend Course Authoring responses are { data: { course: { draftVersion, publishedVersion } } }.
// Unlike public catalog APIs, authoring metadata lives on the version, not the Course root.
const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown> : null;

const requiredText = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Kontrak Instructor Course tidak sesuai: ${field}`);
  }
  return value;
};

const optionalText = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value : undefined;

export function adaptInstructorCourse(input: unknown): Course {
  const raw = asRecord(input);
  if (!raw) throw new Error('Kontrak Instructor Course backend kosong.');
  const draft = asRecord(raw.draftVersion);
  const published = asRecord(raw.publishedVersion);
  const metadata = draft ?? published;
  if (!metadata) throw new Error('Kontrak Instructor Course kehilangan versi metadata.');

  const id = requiredText(raw.id, 'id');
  const slug = requiredText(raw.slug, 'slug');
  const title = requiredText(metadata.title, 'draftVersion/publishedVersion.title');
  const shortDescription = requiredText(metadata.shortDescription, 'shortDescription');
  const categoryId = requiredText(metadata.categoryId, 'categoryId');
  const instructorId = requiredText(raw.instructorId, 'instructorId');
  const category = asRecord(metadata.category);
  const thumbnail = asRecord(metadata.thumbnail);
  const instructor = asRecord(raw.instructor);

  const toVersion = (v: Record<string, unknown> | null): CourseVersion | null => {
    if (!v) return null;
    return {
      id: requiredText(v.id, 'version.id'),
      courseId: id,
      versionNumber: typeof v.versionNumber === 'number' ? v.versionNumber : 1,
      status: requiredText(v.status, 'version.status') as CourseVersionStatus,
      title: requiredText(v.title, 'version.title'),
      subtitle: optionalText(v.shortDescription) ?? null,
      description: optionalText(v.description) ?? null,
      price: requiredText(v.price, 'version.price'),
      currency: requiredText(v.currency, 'version.currency'),
      level: requiredText(v.level, 'version.level') as Course['level'],
      language: requiredText(v.language, 'version.language'),
      thumbnailUrl: optionalText(asRecord(v.thumbnail)?.secureUrl) ?? null,
      learningObjectives: Array.isArray(v.learningObjectives) ? v.learningObjectives as string[] : [],
      requirements: Array.isArray(v.requirements) ? v.requirements as string[] : [],
      targetAudience: Array.isArray(v.targetAudience) ? v.targetAudience as string[] : [],
      createdAt: requiredText(v.createdAt, 'version.createdAt'),
      updatedAt: requiredText(v.updatedAt, 'version.updatedAt'),
    };
  };

  return {
    id,
    slug,
    title,
    subtitle: shortDescription,
    description: requiredText(metadata.description, 'description'),
    thumbnailUrl: optionalText(thumbnail?.secureUrl) ?? null,
    price: requiredText(metadata.price, 'price'),
    currency: requiredText(metadata.currency, 'currency'),
    level: requiredText(metadata.level, 'level') as Course['level'],
    language: requiredText(metadata.language, 'language'),
    categoryId,
    category: category ? {
      id: requiredText(category.id, 'category.id'),
      name: requiredText(category.name, 'category.name'),
      slug: requiredText(category.slug, 'category.slug'),
      description: optionalText(category.description) ?? null,
      isActive: category.isActive === true,
      createdAt: optionalText(category.createdAt) ?? '',
      updatedAt: optionalText(category.updatedAt) ?? '',
    } : undefined,
    instructorId,
    instructor: instructor ? {
      id: requiredText(instructor.id, 'instructor.id'),
      fullName: requiredText(instructor.fullName, 'instructor.fullName'),
    } : undefined,
    currentDraftVersionId: optionalText(raw.draftVersionId) ?? (draft ? requiredText(draft.id, 'draft.id') : null),
    publishedVersionId: optionalText(raw.publishedVersionId) ?? null,
    draftVersion: toVersion(draft),
    publishedVersion: toVersion(published),
    status: requiredText(metadata.status, 'status') as CourseVersionStatus,
    createdAt: requiredText(raw.createdAt, 'createdAt'),
    updatedAt: requiredText(raw.updatedAt, 'updatedAt'),
  };
}

export function adaptInstructorCourseEnvelope(
  response: ApiResponse<unknown>,
): ApiResponse<Course> {
  if (!response.success) throw new Error(response.message || 'Operasi kursus gagal.');
  const envelope = asRecord(response.data);
  if (!envelope || !envelope.course) {
    throw new Error('Kontrak backend tidak mengembalikan data.course.');
  }
  return { ...response, data: adaptInstructorCourse(envelope.course) };
}
