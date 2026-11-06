import type { UserRole } from '../types/auth';

/** Frontend navigation only; server role permissions remain authoritative. */
export function postAuthRoute(role: UserRole, requested?: string | null): string {
  const home = role === 'INSTRUCTOR'
    ? '/instructor'
    : role === 'ADMIN' || role === 'SUPER_ADMIN'
      ? '/admin'
      : '/student';

  // Reject absolute/protocol-relative URLs, backslashes, control chars and
  // role mismatches. Queries/fragments are not carried across authentication.
  if (!requested || !requested.startsWith('/') ||
      requested.startsWith('//') || requested.includes('\\') ||
      /[\u0000-\u001f\u007f]/.test(requested) ||
      requested.includes('?') || requested.includes('#') ||
      requested.split('/').some((seg) => seg === '.' || seg === '..') ||
      requested.includes('%')) return home;

  if (requested === home || requested.startsWith(home + '/')) return requested;
  return home;
}
