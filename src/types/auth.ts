import { UserRole, AccountStatus } from './api';
export type { UserRole, AccountStatus };

export interface UserProfile {
  id?: string;
  userId?: string;
  fullName: string;
  phone?: string | null;
  address?: string | null;
  dateOfBirth?: string | null;
  avatarUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthUser {
  id: string;
  /** Canonical account name: backend User.fullName (not UserProfile.fullName). */
  fullName?: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  emailVerified: boolean;
  isLocked: boolean;
  googleLinked?: boolean;
  profile?: UserProfile | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  tokenType?: 'Bearer';
  accessTokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
}

export interface LoginOtpChallengeResult {
  challengeId: string;
  mode?: 'PASSWORD_AND_OTP' | 'OTP_ONLY';
  cooldownSeconds?: number;
  expiresAt: string;
  maskedEmail?: string;
  deliveryMethod?: 'EMAIL';
}

export interface GoogleAuthResult {
  tokens?: AuthTokens;
  user?: AuthUser;
  otpRequired?: boolean;
  challengeId?: string;
  googleOtpTicket?: string;
  expiresAt?: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  phone?: string | null;
  address?: string | null;
  dateOfBirth?: string | null;
}
