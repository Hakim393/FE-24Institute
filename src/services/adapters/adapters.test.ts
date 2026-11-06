import { test } from 'node:test';
import assert from 'node:assert';
import {
  adaptPublicCourseDetail,
  adaptPublicCourseSummary,
  adaptStudentEnrollment,
  adaptAdminDashboardOverview,
  adaptStudentOrderCheckout,
} from './index';

test('adaptPublicCourseDetail correctly parses OpenAPI { course: PublicCourseDetail } response', () => {
  const openApiFixture = {
    course: {
      id: '81fa55e8-540e-436d-b8d4-5332f1807490',
      courseVersionId: 'e2b34a17-3801-4475-bfa3-0f7dc6c9c7e2',
      versionNumber: 1,
      slug: 'fullstack-typescript-masterclass',
      title: 'Fullstack TypeScript Masterclass',
      shortDescription: 'Belajar arsitektur enterprise modern',
      description: 'Kursus mendalam mengenai ekosistem TypeScript dari database hingga web klien.',
      level: 'INTERMEDIATE',
      language: 'id',
      price: '349000.00',
      currency: 'IDR',
      estimatedDurationMinutes: 1200,
      publishedAt: '2026-11-01T12:00:00.000Z',
      status: 'PUBLISHED',
      category: {
        id: '99e6955a-e71e-4509-b7b5-2eb31b26955a',
        name: 'Pengembangan Web',
        slug: 'pengembangan-web',
        isActive: true,
      },
      thumbnail: {
        id: 'img-123',
        url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        originalName: 'cover.jpg',
        mimeType: 'image/jpeg',
        bytes: 1048576,
      },
      instructor: {
        id: 'ins-456',
        fullName: 'Dr. Hendra Gunawan',
        avatarUrl: null,
      },
      contentCounts: {
        chaptersCount: 1,
        lessonsCount: 1,
        quizzesCount: 1,
        questionsCount: 2,
      },
      learningObjectives: ['Menguasai TypeScript', 'Membangun REST API'],
      requirements: ['Dasar JavaScript'],
      targetAudience: ['Junior & Mid Developers'],
      curriculum: {
        chapters: [
          {
            id: 'ch-1',
            title: 'Fondasi Bahasa & Tooling',
            position: 1,
            isRequired: true,
            lessons: [
              {
                id: 'les-1',
                title: 'Konfigurasi tsconfig & Runtime',
                type: 'TEXT',
                position: 1,
                isRequired: true,
                estimatedDurationMinutes: 45,
                textContent: 'Pengantar tsconfig',
              },
            ],
            quiz: {
              id: 'qz-1',
              title: 'Evaluasi Fondasi',
              passingGrade: 80,
              isRequired: true,
              position: 1,
              questions: [
                {
                  id: 'q-1',
                  questionText: 'Apa fungsi flag strict?',
                  explanation: 'Mengaktifkan pemeriksaan ketat tipe.',
                  position: 1,
                  options: [
                    { id: 'opt-1', optionText: 'Pemeriksaan ketat', isCorrect: true, position: 1 },
                    { id: 'opt-2', optionText: 'Tidak ada', isCorrect: false, position: 2 },
                  ],
                },
              ],
            },
          },
        ],
      },
    },
  };

  const adapted = adaptPublicCourseDetail(openApiFixture);
  assert.strictEqual(adapted.id, '81fa55e8-540e-436d-b8d4-5332f1807490');
  assert.strictEqual(adapted.title, 'Fullstack TypeScript Masterclass');
  assert.strictEqual(adapted.thumbnailUrl, 'https://res.cloudinary.com/demo/image/upload/sample.jpg');
  assert.strictEqual(adapted.price, '349000.00');
  assert.strictEqual(adapted.chapters.length, 1);
  assert.strictEqual(adapted.chapters[0].order, 1);
  assert.strictEqual(adapted.chapters[0].lessons[0].order, 1);
  assert.strictEqual(adapted.chapters[0].quizzes.length, 1);
  assert.strictEqual(adapted.chapters[0].quizzes[0].passingGrade, 80);
});

