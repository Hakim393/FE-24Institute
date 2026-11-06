import { isDevPreviewActive } from "./mode";
// 24Institute Student Service
// Implements Orders, Checkout, Enrollments, Curriculum, Lessons, Quizzes, Progress,
// Certificates (including private PDF binary download), and WhatsApp invitations.

import { api } from './api';
import { ApiResponse } from '../types/api';
import { Order, CheckoutResult, Enrollment, CourseAccessCheck } from '../types/order';
import {
  Chapter,
  Lesson,
  Quiz,
  StudentProgress,
  QuizSubmitAnswer,
  QuizSubmitResult,
} from '../types/course';
import {
  Certificate,
  CertificateEligibility,
} from '../types/certificate';
import { WhatsAppGroupLink } from '../types/admin';
import {
  MOCK_ORDERS,
  MOCK_ENROLLMENTS,
  MOCK_CURRICULUM_SAMPLE,
  MOCK_CERTIFICATES,
  MOCK_WHATSAPP_GENERAL,
  MOCK_WHATSAPP_COURSES,
} from './mock-data';
import { adaptStudentEnrollment, adaptStudentOrderCheckout } from './adapters';
import { adaptEnrolledCurriculum, adaptEnrolledLesson, adaptEnrolledProgress, adaptEnrolledQuiz } from '../utils/student-learning-contract';
import { adaptEngagementList, type EngagementReport, type EngagementRecord } from '../utils/lesson-consumption';
import { adaptCourseAccessCheck } from '../utils/course-access-contract';

