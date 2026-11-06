// Notification Context for live unread counts and toast feedback
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { notificationService } from '../services/notification.service';
import { useAuth } from './AuthContext';

interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
}

interface NotificationContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  toasts: ToastItem[];
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning', title?: string) => void;
  removeToast: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const { isAuthenticated, user } = useAuth();
  const accountId = isAuthenticated && user?.id ? user.id : null;
  // A late response from an old account must never replace the new account badge.
  const activeAccount = useRef(accountId);
  activeAccount.current = accountId;
  const unreadRequest = useRef(0);

  const refreshUnreadCount = useCallback(async () => {
    const ticket = ++unreadRequest.current;
    if (!accountId) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await notificationService.getUnreadCount();
      if (ticket === unreadRequest.current && activeAccount.current === accountId &&
          res.success === true && Number.isSafeInteger(res.data?.unreadCount) &&
          res.data.unreadCount >= 0) {
        setUnreadCount(res.data.unreadCount);
      }
    } catch {
      // Keep last confirmed unread count; do not invent an empty inbox on network failure.
    }
  }, [accountId]);

  useEffect(() => {
    // Always reset on account changes, including logout and role/account switches.
    ++unreadRequest.current;
    setUnreadCount(0);
    if (accountId) void refreshUnreadCount();
  }, [accountId, refreshUnreadCount]);

  useEffect(() => {
    if (!accountId) return;
    const refreshIfVisible = () => {
      if (!document.hidden) void refreshUnreadCount();
    };
    window.addEventListener('focus', refreshIfVisible);
    document.addEventListener('visibilitychange', refreshIfVisible);
    // Lightweight polling; never request an unread count while the page is hidden.
    const interval = window.setInterval(refreshIfVisible, 45_000);
    return () => {
      window.removeEventListener('focus', refreshIfVisible);
      document.removeEventListener('visibilitychange', refreshIfVisible);
      window.clearInterval(interval);
    };
  }, [accountId, refreshUnreadCount]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        refreshUnreadCount,
        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}
      {/* Toast Overlay Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-xl p-4 shadow-xl border text-sm flex items-start justify-between gap-3 transition-all duration-300 animate-slide-in ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : toast.type === 'error'
                ? 'bg-rose-50 text-rose-900 border-rose-200'
                : toast.type === 'warning'
                ? 'bg-amber-50 text-amber-900 border-amber-200'
                : 'bg-blue-50 text-blue-900 border-blue-200'
            }`}
          >
            <div>
              {toast.title && <div className="font-semibold mb-0.5">{toast.title}</div>}
              <div>{toast.message}</div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-gray-600 font-bold text-xs"
              aria-label="Tutup notifikasi"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};