test('adaptPublicCourseSummary extracts shortDescription and thumbnail object properly', () => {
  const summaryFixture = {
    id: 'crs-99',
    courseVersionId: 'ver-99',
    versionNumber: 2,
    slug: 'ai-prompt-engineering',
    title: 'Rekayasa Prompt AI',
    shortDescription: 'Teknik prompt canggih untuk AI',
    level: 'BEGINNER',
    language: 'id',
    price: '275000.00',
    currency: 'IDR',
    estimatedDurationMinutes: 600,
    publishedAt: '2026-11-01T00:00:00.000Z',
    status: 'PUBLISHED',
    category: { id: 'cat-ai', name: 'Data Science & AI', slug: 'data-ai' },
    thumbnail: { url: 'https://example.com/ai.jpg' },
    instructor: { id: 'ins-1', fullName: 'Budi' },
    contentCounts: { chaptersCount: 3, lessonsCount: 10, quizzesCount: 2, questionsCount: 15 },
  };

  const adapted = adaptPublicCourseSummary(summaryFixture);
  assert.strictEqual(adapted.title, 'Rekayasa Prompt AI');
  assert.strictEqual(adapted.thumbnailUrl, 'https://example.com/ai.jpg');
  assert.strictEqual(adapted.description, 'Teknik prompt canggih untuk AI');
});

test('adaptStudentEnrollment handles string progressPercentage and nested course version', () => {
  const enrollmentFixture = {
    id: 'enr-777',
    status: 'ACTIVE',
    progressPercentage: '100.00', // OpenAPI string pattern ^\d{1,3}\.\d{2}$
    enrolledAt: '2026-10-15T08:00:00.000Z',
    completedAt: '2026-11-01T10:00:00.000Z',
    course: {
      id: 'crs-fullstack',
      slug: 'fullstack-typescript-masterclass',
      isActive: true,
      enrolledVersion: {
        id: 'ver-1',
        versionNumber: 1,
        title: 'Fullstack TypeScript Masterclass',
        thumbnailUrl: 'https://example.com/thumb.png',
      },
    },
  };

  const adapted = adaptStudentEnrollment(enrollmentFixture);
  assert.strictEqual(adapted.id, 'enr-777');
  assert.strictEqual(adapted.progressPercentage, 100);
  assert.strictEqual(typeof adapted.progressPercentage, 'number');
  assert.strictEqual(adapted.courseTitle, 'Fullstack TypeScript Masterclass');
  assert.strictEqual(adapted.courseThumbnailUrl, 'https://example.com/thumb.png');
});

test('adaptAdminDashboardOverview parses nested M7AdminDashboardOverview accurately', () => {
  const m7DashboardFixture = {
    users: {
      students: 1350,
      instructors: 48,
    },
    courses: {
      total: 19,
      publishedVersions: 12,
    },
    enrollments: {
      total: 820,
      active: 750,
    },
    payments: {
      paidOrders: 588,
      pendingOrders: 54,
      unknownCheckoutsRequiringReview: 2,
      currency: 'IDR',
      grossCapturedIdr: '205212000.00',
      recordedRefundsIdr: '349000.00',
      netAfterRecordedRefundsIdr: '204863000.00',
      note: 'Angka database terverifikasi',
    },
  };

  const adapted = adaptAdminDashboardOverview(m7DashboardFixture);
  assert.strictEqual(adapted.totalUsers, 1398);
  assert.strictEqual(adapted.totalStudents, 1350);
  assert.strictEqual(adapted.totalInstructors, 48);
  assert.strictEqual(adapted.totalCourses, 19);
  assert.strictEqual(adapted.publishedCourses, 12);
  assert.strictEqual(adapted.draftCourses, undefined); // Not in backend M7 contract
  assert.strictEqual(adapted.paidOrders, 588);
  assert.strictEqual(adapted.grossCapturedIdr, '205212000.00');
  assert.strictEqual(adapted.netCapturedIdr, '204863000.00');
  assert.strictEqual(adapted.users?.students, 1350);
});

test('adaptStudentOrderCheckout extracts token and redirectUrl without fake status', () => {
  const checkoutFixture = {
    orderId: 'ord-abc-123',
    token: 'snap-token-sb-449198',
    redirectUrl: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-sb-449198',
    expiresAt: '2026-11-03T12:00:00.000Z',
  };

  const adapted = adaptStudentOrderCheckout(checkoutFixture);
  assert.strictEqual(adapted.orderId, 'ord-abc-123');
  assert.strictEqual(adapted.token, 'snap-token-sb-449198');
  assert.strictEqual(adapted.redirectUrl, 'https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-sb-449198');
  assert.strictEqual(adapted.expiresAt, '2026-11-03T12:00:00.000Z');
});
