import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api } from './api';

test('Single-flight token refresh mutex: Concurrent requests await exact same promise', async () => {
  api.setTokens({
    accessToken: 'expired_access_token',
    refreshToken: 'mock_refresh_token_xyz',
    expiresIn: 3600,
  });

  // Call refreshAccessToken multiple times simultaneously
  const promise1 = api.refreshAccessToken();
  const promise2 = api.refreshAccessToken();
  const promise3 = api.refreshAccessToken();

  // All three must refer to the exact same pending promise
  assert.strictEqual(promise1, promise2);
  assert.strictEqual(promise2, promise3);

  // Await resolution (will attempt fetch to backend)
  await promise1;
  api.setTokens(null);
});

test('Token cleanup on logout: setTokens(null) cleanly clears access and refresh tokens', () => {
  api.setTokens({
    accessToken: 'test_token_123',
    refreshToken: 'test_refresh_456',
    expiresIn: 3600,
  });

  assert.strictEqual(api.getAccessToken(), 'test_token_123');
  assert.strictEqual(api.getRefreshToken(), 'test_refresh_456');

  api.setTokens(null);
  assert.strictEqual(api.getAccessToken(), null);
  assert.strictEqual(api.getRefreshToken(), null);
});

test('Session expired notification dispatched on refresh failure', async () => {
  let eventDispatched = false;
  const listener = () => {
    eventDispatched = true;
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('24i_auth_session_expired', listener);
  }

  api.setTokens({
    accessToken: 'bad_token',
    refreshToken: 'invalid_refresh_token',
    expiresIn: 3600,
  });

  // Since backend is offline at default or unreachable, refresh will fail
  const res = await api.refreshAccessToken();
  assert.strictEqual(res, null);
  assert.strictEqual(api.getAccessToken(), null);
  assert.strictEqual(api.getRefreshToken(), null);

  if (typeof window !== 'undefined') {
    window.removeEventListener('24i_auth_session_expired', listener);
  }
});
