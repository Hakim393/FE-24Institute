/**
 * 24Institute OpenAPI Response Contract Adapters
 * Ensures 100% fidelity between backend responses (B25/B29 OpenAPI snapshot)
 * and frontend component models.
 */

import { Course, Chapter, Lesson, Quiz } from '../../types/course';
import { Enrollment, Order, StudentOrderCheckout } from '../../types/order';
import { AdminDashboardOverview } from '../../types/admin';

/**
 * Mismatch 1 & 2 Adapter: Public Course Detail & Catalog Summaries
 * Backend returns:
 * - GET /public/courses: items adhering to PublicCourseSummary
 * - GET /public/courses/{slug}: data.course adhering to PublicCourseDetail
 */
export function adaptPublicCourseDetail(apiData: any): Course & { chapters: Chapter[] } {
  if (!apiData) {
    throw new Error('Data kursus tidak ditemukan.');
  }

  // Handle both envelope { course: ... } and direct object
  const raw = apiData.course ? apiData.course : apiData;

  const thumbnailUrl =
    typeof raw.thumbnail === 'object' && raw.thumbnail !== null
      ? raw.thumbnail.url || null
      : typeof raw.thumbnailUrl === 'string'
      ? raw.thumbnailUrl
      : null;

  // Extract chapters from curriculum.chapters or chapters array
  const rawChapters = raw.curriculum?.chapters || raw.chapters || [];
  const chapters: Chapter[] = rawChapters.map((ch: any, chIndex: number) => {
    const rawLessons = ch.lessons || [];
    const lessons: Lesson[] = rawLessons.map((l: any, lIndex: number) => ({
      id: l.id,
      chapterId: ch.id,
      title: l.title,
      type: l.type || 'TEXT',
      order: typeof l.position === 'number' ? l.position : typeof l.order === 'number' ? l.order : lIndex + 1,
      isRequired: Boolean(l.isRequired),
      isPreview: l.isPreview === true,
      durationSeconds: (l.estimatedDurationMinutes || 0) * 60,
      textContent: l.textContent || null,
      youtubeVideoId: l.youtubeVideoId || null,
      imageUrl: l.imageMedia?.secureUrl || l.imageUrl || null,
      audioUrl: l.audioMedia?.secureUrl || l.audioUrl || null,
      isCompleted: Boolean(l.isCompleted),
    }));

    // In OpenAPI, chapter has a single quiz object (ch.quiz), or quizzes array
    const rawQuizzes = ch.quizzes ? ch.quizzes : ch.quiz ? [ch.quiz] : [];
    const quizzes: Quiz[] = rawQuizzes.map((q: any, qIndex: number) => ({
      id: q.id,
      chapterId: ch.id,
      title: q.title,
      description: q.description || null,
      passingGrade: q.passingGrade ?? 70,
      isRequired: Boolean(q.isRequired),
      order: typeof q.position === 'number' ? q.position : qIndex + 1,
      totalQuestions: q.questions?.length ?? q.totalQuestions ?? 0,
      questions: q.questions?.map((qu: any, quIndex: number) => ({
        id: qu.id,
        quizId: q.id,
        prompt: qu.questionText || qu.prompt || '',
        explanation: qu.explanation || null,
        order: typeof qu.position === 'number' ? qu.position : quIndex + 1,
        options: (qu.options || []).map((opt: any, optIndex: number) => ({
          id: opt.id,
          questionId: qu.id,
          text: opt.optionText || opt.text || '',
          isCorrect: Boolean(opt.isCorrect),
          order: typeof opt.position === 'number' ? opt.position : optIndex + 1,
        })),
      })),
    }));

    return {
      id: ch.id,
      courseVersionId: raw.courseVersionId || raw.id,
      title: ch.title,
      description: ch.description || null,
      order: typeof ch.position === 'number' ? ch.position : typeof ch.order === 'number' ? ch.order : chIndex + 1,
      isRequired: Boolean(ch.isRequired),
      lessons,
      quizzes,
    };
  });

  const courseResult: Course & { chapters: Chapter[] } = {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    subtitle: raw.shortDescription || raw.subtitle || null,
    description: raw.description || raw.shortDescription || '',
    thumbnailUrl,
    price: String(raw.price || '0.00'),
    currency: raw.currency || 'IDR',
    level: raw.level || 'ALL_LEVELS',
    language: raw.language || 'Bahasa Indonesia',
    categoryId: raw.category?.id || raw.categoryId || '',
    category: raw.category ? {
      id: raw.category.id,
      name: raw.category.name,
      slug: raw.category.slug,
      isActive: raw.category.isActive ?? true,
      createdAt: raw.category.createdAt || new Date().toISOString(),
      updatedAt: raw.category.updatedAt || new Date().toISOString(),
    } : undefined,
    instructorId: raw.instructor?.id || raw.instructorId || '',
    instructor: raw.instructor ? {
      id: raw.instructor.id,
      fullName: raw.instructor.fullName,
      avatarUrl: raw.instructor.avatarUrl || null,
      headline: raw.instructor.headline || null,
      biography: raw.instructor.biography || null,
      expertise: Array.isArray(raw.instructor.expertise) ? raw.instructor.expertise.filter((x: unknown): x is string => typeof x === 'string') : [],
      linkedinUrl: raw.instructor.linkedinUrl || null,
      githubUrl: raw.instructor.githubUrl || null,
      websiteUrl: raw.instructor.websiteUrl || null,
    } : undefined,
    currentDraftVersionId: raw.draftVersionId || null,
    publishedVersionId: raw.courseVersionId || raw.publishedVersionId || null,
    publishedVersion: {
      id: raw.courseVersionId || raw.id,
      courseId: raw.id,
      versionNumber: raw.versionNumber || 1,
      status: 'PUBLISHED',
      title: raw.title,
      subtitle: raw.shortDescription || null,
      description: raw.description || null,
      price: String(raw.price || '0.00'),
      currency: raw.currency || 'IDR',
      level: raw.level || 'ALL_LEVELS',
      language: raw.language || 'Bahasa Indonesia',
      thumbnailUrl,
      learningObjectives: raw.learningObjectives || [],
      requirements: raw.requirements || [],
      targetAudience: raw.targetAudience || [],
      submittedAt: raw.submittedAt || null,
      reviewCount: raw.reviewCount || 0,
      chapters,
      createdAt: raw.publishedAt || raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || new Date().toISOString(),
    },
    chapters,
    createdAt: raw.publishedAt || raw.createdAt || '',
    updatedAt: raw.updatedAt || '',
  };

  return courseResult;
}

