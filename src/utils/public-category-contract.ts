import type { PublicCategory } from '../types/course';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const parsePublicCategory = (value: unknown): PublicCategory => {
  if (!isObject(value) ||
      typeof value.id !== 'string' || value.id.trim().length === 0 ||
      typeof value.name !== 'string' || value.name.trim().length === 0 ||
      typeof value.slug !== 'string' || value.slug.trim().length === 0 ||
      (value.description !== null && typeof value.description !== 'string') ||
      typeof value.publishedCourseCount !== 'number' ||
      !Number.isSafeInteger(value.publishedCourseCount) ||
      value.publishedCourseCount < 0) {
    throw new Error('Kontrak kategori publik backend tidak sesuai. Jumlah kursus tidak dapat dipercaya.');
  }
  return {
    id: value.id,
    name: value.name,
    slug: value.slug,
    description: value.description as string | null,
    publishedCourseCount: value.publishedCourseCount,
  };
};

export const parsePublicCategoryList = (value: unknown): PublicCategory[] => {
  if (!Array.isArray(value)) {
    throw new Error('Daftar kategori publik backend tidak valid.');
  }
  const parsed = value.map(parsePublicCategory);
  const ids = new Set(parsed.map(category => category.id.toLowerCase()));
  if (ids.size !== parsed.length) {
    throw new Error('Daftar kategori publik mengandung ID duplikat.');
  }
  return parsed;
};

/** Detail endpoint wraps its DTO inside { category: ... }. */
export const parsePublicCategoryDetail = (value: unknown): PublicCategory => {
  if (!isObject(value) || !Object.hasOwn(value, 'category')) {
    throw new Error('Detail kategori publik backend tidak sesuai.');
  }
  return parsePublicCategory(value.category);
};
