import type { AuthTokens, AuthUser } from '../types/auth';

/** Guards UI navigation; the backend remains the authority on authentication. */
export function requireCompleteSession(
  data: { tokens?: AuthTokens; user?: AuthUser } | null | undefined,
): asserts data is { tokens: AuthTokens; user: AuthUser } {
  const t = data?.tokens;
  const u = data?.user;
  const roles = ['STUDENT', 'INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'];
  const backendExpiryFieldsPresent =
    t?.tokenType !== undefined ||
    t?.accessTokenExpiresAt !== undefined ||
    t?.refreshTokenExpiresAt !== undefined;

  const accessExpiry = typeof t?.accessTokenExpiresAt === 'string'
    ? Date.parse(t.accessTokenExpiresAt)
    : Number.NaN;

  const refreshExpiry = typeof t?.refreshTokenExpiresAt === 'string'
    ? Date.parse(t.refreshTokenExpiresAt)
    : Number.NaN;

  const backendExpiryValid =
    t?.tokenType === 'Bearer' &&
    Number.isFinite(accessExpiry) &&
    Number.isFinite(refreshExpiry) &&
    accessExpiry > Date.now() &&
    refreshExpiry > accessExpiry;

  const previewExpiryValid =
    typeof t?.expiresIn === 'number' &&
    Number.isFinite(t.expiresIn) &&
    t.expiresIn > 0;

  const expiryValid = backendExpiryFieldsPresent
    ? backendExpiryValid
    : previewExpiryValid;
  if (!t || !u ||
      typeof t.accessToken !== 'string' || !t.accessToken.trim() ||
      typeof t.refreshToken !== 'string' || !t.refreshToken.trim() ||
      !expiryValid ||
      typeof u.id !== 'string' || !u.id.trim() ||
      typeof u.email !== 'string' || !u.email.includes('@') ||
      !roles.includes(u.role)) {
    throw new Error('Respons login tidak lengkap; sesi tidak dibuat.');
  }
}
