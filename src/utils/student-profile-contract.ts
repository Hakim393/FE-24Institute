import type { AuthUser } from '../types/auth';

type RecordLike = Record<string, unknown>;
const record = (value: unknown): RecordLike | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as RecordLike
    : null;

/**
 * /auth/me sends User.fullName at the top level. Existing UI layouts used
 * profile.fullName, so hydrate this display-only alias from the canonical
 * server field without changing the backend response or any privilege data.
 */
export const normalizeAuthDisplayName = (user: AuthUser): AuthUser => {
  const canonical = typeof user.fullName === 'string' && user.fullName.trim()
    ? user.fullName.trim()
    : typeof user.profile?.fullName === 'string'
      ? user.profile.fullName.trim()
      : '';
  if (!canonical) return user;
  return {
    ...user,
    fullName: canonical,
    profile: { ...(user.profile ?? {}), fullName: canonical },
  };
};

export interface DetailedStudentProfile {
  id: string;
  fullName: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  avatarUrl: string | null;
}

const optionalText = (value: unknown): string | null | undefined => {
  if (value === null) return null;
  if (typeof value === 'string') return value;
  return undefined;
};

/**
 * /auth/profile returns data.user with top-level fullName, while the
 * mutable personal fields live inside data.user.profile. Reject missing
 * or malformed profile fields instead of quietly wiping filled inputs.
 */
export const readDetailedStudentProfile = (
  input: unknown,
  expectedUserId: string,
): DetailedStudentProfile | null => {
  const user = record(input);
  if (!user || typeof user.id !== 'string' || user.id !== expectedUserId ||
      typeof user.fullName !== 'string' || !user.fullName.trim()) return null;

  const profile = user.profile === null ? null : record(user.profile);
  if (user.profile !== null && !profile) return null;

  if (profile) {
    for (const key of ['phone', 'address', 'dateOfBirth', 'avatarUrl']) {
      if (!(key in profile) || optionalText(profile[key]) === undefined) return null;
    }
  }
  const phone = profile?.phone ?? null;
  const address = profile?.address ?? null;
  const dateOfBirth = profile?.dateOfBirth ?? null;
  const avatarUrl = profile?.avatarUrl ?? null;
  if ([phone, address, dateOfBirth, avatarUrl].some(
    value => value !== null && typeof value !== 'string'
  )) return null;

  if (dateOfBirth !== null &&
      (typeof dateOfBirth !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth))) return null;
  if (typeof avatarUrl === 'string' && !/^https:\/\//.test(avatarUrl)) return null;

  return {
    id: user.id,
    fullName: user.fullName.trim(),
    phone: typeof phone === 'string' ? phone : '',
    address: typeof address === 'string' ? address : '',
    dateOfBirth: typeof dateOfBirth === 'string' ? dateOfBirth : '',
    avatarUrl: typeof avatarUrl === 'string' ? avatarUrl : null,
  };
};
