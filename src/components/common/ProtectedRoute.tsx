import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-medium">Memuat autentikasi...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    // If SUPER_ADMIN is requested, allow SUPER_ADMIN only.
    // If ADMIN is requested, allow ADMIN and SUPER_ADMIN.
    const hasRole = allowedRoles.some(r => {
      if (r === 'ADMIN') {
        return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
      }
      return user.role === r;
    });

    if (!hasRole) {
      // Redirect to their respective dashboard
      if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
        return <Navigate to="/admin" replace />;
      }
      if (user.role === 'INSTRUCTOR') {
        return <Navigate to="/instructor" replace />;
      }
      return <Navigate to="/student" replace />;
    }
  }

  return children;
};
