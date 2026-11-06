import { isDevPreviewActive } from "./mode";
// 24Institute Instructor Service
// Implements complete Course Authoring Studio: courses CRUD, revisions, submit for review,
// completeness validation, chapters, lessons, quizzes, questions, and answer options.

import { api } from './api';
import { ApiResponse } from '../types/api';
import {
  Course,
  CourseVersion,
  Chapter,
  Lesson,
  Quiz,
  QuizQuestion,
  QuizOption,
  CourseCompleteness,
  CourseLevel,
  LessonType,
} from '../types/course';
import { MOCK_COURSES, MOCK_CURRICULUM_SAMPLE } from './mock-data';
import { adaptInstructorCourse, adaptInstructorCourseEnvelope } from './adapters/instructor-course';
import { adaptInstructorCurriculumEnvelope } from './adapters/instructor-curriculum';
import { adaptInstructorCompletenessEnvelope } from './adapters/instructor-completeness';
import { buildInstructorLessonBody, adaptCreatedLessonEnvelope } from './adapters/instructor-lesson-contract';
import type { InstructorLessonPatch } from './adapters/instructor-lesson-update';
import { requireConfirmedUpdatedLesson } from './adapters/instructor-lesson-update';
import { buildInstructorQuizQuestionBody, buildInstructorQuizOptionBody } from './adapters/instructor-quiz-contract';

