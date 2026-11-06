import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requireCompleteSession } from './auth-completion-guard';
import type { AuthUser, AuthTokens } from '../types/auth';

const user = {
  id: 'test-student', email: 'student@example.test', role: 'STUDENT',
  status: 'ACTIVE', emailVerified: true, isLocked: false,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
} as AuthUser;
const tokens: AuthTokens = { accessToken: 'test-access', refreshToken: 'test-refresh', expiresIn: 3600 };

test('only complete session payload passes the pre-navigation guard', () => {
  assert.doesNotThrow(() => requireCompleteSession({ tokens, user }));
  for (const data of [
    null, undefined, {}, { user }, { tokens },
    { user, tokens: { ...tokens, accessToken: '' } },
    { user, tokens: { ...tokens, refreshToken: '' } },
    { user, tokens: { ...tokens, expiresIn: 0 } },
    { user, tokens: { ...tokens, expiresIn: Number.NaN } },
    { user: { ...user, role: 'UNKNOWN' }, tokens },
    { user: { ...user, id: '' }, tokens },
  ]) {
    assert.throws(() => requireCompleteSession(data as any), /tidak lengkap/);
  }
});

test('real backend expiry timestamps pass the session guard', () => {
  const liveTokens = {
    accessToken: 'test-access',
    refreshToken: 'test-refresh',
    tokenType: 'Bearer' as const,
    accessTokenExpiresAt: new Date(Date.now() + 300000).toISOString(),
    refreshTokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
  };

  assert.doesNotThrow(() =>
    requireCompleteSession({ user, tokens: liveTokens })
  );

  const invalidTokens = [
    {
      ...liveTokens,
      accessTokenExpiresAt: new Date(Date.now() - 10000).toISOString(),
    },
    { ...liveTokens, refreshTokenExpiresAt: '' },
    { ...liveTokens, tokenType: 'Basic' as any },
    { ...liveTokens, accessToken: '' },
    {
      ...liveTokens,
      accessTokenExpiresAt: 'invalid-date',
      expiresIn: 3600,
    },
  ];

  for (const tokens of invalidTokens) {
    assert.throws(
      () => requireCompleteSession({ user, tokens }),
      /tidak lengkap/
    );
  }
});
