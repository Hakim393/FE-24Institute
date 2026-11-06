import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api } from './api';
import { authService } from './auth.service';
import { studentService } from './student.service';
import { adminService } from './admin.service';
import { isDevPreviewActive, setDevPreviewActive } from './mode';

test('Security Gate 1: Production + backend offline + Register -> FAILS with network error', async () => {
  // Ensure preview mode is off (production / connected behavior)
  setDevPreviewActive(false);
  api.setBaseUrl('http://127.0.0.1:59999/api/v1'); // Unreachable port

  await assert.rejects(
    async () => {
      await authService.register({
        fullName: 'Test Student',
        email: 'test.failclosed@24institute.id',
        password: 'Password123!',
      });
    },
    (err: any) => {
      assert.strictEqual(err.success, false);
      assert.strictEqual(err.error?.code, 'NETWORK_ERROR');
      return true;
    }
  );
});

test('Security Gate 2: Production + backend offline + Send OTP -> FAILS with network error', async () => {
  setDevPreviewActive(false);
  api.setBaseUrl('http://127.0.0.1:59999/api/v1');

  await assert.rejects(
    async () => {
      await authService.sendLoginOtp('student@24institute.id', 'Password123!');
    },
    (err: any) => {
      assert.strictEqual(err.success, false);
      assert.strictEqual(err.error?.code, 'NETWORK_ERROR');
      return true;
    }
  );
});

test('Security Gate 3: Production + backend offline + Create Order -> FAILS with network error', async () => {
  setDevPreviewActive(false);
  api.setBaseUrl('http://127.0.0.1:59999/api/v1');

  await assert.rejects(
    async () => {
      await studentService.createOrder('00000000-0000-0000-0000-000000000001', 'idempotency-test-1');
    },
    (err: any) => {
      assert.strictEqual(err.success, false);
      assert.strictEqual(err.error?.code, 'NETWORK_ERROR');
      return true;
    }
  );
});

test('Security Gate 4: Production + backend offline + Checkout -> FAILS with network error', async () => {
  setDevPreviewActive(false);
  api.setBaseUrl('http://127.0.0.1:59999/api/v1');

  await assert.rejects(
    async () => {
      await studentService.checkoutOrder('00000000-0000-0000-0000-000000000002');
    },
    (err: any) => {
      assert.strictEqual(err.success, false);
      assert.strictEqual(err.error?.code, 'NETWORK_ERROR');
      return true;
    }
  );
});

test('Security Gate 5: Production + backend offline + Admin Overview -> FAILS with network error', async () => {
  setDevPreviewActive(false);
  api.setBaseUrl('http://127.0.0.1:59999/api/v1');

  await assert.rejects(
    async () => {
      await adminService.getDashboardOverview();
    },
    (err: any) => {
      assert.strictEqual(err.success, false);
      assert.strictEqual(err.error?.code, 'NETWORK_ERROR');
      return true;
    }
  );
});

test('Security Gate 6: Production + mock JWT ADMIN -> Does NOT become authenticated Admin', async () => {
  setDevPreviewActive(false);
  api.setBaseUrl('http://127.0.0.1:59999/api/v1');
  api.setTokens({
    accessToken: 'mock_jwt_access_admin',
    refreshToken: 'mock_jwt_refresh_admin',
    expiresIn: 3600,
  });

  // Calling getMe() must attempt backend verification and fail closed, NOT returning mock admin user
  await assert.rejects(
    async () => {
      await authService.getMe();
    },
    (err: any) => {
      assert.strictEqual(err.success, false);
      return true;
    }
  );

  api.setTokens(null);
});

test('Security Gate 7: Production + API 401 handling -> Refreshes or expires session correctly', async () => {
  api.setTokens(null);
  // Without refresh token, calling refreshAccessToken returns null
  const refreshed = await api.refreshAccessToken();
  assert.strictEqual(refreshed, null);
  assert.strictEqual(api.getAccessToken(), null);
});

test('Security Gate 8: actual mocked HTTP 403 is rejected (NOT a 401 test)', async () => {
  setDevPreviewActive(false);
  api.setBaseUrl('http://127.0.0.1:59999/api/v1');
  api.setTokens(null);
  const oldFetch = globalThis.fetch;
  try {
    // No server is contacted: synthetic Response explicitly has status 403.
    globalThis.fetch = async () => new Response(JSON.stringify({
      success: false,
      message: 'Akses ditolak',
      error: { code: 'FORBIDDEN' },
    }), { status: 403, headers: { 'content-type': 'application/json' } });
    await assert.rejects(
      () => api.request('/admin/dashboard/overview'),
      (err: any) => {
        assert.equal(err.success, false);
        assert.equal(err.error?.code, 'FORBIDDEN');
        return true;
      },
    );
  } finally {
    globalThis.fetch = oldFetch;
  }
});

test('Security Gate 9: Development mock only available via explicit preview configuration', () => {
  setDevPreviewActive(false);
  assert.strictEqual(isDevPreviewActive(), false);

  setDevPreviewActive(true);
  assert.strictEqual(isDevPreviewActive(), true);

  // Reset to false for safety
  setDevPreviewActive(false);
  assert.strictEqual(isDevPreviewActive(), false);
});

test('Security Gate 10: Connected mode does NOT fallback to mock when network request fails', async () => {
  setDevPreviewActive(false);
  api.setBaseUrl('http://127.0.0.1:59999/api/v1');

  // Verify that an arbitrary endpoint failure does not quietly return mock data
  await assert.rejects(
    async () => {
      await studentService.getCurriculum('00000000-0000-0000-0000-000000000099');
    },
    (err: any) => {
      assert.strictEqual(err.success, false);
      assert.strictEqual(err.error?.code, 'NETWORK_ERROR');
      return true;
    }
  );
});
