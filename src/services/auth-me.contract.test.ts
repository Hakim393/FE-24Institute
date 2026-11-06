import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api } from './api';
import { authService } from './auth.service';
import { setDevPreviewActive } from './mode';

const makeUser = (role: string) => ({
  id: '0c1022fe-c61b-49cc-9680-bade82e21460',
  email: 'tester@example.test',
  role,
  status: 'ACTIVE',
  emailVerified: true,
  isLocked: false,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
});

async function withMockedMe(
  payload: unknown,
  check: () => Promise<void>
) {
  const oldFetch = globalThis.fetch;

  setDevPreviewActive(false);
  api.setBaseUrl('http://127.0.0.1:59998/api/v1');
  api.setTokens({
    accessToken: 'contract-test-access',
    refreshToken: 'contract-test-refresh',
    expiresIn: 600,
  });

  try {
    globalThis.fetch = async () => new Response(
      JSON.stringify({
        success: true,
        message: 'OK',
        data: payload,
        requestId: 'contract-test',
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }
    );

    await check();
  } finally {
    globalThis.fetch = oldFetch;
    api.setTokens(null);
  }
}

test('Auth/me unwraps real backend envelope for every role', async () => {
  const roles = ['STUDENT', 'INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'];

  for (const role of roles) {
    await withMockedMe({ user: makeUser(role) }, async () => {
      const result = await authService.getMe();

      assert.equal(result.success, true);
      assert.equal(result.data.role, role);
      assert.equal(result.data.id, makeUser(role).id);
    });
  }
});

test('Auth/me rejects missing user and unknown role', async () => {
  const badPayloads = [
    {},
    { user: null },
    { user: makeUser('GUEST') },
  ];

  for (const payload of badPayloads) {
    await withMockedMe(payload, async () => {
      await assert.rejects(
        authService.getMe(),
        (err: any) =>
          err?.error?.code === 'AUTH_ME_CONTRACT_INVALID'
      );
    });
  }
});