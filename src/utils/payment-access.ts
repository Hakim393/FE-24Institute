/** Backend course entitlement is the ONLY source of course access. */
export type CoursePaymentAccess = 'GRANTED' | 'PAID_AWAITING_ENTITLEMENT' | 'WAITING';

export function resolveCoursePaymentAccess(
  orderStatus: string | undefined,
  backendHasAccess: boolean,
): CoursePaymentAccess {
  if (backendHasAccess === true) return 'GRANTED';
  if (orderStatus === 'PAID') return 'PAID_AWAITING_ENTITLEMENT';
  return 'WAITING';
}