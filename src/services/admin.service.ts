import { isDevPreviewActive } from "./mode";
import { normalizeMediaUpload } from '../utils/connected-contract-guards';
// 24Institute Admin Service
// Implements complete LMS management: Dashboard Overview, User Management, Category Management,
// Course Reviews & Publishing, Certificate Reviews & Issuance & Revocation,
// Read-Only Commerce Monitoring (Orders & Enrollments), Media Assets & Storage, and WhatsApp Links.

import { api } from './api';
import { ApiResponse, UserRole, AccountStatus } from '../types/api';
import { AuthUser } from '../types/auth';
import { Category, CourseVersion } from '../types/course';
import { Order, Enrollment } from '../types/order';
import { Certificate } from '../types/certificate';
import {
  AdminDashboardOverview,
  UserStatistics,
  CategoryStatistics,
  CourseReviewDecisionInput,
  CourseReviewVersionDetail,
  MediaItem,
  MediaStatistics,
  WhatsAppGroupLink,
  PremiumExposure,
  PremiumAssetInventory,
} from '../types/admin';
import {
  MOCK_USERS,
  MOCK_CATEGORIES,
  MOCK_ADMIN_OVERVIEW,
  MOCK_ORDERS,
  MOCK_ENROLLMENTS,
  MOCK_CERTIFICATES,
  MOCK_MEDIA_ITEMS,
  MOCK_WHATSAPP_GENERAL,
  MOCK_WHATSAPP_COURSES,
  MOCK_CURRICULUM_SAMPLE,
} from './mock-data';
import { adaptAdminDashboardOverview } from './adapters';

