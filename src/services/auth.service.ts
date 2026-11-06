// 24Institute Authentication Service
// Adheres strictly to the 18 Auth operations + Profile & Avatar endpoints
// Strictly Fail-Closed: No implicit mock fallback in production or connected mode.

import { api } from './api';
import { ApiResponse } from '../types/api';
import {
  AuthUser,
  AuthTokens,
  LoginOtpChallengeResult,
  GoogleAuthResult,
  RegisterRequest,
  UpdateProfileRequest,
  UserProfile,
  UserRole,
} from '../types/auth';
import { MOCK_USERS } from './mock-data';
import { isDevPreviewActive } from './mode';
import { normalizeAuthDisplayName } from '../utils/student-profile-contract';

export const authService = {
  async register(data: RegisterRequest): Promise<ApiResponse<{ pendingVerification: boolean; email: string }>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Registrasi berhasil (Mode Simulasi Preview). Silakan periksa inbox email Anda untuk verifikasi.',
        data: { pendingVerification: true, email: data.email },
        requestId: 'mock-reg-id',
      };
    }
    return api.request('/auth/register', {
      method: 'POST',
      body: data,
    });
  },

  async verifyEmail(token: string): Promise<ApiResponse<{ verified: boolean }>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Email berhasil diverifikasi (Mode Simulasi Preview). Silakan masuk dengan OTP.',
        data: { verified: true },
        requestId: 'mock-verify-id',
      };
    }
    return api.request('/auth/verify-email', {
      method: 'POST',
      body: { token },
    });
  },

  async resendVerification(email: string): Promise<ApiResponse<{ accepted: boolean }>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Jika email terdaftar, tautan verifikasi baru telah dikirimkan ke inbox Anda.',
        data: { accepted: true },
        requestId: 'mock-resend-verify-id',
      };
    }
    return api.request('/auth/resend-verification', {
      method: 'POST',
      body: { email },
    });
  },

  async sendLoginOtp(email: string, password?: string): Promise<ApiResponse<LoginOtpChallengeResult>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Kode OTP 6-digit berhasil dikirimkan ke email Anda (Mode Simulasi Preview).',
        data: {
          challengeId: 'mock-challenge-' + Date.now(),
          mode: password ? 'PASSWORD_AND_OTP' : 'OTP_ONLY',
          cooldownSeconds: 60,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          maskedEmail: email.replace(/(.{2})(.*)(?=@)/, '$1***'),
          deliveryMethod: 'EMAIL',
        },
        requestId: 'mock-login-otp-req',
      };
    }
    return api.request('/auth/send-login-otp', {
      method: 'POST',
      body: { email, ...(password ? { password } : {}) },
    });
  },

  async resendLoginOtp(challengeId: string): Promise<ApiResponse<LoginOtpChallengeResult>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Kode OTP baru telah dikirimkan ke email Anda (Mode Simulasi Preview).',
        data: {
          challengeId: 'mock-challenge-resend-' + Date.now(),
          cooldownSeconds: 60,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        },
        requestId: 'mock-resend-otp',
      };
    }
    return api.request('/auth/resend-login-otp', {
      method: 'POST',
      body: { challengeId },
    });
  },

  async verifyLoginOtp(
    challengeId: string,
    code: string,
    roleOverride?: string
  ): Promise<ApiResponse<{ tokens: AuthTokens; user: AuthUser }>> {
    if (isDevPreviewActive()) {
      // Find matching mock user or default student
      let mockUser = MOCK_USERS[0];
      if (roleOverride) {
        const found = MOCK_USERS.find((u) => u.role === roleOverride);
        if (found) mockUser = found;
      }

      const mockTokens: AuthTokens = {
        accessToken: 'mock_jwt_access_' + mockUser.role.toLowerCase(),
        refreshToken: 'mock_jwt_refresh_' + mockUser.role.toLowerCase(),
        expiresIn: 3600,
      };
      api.setTokens(mockTokens);

      return {
        success: true,
        message: 'Verifikasi OTP berhasil (Mode Simulasi Preview). Selamat datang kembali.',
        data: { tokens: mockTokens, user: mockUser },
        requestId: 'mock-verify-otp',
      };
    }

    const res = await api.request<{ tokens: AuthTokens; user: AuthUser }>('/auth/verify-login-otp', {
      method: 'POST',
      body: { challengeId, code },
    });
    if (res.data?.tokens) {
      api.setTokens(res.data.tokens);
    }
    return res;
  },

  async getMe(): Promise<ApiResponse<AuthUser>> {
    const currentToken = api.getAccessToken();
    if (!currentToken) {
      throw {
        success: false,
        message: 'Tidak ada sesi aktif.',
        error: { code: 'UNAUTHORIZED' },
        requestId: 'no-session',
      };
    }

    if (isDevPreviewActive()) {
      // Resolve only an exact token issued by the explicit development preview.
      // Never infer privileges from arbitrary token substrings.
      const user = MOCK_USERS.find(
        (candidate) =>
          currentToken === `mock_jwt_access_${candidate.role.toLowerCase()}`
      );

      if (!user) {
        throw {
          success: false,
          message: 'Token sesi preview tidak dikenali.',
          error: { code: 'UNAUTHORIZED' },
          requestId: 'invalid-preview-token',
        };
      }
      return {
        success: true,
        message: 'Informasi pengguna berhasil dimuat (Mode Simulasi Preview)',
        data: user,
        requestId: 'mock-me-id',
      };
    }
    const response = await api.request<{ user: AuthUser }>('/auth/me');
    const user = response.data?.user;

    if (!user ||
        typeof user.id !== 'string' || !user.id.trim() ||
        typeof user.email !== 'string' || !user.email.includes('@') ||
        !['STUDENT', 'INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      throw {
        success: false,
        message: 'Respons /auth/me tidak sesuai kontrak.',
        error: { code: 'AUTH_ME_CONTRACT_INVALID' },
        requestId: response.requestId,
      };
    }

    return { ...response, data: normalizeAuthDisplayName(user) };
  },

  async logout(): Promise<ApiResponse<{ loggedOut: boolean }>> {
    const refreshToken = api.getRefreshToken();
    try {
      if (isDevPreviewActive()) {
        return {
          success: true,
          message: 'Sesi simulasi lokal diakhiri.',
          data: { loggedOut: true },
          requestId: 'mock-logout',
        };
      }
      if (!refreshToken) {
        return {
          success: true,
          message: 'Sesi lokal diakhiri; tidak ada refresh token untuk dicabut di server.',
          data: { loggedOut: false },
          requestId: 'local-only-logout',
        };
      }
      return await api.request<{ loggedOut: boolean }>('/auth/logout', {
        method: 'POST',
        body: { refreshToken },
      });
    } finally {
      // Logout locally even when server-side revocation fails; never claim remote success.
      api.setTokens(null);
    }
  },

  async logoutAll(): Promise<ApiResponse<{ loggedOutAll: boolean }>> {
    try {
      if (isDevPreviewActive()) {
        return {
          success: true,
          message: 'Seluruh sesi simulasi lokal diakhiri.',
          data: { loggedOutAll: true },
          requestId: 'mock-logout-all',
        };
      }
      // Successful server revocation is the only source of truth for "all devices".
      return await api.request<{ loggedOutAll: boolean }>('/auth/logout-all', {
        method: 'POST',
      });
    } finally {
      api.setTokens(null);
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<{ updated: boolean }>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Kata sandi berhasil diperbarui (Mode Simulasi Preview).',
        data: { updated: true },
        requestId: 'mock-change-pwd',
      };
    }
    return api.request('/auth/change-password', {
      method: 'PATCH',
      body: { currentPassword, newPassword },
    });
  },

  async forgotPassword(email: string): Promise<ApiResponse<{ accepted: boolean }>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Jika email terdaftar, instruksi pemulihan kata sandi telah dikirimkan.',
        data: { accepted: true },
        requestId: 'mock-forgot-pwd',
      };
    }
    return api.request('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    });
  },

  async resetPassword(resetToken: string, newPassword: string): Promise<ApiResponse<{ reset: boolean }>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Kata sandi baru berhasil disimpan (Mode Simulasi Preview). Silakan masuk kembali.',
        data: { reset: true },
        requestId: 'mock-reset-pwd',
      };
    }
    return api.request('/auth/reset-password', {
      method: 'POST',
      body: { resetToken, newPassword },
    });
  },

  // Google Sign-In with ID Token (POST-based)
  async googleSignIn(idToken: string): Promise<ApiResponse<GoogleAuthResult>> {
    if (isDevPreviewActive()) {
      const mockTokens: AuthTokens = {
        accessToken: 'mock_jwt_access_student',
        refreshToken: 'mock_jwt_refresh_student',
        expiresIn: 3600,
      };
      api.setTokens(mockTokens);
      return {
        success: true,
        message: 'Autentikasi Google berhasil (Mode Simulasi Preview).',
        data: {
          tokens: mockTokens,
          user: MOCK_USERS[0],
          otpRequired: false,
        },
        requestId: 'mock-google-id',
      };
    }
    const res = await api.request<GoogleAuthResult>('/auth/google', {
      method: 'POST',
      body: { idToken },
    });
    if (res.data?.tokens) {
      api.setTokens(res.data.tokens);
    }
    return res;
  },

  async googleVerifyOtp(
    challengeId: string,
    code: string,
    googleOtpTicket: string
  ): Promise<ApiResponse<{ tokens: AuthTokens; user: AuthUser }>> {
    if (isDevPreviewActive()) {
      const mockTokens: AuthTokens = {
        accessToken: 'mock_jwt_access_student',
        refreshToken: 'mock_jwt_refresh_student',
        expiresIn: 3600,
      };
      api.setTokens(mockTokens);
      return {
        success: true,
        message: 'Verifikasi Google OTP berhasil (Mode Simulasi Preview).',
        data: { tokens: mockTokens, user: MOCK_USERS[0] },
        requestId: 'mock-google-otp',
      };
    }
    const res = await api.request<{ tokens: AuthTokens; user: AuthUser }>('/auth/google/verify-otp', {
      method: 'POST',
      body: { challengeId, code, googleOtpTicket },
    });
    if (res.data?.tokens) {
      api.setTokens(res.data.tokens);
    }
    return res;
  },

  async googleResendOtp(
    challengeId: string,
    googleOtpTicket: string
  ): Promise<ApiResponse<{ challengeId: string; googleOtpTicket: string; cooldownSeconds: number }>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Kode OTP Google telah dikirimkan kembali (Mode Simulasi Preview).',
        data: {
          challengeId: 'mock-google-challenge-' + Date.now(),
          googleOtpTicket: 'mock-ticket-' + Date.now(),
          cooldownSeconds: 60,
        },
        requestId: 'mock-google-resend',
      };
    }
    return api.request('/auth/google/resend-otp', {
      method: 'POST',
      body: { challengeId, googleOtpTicket },
    });
  },

  async linkGoogleAccount(currentPassword: string, idToken: string): Promise<ApiResponse<{ linked: boolean }>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Akun Google berhasil ditautkan (Mode Simulasi Preview).',
        data: { linked: true },
        requestId: 'mock-google-link',
      };
    }
    return api.request('/auth/google/link', {
      method: 'POST',
      body: { currentPassword, idToken },
    });
  },

  // Student Profile and Avatar
  async getProfile(): Promise<ApiResponse<{ user: AuthUser }>> {
    if (isDevPreviewActive()) {
      const me = await this.getMe();
      return {
        success: true,
        message: 'Profil berhasil dimuat (Mode Simulasi Preview)',
        data: { user: { ...me.data, fullName: me.data.fullName || me.data.profile?.fullName } },
        requestId: 'mock-profile-get',
      };
    }
    return api.request('/auth/profile');
  },

  async updateProfile(data: UpdateProfileRequest): Promise<ApiResponse<{ user: AuthUser }>> {
    if (isDevPreviewActive()) {
      const me = await this.getMe();
      const updatedProfile: UserProfile = {
        ...me.data.profile,
        fullName: data.fullName ?? me.data.profile?.fullName ?? 'Ahmad Fikhi',
        phone: data.phone ?? me.data.profile?.phone,
        address: data.address ?? me.data.profile?.address,
        dateOfBirth: data.dateOfBirth ?? me.data.profile?.dateOfBirth,
      };
      me.data.profile = updatedProfile;
      me.data.fullName = updatedProfile.fullName;
      return {
        success: true,
        message: 'Profil berhasil diperbarui (Mode Simulasi Preview).',
        data: { user: me.data },
        requestId: 'mock-profile-update',
      };
    }
    return api.request('/auth/profile', {
      method: 'PATCH',
      body: data,
    });
  },

  async uploadAvatar(file: File): Promise<ApiResponse<{ avatarUrl: string }>> {
    if (isDevPreviewActive()) {
      // Local object URL for preview
      const localUrl = URL.createObjectURL(file);
      return {
        success: true,
        message: 'Foto profil berhasil diperbarui (Mode Simulasi Preview).',
        data: { avatarUrl: localUrl },
        requestId: 'mock-avatar-upload',
      };
    }
    const formData = new FormData();
    formData.append('avatar', file);
    return api.request('/auth/profile/avatar', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
  },

  async deleteAvatar(): Promise<ApiResponse<{ avatarUrl: null }>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Foto profil berhasil dihapus (Mode Simulasi Preview).',
        data: { avatarUrl: null },
        requestId: 'mock-avatar-delete',
      };
    }
    return api.request('/auth/profile/avatar', {
      method: 'DELETE',
    });
  },
};
