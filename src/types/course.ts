export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL_LEVELS';

export type CourseVersionStatus = 'DRAFT' | 'SUBMITTED' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'PUBLISHED' | 'ARCHIVED';

export type LessonType = 'TEXT' | 'IMAGE' | 'AUDIO' | 'YOUTUBE_VIDEO' | 'MIXED';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isActive: boolean;
  coursesCount?: number;
  createdAt: string;
  updatedAt: string;
}

/** Shape of GET /api/v1/public/categories (distinct from admin Category). */
export interface PublicCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  publishedCourseCount: number;
}

export interface QuizOption {
  id: string;
  questionId: string;
  text: string;
  isCorrect?: boolean; // Only present in authoring, NOT in student quiz!
  order: number;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  prompt: string;
  explanation?: string | null;
  order: number;
  options: QuizOption[];
}

export interface Quiz {
  id: string;
  chapterId: string;
  title: string;
  description?: string | null;
  passingGrade: number; // percentage (e.g. 70)
  isRequired: boolean;
  order: number;
  questions?: QuizQuestion[];
  totalQuestions?: number;
  /** Latest graded attempt for the authenticated enrollment, never the answer key. */
  latestResult?: { score: number; status: 'PASSED' | 'FAILED'; attemptNumber: number } | null;
  /** Server-authoritative remedial eligibility; all attempts remain persisted. */
  retry?: { canRetry: boolean; failedAttemptCount: number; remainingSeconds: number; nextAllowedAt: string | null } | null;
  /** Backend-only official completion prerequisite; never derived from advisory viewing percentage. */
  access?: {
    canAttempt: boolean;
    totalRequiredLessons: number;
    completedRequiredLessons: number;
    remainingRequiredLessons: number;
    totalPriorQuizzes: number;
    passedPriorQuizzes: number;
    remainingPriorQuizzes: number;
    blockedByQuizId: string | null;
  } | null;
}

export interface LessonMedia {
  id: string;
  lessonId: string;
  kind: 'IMAGE' | 'AUDIO';
  url: string;
  expiresAt?: string;
}

export interface Lesson {
  canvasDocument?: import('../utils/lesson-canvas-draft').CanvasNode | null;
  id: string;
  chapterId: string;
  title: string;
  type: LessonType;
  order: number;
  isRequired: boolean;
  isPreview?: boolean;
  durationSeconds?: number | null;
  textContent?: string | null;
  youtubeVideoId?: string | null;
  imageUrl?: string | null;
  audioUrl?: string | null;
  /** Server entitlement-scoped flags only; never raw Cloudinary URLs or media IDs. */
  media?: {
    hasImage: boolean;
    hasAudio: boolean;
    delivery: 'REQUEST_VIA_STUDENT_MEDIA_ENDPOINT' | 'NONE';
  };
  isCompleted?: boolean;
}

export interface Chapter {
  id: string;
  courseVersionId: string;
  title: string;
  description?: string | null;
  order: number;
  isRequired: boolean;
  lessons: Lesson[];
  quizzes: Quiz[];
}

export interface CourseCompletenessIssue {
  code: string;
  message: string;
  entityType: string; // Backend can return COURSE_VERSION, COURSE, CHAPTER, etc.
  entityId?: string;
}

export interface CourseCompleteness {
  isComplete: boolean;
  canSubmit: boolean;
  totalChapters: number;
  totalLessons: number;
  totalQuizzes: number;
  totalQuestions: number;
  issues: CourseCompletenessIssue[];
}

export interface CourseVersion {
  id: string;
  courseId: string;
  versionNumber: number;
  status: CourseVersionStatus;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  price: string; // decimal string IDR
  currency: string;
  level: CourseLevel;
  language: string;
  thumbnailUrl?: string | null;
  learningObjectives?: string[] | null;
  requirements?: string[] | null;
  targetAudience?: string[] | null;
  submittedAt?: string | null;
  reviewCount?: number;
  latestReviewNotes?: string | null;
  reviewerNotes?: string | null;
  chapters?: Chapter[];
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  thumbnailUrl?: string | null;
  price: string;
  currency: string;
  level: CourseLevel;
  language: string;
  categoryId: string;
  category?: Category;
  instructorId: string;
  instructor?: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
    headline?: string | null;
    biography?: string | null;
    expertise?: string[];
    linkedinUrl?: string | null;
    githubUrl?: string | null;
    websiteUrl?: string | null;
  };
  currentDraftVersionId?: string | null;
  publishedVersionId?: string | null;
  draftVersion?: CourseVersion | null;
  publishedVersion?: CourseVersion | null;
  status?: CourseVersionStatus;
  versions?: CourseVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface StudentProgress {
  courseId: string;
  totalRequiredItems: number;
  completedItems: number;
  completionPercentage: number;
  isEligibleForCertificate: boolean;
  completedLessonIds: string[];
  passedQuizIds: string[];
  lastAccessedAt?: string;
}

export interface QuizSubmitAnswer {
  questionId: string;
  selectedOptionId: string;
}

export interface QuizSubmitResult {
  quizId?: string;
  attemptNumber?: number;
  status: 'PASSED' | 'FAILED';
  score: number;
  passingGrade: number;
  correctAnswers: number;
  totalQuestions: number;
  nextAllowedAt?: string | null;
  retryAfterSeconds?: number;
  passed?: boolean;
  attemptsUsed?: number;
  maxAttempts?: number;
}