export function adaptPublicCourseSummary(item: any): Course {
  const thumbnailUrl =
    typeof item.thumbnail === 'object' && item.thumbnail !== null
      ? item.thumbnail.url || null
      : typeof item.thumbnailUrl === 'string'
      ? item.thumbnailUrl
      : null;

  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    subtitle: item.shortDescription || item.subtitle || null,
    description: item.shortDescription || item.description || '',
    thumbnailUrl,
    price: String(item.price || '0.00'),
    currency: item.currency || 'IDR',
    level: item.level || 'ALL_LEVELS',
    language: item.language || 'Bahasa Indonesia',
    categoryId: item.category?.id || item.categoryId || '',
    category: item.category ? {
      id: item.category.id,
      name: item.category.name,
      slug: item.category.slug,
      isActive: item.category.isActive ?? true,
      createdAt: item.category.createdAt || '',
      updatedAt: item.category.updatedAt || '',
    } : undefined,
    instructorId: item.instructor?.id || item.instructorId || '',
    instructor: item.instructor ? {
      id: item.instructor.id,
      fullName: item.instructor.fullName,
      avatarUrl: item.instructor.avatarUrl || null,
      headline: item.instructor.headline || null,
      biography: item.instructor.biography || null,
      expertise: Array.isArray(item.instructor.expertise) ? item.instructor.expertise.filter((x: unknown): x is string => typeof x === 'string') : [],
      linkedinUrl: item.instructor.linkedinUrl || null,
      githubUrl: item.instructor.githubUrl || null,
      websiteUrl: item.instructor.websiteUrl || null,
    } : undefined,
    publishedVersionId: item.courseVersionId || null,
    createdAt: item.publishedAt || item.createdAt || '',
    updatedAt: item.updatedAt || '',
  };
}

/**
 * Mismatch 3 Adapter: Student Enrollments
 * Backend returns progressPercentage as string (e.g. "100.00") and course as nested object.
 */
export function adaptStudentEnrollment(item: any): Enrollment {
  if (!item || typeof item !== 'object') {
    throw new Error('Respons enrollment tidak valid.');
  }
  if (!['ACTIVE', 'COMPLETED', 'CANCELLED', 'REFUNDED'].includes(item.status)) {
    throw new Error('Status enrollment tidak dikenal atau tidak tersedia.');
  }
  const rawPct = item.progressPercentage;
  const progressNum =
    typeof rawPct === 'number'
      ? rawPct
      : typeof rawPct === 'string' && /^\d{1,3}\.\d{2}$/.test(rawPct)
        ? Number(rawPct)
        : Number.NaN;
  if (!Number.isFinite(progressNum) || progressNum < 0 || progressNum > 100) {
    throw new Error('Persentase progres enrollment tidak valid.');
  }

  const version = item.course?.enrolledVersion || item.course?.currentPublishedVersion;
  const courseTitle =
    version?.title ||
    item.course?.title ||
    item.courseTitle ||
    'Kursus 24Institute';
  const courseThumbnailUrl =
    version?.thumbnailUrl ||
    item.course?.thumbnailUrl ||
    item.courseThumbnailUrl ||
    null;

  return {
    id: item.id,
    studentId: item.studentId || '',
    courseId: item.course?.id || item.courseId || '',
    courseTitle,
    courseThumbnailUrl,
    status: item.status,
    progressPercentage: Math.min(100, Math.max(0, Math.round(progressNum * 100) / 100)),
    enrolledAt: item.enrolledAt || item.createdAt || '',
    completedAt: item.completedAt || null,
  };
}

