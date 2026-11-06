import { UserRole, AccountStatus } from './api';
import { CourseLevel, CourseVersionStatus } from './course';

export interface AdminDashboardOverview {
  totalUsers: number;
  totalStudents: number;
  totalInstructors: number;
  totalAdmins?: number;
  totalCourses: number;
  publishedCourses: number;
  draftCourses?: number;
  submittedReviews?: number;
  totalOrders: number;
  paidOrders: number;
  totalCertificatesIssued?: number;
  pendingCertificateRequests?: number;
  pendingCertificateReviews?: number;
  totalCategories?: number;
  grossCapturedIdr?: string;
  netCapturedIdr?: string;
  users?: {
    students: number;
    instructors: number;
  };
  courses?: {
    total: number;
    publishedVersions: number;
  };
  enrollments?: {
    total: number;
    active: number;
  };
  payments?: {
    paidOrders: number;
    pendingOrders: number;
    unknownCheckoutsRequiringReview: number;
    currency: string;
    grossCapturedIdr: string;
    recordedRefundsIdr: string;
    netAfterRecordedRefundsIdr: string;
    note: string;
  };
}

export interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  lockedUsers: number;
  roleDistribution: Record<UserRole, number>;
  verifiedEmailsCount: number;
}

export interface CategoryStatistics {
  totalCategories: number;
  activeCategories: number;
  inactiveCategories: number;
  totalCoursesAssigned: number;
}

export interface CourseReviewDecisionInput {
  decision: 'APPROVED' | 'REJECTED' | 'REQUEST_CHANGES';
  expectedSubmittedAt: string;
  expectedReviewCount: number;
  notes?: string;
}

export interface CourseReviewVersionDetail {
  id: string;
  courseId: string;
  versionNumber: number;
  status: CourseVersionStatus;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  price: string;
  currency: string;
  level: CourseLevel;
  language: string;
  submittedAt: string;
  reviewCount: number;
  reviewerNotes?: string | null;
  instructor: {
    id: string;
    fullName: string;
    email: string;
  };
  chapters: any[];
}

export interface MediaItem {
  id: string;
  purpose: 'COURSE_THUMBNAIL' | 'LESSON_IMAGE' | 'LESSON_AUDIO' | 'CERTIFICATE';
  resourceType: 'IMAGE' | 'AUDIO' | 'DOCUMENT';
  filename: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  isDeleted: boolean;
  uploadedById: string;
  uploadedByName?: string;
  createdAt: string;
}

export interface MediaStatistics {
  totalItems: number;
  totalStorageBytes: number;
  byPurpose: Record<string, number>;
  byType: Record<string, number>;
}

export interface WhatsAppGroupLink {
  type: 'GENERAL' | 'COURSE';
  courseId?: string;
  inviteUrl: string;
  isActive: boolean;
  updatedAt?: string;
}

export interface PremiumExposure {
  totalProtectedLessons: number;
  totalSignedUrlsGenerated24h: number;
  activeExpiringUrlsCount: number;
}

export interface PremiumAssetInventory {
  totalAssets: number;
  imagesCount: number;
  audiosCount: number;
  orphanedAssetsCount: number;
}