export const adminService = {
  // Dashboard Overview
  async getDashboardOverview(): Promise<ApiResponse<AdminDashboardOverview>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Ringkasan operasional sistem 24Institute',
        data: MOCK_ADMIN_OVERVIEW,
        requestId: 'mock-admin-overview',
      };
    }
    const res = await api.request<any>('/admin/dashboard/overview');
    return {
      ...res,
      data: adaptAdminDashboardOverview(res.data),
    };
  },

  // User Management
  async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: UserRole;
    status?: AccountStatus;
    emailVerification?: boolean;
    lockStatus?: boolean;
    deletionStatus?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ApiResponse<AuthUser[]>> {
    if (isDevPreviewActive()) {
      let filtered = [...MOCK_USERS];
      if (params?.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(
          (u) =>
            u.email.toLowerCase().includes(q) ||
            u.profile?.fullName.toLowerCase().includes(q)
        );
      }
      if (params?.role) filtered = filtered.filter((u) => u.role === params.role);
      if (params?.status) filtered = filtered.filter((u) => u.status === params.status);
      return {
        success: true,
        message: 'Daftar pengguna sistem',
        data: filtered,
        requestId: 'mock-users-list',
        meta: {
          pagination: {
            page: params?.page || 1,
            limit: params?.limit || 10,
            totalItems: filtered.length,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      };
    }
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.search) query.set('search', params.search);
    if (params?.role) query.set('role', params.role);
    if (params?.status) query.set('status', params.status);
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
    return api.request(`/users?${query.toString()}`);
  },

  async getUserStatistics(): Promise<ApiResponse<UserStatistics>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Statistik akun pengguna',
        data: {
          totalUsers: 1420,
          activeUsers: 1395,
          suspendedUsers: 15,
          lockedUsers: 10,
          roleDistribution: {
            STUDENT: 1350,
            INSTRUCTOR: 48,
            ADMIN: 20,
            SUPER_ADMIN: 2,
          },
          verifiedEmailsCount: 1380,
        },
        requestId: 'mock-user-stats',
      };
    }
    return api.request('/users/statistics');
  },

  async createUser(data: {
    fullName: string;
    email: string;
    password: string;
    role: UserRole;
  }): Promise<ApiResponse<AuthUser>> {
    if (isDevPreviewActive()) {
      const newUser: AuthUser = {
        id: 'usr_' + Math.random().toString(36).substring(2, 9),
        email: data.email,
        role: data.role,
        status: 'ACTIVE',
        emailVerified: true,
        isLocked: false,
        profile: { fullName: data.fullName },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      MOCK_USERS.push(newUser);
      return {
        success: true,
        message: 'Pengguna baru berhasil dibuat.',
        data: newUser,
        requestId: 'mock-user-create',
      };
    }
    return api.request('/users', {
      method: 'POST',
      body: data,
    });
  },

  async getUser(userId: string): Promise<ApiResponse<AuthUser>> {
    if (isDevPreviewActive()) {
      const found = MOCK_USERS.find((u) => u.id === userId) || MOCK_USERS[0];
      return {
        success: true,
        message: 'Detail pengguna',
        data: found,
        requestId: 'mock-user-get',
      };
    }
    return api.request(`/users/${userId}`);
  },

  async updateUser(userId: string, data: { fullName?: string; phone?: string; address?: string }): Promise<ApiResponse<AuthUser>> {
    if (isDevPreviewActive()) {
      const user = MOCK_USERS.find((u) => u.id === userId) || MOCK_USERS[0];
      if (user.profile) Object.assign(user.profile, data);
      return {
        success: true,
        message: 'Data pengguna diperbarui.',
        data: user,
        requestId: 'mock-user-update',
      };
    }
    return api.request(`/users/${userId}`, {
      method: 'PATCH',
      body: data,
    });
  },

  async deleteUser(userId: string, reason?: string): Promise<ApiResponse<{ deleted: boolean }>> {
    if (isDevPreviewActive()) {
      const u = MOCK_USERS.find((x) => x.id === userId);
      if (u) u.status = 'DELETED';
      return {
        success: true,
        message: 'Pengguna berhasil di-soft delete.',
        data: { deleted: true },
        requestId: 'mock-user-del',
      };
    }
    return api.request(`/users/${userId}`, {
      method: 'DELETE',
      body: { reason },
    });
  },

  async changeUserRole(userId: string, role: UserRole): Promise<ApiResponse<AuthUser>> {
    if (isDevPreviewActive()) {
      const u = MOCK_USERS.find((x) => x.id === userId);
      if (u) u.role = role;
      return {
        success: true,
        message: 'Peran pengguna berhasil diubah.',
        data: u || MOCK_USERS[0],
        requestId: 'mock-user-role',
      };
    }
    return api.request(`/users/${userId}/role`, {
      method: 'PATCH',
      body: { role },
    });
  },

  async changeUserStatus(userId: string, status: AccountStatus, reason?: string): Promise<ApiResponse<AuthUser>> {
    if (isDevPreviewActive()) {
      const u = MOCK_USERS.find((x) => x.id === userId);
      if (u) u.status = status;
      return {
        success: true,
        message: 'Status akun berhasil diperbarui.',
        data: u || MOCK_USERS[0],
        requestId: 'mock-user-status',
      };
    }
    return api.request(`/users/${userId}/status`, {
      method: 'PATCH',
      body: { status, reason },
    });
  },

  async deactivateUser(userId: string, reason: string): Promise<ApiResponse<{ deactivated: boolean }>> {
    if (isDevPreviewActive()) {
      const u = MOCK_USERS.find((x) => x.id === userId);
      if (u) u.status = 'INACTIVE';
      return {
        success: true,
        message: 'Akun berhasil dinonaktifkan.',
        data: { deactivated: true },
        requestId: 'mock-user-deact',
      };
    }
    return api.request(`/users/${userId}/deactivate`, {
      method: 'POST',
      body: { reason },
    });
  },

  async reactivateUser(userId: string): Promise<ApiResponse<{ reactivated: boolean }>> {
    if (isDevPreviewActive()) {
      const u = MOCK_USERS.find((x) => x.id === userId);
      if (u) u.status = 'ACTIVE';
      return {
        success: true,
        message: 'Akun berhasil diaktifkan kembali.',
        data: { reactivated: true },
        requestId: 'mock-user-react',
      };
    }
    return api.request(`/users/${userId}/reactivate`, {
      method: 'POST',
      body: {},
    });
  },

  async requestInstructorPasswordRecovery(
    userId: string,
    input: {
      actorPassword: string;
      verificationMethod: 'KNOWN_NUMBER_VOICE_CALL' | 'IN_PERSON';
      verificationReference: string;
    },
  ): Promise<ApiResponse<{ accepted: boolean }>> {
    if (isDevPreviewActive()) {
      throw new Error('Pemulihan akun tidak tersedia dalam mode preview.');
    }
    return api.request(`/users/${userId}/request-password-recovery`, {
      method: 'POST', body: input,
    });
  },

  async unlockUser(userId: string): Promise<ApiResponse<{ unlocked: boolean }>> {
    if (isDevPreviewActive()) {
      const u = MOCK_USERS.find((x) => x.id === userId);
      if (u) u.isLocked = false;
      return {
        success: true,
        message: 'Kunci keamanan akun berhasil dibuka.',
        data: { unlocked: true },
        requestId: 'mock-user-unlock',
      };
    }
    return api.request(`/users/${userId}/unlock`, {
      method: 'POST',
      body: {},
    });
  },

  async restoreUser(userId: string): Promise<ApiResponse<AuthUser>> {
    if (isDevPreviewActive()) {
      const u = MOCK_USERS.find((x) => x.id === userId);
      if (u) u.status = 'ACTIVE';
      return {
        success: true,
        message: 'Akun pengguna berhasil dipulihkan.',
        data: u || MOCK_USERS[0],
        requestId: 'mock-user-restore',
      };
    }
    return api.request(`/users/${userId}/restore`, {
      method: 'POST',
      body: {},
    });
  },

  // Category Management
  async getCategories(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'ACTIVE' | 'INACTIVE';
  }): Promise<ApiResponse<Category[]>> {
    if (isDevPreviewActive()) {
      let filtered = [...MOCK_CATEGORIES];
      if (params?.search) {
        filtered = filtered.filter((c) => c.name.toLowerCase().includes(params.search!.toLowerCase()));
      }
      return {
        success: true,
        message: 'Daftar kategori administrasi',
        data: filtered,
        requestId: 'mock-cat-list',
        meta: {
          pagination: {
            page: params?.page || 1,
            limit: params?.limit || 10,
            totalItems: filtered.length,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      };
    }
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.search) query.set('search', params.search);
    return api.request(`/categories?${query.toString()}`);
  },

  async getCategoryStatistics(): Promise<ApiResponse<CategoryStatistics>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Statistik kategori',
        data: {
          totalCategories: 4,
          activeCategories: 4,
          inactiveCategories: 0,
          totalCoursesAssigned: 23,
        },
        requestId: 'mock-cat-stats',
      };
    }
    return api.request('/categories/statistics');
  },

  async createCategory(data: { name: string; description?: string; isActive?: boolean }): Promise<ApiResponse<Category>> {
    if (isDevPreviewActive()) {
      const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const newCat: Category = {
        id: 'cat_' + Math.random().toString(36).substring(2, 9),
        name: data.name,
        slug,
        description: data.description,
        isActive: data.isActive ?? true,
        coursesCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      MOCK_CATEGORIES.push(newCat);
      return {
        success: true,
        message: 'Kategori baru berhasil ditambahkan.',
        data: newCat,
        requestId: 'mock-cat-create',
      };
    }
    return api.request('/categories', {
      method: 'POST',
      body: data,
    });
  },

  async getCategory(categoryId: string): Promise<ApiResponse<Category>> {
    if (isDevPreviewActive()) {
      const found = MOCK_CATEGORIES.find((c) => c.id === categoryId) || MOCK_CATEGORIES[0];
      return {
        success: true,
        message: 'Detail kategori',
        data: found,
        requestId: 'mock-cat-get',
      };
    }
    return api.request(`/categories/${categoryId}`);
  },

  async updateCategory(categoryId: string, data: { name?: string; description?: string }): Promise<ApiResponse<Category>> {
    if (isDevPreviewActive()) {
      const cat = MOCK_CATEGORIES.find((c) => c.id === categoryId);
      if (cat) Object.assign(cat, data);
      return {
        success: true,
        message: 'Kategori berhasil diperbarui.',
        data: cat || MOCK_CATEGORIES[0],
        requestId: 'mock-cat-update',
      };
    }
    return api.request(`/categories/${categoryId}`, {
      method: 'PATCH',
      body: data,
    });
  },

  async deleteCategory(categoryId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    if (isDevPreviewActive()) {
      const idx = MOCK_CATEGORIES.findIndex((c) => c.id === categoryId);
      if (idx !== -1) MOCK_CATEGORIES.splice(idx, 1);
      return {
        success: true,
        message: 'Kategori berhasil dihapus.',
        data: { deleted: true },
        requestId: 'mock-cat-del',
      };
    }
    return api.request(`/categories/${categoryId}`, {
      method: 'DELETE',
    });
  },

  async changeCategoryStatus(categoryId: string, isActive: boolean): Promise<ApiResponse<Category>> {
    if (isDevPreviewActive()) {
      const cat = MOCK_CATEGORIES.find((c) => c.id === categoryId);
      if (cat) cat.isActive = isActive;
      return {
        success: true,
        message: 'Status kategori berhasil diperbarui.',
        data: cat || MOCK_CATEGORIES[0],
        requestId: 'mock-cat-status',
      };
    }
    return api.request(`/categories/${categoryId}/status`, {
      method: 'PATCH',
      body: { isActive },
    });
  },

  async restoreCategory(categoryId: string): Promise<ApiResponse<Category>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Kategori berhasil dipulihkan.',
        data: MOCK_CATEGORIES[0],
        requestId: 'mock-cat-restore',
      };
    }
    return api.request(`/categories/${categoryId}/restore`, {
      method: 'POST',
      body: {},
    });
  },

  // Course Reviews & Publishing
  async getCourseReviews(params?: { page?: number; limit?: number; status?: string; search?: string }): Promise<ApiResponse<CourseVersion[]>> {
    if (isDevPreviewActive()) {
      const sampleReviews: CourseVersion[] = [
        {
          id: 'ver_sub_01',
          courseId: 'crs_fullstack_ts',
          versionNumber: 1,
          status: 'SUBMITTED',
          title: 'Fullstack TypeScript & REST API Masterclass',
          subtitle: 'Membangun aplikasi enterprise skala besar',
          price: '349000.00',
          currency: 'IDR',
          level: 'INTERMEDIATE',
          language: 'Bahasa Indonesia',
          submittedAt: '2026-11-01T10:00:00Z',
          reviewCount: 0,
          chapters: MOCK_CURRICULUM_SAMPLE,
          createdAt: '2026-10-25T08:00:00Z',
          updatedAt: '2026-11-01T10:00:00Z',
        },
      ];
      return {
        success: true,
        message: 'Daftar pengajuan review kursus',
        data: sampleReviews,
        requestId: 'mock-reviews-list',
        meta: {
          pagination: {
            page: 1,
            limit: 10,
            totalItems: sampleReviews.length,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      };
    }
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    return api.request(`/admin/course-reviews?${query.toString()}`);
  },

  async getCourseReviewDetail(courseVersionId: string): Promise<ApiResponse<CourseReviewVersionDetail>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Detail exact versi kursus untuk reviewer',
        data: {
          id: courseVersionId,
          courseId: 'crs_fullstack_ts',
          versionNumber: 1,
          status: 'SUBMITTED',
          title: 'Fullstack TypeScript & REST API Masterclass',
          subtitle: 'Membangun aplikasi enterprise skala besar dari nol',
          description: 'Kurikulum komprehensif fullstack TypeScript.',
          price: '349000.00',
          currency: 'IDR',
          level: 'INTERMEDIATE',
          language: 'Bahasa Indonesia',
          submittedAt: '2026-11-01T10:00:00Z',
          reviewCount: 0,
          instructor: {
            id: 'usr_instructor_01',
            fullName: 'Dr. Hendra Gunawan, S.Kom., M.T.',
            email: 'instructor@24institute.id',
          },
          chapters: MOCK_CURRICULUM_SAMPLE,
        },
        requestId: 'mock-review-detail',
      };
    }
    return api.request(`/admin/course-reviews/${courseVersionId}`);
  },

  async decideCourseReview(courseVersionId: string, input: CourseReviewDecisionInput): Promise<ApiResponse<CourseVersion>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: `Keputusan review '${input.decision}' berhasil dicatat.`,
        data: {
          id: courseVersionId,
          courseId: 'crs_fullstack_ts',
          versionNumber: 1,
          status: input.decision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
          title: 'Fullstack TypeScript',
          price: '349000.00',
          currency: 'IDR',
          level: 'INTERMEDIATE',
          language: 'Bahasa Indonesia',
          reviewerNotes: input.notes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        requestId: 'mock-review-decision',
      };
    }
    return api.request(`/admin/course-reviews/${courseVersionId}/decision`, {
      method: 'POST',
      body: input,
    });
  },

  async publishCourseReview(courseVersionId: string): Promise<ApiResponse<CourseVersion>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Versi kursus resmi berhasil dipublikasikan dan aktif di katalog siswa!',
        data: {
          id: courseVersionId,
          courseId: 'crs_fullstack_ts',
          versionNumber: 1,
          status: 'PUBLISHED',
          title: 'Fullstack TypeScript',
          price: '349000.00',
          currency: 'IDR',
          level: 'INTERMEDIATE',
          language: 'Bahasa Indonesia',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        requestId: 'mock-review-publish',
      };
    }
    return api.request(`/admin/course-reviews/${courseVersionId}/publish`, {
      method: 'POST',
      body: {},
    });
  },

  // Certificate Management (Review -> Issue -> Revoke)
  async getCertificateRequests(status: 'PROCESSING' | 'ELIGIBLE' | 'REJECTED' = 'PROCESSING'): Promise<ApiResponse<Certificate[]>> {
    if (isDevPreviewActive()) {
      const filtered = MOCK_CERTIFICATES.filter((c) => {
        if (status === 'PROCESSING') return c.status === 'PROCESSING';
        if (status === 'ELIGIBLE') return c.status === 'ELIGIBLE';
        if (status === 'REJECTED') return c.status === 'REJECTED';
        return true;
      });
      return {
        success: true,
        message: 'Antrean permintaan sertifikat internal',
        data: filtered,
        requestId: 'mock-cert-reqs',
      };
    }
    return api.request(`/admin/certificates/requests?status=${status}`);
  },

  async getCertificateRequestDetail(certificateId: string): Promise<ApiResponse<Certificate>> {
    if (isDevPreviewActive()) {
      const cert = MOCK_CERTIFICATES.find((c) => c.id === certificateId) || MOCK_CERTIFICATES[0];
      return {
        success: true,
        message: 'Detail pengajuan sertifikat',
        data: cert,
        requestId: 'mock-cert-req-detail',
      };
    }
    return api.request(`/admin/certificates/requests/${certificateId}`);
  },

  async reviewCertificate(
    certificateId: string,
    decision: 'APPROVE' | 'REJECT',
    notes?: string
  ): Promise<ApiResponse<Certificate>> {
    if (isDevPreviewActive()) {
      const cert = MOCK_CERTIFICATES.find((c) => c.id === certificateId) || MOCK_CERTIFICATES[0];
      cert.status = decision === 'APPROVE' ? 'ELIGIBLE' : 'REJECTED';
      cert.reviewedAt = new Date().toISOString();
      cert.reviewerNotes = notes;
      return {
        success: true,
        message: decision === 'APPROVE' ? 'Pengajuan disetujui. Status berubah menjadi ELIGIBLE.' : 'Pengajuan ditolak.',
        data: cert,
        requestId: 'mock-cert-review',
      };
    }
    return api.request(`/admin/certificates/requests/${certificateId}/review`, {
      method: 'POST',
      body: { decision, ...(notes ? { notes } : {}) },
    });
  },

  async issueCertificate(certificateId: string): Promise<ApiResponse<Certificate>> {
    if (isDevPreviewActive()) {
      const cert = MOCK_CERTIFICATES.find((c) => c.id === certificateId) || MOCK_CERTIFICATES[0];
      cert.status = 'ISSUED';
      cert.issuedAt = new Date().toISOString();
      cert.pdfDownloadAvailable = true;
      return {
        success: true,
        message: 'Sertifikat digital resmi 24Institute berhasil diterbitkan (ISSUED).',
        data: cert,
        requestId: 'mock-cert-issue',
      };
    }
    return api.request(`/admin/certificates/requests/${certificateId}/issue`, {
      method: 'POST',
      body: {},
    });
  },

  async revokeCertificate(certificateId: string, reason: string): Promise<ApiResponse<Certificate>> {
    if (isDevPreviewActive()) {
      const cert = MOCK_CERTIFICATES.find((c) => c.id === certificateId) || MOCK_CERTIFICATES[0];
      cert.status = 'REVOKED';
      cert.revocationReason = reason;
      cert.pdfDownloadAvailable = false;
      return {
        success: true,
        message: 'Sertifikat berhasil dicabut (REVOKED).',
        data: cert,
        requestId: 'mock-cert-revoke',
      };
    }
    return api.request(`/admin/certificates/requests/${certificateId}/revoke`, {
      method: 'POST',
      body: { reason },
    });
  },

  // Read-Only Commerce Monitoring (B25 contract)
  async getOrdersMonitoring(params?: {
    page?: number;
    limit?: number;
    studentId?: string;
    courseId?: string;
    status?: string;
    checkoutState?: string;
  }): Promise<ApiResponse<Order[]>> {
    if (isDevPreviewActive()) {
      let filtered = [...MOCK_ORDERS];
      if (params?.status) filtered = filtered.filter((o) => o.status === params.status);
      if (params?.checkoutState) filtered = filtered.filter((o) => o.checkoutState === params.checkoutState);
      return {
        success: true,
        message: 'Monitoring transaksi pesanan (Read-Only)',
        data: filtered,
        requestId: 'mock-admin-orders',
        meta: {
          pagination: {
            page: params?.page || 1,
            limit: params?.limit || 10,
            totalItems: filtered.length,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      };
    }
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.status) query.set('status', params.status);
    if (params?.checkoutState) query.set('checkoutState', params.checkoutState);
    return api.request(`/admin/orders?${query.toString()}`);
  },

  async getOrderDetailMonitoring(orderId: string): Promise<ApiResponse<Order>> {
    if (isDevPreviewActive()) {
      const order = MOCK_ORDERS.find((o) => o.id === orderId) || MOCK_ORDERS[0];
      return {
        success: true,
        message: 'Detail monitoring pesanan',
        data: order,
        requestId: 'mock-admin-order-get',
      };
    }
    return api.request(`/admin/orders/${orderId}`);
  },

  async getEnrollmentsMonitoring(params?: {
    page?: number;
    limit?: number;
    studentId?: string;
    courseId?: string;
    status?: string;
  }): Promise<ApiResponse<Enrollment[]>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Monitoring pendaftaran kursus (Read-Only)',
        data: MOCK_ENROLLMENTS,
        requestId: 'mock-admin-enrollments',
        meta: {
          pagination: {
            page: params?.page || 1,
            limit: params?.limit || 10,
            totalItems: MOCK_ENROLLMENTS.length,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      };
    }
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.studentId) query.set('studentId', params.studentId);
    if (params?.courseId) query.set('courseId', params.courseId);
    if (params?.status) query.set('status', params.status);
    return api.request(`/admin/enrollments?${query.toString()}`);
  },

  async getEnrollmentDetailMonitoring(enrollmentId: string): Promise<ApiResponse<Enrollment>> {
    if (isDevPreviewActive()) {
      const enr = MOCK_ENROLLMENTS.find((e) => e.id === enrollmentId) || MOCK_ENROLLMENTS[0];
      return {
        success: true,
        message: 'Detail pendaftaran kursus',
        data: enr,
        requestId: 'mock-admin-enr-get',
      };
    }
    return api.request(`/admin/enrollments/${enrollmentId}`);
  },

  async getAdminOrderById(orderId: string): Promise<ApiResponse<Order>> {
    return this.getOrderDetailMonitoring(orderId);
  },

  async getAdminEnrollmentById(enrollmentId: string): Promise<ApiResponse<Enrollment>> {
    return this.getEnrollmentDetailMonitoring(enrollmentId);
  },

  // Media Management
  async getMediaList(params?: { page?: number; limit?: number; purpose?: string }): Promise<ApiResponse<MediaItem[]>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Daftar inventaris media',
        data: MOCK_MEDIA_ITEMS,
        requestId: 'mock-media-list',
        meta: {
          pagination: {
            page: 1,
            limit: 10,
            totalItems: MOCK_MEDIA_ITEMS.length,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      };
    }
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.purpose) query.set('purpose', params.purpose);
    return api.request(`/media?${query.toString()}`);
  },

  async getMediaStatistics(): Promise<ApiResponse<MediaStatistics>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Statistik penyimpanan media',
        data: {
          totalItems: 48,
          totalStorageBytes: 154200000,
          byPurpose: {
            COURSE_THUMBNAIL: 24,
            LESSON_IMAGE: 18,
            LESSON_AUDIO: 6,
          },
          byType: {
            IMAGE: 42,
            AUDIO: 6,
          },
        },
        requestId: 'mock-media-stats',
      };
    }
    return api.request('/media/statistics');
  },

  async uploadCourseThumbnail(file: File): Promise<ApiResponse<{ mediaId: string; url: string }>> {
    if (isDevPreviewActive()) {
      const localUrl = URL.createObjectURL(file);
      return {
        success: true,
        message: 'Thumbnail kursus berhasil diunggah.',
        data: { mediaId: 'med_thumb_' + Date.now(), url: localUrl },
        requestId: 'mock-thumb-upload',
      };
    }
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.request('/media/course-thumbnails', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
    return { ...response, data: normalizeMediaUpload(response) };
  },

  async uploadLessonImage(file: File): Promise<ApiResponse<{ mediaId: string; url: string }>> {
    if (isDevPreviewActive()) {
      const localUrl = URL.createObjectURL(file);
      return {
        success: true,
        message: 'Gambar lesson berhasil diunggah.',
        data: { mediaId: 'med_img_' + Date.now(), url: localUrl },
        requestId: 'mock-img-upload',
      };
    }
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.request('/media/lesson-images', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
    return { ...response, data: normalizeMediaUpload(response) };
  },

  async uploadLessonAudio(file: File): Promise<ApiResponse<{ mediaId: string; url: string }>> {
    if (isDevPreviewActive()) {
      const localUrl = URL.createObjectURL(file);
      return {
        success: true,
        message: 'Audio lesson berhasil diunggah.',
        data: { mediaId: 'med_audio_' + Date.now(), url: localUrl },
        requestId: 'mock-audio-upload',
      };
    }
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.request('/media/lesson-audios', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
    return { ...response, data: normalizeMediaUpload(response) };
  },

  async uploadCertificatePdfFile(file: File): Promise<ApiResponse<{ mediaId: string; url: string }>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'File master sertifikat berhasil diunggah.',
        data: { mediaId: 'med_cert_' + Date.now(), url: '/mock-cert.pdf' },
        requestId: 'mock-cert-pdf-upload',
      };
    }
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.request('/media/certificates', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
    return { ...response, data: normalizeMediaUpload(response) };
  },

  async getMediaById(mediaId: string): Promise<ApiResponse<MediaItem>> {
    if (isDevPreviewActive()) {
      const found = MOCK_MEDIA_ITEMS.find((m) => m.id === mediaId) || MOCK_MEDIA_ITEMS[0];
      return {
        success: true,
        message: 'Detail aset media',
        data: found,
        requestId: 'mock-media-get',
      };
    }
    return api.request(`/media/${mediaId}`);
  },

  async deleteMedia(mediaId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Media berhasil dihapus.',
        data: { deleted: true },
        requestId: 'mock-media-del',
      };
    }
    return api.request(`/media/${mediaId}`, { method: 'DELETE' });
  },

  async restoreMedia(mediaId: string): Promise<ApiResponse<{ restored: boolean }>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Media berhasil dipulihkan.',
        data: { restored: true },
        requestId: 'mock-media-restore',
      };
    }
    return api.request(`/media/${mediaId}/restore`, { method: 'POST', body: {} });
  },

  async cleanupMedia(olderThanDays: number = 30): Promise<ApiResponse<{ cleanedCount: number }>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Pembersihan media berhasil diselesaikan.',
        data: { cleanedCount: 3 },
        requestId: 'mock-media-cleanup',
      };
    }
    return api.request('/media/cleanup', {
      method: 'POST',
      body: { olderThanDays },
    });
  },

  async getPremiumExposure(): Promise<ApiResponse<PremiumExposure>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Audit proteksi media premium',
        data: {
          totalProtectedLessons: 42,
          totalSignedUrlsGenerated24h: 312,
          activeExpiringUrlsCount: 8,
        },
        requestId: 'mock-prem-exp',
      };
    }
    return api.request('/admin/media/premium-exposure');
  },

  async getPremiumAssetInventory(): Promise<ApiResponse<PremiumAssetInventory>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Inventaris aset premium',
        data: {
          totalAssets: 48,
          imagesCount: 42,
          audiosCount: 6,
          orphanedAssetsCount: 0,
        },
        requestId: 'mock-prem-inv',
      };
    }
    return api.request('/admin/media/premium-asset-inventory');
  },

  // WhatsApp Management
  async getGeneralWhatsApp(): Promise<ApiResponse<WhatsAppGroupLink>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Tautan WhatsApp umum saat ini',
        data: MOCK_WHATSAPP_GENERAL,
        requestId: 'mock-admin-wa-general',
      };
    }
    return api.request('/admin/whatsapp/general');
  },

  async upsertGeneralWhatsApp(inviteUrl: string, isActive: boolean): Promise<ApiResponse<WhatsAppGroupLink>> {
    if (isDevPreviewActive()) {
      MOCK_WHATSAPP_GENERAL.inviteUrl = inviteUrl;
      MOCK_WHATSAPP_GENERAL.isActive = isActive;
      MOCK_WHATSAPP_GENERAL.updatedAt = new Date().toISOString();
      return {
        success: true,
        message: 'Tautan WhatsApp umum berhasil disimpan.',
        data: MOCK_WHATSAPP_GENERAL,
        requestId: 'mock-upsert-wa-general',
      };
    }
    return api.request('/admin/whatsapp/general', {
      method: 'PUT',
      body: { inviteUrl, isActive },
    });
  },

  async getCourseWhatsApp(courseId: string): Promise<ApiResponse<WhatsAppGroupLink>> {
    if (isDevPreviewActive()) {
      const link = MOCK_WHATSAPP_COURSES[courseId] || {
        type: 'COURSE',
        courseId,
        inviteUrl: 'https://chat.whatsapp.com/CourseDisc24Inst_' + courseId.substring(0, 6),
        isActive: true,
      };
      return {
        success: true,
        message: 'Tautan WhatsApp kursus',
        data: link,
        requestId: 'mock-admin-wa-course',
      };
    }
    return api.request(`/admin/whatsapp/courses/${courseId}`);
  },

  async upsertCourseWhatsApp(
    courseId: string,
    inviteUrl: string,
    isActive: boolean
  ): Promise<ApiResponse<WhatsAppGroupLink>> {
    if (isDevPreviewActive()) {
      const link: WhatsAppGroupLink = {
        type: 'COURSE',
        courseId,
        inviteUrl,
        isActive,
        updatedAt: new Date().toISOString(),
      };
      MOCK_WHATSAPP_COURSES[courseId] = link;
      return {
        success: true,
        message: 'Tautan grup WhatsApp kursus berhasil diperbarui.',
        data: link,
        requestId: 'mock-upsert-wa-course',
      };
    }
    return api.request(`/admin/whatsapp/courses/${courseId}`, {
      method: 'PUT',
      body: { inviteUrl, isActive },
    });
  },
};
