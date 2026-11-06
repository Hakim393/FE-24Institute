import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../../services/notification.service';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import type { AppNotification, NotificationType } from '../../types/notification';
import type { PaginationMeta } from '../../types/api';
import { requireNotificationPage, notificationDestination, requireNotificationDeleteOne, requireNotificationDeleteAll } from '../../utils/notification-center-contract';
import { requireNotificationRead, requireNotificationsReadAll } from '../../utils/connected-contract-guards';
import { formatDateTimeIndo } from '../../utils/formatters';
import {
  Bell, CheckCircle2, CheckCheck, Info, Award, CreditCard,
  BookOpen, RefreshCw, Loader2, ChevronRight, AlertTriangle, UserRound, Trash2, X,
} from 'lucide-react';

const PAGE_SIZE = 20;
const getNotifIcon = (type: NotificationType) => {
  if (type === 'PAYMENT_SUCCESS' || type === 'ENROLLMENT_CREATED' || type === 'COURSE_COMPLETED' || type === 'QUIZ_PASSED')
    return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
  if (type.endsWith('_FAILED') || type.endsWith('_REJECTED') || type === 'CERTIFICATE_REVOKED')
    return <AlertTriangle className="w-5 h-5 text-amber-600" />;
  if (type.startsWith('PAYMENT_')) return <CreditCard className="w-5 h-5 text-blue-600" />;
  if (type.startsWith('CERTIFICATE_')) return <Award className="w-5 h-5 text-purple-600" />;
  if (type.startsWith('COURSE_') || type.startsWith('QUIZ_')) return <BookOpen className="w-5 h-5 text-sky-600" />;
  if (type.startsWith('ACCOUNT_') || type === 'ROLE_CHANGED') return <UserRound className="w-5 h-5 text-indigo-600" />;
  return <Info className="w-5 h-5 text-indigo-600" />;
};

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { refreshUnreadCount, showToast } = useNotification();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<null | { kind: 'one'; id: string; title: string } | { kind: 'all' }>(null);
  const canManageHistory = role === 'ADMIN' || role === 'SUPER_ADMIN';
  const [loadError, setLoadError] = useState<string | null>(null);
  const [moreError, setMoreError] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const mounted = useRef(true);
  const accountId = user?.id ?? null;

  const fetchNotifs = useCallback(async () => {
    const ticket = ++requestSequence.current;
    setIsLoading(true);
    setIsLoadingMore(false);
    setLoadError(null);
    setMoreError(null);
    try {
      const res = await notificationService.getNotifications({ page: 1, limit: PAGE_SIZE, unreadOnly });
      const list = requireNotificationPage(res, 1, PAGE_SIZE);
      if (mounted.current && ticket === requestSequence.current) {
        setNotifications(list.items);
        setPagination(list.pagination);
      }
    } catch (err: unknown) {
      if (mounted.current && ticket === requestSequence.current) {
        setNotifications([]);
        setPagination(null);
        setLoadError(err instanceof Error ? err.message : 'Gagal memuat notifikasi.');
      }
    } finally {
      if (mounted.current && ticket === requestSequence.current) setIsLoading(false);
    }
  }, [unreadOnly, accountId]);

  useEffect(() => {
    mounted.current = true;
    void fetchNotifs();
    return () => {
      mounted.current = false;
      ++requestSequence.current; // Discard stale responses on filter, account, or route changes.
    };
  }, [fetchNotifs]);

  const loadMore = async () => {
    if (isLoading || isLoadingMore || isMutating || !pagination?.hasNextPage) return;
    const nextPage = pagination.page + 1;
    const ticket = ++requestSequence.current;
    setIsLoadingMore(true);
    setMoreError(null);
    try {
      const res = await notificationService.getNotifications({ page: nextPage, limit: PAGE_SIZE, unreadOnly });
      const list = requireNotificationPage(res, nextPage, PAGE_SIZE);
      if (mounted.current && ticket === requestSequence.current) {
        setNotifications((existing) => {
          const seen = new Set(existing.map((item) => item.id));
          return [...existing, ...list.items.filter((item) => !seen.has(item.id))];
        });
        setPagination(list.pagination);
      }
    } catch (err: unknown) {
      if (mounted.current && ticket === requestSequence.current) {
        setMoreError(err instanceof Error ? err.message : 'Gagal memuat halaman selanjutnya.');
      }
    } finally {
      if (mounted.current && ticket === requestSequence.current) setIsLoadingMore(false);
    }
  };

  const handleMarkAsRead = async (id: string, destination?: string | null) => {
    if (isMutating) return;
    setIsMutating(true);
    ++requestSequence.current; // Prevent older reads from undoing a successful mutation.
    try {
      const res = await notificationService.markAsRead(id);
      requireNotificationRead(res, id);
      await refreshUnreadCount();
      if (destination) navigate(destination);
      else await fetchNotifs();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal menandai notifikasi.', 'error');
      await fetchNotifs();
    } finally {
      if (mounted.current) setIsMutating(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (isMutating) return;
    setIsMutating(true);
    ++requestSequence.current;
    try {
      const res = await notificationService.markAllAsRead();
      requireNotificationsReadAll(res);
      await refreshUnreadCount();
      await fetchNotifs();
      showToast('Seluruh notifikasi ditandai telah dibaca.', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal menandai semua notifikasi.', 'error');
      await fetchNotifs();
    } finally {
      if (mounted.current) setIsMutating(false);
    }
  };

  const confirmDeleteHistory = async () => {
    if (!canManageHistory || !pendingDelete || isMutating) return;
    const target = pendingDelete;
    setIsMutating(true);
    ++requestSequence.current; // Invalidate stale list reads before server mutation.
    try {
      if (target.kind === 'one') {
        requireNotificationDeleteOne(await notificationService.deleteOne(target.id), target.id);
      } else {
        requireNotificationDeleteAll(await notificationService.deleteAll());
      }
      setPendingDelete(null);
      await Promise.all([refreshUnreadCount(), fetchNotifs()]);
      showToast(target.kind === 'all' ? 'Riwayat notifikasi akun ini berhasil dihapus.' : 'Notifikasi berhasil dihapus.', 'success');
    } catch (err: unknown) {
      setPendingDelete(null);
      showToast(err instanceof Error ? err.message : 'Gagal menghapus notifikasi.', 'error');
      await fetchNotifs();
    } finally {
      if (mounted.current) setIsMutating(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-blue-600" />
            <span>Pusat Notifikasi</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pemberitahuan resmi terkait aktivitas akun, kursus, transaksi, dan sertifikat.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
            <input
              type="checkbox" checked={unreadOnly} disabled={isMutating}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Belum dibaca saja</span>
          </label>
          <button
            type="button" onClick={() => void fetchNotifs()} disabled={isLoading || isMutating}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:text-blue-700 text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Muat ulang
          </button>
          <button
            type="button" onClick={() => void handleMarkAllAsRead()} disabled={isLoading || isMutating || notifications.length === 0}
            className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:text-blue-700 text-xs font-bold disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
          >
            <CheckCheck className="w-3.5 h-3.5" /> Tandai Semua Dibaca
          </button>
          {canManageHistory && (
            <button type="button" onClick={() => setPendingDelete({ kind: 'all' })}
              disabled={isLoading || isMutating || notifications.length === 0}
              className="px-3.5 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold disabled:opacity-50 inline-flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" /> Hapus Semua Riwayat
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : loadError ? (
        <div role="alert" className="bg-rose-50 p-6 rounded-2xl border border-rose-200 text-sm text-rose-800">
          <p className="font-bold">Gagal memuat notifikasi</p>
          <p className="mt-1">{loadError}</p>
          <button type="button" onClick={() => void fetchNotifs()} className="mt-3 rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white">Coba lagi</button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <Bell className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Tidak ada notifikasi</h3>
          <p className="text-xs text-slate-500">
            {unreadOnly ? 'Tidak ada notifikasi yang belum dibaca. Nonaktifkan filter untuk melihat riwayat.' : 'Belum ada riwayat notifikasi untuk akun ini.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => {
            const destination = notificationDestination(notif, role);
            return (
              <div key={notif.id} className={`p-4 sm:p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                notif.isRead ? 'bg-white border-slate-200' : 'bg-blue-50/50 border-blue-200 shadow-2xs'
              }`}>
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 shrink-0 mt-0.5">
                    {getNotifIcon(notif.type)}
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900 leading-snug">{notif.title}</h3>
                      {!notif.isRead && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>
                    <div className="text-[10px] text-slate-400 font-medium pt-1">{formatDateTimeIndo(notif.createdAt)}</div>
                    {destination && (
                      <button type="button" disabled={isMutating}
                        onClick={() => {
                          if (notif.isRead) navigate(destination);
                          else void handleMarkAsRead(notif.id, destination);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline disabled:opacity-50 pt-1">
                        Buka detail <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0 items-end">
                  {!notif.isRead && (
                    <button type="button" disabled={isMutating}
                      onClick={() => void handleMarkAsRead(notif.id)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-blue-700 text-xs font-semibold disabled:opacity-50">
                      Tandai Dibaca
                    </button>
                  )}
                  {canManageHistory && (
                    <button type="button" disabled={isMutating}
                      onClick={() => setPendingDelete({ kind: 'one', id: notif.id, title: notif.title })}
                      className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 bg-white hover:bg-rose-50 text-xs font-semibold disabled:opacity-50 inline-flex items-center gap-1">
                      <Trash2 className="w-3.5 h-3.5" /> Hapus
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {pagination && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3">
              <span className="text-xs text-slate-500">
                Menampilkan {notifications.length} dari {pagination.totalItems} notifikasi
              </span>
              {pagination.hasNextPage && (
                <button type="button" disabled={isLoadingMore || isMutating} onClick={() => void loadMore()}
                  className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-xs font-bold text-blue-700 disabled:opacity-50 inline-flex items-center gap-2">
                  {isLoadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                  Muat Lebih Banyak
                </button>
              )}
            </div>
          )}
          {moreError && <p role="alert" className="text-xs text-rose-700">{moreError} Coba klik Muat Lebih Banyak lagi.</p>}
        </div>
      )}
      {canManageHistory && pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="presentation">
          <div role="alertdialog" aria-modal="true" aria-labelledby="delete-notification-title"
            aria-describedby="delete-notification-description"
            onKeyDown={(event) => { if (event.key === 'Escape' && !isMutating) setPendingDelete(null); }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h2 id="delete-notification-title" className="text-lg font-bold text-slate-900">
                {pendingDelete.kind === 'all' ? 'Hapus semua riwayat notifikasi?' : 'Hapus notifikasi ini?'}
              </h2>
              <button type="button" aria-label="Tutup dialog" disabled={isMutating}
                onClick={() => setPendingDelete(null)} className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-50"><X className="w-5 h-5" /></button>
            </div>
            <p id="delete-notification-description" className="text-sm text-slate-600">
              {pendingDelete.kind === 'all'
                ? 'Seluruh notifikasi akun ini, termasuk yang sudah dibaca atau belum dimuat di halaman, akan dihapus permanen. Notifikasi akun lain, catatan transaksi, dan audit log tidak akan dihapus.'
                : `Notifikasi “${pendingDelete.title}” akan dihapus permanen hanya dari akun ini. Catatan transaksi dan audit log tidak akan dihapus.`}
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" disabled={isMutating} onClick={() => setPendingDelete(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Batal</button>
              <button type="button" disabled={isMutating} onClick={() => void confirmDeleteHistory()}
                className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50 inline-flex gap-2 items-center">
                {isMutating && <Loader2 className="w-4 h-4 animate-spin" />} Ya, Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
