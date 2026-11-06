import type { CourseAccessCheck } from '../types/order';

/** The live backend contract uses `allowed`. Never infer enrollment from order status. */
export function adaptCourseAccessCheck(payload: unknown, requestedCourseId: string): CourseAccessCheck {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Respons akses kursus tidak valid.');
  }
  const input = payload as Record<string, unknown>;
  if (input.courseId !== requestedCourseId || typeof input.allowed !== 'boolean') {
    throw new Error('Kontrak akses kursus tidak cocok dengan backend.');
  }
  return { courseId: requestedCourseId, allowed: input.allowed };
}
