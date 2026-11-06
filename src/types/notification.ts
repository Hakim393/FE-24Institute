/** Backend Prisma NotificationType enum (2026-11-05 snapshot). */
export type NotificationType =
  | 'ROLE_CHANGED' | 'ACCOUNT_DEACTIVATED' | 'ACCOUNT_REACTIVATED'
  | 'COURSE_SUBMITTED' | 'COURSE_APPROVED' | 'COURSE_REJECTED' | 'COURSE_CHANGES_REQUESTED'
  | 'PAYMENT_PENDING' | 'PAYMENT_SUCCESS' | 'PAYMENT_FAILED' | 'PAYMENT_EXPIRED' | 'PAYMENT_REFUNDED'
  | 'ENROLLMENT_CREATED'
  | 'QUIZ_PASSED' | 'QUIZ_FAILED' | 'COURSE_COMPLETED'
  | 'CERTIFICATE_ELIGIBLE' | 'CERTIFICATE_PROCESSING' | 'CERTIFICATE_ISSUED'
  | 'CERTIFICATE_REJECTED' | 'CERTIFICATE_REVOKED'
  | 'SYSTEM';

/** GET /api/v1/notifications includes these fields; userId/link are NOT in its DTO. */
export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}
