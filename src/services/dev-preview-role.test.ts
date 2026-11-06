import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api } from './api';
import { authService } from './auth.service';
import { setDevPreviewActive } from './mode';

function useToken(token: string) {
  api.setTokens({
    accessToken: token,
    refreshToken: 'mock_jwt_refresh_test',
    expiresIn: 3600,
  });
}

test('Four explicit preview roles survive getMe rehydration', async () => {
  setDevPreviewActive(true);
  try {
    for (const role of [
      'STUDENT',
      'INSTRUCTOR',
      'ADMIN',
      'SUPER_ADMIN',
    ]) {
      useToken(`mock_jwt_access_${role.toLowerCase()}`);
      const result = await authService.getMe();
      assert.equal(result.success, true);
      assert.equal(result.data.role, role);
    }
  } finally {
    api.setTokens(null);
    setDevPreviewActive(false);
  }
});

test('Unknown and misleading preview tokens fail closed', async () => {
  setDevPreviewActive(true);
  try {
    for (const token of [
      'mock_jwt_access_superadmin',
      'mock_jwt_access_admin_extra',
      'mock_jwt_access_student_admin',
      'arbitrary-token',
    ]) {
      useToken(token);
      await assert.rejects(
        authService.getMe(),
        (err: any) => err?.error?.code === 'UNAUTHORIZED'
      );
    }
  } finally {
    api.setTokens(null);
    setDevPreviewActive(false);
  }
});