/**
 * Mismatch 4 Adapter: Admin Dashboard Overview
 * Backend returns nested M7AdminDashboardOverview { users, courses, enrollments, payments }.
 */
export function adaptAdminDashboardOverview(raw: any): AdminDashboardOverview {
  // M7 OpenAPI: all four nested sections and their required fields are mandatory.
  if (!raw || typeof raw !== 'object' || !raw.users || !raw.courses || !raw.enrollments || !raw.payments) {
    throw new Error('Kontrak ringkasan Admin tidak lengkap.');
  }
  const { users, courses, enrollments, payments } = raw;
  const nonNegativeInt = (value: unknown, name: string): number => {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
      throw new Error(`Metrik Admin tidak valid: ${name}`);
    }
    return value;
  };
  const idr = (value: unknown, name: string): string => {
    if (typeof value !== 'string' || !/^-?\d+\.\d{2}$/.test(value)) {
      throw new Error(`Nominal Admin tidak valid: ${name}`);
    }
    return value;
  };
  const students = nonNegativeInt(users.students, 'users.students');
  const instructors = nonNegativeInt(users.instructors, 'users.instructors');
  const courseTotal = nonNegativeInt(courses.total, 'courses.total');
  const publishedVersions = nonNegativeInt(courses.publishedVersions, 'courses.publishedVersions');
  const enrollmentsTotal = nonNegativeInt(enrollments.total, 'enrollments.total');
  const enrollmentsActive = nonNegativeInt(enrollments.active, 'enrollments.active');
  const paid = nonNegativeInt(payments.paidOrders, 'payments.paidOrders');
  const pending = nonNegativeInt(payments.pendingOrders, 'payments.pendingOrders');
  const unknown = nonNegativeInt(payments.unknownCheckoutsRequiringReview, 'payments.unknownCheckoutsRequiringReview');
  if (payments.currency !== 'IDR' || typeof payments.note !== 'string') {
    throw new Error('Mata uang atau keterangan ringkasan Admin tidak valid.');
  }
  const gross = idr(payments.grossCapturedIdr, 'grossCapturedIdr');
  const refunds = idr(payments.recordedRefundsIdr, 'recordedRefundsIdr');
  const net = idr(payments.netAfterRecordedRefundsIdr, 'netAfterRecordedRefundsIdr');
  return {
    // NOT complete totals: these are explicitly labeled as subsets in AdminDashboard.
    totalUsers: students + instructors,
    totalStudents: students,
    totalInstructors: instructors,
    totalCourses: courseTotal,
    publishedCourses: publishedVersions,
    // Number of drafts is not in the M7 backend response; never infer it.
    draftCourses: undefined,
    totalOrders: paid + pending,
    paidOrders: paid,
    grossCapturedIdr: gross,
    netCapturedIdr: net,
    users: { students, instructors },
    courses: { total: courseTotal, publishedVersions },
    enrollments: { total: enrollmentsTotal, active: enrollmentsActive },
    payments: {
      paidOrders: paid,
      pendingOrders: pending,
      unknownCheckoutsRequiringReview: unknown,
      currency: payments.currency,
      grossCapturedIdr: gross,
      recordedRefundsIdr: refunds,
      netAfterRecordedRefundsIdr: net,
      note: payments.note,
    },
  };
}

/**
 * Mismatch 5 Adapter: Student Checkout Response
 * Contract fields: orderId, token, redirectUrl, expiresAt (NO status property!).
 */
export function adaptStudentOrderCheckout(raw: any): StudentOrderCheckout {
  if (!raw || typeof raw.orderId !== 'string' || !raw.orderId.trim()) {
    throw new Error('Respons checkout tidak memiliki orderId yang sah.');
  }
  if (typeof raw.token !== 'string' || !raw.token.trim()) {
    throw new Error('Respons checkout tidak memiliki token Snap yang valid.');
  }
  if (typeof raw.redirectUrl !== 'string' || !/^https:\/\//i.test(raw.redirectUrl)) {
    throw new Error('Respons checkout tidak memiliki URL HTTPS yang valid.');
  }
  if (typeof raw.expiresAt !== 'string' || !Number.isFinite(Date.parse(raw.expiresAt))) {
    throw new Error('Respons checkout tidak memiliki expiresAt yang valid.');
  }
  return {
    orderId: raw.orderId,
    token: raw.token,
    redirectUrl: raw.redirectUrl,
    expiresAt: raw.expiresAt,
  };
}
