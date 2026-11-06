export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'ABANDONED'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED';

export type CheckoutState = 'NOT_STARTED' | 'INITIATING' | 'READY' | 'UNKNOWN';

export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED' | 'REVOKED' | 'EXPIRED';

export interface Order {
  id: string;
  orderNumber: string;
  studentId: string;
  student?: {
    id: string;
    fullName: string;
    email: string;
  };
  courseId: string;
  courseVersionId: string;
  courseTitle: string;
  courseThumbnailUrl?: string | null;
  amount: string; // decimal string
  currency: string;
  status: OrderStatus;
  checkoutState: CheckoutState;
  midtransOrderId?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheckoutResult {
  orderId: string;
  token?: string;
  redirectUrl?: string;
  expiresAt?: string;
  status?: CheckoutState;
}

export interface StudentOrderCheckout {
  orderId: string;
  token: string;
  redirectUrl: string;
  expiresAt: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  student?: {
    id: string;
    fullName: string;
    email: string;
  };
  courseId: string;
  courseVersionId?: string;
  courseTitle: string;
  courseSlug?: string;
  courseThumbnailUrl?: string | null;
  status: EnrollmentStatus;
  progressPercentage: number;
  enrolledAt: string;
  completedAt?: string | null;
}

/** Exact GET /student/enrollments/courses/:courseId/access backend contract.
 * The endpoint returns `allowed`, never `hasAccess`.
 */
export interface CourseAccessCheck {
  courseId: string;
  allowed: boolean;
}