export const instructorService = {
  // Course CRUD & Workflow
  async getCourses(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ApiResponse<Course[]>> {
    if (isDevPreviewActive()) {
      let filtered = [...MOCK_COURSES];
      if (params?.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter((c) => c.title.toLowerCase().includes(q) || c.slug.includes(q));
      }
      return {
        success: true,
        message: 'Daftar kursus milik instructor',
        data: filtered,
        requestId: 'mock-inst-courses',
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
    if (params?.status) query.set('status', params.status);
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
    const response = await api.request<unknown>(`/instructor/courses?${query.toString()}`);
    if (!response.success) throw new Error(response.message || 'Daftar course gagal dimuat.');
    if (!Array.isArray(response.data)) throw new Error('Kontrak daftar course backend tidak sesuai.');
    return { ...response, data: response.data.map(adaptInstructorCourse) };
  },

  async getCourse(courseId: string): Promise<ApiResponse<Course>> {
    if (isDevPreviewActive()) {
      const found = MOCK_COURSES.find((c) => c.id === courseId) || MOCK_COURSES[0];
      return {
        success: true,
        message: 'Detail kursus instructor',
        data: found,
        requestId: 'mock-inst-course-get',
      };
    }
    const response = await api.request<unknown>(`/instructor/courses/${courseId}`);
    return adaptInstructorCourseEnvelope(response);
  },

  async createCourse(data: {
    title: string;
    shortDescription: string;
    description: string;
    categoryId: string;
    price: string;
    currency?: string;
    level: CourseLevel;
    language?: string;
  }): Promise<ApiResponse<Course>> {
    if (isDevPreviewActive()) {
      const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const newCourse: Course = {
        id: 'crs_' + Math.random().toString(36).substring(2, 9),
        slug,
        title: data.title,
        subtitle: data.shortDescription,
        description: data.description,
        price: data.price,
        currency: data.currency || 'IDR',
        level: data.level,
        language: data.language || 'id',
        categoryId: data.categoryId,
        instructorId: 'usr_instructor_01',
        currentDraftVersionId: 'ver_draft_' + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      MOCK_COURSES.unshift(newCourse);
      return {
        success: true,
        message: 'Draft kursus berhasil dibuat.',
        data: newCourse,
        requestId: 'mock-create-course',
      };
    }
    const response = await api.request<unknown>('/instructor/courses', {
      method: 'POST',
      body: data,
    });
    return adaptInstructorCourseEnvelope(response);
  },

  async updateDraftCourse(
    courseId: string,
    data: {
      title?: string;
      shortDescription?: string;
      description?: string;
      categoryId?: string;
      price?: string;
      level?: CourseLevel;
      language?: string;
      thumbnailMediaId?: string | null;
      learningObjectives?: string[];
      requirements?: string[];
      targetAudience?: string[];
    }
  ): Promise<ApiResponse<Course>> {
    if (isDevPreviewActive()) {
      const course = MOCK_COURSES.find((c) => c.id === courseId) || MOCK_COURSES[0];
      const { shortDescription, ...otherChanges } = data;
      Object.assign(course, otherChanges, shortDescription === undefined ? {} : { subtitle: shortDescription }, { updatedAt: new Date().toISOString() });
      return {
        success: true,
        message: 'Metadata draft kursus berhasil disimpan.',
        data: course,
        requestId: 'mock-update-draft',
      };
    }
    const response = await api.request<unknown>(`/instructor/courses/${courseId}`, {
      method: 'PATCH',
      body: data,
    });
    return adaptInstructorCourseEnvelope(response);
  },

  async deleteDraftCourse(courseId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    if (isDevPreviewActive()) {
      const idx = MOCK_COURSES.findIndex((c) => c.id === courseId);
      if (idx !== -1) MOCK_COURSES.splice(idx, 1);
      return {
        success: true,
        message: 'Draft kursus berhasil dihapus.',
        data: { deleted: true },
        requestId: 'mock-del-course',
      };
    }
    return api.request(`/instructor/courses/${courseId}`, {
      method: 'DELETE',
    });
  },

  async submitForReview(courseId: string, expectedCourseVersionId: string): Promise<ApiResponse<{ submitted: boolean }>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Kursus berhasil diajukan untuk ditinjau oleh Admin.',
        data: { submitted: true },
        requestId: 'mock-submit-review',
      };
    }
    return api.request(`/instructor/courses/${courseId}/submit-for-review`, {
      method: 'POST',
      body: { expectedCourseVersionId },
    });
  },

  async createRevision(courseId: string, expectedPublishedCourseVersionId: string): Promise<ApiResponse<CourseVersion>> {
    if (isDevPreviewActive()) {
      const newVer: CourseVersion = {
        id: 'ver_rev_' + Date.now(),
        courseId,
        versionNumber: 2,
        status: 'DRAFT',
        title: 'Fullstack TypeScript & REST API Masterclass (Revisi)',
        price: '349000.00',
        currency: 'IDR',
        level: 'INTERMEDIATE',
        language: 'Bahasa Indonesia',
        chapters: MOCK_CURRICULUM_SAMPLE,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return {
        success: true,
        message: 'Draft revisi baru berhasil dibuat dari versi publikasi sebelumnya.',
        data: newVer,
        requestId: 'mock-create-revision',
      };
    }
    return api.request(`/instructor/courses/${courseId}/revisions`, {
      method: 'POST',
      body: { expectedPublishedCourseVersionId },
    });
  },

  // Curriculum & Completeness
  async getCurriculum(courseId: string): Promise<ApiResponse<{ courseId: string; chapters: Chapter[] }>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Curriculum authoring snapshot',
        data: { courseId, chapters: MOCK_CURRICULUM_SAMPLE },
        requestId: 'mock-inst-curriculum',
      };
    }
    const response = await api.request<unknown>(`/instructor/courses/${courseId}/curriculum`);
    if (!response.success) throw new Error(response.message || 'Kurikulum gagal dimuat.');
    return { ...response, data: adaptInstructorCurriculumEnvelope(response.data, courseId) };
  },

  async getCompleteness(courseId: string): Promise<ApiResponse<CourseCompleteness>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Validasi kelengkapan draft kursus',
        data: {
          isComplete: true,
          canSubmit: true,
          totalChapters: 2,
          totalLessons: 5,
          totalQuizzes: 1,
          totalQuestions: 3,
          issues: [],
        },
        requestId: 'mock-completeness',
      };
    }
    const response = await api.request<unknown>(`/instructor/courses/${courseId}/completeness`);
    if (!response.success) throw new Error(response.message || 'Validasi kelengkapan gagal dimuat.');
    return { ...response, data: adaptInstructorCompletenessEnvelope(response.data, courseId) };
  },

  // Chapter Management
  async createChapter(
    courseId: string,
    data: { title: string; description?: string; order?: number; isRequired?: boolean }
  ): Promise<ApiResponse<Chapter>> {
    if (isDevPreviewActive()) {
      const newChap: Chapter = {
        id: 'chap_' + Math.random().toString(36).substring(2, 9),
        courseVersionId: 'ver_01',
        title: data.title,
        description: data.description,
        order: data.order || MOCK_CURRICULUM_SAMPLE.length + 1,
        isRequired: data.isRequired ?? true,
        lessons: [],
        quizzes: [],
      };
      MOCK_CURRICULUM_SAMPLE.push(newChap);
      return {
        success: true,
        message: 'Bab baru berhasil ditambahkan.',
        data: newChap,
        requestId: 'mock-chap-create',
      };
    }
    return api.request(`/instructor/courses/${courseId}/chapters`, {
      method: 'POST',
      body: data,
    });
  },

  async reorderChapters(
    courseId: string,
    chaptersOrder: { chapterId: string; order: number }[]
  ): Promise<ApiResponse<{ reordered: boolean }>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Urutan bab berhasil diperbarui.',
        data: { reordered: true },
        requestId: 'mock-chap-reorder',
      };
    }
    return api.request(`/instructor/courses/${courseId}/chapters/reorder`, {
      method: 'PATCH',
      body: { chapters: chaptersOrder },
    });
  },

  async updateChapter(
    courseId: string,
    chapterId: string,
    data: { title?: string; description?: string; isRequired?: boolean }
  ): Promise<ApiResponse<Chapter>> {
    if (isDevPreviewActive()) {
      const chap = MOCK_CURRICULUM_SAMPLE.find((c) => c.id === chapterId);
      if (chap) Object.assign(chap, data);
      return {
        success: true,
        message: 'Bab berhasil diperbarui.',
        data: chap || MOCK_CURRICULUM_SAMPLE[0],
        requestId: 'mock-chap-update',
      };
    }
    return api.request(`/instructor/courses/${courseId}/chapters/${chapterId}`, {
      method: 'PATCH',
      body: data,
    });
  },

  async deleteChapter(courseId: string, chapterId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    if (isDevPreviewActive()) {
      const idx = MOCK_CURRICULUM_SAMPLE.findIndex((c) => c.id === chapterId);
      if (idx !== -1) MOCK_CURRICULUM_SAMPLE.splice(idx, 1);
      return {
        success: true,
        message: 'Bab berhasil dihapus.',
        data: { deleted: true },
        requestId: 'mock-chap-del',
      };
    }
    return api.request(`/instructor/courses/${courseId}/chapters/${chapterId}`, {
      method: 'DELETE',
    });
  },

  // Lesson Management
  async createLesson(
    courseId: string,
    chapterId: string,
    data: {
      title: string;
      type: LessonType;
      order?: number;
      isRequired?: boolean;
      durationSeconds?: number;
      textContent?: string;
      youtubeUrl?: string;
      imageMediaId?: string;
      audioMediaId?: string;
      imageUrl?: string;
      audioUrl?: string;
    }
  ): Promise<ApiResponse<Lesson>> {
    if (isDevPreviewActive()) {
      const newLesson: Lesson = {
        id: 'les_' + Math.random().toString(36).substring(2, 9),
        chapterId,
        title: data.title,
        type: data.type,
        order: data.order || 1,
        isRequired: data.isRequired ?? true,
        durationSeconds: data.durationSeconds || 300,
        textContent: data.textContent,
        youtubeVideoId: data.type === 'YOUTUBE_VIDEO' && data.youtubeUrl ? new URL(buildInstructorLessonBody(data).youtubeUrl!).searchParams.get('v') : undefined,
        imageUrl: data.imageUrl,
        audioUrl: data.audioUrl,
      };
      const chap = MOCK_CURRICULUM_SAMPLE.find((c) => c.id === chapterId) || MOCK_CURRICULUM_SAMPLE[0];
      chap.lessons.push(newLesson);
      return {
        success: true,
        message: 'Pelajaran berhasil ditambahkan.',
        data: newLesson,
        requestId: 'mock-lesson-create',
      };
    }
    const body = buildInstructorLessonBody(data);
    const response = await api.request<unknown>(`/instructor/courses/${courseId}/chapters/${chapterId}/lessons`, {
      method: 'POST',
      body,
    });
    return adaptCreatedLessonEnvelope(response, chapterId);
  },

  async reorderLessons(
    courseId: string,
    chapterId: string,
    lessonsOrder: { lessonId: string; order: number }[]
  ): Promise<ApiResponse<{ reordered: boolean }>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Urutan pelajaran berhasil disimpan.',
        data: { reordered: true },
        requestId: 'mock-les-reorder',
      };
    }
    return api.request(`/instructor/courses/${courseId}/chapters/${chapterId}/lessons/reorder`, {
      method: 'PATCH',
      body: { lessons: lessonsOrder },
    });
  },

  async updateLesson(
    courseId: string,
    chapterId: string,
    lessonId: string,
    data: InstructorLessonPatch
  ): Promise<ApiResponse<Lesson>> {
    if (isDevPreviewActive()) {
      const chap = MOCK_CURRICULUM_SAMPLE.find((c) => c.id === chapterId) || MOCK_CURRICULUM_SAMPLE[0];
      const lesson = chap.lessons.find((l) => l.id === lessonId);
      if (lesson) {
        if (data.title !== undefined) lesson.title = data.title;
        if (data.textContent !== undefined) lesson.textContent = data.textContent;
        if (data.youtubeUrl !== undefined) {
          lesson.youtubeVideoId = data.youtubeUrl ? new URL(data.youtubeUrl).searchParams.get('v') : null;
        }
      }
      return {
        success: true,
        message: 'Pelajaran berhasil diperbarui.',
        data: lesson || chap.lessons[0],
        requestId: 'mock-les-update',
      };
    }
    const response = await api.request<unknown>(`/instructor/courses/${courseId}/chapters/${chapterId}/lessons/${lessonId}`, {
      method: 'PATCH',
      body: data,
    });
    requireConfirmedUpdatedLesson(response, lessonId, chapterId);
    // The builder refreshes curriculum from the server after successful PATCH.
    return response as ApiResponse<Lesson>;
  },

  /** Set/unset an existing Lesson as the one free course preview. */
  async setLessonPreview(courseId: string, chapterId: string, lessonId: string, isPreview: boolean): Promise<void> {
    if (isDevPreviewActive()) {
      const chapter = MOCK_CURRICULUM_SAMPLE.find((c) => c.id === chapterId);
      const lesson = chapter?.lessons.find((l) => l.id === lessonId);
      if (!lesson) throw new Error('Lesson preview tidak ditemukan pada kurikulum demo.');
      lesson.isPreview = isPreview;
      return;
    }
    const response = await api.request<unknown>(`/instructor/courses/${courseId}/chapters/${chapterId}/lessons/${lessonId}`, {
      method: 'PATCH', body: { isPreview },
    });
    const data = response.data;
    const record = (v: unknown): Record<string, unknown> | null =>
      v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null;
    const lesson = record(record(data)?.lesson);
    if (response.success !== true || !lesson || lesson.id !== lessonId ||
        lesson.chapterId !== chapterId || lesson.isPreview !== isPreview) {
      throw new Error('Status preview belum terkonfirmasi oleh backend. Periksa sebelum retry.');
    }
  },

  async deleteLesson(courseId: string, chapterId: string, lessonId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    if (isDevPreviewActive()) {
      const chap = MOCK_CURRICULUM_SAMPLE.find((c) => c.id === chapterId) || MOCK_CURRICULUM_SAMPLE[0];
      const idx = chap.lessons.findIndex((l) => l.id === lessonId);
      if (idx !== -1) chap.lessons.splice(idx, 1);
      return {
        success: true,
        message: 'Pelajaran berhasil dihapus.',
        data: { deleted: true },
        requestId: 'mock-les-del',
      };
    }
    return api.request(`/instructor/courses/${courseId}/chapters/${chapterId}/lessons/${lessonId}`, {
      method: 'DELETE',
    });
  },

  // Quiz Management
  async createQuiz(
    courseId: string,
    chapterId: string,
    data: { title: string; description?: string; passingGrade?: number; isRequired?: boolean; order?: number }
  ): Promise<ApiResponse<Quiz>> {
    if (isDevPreviewActive()) {
      const newQuiz: Quiz = {
        id: 'quiz_' + Math.random().toString(36).substring(2, 9),
        chapterId,
        title: data.title,
        description: data.description,
        passingGrade: data.passingGrade || 70,
        isRequired: data.isRequired ?? true,
        order: data.order || 1,
        totalQuestions: 0,
        questions: [],
      };
      const chap = MOCK_CURRICULUM_SAMPLE.find((c) => c.id === chapterId) || MOCK_CURRICULUM_SAMPLE[0];
      chap.quizzes.push(newQuiz);
      return {
        success: true,
        message: 'Kuis berhasil dibuat.',
        data: newQuiz,
        requestId: 'mock-quiz-create',
      };
    }
    return api.request(`/instructor/courses/${courseId}/chapters/${chapterId}/quizzes`, {
      method: 'POST',
      body: data,
    });
  },

  async updateQuiz(
    courseId: string,
    chapterId: string,
    quizId: string,
    data: Partial<Quiz>
  ): Promise<ApiResponse<Quiz>> {
    if (isDevPreviewActive()) {
      const chap = MOCK_CURRICULUM_SAMPLE.find((c) => c.id === chapterId) || MOCK_CURRICULUM_SAMPLE[0];
      const quiz = chap.quizzes.find((q) => q.id === quizId);
      if (quiz) Object.assign(quiz, data);
      return {
        success: true,
        message: 'Kuis berhasil diperbarui.',
        data: quiz || chap.quizzes[0],
        requestId: 'mock-quiz-update',
      };
    }
    return api.request(`/instructor/courses/${courseId}/chapters/${chapterId}/quizzes/${quizId}`, {
      method: 'PATCH',
      body: data,
    });
  },

  async deleteQuiz(courseId: string, chapterId: string, quizId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    if (isDevPreviewActive()) {
      const chap = MOCK_CURRICULUM_SAMPLE.find((c) => c.id === chapterId) || MOCK_CURRICULUM_SAMPLE[0];
      const idx = chap.quizzes.findIndex((q) => q.id === quizId);
      if (idx !== -1) chap.quizzes.splice(idx, 1);
      return {
        success: true,
        message: 'Kuis berhasil dihapus.',
        data: { deleted: true },
        requestId: 'mock-quiz-del',
      };
    }
    return api.request(`/instructor/courses/${courseId}/chapters/${chapterId}/quizzes/${quizId}`, {
      method: 'DELETE',
    });
  },

  // Questions
  async createQuizQuestion(
    courseId: string,
    chapterId: string,
    quizId: string,
    data: { prompt: string; explanation?: string; order?: number }
  ): Promise<ApiResponse<QuizQuestion>> {
    if (isDevPreviewActive()) {
      const newQ: QuizQuestion = {
        id: 'q_' + Math.random().toString(36).substring(2, 9),
        quizId,
        prompt: data.prompt,
        explanation: data.explanation,
        order: data.order || 1,
        options: [],
      };
      return {
        success: true,
        message: 'Pertanyaan berhasil ditambahkan.',
        data: newQ,
        requestId: 'mock-question-create',
      };
    }
    return api.request(`/instructor/courses/${courseId}/chapters/${chapterId}/quizzes/${quizId}/questions`, {
      method: 'POST',
      body: buildInstructorQuizQuestionBody(data),
    });
  },

  async reorderQuizQuestions(
    courseId: string,
    chapterId: string,
    quizId: string,
    questionsOrder: { questionId: string; order: number }[]
  ): Promise<ApiResponse<{ reordered: boolean }>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Urutan pertanyaan kuis berhasil diperbarui.',
        data: { reordered: true },
        requestId: 'mock-q-reorder',
      };
    }
    return api.request(`/instructor/courses/${courseId}/chapters/${chapterId}/quizzes/${quizId}/questions/reorder`, {
      method: 'PATCH',
      body: { questions: questionsOrder },
    });
  },

  async updateQuizQuestion(
    courseId: string,
    chapterId: string,
    quizId: string,
    questionId: string,
    data: { prompt?: string; explanation?: string }
  ): Promise<ApiResponse<QuizQuestion>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Pertanyaan kuis berhasil diperbarui.',
        data: {
          id: questionId,
          quizId,
          prompt: data.prompt || 'Soal kuis',
          explanation: data.explanation,
          order: 1,
          options: [],
        },
        requestId: 'mock-q-update',
      };
    }
    return api.request(`/instructor/courses/${courseId}/chapters/${chapterId}/quizzes/${quizId}/questions/${questionId}`, {
      method: 'PATCH',
      body: data,
    });
  },

  async deleteQuizQuestion(
    courseId: string,
    chapterId: string,
    quizId: string,
    questionId: string
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Pertanyaan kuis berhasil dihapus.',
        data: { deleted: true },
        requestId: 'mock-q-del',
      };
    }
    return api.request(`/instructor/courses/${courseId}/chapters/${chapterId}/quizzes/${quizId}/questions/${questionId}`, {
      method: 'DELETE',
    });
  },

  // Options
  async createQuizOption(
    courseId: string,
    chapterId: string,
    quizId: string,
    questionId: string,
    data: { text: string; isCorrect: boolean; order?: number }
  ): Promise<ApiResponse<QuizOption>> {
    if (isDevPreviewActive()) {
      const newOpt: QuizOption = {
        id: 'opt_' + Math.random().toString(36).substring(2, 9),
        questionId,
        text: data.text,
        isCorrect: data.isCorrect,
        order: data.order || 1,
      };
      return {
        success: true,
        message: 'Pilihan jawaban berhasil ditambahkan.',
        data: newOpt,
        requestId: 'mock-opt-create',
      };
    }
    return api.request(
      `/instructor/courses/${courseId}/chapters/${chapterId}/quizzes/${quizId}/questions/${questionId}/options`,
      {
        method: 'POST',
        body: buildInstructorQuizOptionBody(data),
      }
    );
  },

  async reorderQuizOptions(
    courseId: string,
    chapterId: string,
    quizId: string,
    questionId: string,
    optionsOrder: { optionId: string; order: number }[]
  ): Promise<ApiResponse<{ reordered: boolean }>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Urutan opsi jawaban diperbarui.',
        data: { reordered: true },
        requestId: 'mock-opt-reorder',
      };
    }
    return api.request(
      `/instructor/courses/${courseId}/chapters/${chapterId}/quizzes/${quizId}/questions/${questionId}/options/reorder`,
      {
        method: 'PATCH',
        body: { options: optionsOrder },
      }
    );
  },

  async updateQuizOption(
    courseId: string,
    chapterId: string,
    quizId: string,
    questionId: string,
    optionId: string,
    data: { text?: string; isCorrect?: boolean }
  ): Promise<ApiResponse<QuizOption>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Pilihan jawaban berhasil disimpan.',
        data: {
          id: optionId,
          questionId,
          text: data.text || 'Opsi',
          isCorrect: data.isCorrect ?? false,
          order: 1,
        },
        requestId: 'mock-opt-update',
      };
    }
    return api.request(
      `/instructor/courses/${courseId}/chapters/${chapterId}/quizzes/${quizId}/questions/${questionId}/options/${optionId}`,
      {
        method: 'PATCH',
        body: data,
      }
    );
  },

  async deleteQuizOption(
    courseId: string,
    chapterId: string,
    quizId: string,
    questionId: string,
    optionId: string
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    if (isDevPreviewActive()) {
      return {
        success: true,
        message: 'Pilihan jawaban berhasil dihapus.',
        data: { deleted: true },
        requestId: 'mock-opt-del',
      };
    }
    return api.request(
      `/instructor/courses/${courseId}/chapters/${chapterId}/quizzes/${quizId}/questions/${questionId}/options/${optionId}`,
      {
        method: 'DELETE',
      }
    );
  },
};
