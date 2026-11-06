import type { ApiResponse, PaginationMeta, UserRole } from '../types/api';
import type { AppNotification, NotificationType } from '../types/notification';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KNOWN_TYPES = new Set<NotificationType>([
  'ROLE_CHANGED', 'ACCOUNT_DEACTIVATED', 'ACCOUNT_REACTIVATED',
  'COURSE_SUBMITTED', 'COURSE_APPROVED', 'COURSE_REJECTED', 'COURSE_CHANGES_REQUESTED',
  'PAYMENT_PENDING', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'PAYMENT_EXPIRED', 'PAYMENT_REFUNDED',
  'ENROLLMENT_CREATED', 'QUIZ_PASSED', 'QUIZ_FAILED', 'COURSE_COMPLETED',
  'CERTIFICATE_ELIGIBLE', 'CERTIFICATE_PROCESSING', 'CERTIFICATE_ISSUED',
  'CERTIFICATE_REJECTED', 'CERTIFICATE_REVOKED', 'SYSTEM',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const isIsoTime = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && !Number.isNaN(Date.parse(value));

/** Check the actual backend DTO and pagination before trusting list state. */
export function requireNotificationPage(
  response: ApiResponse<AppNotification[]>,
  expectedPage: number,
  expectedLimit: number,
): { items: AppNotification[]; pagination: PaginationMeta } {
  const pagination = response?.meta?.pagination;
  if (response?.success !== true || !Array.isArray(response.data) ||
      !pagination || !Number.isSafeInteger(pagination.page) || pagination.page !== expectedPage ||
      !Number.isSafeInteger(pagination.limit) || pagination.limit !== expectedLimit ||
      !Number.isSafeInteger(pagination.totalItems) || pagination.totalItems < 0 ||
      !Number.isSafeInteger(pagination.totalPages) || pagination.totalPages < 0 ||
      typeof pagination.hasNextPage !== 'boolean' ||
      typeof pagination.hasPreviousPage !== 'boolean' ||
      response.data.length > expectedLimit) {
    throw new Error('Respons daftar atau pagination notifikasi tidak sesuai API server.');
  }

  const ids = new Set<string>();
  for (const item of response.data) {
    if (!isRecord(item) || typeof item.id !== 'string' || !UUID.test(item.id) ||
        ids.has(item.id) || typeof item.type !== 'string' || !KNOWN_TYPES.has(item.type as NotificationType) ||
        typeof item.title !== 'string' || typeof item.message !== 'string' ||
        (item.data !== null && !isRecord(item.data)) ||
        typeof item.isRead !== 'boolean' ||
        (item.readAt !== null && !isIsoTime(item.readAt)) ||
        !isIsoTime(item.createdAt)) {
      throw new Error('Data notifikasi tidak sesuai kontrak backend.');
    }
    ids.add(item.id);
  }
  return { items: response.data, pagination };
}

/** Routes are authored locally, never read as links from untrusted notification.data. */
export function notificationDestination(
  notification: Pick<AppNotification, 'type' | 'data'>,
  role: UserRole | null,
): string | null {
  const type = notification.type;
  const data = notification.data;
  const courseId = isRecord(data) && typeof data.courseId === 'string' && UUID.test(data.courseId)
    ? data.courseId : null;
  const quizId = isRecord(data) && typeof data.quizId === 'string' && UUID.test(data.quizId)
    ? data.quizId : null;

  if (role === 'STUDENT') {
    if (type.startsWith('PAYMENT_')) return '/student/orders';
    if (type === 'ENROLLMENT_CREATED' || type === 'COURSE_COMPLETED') {
      return courseId ? `/student/classroom/${courseId}` : '/student/my-courses';
    }
    if (type === 'QUIZ_PASSED' || type === 'QUIZ_FAILED') {
      return courseId && quizId ? `/student/classroom/${courseId}/quiz/${quizId}` : '/student/my-courses';
    }
    if (type.startsWith('CERTIFICATE_')) return '/student/certificates';
    if (type === 'ROLE_CHANGED' || type.startsWith('ACCOUNT_')) return '/student/profile';
    return null;
  }
  if (role === 'INSTRUCTOR') {
    if (type.startsWith('COURSE_')) return '/instructor/courses';
    if (type === 'ROLE_CHANGED' || type.startsWith('ACCOUNT_')) return '/instructor/profile';
    return null;
  }
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    if (type.startsWith('COURSE_')) return '/admin/course-reviews';
    if (type.startsWith('CERTIFICATE_')) return '/admin/certificates';
    if (type.startsWith('PAYMENT_')) return '/admin/orders';
    if (type === 'ENROLLMENT_CREATED') return '/admin/enrollments';
    if (type === 'ROLE_CHANGED' || type.startsWith('ACCOUNT_')) return '/admin/users';
    return null;
  }
  return null; // No privileged navigation for roles without a matching UI route.
}

/** Never change UI based on a forged or incomplete delete response. */
export function requireNotificationDeleteOne(response: unknown, expectedId: string): void {
  if (!isRecord(response) || response.success !== true || !isRecord(response.data) ||
      response.data.id !== expectedId || response.data.deleted !== true) {
    throw new Error('Server tidak mengonfirmasi penghapusan notifikasi. Muat ulang halaman.');
  }
}

export function requireNotificationDeleteAll(response: unknown): number {
  if (!isRecord(response) || response.success !== true || !isRecord(response.data) ||
      typeof response.data.deletedCount !== 'number' || !Number.isSafeInteger(response.data.deletedCount) ||
      response.data.deletedCount < 0) {
    throw new Error('Server tidak mengonfirmasi penghapusan riwayat notifikasi. Muat ulang halaman.');
  }
  return response.data.deletedCount;
}
