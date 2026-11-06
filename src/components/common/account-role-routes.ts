import type { UserRole } from '../../types/auth';

// Role-specific front-end links. Backend permission checks remain authoritative.
export function accountNotificationsRoute(role: UserRole | null): string {
  if (role === 'INSTRUCTOR') return '/instructor/notifications';
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') return '/admin/notifications';
  return '/student/notifications';
}

export function accountProfileRoute(role: UserRole | null): string {
  if (role === 'INSTRUCTOR') return '/instructor/profile';
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') return '/admin/profile';
  return '/student/profile';
}