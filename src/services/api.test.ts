import { test } from 'node:test';
import assert from 'node:assert';
import { api } from './api';

test('api.generateRequestId produces valid RFC4122 v4 UUID format', () => {
  const reqId = api.generateRequestId();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  assert.ok(uuidRegex.test(reqId), `Generated requestId ${reqId} is not a valid UUID v4`);
});

test('api.setTokens updates token state and removes on null', () => {
  api.setTokens({
    accessToken: 'test_access_token_123',
    refreshToken: 'test_refresh_token_456',
    expiresIn: 3600,
  });

  assert.strictEqual(api.getAccessToken(), 'test_access_token_123');
  assert.strictEqual(api.getRefreshToken(), 'test_refresh_token_456');

  // Clear tokens
  api.setTokens(null);
  assert.strictEqual(api.getAccessToken(), null);
  assert.strictEqual(api.getRefreshToken(), null);
});

test('api.refreshAccessToken fails cleanly and clears tokens when no refresh token is present', async () => {
  api.setTokens(null);
  const result = await api.refreshAccessToken();
  assert.strictEqual(result, null);
  assert.strictEqual(api.getAccessToken(), null);
});

test('api.setBaseUrl strips trailing slashes and validates protocol', () => {
  api.setBaseUrl('http://api.24institute.id/api/v1///');
  assert.strictEqual(api.getBaseUrl(), 'http://api.24institute.id/api/v1');

  assert.throws(
    () => {
      api.setBaseUrl('ftp://invalid-url');
    },
    { message: /harus diawali dengan http:\/\/ atau https:\/\// }
  );

  // Restore default
  api.setBaseUrl('http://localhost:5000/api/v1');
});
