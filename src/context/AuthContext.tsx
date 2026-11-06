// Authentication Context for 24Institute LMS
// Strictly fail-closed: No token = unauthenticated.
// Mode isolation: No auto-mock authentication in connected or production mode.
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthUser, UserRole } from '../types/auth';
import { authService } from '../services/auth.service';
import { api } from '../services/api';
import { MOCK_USERS } from '../services/mock-data';

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isDevPreviewActive: boolean;
  loginAsDemoUser: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  setDevPreviewActive: (active: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDevPreviewActive, setIsDevPreviewActive] = useState<boolean>(() => {
    if (import.meta.env.PROD) return false;
    try {
      return localStorage.getItem('24i_dev_preview_active') === 'true';
    } catch {
      return false;
    }
  });

  const initAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = api.getAccessToken();

      // Security rule: No token = strictly unauthenticated (fail-closed)
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const res = await authService.getMe();
      if (res.success && res.data) {
        setUser(res.data);
      } else {
        setUser(null);
        api.setTokens(null);
      }
    } catch {
      setUser(null);
      api.setTokens(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();

    // Listen to session expired event from ApiClient
    const handleSessionExpired = () => {
      setUser(null);
      api.setTokens(null);
    };

    window.addEventListener('24i_auth_session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('24i_auth_session_expired', handleSessionExpired);
    };
  }, [initAuth]);

  /**
   * Demo role switcher: strictly gated to development mode only.
   * Completely disabled in production build.
   */
  const loginAsDemoUser = async (targetRole: UserRole) => {
    if (import.meta.env.PROD) {
      console.warn('[SECURITY] Demo user switching is disabled in production.');
      return;
    }

    setIsLoading(true);
    try {
      const mockUser = MOCK_USERS.find((u) => u.role === targetRole) || MOCK_USERS[0];
      api.setTokens({
        accessToken: `mock_jwt_access_${targetRole.toLowerCase()}`,
        refreshToken: `mock_jwt_refresh_${targetRole.toLowerCase()}`,
        expiresIn: 3600,
      });
      setUser(mockUser);
    } finally {
      setIsLoading(false);
    }
  };

  const setDevPreviewActive = (active: boolean) => {
    if (import.meta.env.PROD) return;
    setIsDevPreviewActive(active);
    try {
      localStorage.setItem('24i_dev_preview_active', active ? 'true' : 'false');
    } catch {}
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } catch {
      // Force cleanup even if network fails
    } finally {
      api.setTokens(null);
      setUser(null);
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    try {
      const res = await authService.getMe();
      if (res.success && res.data) {
        setUser(res.data);
      }
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: !!user,
        isLoading,
        isDevPreviewActive,
        loginAsDemoUser,
        logout,
        refreshProfile,
        setUser,
        setDevPreviewActive,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
