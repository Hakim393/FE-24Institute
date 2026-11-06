// Exact API contract for /admin/course-reviews (B31 connected development).
// Fail closed on malformed IDs/versions; never infer prices from missing queue fields.
export type ReviewStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'PUBLISHED' | 'ARCHIVED';

export interface ReviewQueueEntry {
  id: string; // courseVersionId; backend queue does NOT expose `id`
  courseId: string;
  versionNumber: number;
  title: string;
  status: ReviewStatus;
  submittedAt: string;
  updatedAt: string;
  isCurrentDraft: boolean;
  reviewable: boolean;
  instructorName: string;
}

export interface ReviewVersionDetail {
  id: string;
  courseId: string;
  versionNumber: number;
  title: string;
  status: ReviewStatus;
  price: string;
  currency: string;
  level: string;
  submittedAt: string;
  reviewCount: number;
  instructorName: string;
  isCurrentDraft: boolean;
  reviewable: boolean;
  chapters: Array<{ id: string; title: string; lessonCount: number; quizCount: number }>;
}

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const statuses: ReviewStatus[] = ['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED', 'ARCHIVED'];
const object = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Kontrak review tidak valid: ${label}`);
  }
  return value as Record<string, unknown>;
};
const nonEmpty = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Kontrak review tidak valid: ${label}`);
  return value;
};
const uuid = (value: unknown, label: string): string => {
  const str = nonEmpty(value, label);
  if (!uuidRe.test(str)) throw new Error(`ID versi review tidak valid: ${label}`);
  return str;
};
const integer = (value: unknown, label: string): number => {
  if (!Number.isInteger(value) || (value as number) < 0) throw new Error(`Kontrak review tidak valid: ${label}`);
  return value as number;
};
const boolean = (value: unknown, label: string): boolean => {
  if (typeof value !== 'boolean') throw new Error(`Kontrak review tidak valid: ${label}`);
  return value;
};
const date = (value: unknown, label: string): string => {
  const str = nonEmpty(value, label);
  if (Number.isNaN(Date.parse(str))) throw new Error(`Kontrak review tidak valid: ${label}`);
  return str;
};
const status = (value: unknown): ReviewStatus => {
  if (!statuses.includes(value as ReviewStatus)) throw new Error('Status versi review tidak dikenal');
  return value as ReviewStatus;
};
const money = (value: unknown): string => {
  const text = nonEmpty(value, 'version.price');
  if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(text)) throw new Error('Kontrak review tidak valid: version.price');
  return text;
};

export function adaptReviewQueue(raw: unknown): ReviewQueueEntry[] {
  if (!Array.isArray(raw)) throw new Error('Kontrak antrean review tidak berupa array');
  return raw.map((item, index) => {
    const row = object(item, `queue[${index}]`);
    const instructor = object(row.instructor, 'queue.instructor');
    const id = uuid(row.courseVersionId, 'queue.courseVersionId');
    return {
      id,
      courseId: uuid(row.courseId, 'queue.courseId'),
      versionNumber: integer(row.versionNumber, 'queue.versionNumber'),
      title: nonEmpty(row.title, 'queue.title'),
      status: status(row.status),
      submittedAt: date(row.submittedAt, 'queue.submittedAt'),
      updatedAt: date(row.updatedAt, 'queue.updatedAt'),
      isCurrentDraft: boolean(row.isCurrentDraft, 'queue.isCurrentDraft'),
      reviewable: boolean(row.reviewable, 'queue.reviewable'),
      instructorName: nonEmpty(instructor.fullName, 'queue.instructor.fullName'),
    };
  });
}

export function adaptReviewDetail(raw: unknown, expectedId: string): ReviewVersionDetail {
  const wrapper = object(raw, 'data');
  const review = object(wrapper.review, 'data.review');
  const version = object(review.version, 'review.version');
  const token = object(review.submissionToken, 'review.submissionToken');
  const instructor = object(review.instructor, 'review.instructor');
  const courseId = uuid(version.courseId, 'review.version.courseId');
  const id = uuid(version.id, 'review.version.id');
  if (id.toLowerCase() !== uuid(expectedId, 'expectedId').toLowerCase()) {
    throw new Error('ID versi detail tidak sesuai antrean review');
  }
  const course = object(review.course, 'review.course');
  if (uuid(course.id, 'review.course.id') !== courseId) {
    throw new Error('Course/version pada review tidak cocok');
  }
  const rawChapters = version.chapters;
  if (!Array.isArray(rawChapters)) throw new Error('Snapshot bab review tidak tersedia');
  const chapters = rawChapters.map((chapterRaw: unknown) => {
    const chapter = object(chapterRaw, 'review.version.chapters[]');
    if (!Array.isArray(chapter.lessons)) throw new Error('Snapshot lesson review tidak tersedia');
    return {
      id: uuid(chapter.id, 'chapter.id'),
      title: nonEmpty(chapter.title, 'chapter.title'),
      lessonCount: chapter.lessons.length,
      quizCount: chapter.quiz === null ? 0 : (object(chapter.quiz, 'chapter.quiz'), 1),
    };
  });
  const submittedAt = date(token.submittedAt, 'submissionToken.submittedAt');
  if (date(version.submittedAt, 'version.submittedAt') !== submittedAt) {
    throw new Error('Submission token dan versi berbeda');
  }
  return {
    id, courseId,
    versionNumber: integer(version.versionNumber, 'version.versionNumber'),
    title: nonEmpty(version.title, 'version.title'),
    status: status(version.status),
    price: money(version.price),
    currency: nonEmpty(version.currency, 'version.currency'),
    level: nonEmpty(version.level, 'version.level'),
    submittedAt,
    reviewCount: integer(token.reviewCount, 'submissionToken.reviewCount'),
    instructorName: nonEmpty(instructor.fullName, 'instructor.fullName'),
    isCurrentDraft: boolean(review.isCurrentDraft, 'review.isCurrentDraft'),
    reviewable: boolean(review.reviewable, 'review.reviewable'),
    chapters,
  };
}
