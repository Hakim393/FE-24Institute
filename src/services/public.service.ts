import { isDevPreviewActive } from "./mode";
// 24Institute Public Service
// Implements public catalog (courses, categories) and public certificate verification.

import { api } from './api';
import { ApiResponse, ApiIdentity } from '../types/api';
import { Course, PublicCategory, CourseLevel } from '../types/course';
import { CertificateVerificationResult } from '../types/certificate';
import { MOCK_COURSES, MOCK_CATEGORIES, MOCK_CERTIFICATES } from './mock-data';
import { adaptPublicCourseDetail, adaptPublicCourseSummary } from './adapters';

import { parsePublicPreviewLesson, type PublicPreviewLesson } from '../utils/public-lesson-preview';
import { parsePublicCertificateVerification } from '../utils/public-certificate-verification';
import { parsePublicCategoryList, parsePublicCategoryDetail } from '../utils/public-category-contract';

export const publicService = {
  async getApiIdentity(): Promise<ApiResponse<ApiIdentity>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: '24Institute LMS Official API',
        data: {
          name: '24Institute LMS Engine',
          version: '1.0.0-b25',
          environment: 'production-ready',
          timestamp: new Date().toISOString(),
          documentationUrl: '/docs',
        },
        requestId: 'mock-api-root',
      };
    }
    return api.request('/');
  },

  async getCategories(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ApiResponse<PublicCategory[]>> {
    if (isDevPreviewActive()) {
      let filtered = [...MOCK_CATEGORIES];
      if (params?.search) {
        filtered = filtered.filter((c) => c.name.toLowerCase().includes(params.search!.toLowerCase()));
      }
      return {
        success: true,
        message: 'Kategori kursus aktif',
        data: filtered.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description ?? null,
          publishedCourseCount: category.coursesCount ?? 0,
        })),
        requestId: 'mock-pub-cats',
        meta: {
          pagination: {
            page: params?.page || 1,
            limit: params?.limit || 12,
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
    const res = await api.request<unknown>(`/public/categories?${query.toString()}`);
    if (res.success !== true) throw new Error('Daftar kategori publik tidak dapat dimuat.');
    return { ...res, data: parsePublicCategoryList(res.data) };
  },

  async getCategoryBySlug(slug: string): Promise<ApiResponse<PublicCategory>> {
    if (isDevPreviewActive()) {
      const found = MOCK_CATEGORIES.find((c) => c.slug === slug) || MOCK_CATEGORIES[0];
      return {
        success: true,
        message: 'Detail kategori publik',
        data: {
          id: found.id,
          name: found.name,
          slug: found.slug,
          description: found.description ?? null,
          publishedCourseCount: found.coursesCount ?? 0,
        },
        requestId: 'mock-pub-cat-slug',
      };
    }
    const res = await api.request<unknown>(`/public/categories/${encodeURIComponent(slug)}`);
    if (res.success !== true) throw new Error('Detail kategori publik tidak dapat dimuat.');
    return { ...res, data: parsePublicCategoryDetail(res.data) };
  },

  async getCourses(params?: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    level?: CourseLevel;
    language?: string;
    currency?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ApiResponse<Course[]>> {
    if (isDevPreviewActive()) {
      let filtered = [...MOCK_COURSES];
      if (params?.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(
          (c) => c.title.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
        );
      }
      if (params?.categoryId) {
        filtered = filtered.filter((c) => c.categoryId === params.categoryId);
      }
      if (params?.level) {
        filtered = filtered.filter((c) => c.level === params.level);
      }
      return {
        success: true,
        message: 'Katalog kursus publik',
        data: filtered,
        requestId: 'mock-pub-courses',
        meta: {
          pagination: {
            page: params?.page || 1,
            limit: params?.limit || 12,
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
    if (params?.categoryId) query.set('categoryId', params.categoryId);
    if (params?.level) query.set('level', params.level);
    if (params?.language) query.set('language', params.language);
    if (params?.minPrice) query.set('minPrice', params.minPrice.toString());
    if (params?.maxPrice) query.set('maxPrice', params.maxPrice.toString());
    if (params?.sortBy === 'price' || params?.currency) query.set('currency', params?.currency || 'IDR');
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
    const res = await api.request<any[]>(`/public/courses?${query.toString()}`);
    return {
      ...res,
      data: (res.data || []).map(adaptPublicCourseSummary),
    };
  },

  async getCourseBySlug(slug: string): Promise<ApiResponse<Course>> {
    if (isDevPreviewActive()) {
      const found = MOCK_COURSES.find((c) => c.slug === slug) || MOCK_COURSES[0];
      return {
        success: true,
        message: 'Detail kursus publik',
        data: found,
        requestId: 'mock-pub-course-slug',
      };
    }
    const res = await api.request<any>(`/public/courses/${slug}`);
    return {
      ...res,
      data: adaptPublicCourseDetail(res.data),
    };
  },

  async getLessonPreview(slug: string, lessonId: string): Promise<ApiResponse<{ lesson: PublicPreviewLesson }>> {
    if (isDevPreviewActive()) {
      throw new Error('Preview gratis hanya tersedia saat terhubung ke backend resmi.');
    }
    const res = await api.request<{ lesson: unknown }>(`/public/courses/${encodeURIComponent(slug)}/preview/${encodeURIComponent(lessonId)}`);
    if (res.success !== true || !res.data) {
      throw new Error('Gagal memuat preview dari backend.');
    }
    return { ...res, data: { lesson: parsePublicPreviewLesson(res.data, lessonId) } };
  },

  async verifyCertificate(certificateNumber: string): Promise<ApiResponse<CertificateVerificationResult>> {
    if (isDevPreviewActive()) {
      const found = MOCK_CERTIFICATES.find((c) => c.certificateNumber === certificateNumber && c.status === 'ISSUED');
      if (found) {
        return {
          success: true,
          message: 'Hasil verifikasi credential internal',
          data: {
            valid: true,
            credentialType: '24INSTITUTE_INTERNAL_DIGITAL_REGISTRY',
            issuerName: '24Institute',
            courseTitle: found.courseTitle,
            issuedAt: found.issuedAt || new Date().toISOString(),
            disclaimer: 'Internal 24Institute credential, not an official BNSP certification',
          },
          requestId: 'mock-cert-verify-valid',
        };
      }
      return {
        success: true,
        message: 'Hasil verifikasi credential internal',
        data: { valid: false, credentialType: '24INSTITUTE_INTERNAL_DIGITAL_REGISTRY' },
        requestId: 'mock-cert-verify-invalid',
      };
    }
    const res = await api.request<unknown>(`/public/certificates/verify/${encodeURIComponent(certificateNumber)}`);
    if (res.success !== true) throw new Error('Public certificate verification API failed');
    return { ...res, data: parsePublicCertificateVerification(res.data) };
  },
};
