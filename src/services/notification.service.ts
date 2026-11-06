import { isDevPreviewActive } from "./mode";
// 24Institute Notification Service
// Implements Notification Center: list, unread count, read single, read all

import { api } from './api';
import { ApiResponse } from '../types/api';
import { AppNotification } from '../types/notification';
import { MOCK_NOTIFICATIONS } from './mock-data';

export const notificationService = {
  async getNotifications(params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<ApiResponse<AppNotification[]>> {
    if (isDevPreviewActive()) {
      let filtered = [...MOCK_NOTIFICATIONS];
      if (params?.unreadOnly) {
        filtered = filtered.filter((n) => !n.isRead);
      }
      const page = params?.page ?? 1;
      const limit = params?.limit ?? 20;
      const totalItems = filtered.length;
      const totalPages = Math.ceil(totalItems / limit);
      filtered = filtered.slice((page - 1) * limit, page * limit);
      return {
        success: true,
        message: 'Daftar notifikasi akun',
        data: filtered,
        requestId: 'mock-notif-list',
        meta: {
          pagination: {
            page,
            limit,
            totalItems,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          },
        },
      };
    }
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.unreadOnly) query.set('unreadOnly', 'true');
    return api.request(`/notifications?${query.toString()}`);
  },

  async getUnreadCount(): Promise<ApiResponse<{ unreadCount: number }>> {
    if (isDevPreviewActive()) {
      const count = MOCK_NOTIFICATIONS.filter((n) => !n.isRead).length;
      return {
        success: true,
        message: 'Jumlah notifikasi belum dibaca',
        data: { unreadCount: count },
        requestId: 'mock-notif-unread',
      };
    }
    return api.request('/notifications/unread-count');
  },

  async markAsRead(notificationId: string): Promise<ApiResponse<{ id: string; isRead: boolean; changed: boolean }>> {
    if (isDevPreviewActive()) {
      const found = MOCK_NOTIFICATIONS.find((n) => n.id === notificationId);
      if (found) found.isRead = true;
      return {
        success: true,
        message: 'Notifikasi ditandai telah dibaca.',
        data: { id: notificationId, isRead: true, changed: true },
        requestId: 'mock-notif-read-one',
      };
    }
    return api.request(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  },

  async markAllAsRead(): Promise<ApiResponse<{ markedRead: number }>> {
    if (isDevPreviewActive()) {
      const markedRead = MOCK_NOTIFICATIONS.filter((n) => !n.isRead).length;
      MOCK_NOTIFICATIONS.forEach((n) => (n.isRead = true));
      return {
        success: true,
        message: 'Seluruh notifikasi ditandai telah dibaca.',
        data: { markedRead },
        requestId: 'mock-notif-read-all',
      };
    }
    return api.request('/notifications/read-all', {
      method: 'PATCH',
    });
  },
  async deleteOne(notificationId: string): Promise<ApiResponse<{ id: string; deleted: boolean }>> {
    if (isDevPreviewActive()) {
      const idx = MOCK_NOTIFICATIONS.findIndex((n) => n.id === notificationId);
      if (idx < 0) throw new Error('Notifikasi tidak ditemukan.');
      MOCK_NOTIFICATIONS.splice(idx, 1);
      return { success: true, message: 'Notifikasi dihapus.', data: { id: notificationId, deleted: true }, requestId: 'mock-notif-delete-one' };
    }
    return api.request(`/notifications/${encodeURIComponent(notificationId)}`, { method: 'DELETE' });
  },

  async deleteAll(): Promise<ApiResponse<{ deletedCount: number }>> {
    if (isDevPreviewActive()) {
      const deletedCount = MOCK_NOTIFICATIONS.length;
      MOCK_NOTIFICATIONS.splice(0);
      return { success: true, message: 'Riwayat dihapus.', data: { deletedCount }, requestId: 'mock-notif-delete-all' };
    }
    return api.request('/notifications/all', { method: 'DELETE' });
  },
};