export const studentService = {
  // Orders & Midtrans Checkout
  async createOrder(courseId: string, idempotencyKey: string): Promise<ApiResponse<Order>> {
    if (isDevPreviewActive()) {
      const newOrder: Order = {
        id: 'ord_' + Math.random().toString(36).substring(2, 9),
        orderNumber: 'ORD-DEMO-' + Date.now().toString().slice(-6),
        studentId: 'usr_student_01',
        courseId,
        courseVersionId: 'ver_01',
        courseTitle: 'Fullstack TypeScript & REST API Masterclass',
        courseThumbnailUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80',
        amount: '349000.00',
        currency: 'IDR',
        status: 'PENDING',
        checkoutState: 'READY',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      MOCK_ORDERS.unshift(newOrder);
      return {
        success: true,
        message: 'Pesanan berhasil dibuat. Silakan lanjutkan ke checkout pembayaran.',
        data: newOrder,
        requestId: 'mock-order-create',
      };
    }
    return api.request('/student/orders', {
      method: 'POST',
      body: { courseId },
      idempotencyKey,
    });
  },

  async getOrders(params?: { page?: number; limit?: number; status?: string }): Promise<ApiResponse<Order[]>> {
    if (isDevPreviewActive()) {
      let filtered = [...MOCK_ORDERS];
      if (params?.status) {
        filtered = filtered.filter((o) => o.status === params.status);
      }
      return {
        success: true,
        message: 'Daftar riwayat pesanan',
        data: filtered,
        requestId: 'mock-orders-list',
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
    return api.request(`/student/orders?${query.toString()}`);
  },

  async getOrder(orderId: string): Promise<ApiResponse<Order>> {
    if (isDevPreviewActive()) {
      const order = MOCK_ORDERS.find((o) => o.id === orderId) || MOCK_ORDERS[0];
      return {
        success: true,
        message: 'Detail pesanan',
        data: order,
        requestId: 'mock-order-detail',
      };
    }
    return api.request(`/student/orders/${orderId}`);
  },

  async checkoutOrder(orderId: string): Promise<ApiResponse<CheckoutResult>> {
    if (isDevPreviewActive()) {
      // Mock Sandbox Checkout Result
      return {
        success: true,
        message: 'Sesi checkout Midtrans Sandbox siap',
        data: {
          orderId,
          token: 'snap-token-demo-' + Date.now(),
          redirectUrl: `https://app.sandbox.midtrans.com/snap/v2/vtweb/demo-${orderId}`,
          expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          status: 'READY',
        },
        requestId: 'mock-checkout-id',
      };
    }
    const res = await api.request<any>(`/student/orders/${orderId}/checkout`, {
      method: 'POST',
      body: {},
    });
    return {
      ...res,
      data: adaptStudentOrderCheckout(res.data),
    };
  },

  // Enrollments
  async getEnrollments(params?: { page?: number; limit?: number; status?: string }): Promise<ApiResponse<Enrollment[]>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Daftar kursus terdaftar',
        data: MOCK_ENROLLMENTS.map(adaptStudentEnrollment),
        requestId: 'mock-enrollments-list',
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
    if (params?.status) query.set('status', params.status);
    const res = await api.request<any[]>(`/student/enrollments?${query.toString()}`);
    return {
      ...res,
      data: (res.data || []).map(adaptStudentEnrollment),
    };
  },

  async getEnrollment(enrollmentId: string): Promise<ApiResponse<Enrollment>> {
    if (isDevPreviewActive()) {
      const found = MOCK_ENROLLMENTS.find((e) => e.id === enrollmentId) || MOCK_ENROLLMENTS[0];
      return {
        success: true,
        message: 'Detail enrollment',
        data: adaptStudentEnrollment(found),
        requestId: 'mock-enr-detail',
      };
    }
    const res = await api.request<any>(`/student/enrollments/${enrollmentId}`);
    return {
      ...res,
      data: adaptStudentEnrollment(res.data),
    };
  },

  async checkCourseAccess(courseId: string): Promise<ApiResponse<CourseAccessCheck>> {
    if (isDevPreviewActive()) {
      const hasAccess = MOCK_ENROLLMENTS.some((e) => e.courseId === courseId);
      return {
        success: true,
        message: 'Status hak akses kursus',
        data: { courseId, allowed: hasAccess },
        requestId: 'mock-access-check',
      };
    }
    const response = await api.request<unknown>(`/student/enrollments/courses/${courseId}/access`);
    if (response.success !== true) throw new Error('Gagal memeriksa hak akses kursus.');
    return { ...response, data: adaptCourseAccessCheck(response.data, courseId) };
  },

  // Advisory lesson consumption. This never changes official completion/certificate status.
  async getConsumption(courseId: string): Promise<ApiResponse<{ records: Record<string, EngagementRecord>; lastAccessedLessonId: string | null }>> {
    if (isDevPreviewActive()) return {
      success: true, message: 'Preview progress', data: { records: {}, lastAccessedLessonId: null }, requestId: 'mock-consumption',
    };
    const response = await api.request<unknown>(`/student/courses/${courseId}/consumption`);
    return { ...response, data: adaptEngagementList(response.data, courseId) };
  },

  async saveConsumption(courseId: string, lessonId: string, report: EngagementReport): Promise<ApiResponse<unknown>> {
    if (isDevPreviewActive()) return { success: true, message: 'Preview progress saved', data: {}, requestId: 'mock-consumption-save' };
    return api.request(`/student/courses/${courseId}/lessons/${lessonId}/consumption`, {
      method: 'PUT', body: report,
    });
  },

  // Learning Experience & Player
  async getCurriculum(courseId: string): Promise<ApiResponse<{ courseId: string; chapters: Chapter[] }>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Struktur kurikulum pembelajaran',
        data: { courseId, chapters: MOCK_CURRICULUM_SAMPLE },
        requestId: 'mock-curriculum-id',
      };
    }
    const res = await api.request<unknown>(`/student/courses/${courseId}/curriculum`);
    return { ...res, data: adaptEnrolledCurriculum(res.data, courseId) };
  },

  async getCanvasMediaUrl(courseId:string,lessonId:string,mediaId:string):Promise<ApiResponse<{url:string;kind:'IMAGE'|'AUDIO';expiresAt:number;mediaId:string}>>{
    if(isDevPreviewActive())throw new Error('Canvas premium media hanya tersedia pada koneksi backend nyata.');
    const r=await api.request<{url:string;kind:'IMAGE'|'AUDIO';expiresAt:number;mediaId:string}>(`/student/courses/${courseId}/lessons/${lessonId}/canvas-media/${mediaId}`);
    if(r.data?.mediaId?.toLowerCase()!==mediaId.toLowerCase()||!['IMAGE','AUDIO'].includes(r.data?.kind)||typeof r.data?.expiresAt!=='number')throw new Error('Kontrak media Canvas tidak sesuai.');
    return r;
  },

  async getLesson(courseId: string, lessonId: string): Promise<ApiResponse<Lesson>> {
    if (isDevPreviewActive()) {
      for (const chap of MOCK_CURRICULUM_SAMPLE) {
        const found = chap.lessons.find((l) => l.id === lessonId);
        if (found) {
          return {
            success: true,
            message: 'Konten lesson',
            data: found,
            requestId: 'mock-lesson-detail',
          };
        }
      }
      return {
        success: true,
        message: 'Konten lesson default',
        data: MOCK_CURRICULUM_SAMPLE[0].lessons[0],
        requestId: 'mock-lesson-default',
      };
    }
    const res = await api.request<unknown>(`/student/courses/${courseId}/lessons/${lessonId}`);
    return { ...res, data: adaptEnrolledLesson(res.data, courseId, lessonId) };
  },

  async startLesson(courseId: string, lessonId: string): Promise<ApiResponse<{ started: boolean }>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Lesson dimulai',
        data: { started: true },
        requestId: 'mock-lesson-start',
      };
    }
    return api.request(`/student/courses/${courseId}/lessons/${lessonId}/start`, {
      method: 'POST',
      body: {},
    });
  },

  async completeLesson(courseId: string, lessonId: string): Promise<ApiResponse<{ courseId: string; lessonId: string; status: 'COMPLETED' }>> {
    if (isDevPreviewActive()) {
      for (const chap of MOCK_CURRICULUM_SAMPLE) {
        const found = chap.lessons.find((l) => l.id === lessonId);
        if (found) found.isCompleted = true;
      }
      return {
        success: true,
        message: 'Lesson berhasil ditandai selesai',
        data: { courseId, lessonId, status: 'COMPLETED' },
        requestId: 'mock-lesson-complete',
      };
    }
    return api.request(`/student/courses/${courseId}/lessons/${lessonId}/complete`, {
      method: 'POST',
      body: {},
    });
  },

  async getQuiz(courseId: string, quizId: string): Promise<ApiResponse<Quiz>> {
    if (isDevPreviewActive()) {
      for (const chap of MOCK_CURRICULUM_SAMPLE) {
        const found = chap.quizzes.find((q) => q.id === quizId);
        if (found) {
          // Student quiz does NOT expose isCorrect
          const studentQuiz: Quiz = {
            ...found,
            questions: found.questions?.map((q) => ({
              ...q,
              options: q.options.map((opt) => ({
                id: opt.id,
                questionId: opt.questionId,
                text: opt.text,
                order: opt.order,
              })),
            })),
          };
          return {
            success: true,
            message: 'Soal kuis siswa',
            data: studentQuiz,
            requestId: 'mock-quiz-detail',
          };
        }
      }
      return {
        success: true,
        message: 'Soal kuis default',
        data: MOCK_CURRICULUM_SAMPLE[0].quizzes[0],
        requestId: 'mock-quiz-default',
      };
    }
    const res = await api.request<unknown>(`/student/courses/${courseId}/quizzes/${quizId}`);
    return { ...res, data: adaptEnrolledQuiz(res.data, courseId, quizId) };
  },

  async submitQuiz(
    courseId: string,
    quizId: string,
    answers: QuizSubmitAnswer[]
  ): Promise<ApiResponse<QuizSubmitResult>> {
    if (isDevPreviewActive()) {
      // Calculate realistic score in preview mode
      const quiz = MOCK_CURRICULUM_SAMPLE[0].quizzes[0];
      let correct = 0;
      for (const ans of answers) {
        const q = quiz.questions?.find((qq) => qq.id === ans.questionId);
        const opt = q?.options.find((oo) => oo.id === ans.selectedOptionId);
        if (opt?.isCorrect) correct++;
      }
      const total = quiz.questions?.length || 3;
      const score = Math.round((correct / total) * 100);
      const passed = score >= quiz.passingGrade;

      return {
        success: true,
        message: passed ? 'Selamat, Anda lulus kuis ini!' : 'Nilai Anda belum mencapai passing grade.',
        data: {
          quizId,
          attemptNumber: 1,
          status: passed ? 'PASSED' : 'FAILED',
          score,
          passed,
          totalQuestions: total,
          correctAnswers: correct,
          passingGrade: quiz.passingGrade,
          attemptsUsed: 1,
          maxAttempts: 3,
          nextAllowedAt: null,
        },
        requestId: 'mock-quiz-submit',
      };
    }
    return api.request(`/student/courses/${courseId}/quizzes/${quizId}/submit`, {
      method: 'POST',
      body: { answers },
    });
  },

  async getProgress(courseId: string): Promise<ApiResponse<StudentProgress>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Ringkasan progress belajar',
        data: {
          courseId,
          totalRequiredItems: 5,
          completedItems: 3,
          completionPercentage: 60,
          isEligibleForCertificate: false,
          completedLessonIds: ['les_01_01', 'les_01_02'],
          passedQuizIds: [],
        },
        requestId: 'mock-progress-id',
      };
    }
    const res = await api.request<unknown>(`/student/courses/${courseId}/progress`);
    return { ...res, data: adaptEnrolledProgress(res.data, courseId) };
  },

  async getProgressRequirements(courseId: string): Promise<ApiResponse<{ requiredLessonIds: string[]; requiredQuizIds: string[] }>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Persyaratan kelulusan',
        data: {
          requiredLessonIds: ['les_01_01', 'les_01_02', 'les_01_03', 'les_02_01'],
          requiredQuizIds: ['quiz_01'],
        },
        requestId: 'mock-progress-reqs',
      };
    }
    return api.request(`/student/courses/${courseId}/progress/requirements`);
  },

  async syncProgress(courseId: string): Promise<ApiResponse<StudentProgress>> {
    if (isDevPreviewActive()) {
      return this.getProgress(courseId);
    }
    const res = await api.request<unknown>(`/student/courses/${courseId}/progress/sync`, {
      method: 'POST',
      body: {},
    });
    return { ...res, data: adaptEnrolledProgress(res.data, courseId) };
  },

  async getTemporaryMediaUrl(courseId: string, lessonId: string, kind: 'image' | 'audio'): Promise<ApiResponse<{ url: string; expiresAt: string }>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'URL unduhan media bertanda tangan (berlaku 120 detik)',
        data: {
          url: kind === 'image'
            ? 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80'
            : 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
          expiresAt: new Date(Date.now() + 120 * 1000).toISOString(),
        },
        requestId: 'mock-signed-media',
      };
    }
    return api.request(`/student/courses/${courseId}/lessons/${lessonId}/media/${kind}`);
  },

  // Certificates
  async getCertificates(): Promise<ApiResponse<Certificate[]>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Daftar sertifikat internal',
        data: MOCK_CERTIFICATES,
        requestId: 'mock-cert-list',
      };
    }
    return api.request('/student/certificates');
  },

  async getCertificateEligibility(courseId: string): Promise<ApiResponse<CertificateEligibility>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Kelayakan pengajuan sertifikat',
        data: {
          courseId,
          isEligible: true,
          completionPercentage: 100,
          existingCertificateId: 'cert_01_sample',
          existingCertificateStatus: 'ISSUED',
        },
        requestId: 'mock-cert-eligibility',
      };
    }
    return api.request(`/student/certificates/${courseId}/eligibility`);
  },

  async requestCertificate(courseId: string): Promise<ApiResponse<Certificate>> {
    if (isDevPreviewActive()) {
      const newCert: Certificate = {
        id: 'cert_' + Math.random().toString(36).substring(2, 9),
        certificateNumber: '24I-' + Array.from({ length: 36 }, () => Math.floor(Math.random() * 16).toString(16).toUpperCase()).join(''),
        courseId,
        courseTitle: 'Fullstack TypeScript & REST API Masterclass',
        studentId: 'usr_student_01',
        studentName: 'Ahmad Fikhi',
        status: 'PROCESSING',
        pdfDownloadAvailable: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      MOCK_CERTIFICATES.push(newCert);
      return {
        success: true,
        message: 'Permintaan sertifikat berhasil diajukan. Menunggu verifikasi admin.',
        data: newCert,
        requestId: 'mock-cert-req',
      };
    }
    return api.request(`/student/certificates/${courseId}/request`, {
      method: 'POST',
      body: {},
    });
  },

  async getCertificate(certificateId: string): Promise<ApiResponse<Certificate>> {
    if (isDevPreviewActive()) {
      const found = MOCK_CERTIFICATES.find((c) => c.id === certificateId) || MOCK_CERTIFICATES[0];
      return {
        success: true,
        message: 'Detail sertifikat',
        data: found,
        requestId: 'mock-cert-get',
      };
    }
    return api.request(`/student/certificates/${certificateId}`);
  },

  async downloadCertificatePdf(certificateId: string): Promise<Blob> {
    if (isDevPreviewActive()) {
      // Create a mock PDF blob for testing in browser
      const mockPdfContent = `%PDF-1.4
1 0 obj << /Title (Sertifikat 24Institute) /Author (24Institute) >> endobj
2 0 obj << /Type /Catalog /Pages 3 0 R >> endobj
3 0 obj << /Type /Pages /Kids [4 0 R] /Count 1 >> endobj
4 0 obj << /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >> endobj
5 0 obj << /Length 55 >> stream
BT /F1 24 Tf 100 700 Td (Sertifikat Resmi 24Institute) Tj ET
endstream endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000080 00000 n
0000000127 00000 n
0000000184 00000 n
0000000281 00000 n
trailer << /Size 6 /Root 2 0 R >>
startxref
385
%%EOF`;
      return new Blob([mockPdfContent], { type: 'application/pdf' });
    }
    const res = await api.request<Blob>(`/student/certificates/${certificateId}/pdf`, {
      asBlob: true,
    });
    return res.data;
  },

  // WhatsApp Group Invitations
  async getGeneralWhatsAppGroup(): Promise<ApiResponse<WhatsAppGroupLink>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Tautan resmi komunitas umum WhatsApp',
        data: MOCK_WHATSAPP_GENERAL,
        requestId: 'mock-wa-general',
      };
    }
    return api.request('/student/whatsapp/general');
  },

  async getCourseWhatsAppGroup(courseId: string): Promise<ApiResponse<WhatsAppGroupLink>> {
    if (isDevPreviewActive()) {
      const link = MOCK_WHATSAPP_COURSES[courseId] || {
        type: 'COURSE',
        courseId,
        inviteUrl: 'https://chat.whatsapp.com/CourseDisc24Inst_' + courseId.substring(0, 6),
        isActive: true,
      };
      return {
        success: true,
        message: 'Tautan resmi komunitas kursus WhatsApp',
        data: link,
        requestId: 'mock-wa-course',
      };
    }
    return api.request(`/student/whatsapp/courses/${courseId}`);
  },
};
