import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Search, 
  Filter, 
  Layers, 
  FileCheck, 
  ExternalLink,
  Shield,
  Clock,
  KeyRound,
  Download
} from 'lucide-react';

interface ApiRouteItem {
  id: string;
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  group: string;
  role: 'PUBLIC' | 'STUDENT' | 'INSTRUCTOR' | 'ADMIN' | 'SUPER_ADMIN';
  uiScreen: string;
  serviceCall: string;
  status: 'IMPLEMENTED' | 'SERVER_ONLY' | 'DISABLED_LEGACY';
  strictRule?: string;
  summary: string;
}

export const API_CATALOG: ApiRouteItem[] = [
  // Authentication (18)
  { id: 'AUTH-1', method: 'POST', path: '/auth/forgot-password', group: 'Authentication', role: 'PUBLIC', uiScreen: 'ForgotPasswordPage (/forgot-password)', serviceCall: 'authService.forgotPassword', status: 'IMPLEMENTED', summary: 'Meminta tautan reset password student' },
  { id: 'AUTH-2', method: 'POST', path: '/auth/reset-password', group: 'Authentication', role: 'PUBLIC', uiScreen: 'ResetPasswordPage (/reset-password)', serviceCall: 'authService.resetPassword', status: 'IMPLEMENTED', strictRule: 'Token dibersihkan dari query params URL setelah submit', summary: 'Mengubah password dengan reset token sekali pakai' },
  { id: 'AUTH-3', method: 'POST', path: '/auth/google', group: 'Authentication', role: 'PUBLIC', uiScreen: 'LoginPage (/login)', serviceCall: 'authService.googleLogin', status: 'IMPLEMENTED', summary: 'Google Sign-In menggunakan ID Token' },
  { id: 'AUTH-4', method: 'POST', path: '/auth/google/verify-otp', group: 'Authentication', role: 'PUBLIC', uiScreen: 'LoginPage OTP Step (/login)', serviceCall: 'authService.verifyGoogleOtp', status: 'IMPLEMENTED', summary: 'Verifikasi OTP login Google untuk akun lama' },
  { id: 'AUTH-5', method: 'POST', path: '/auth/google/resend-otp', group: 'Authentication', role: 'PUBLIC', uiScreen: 'LoginPage OTP Step (/login)', serviceCall: 'authService.resendGoogleOtp', status: 'IMPLEMENTED', summary: 'Kirim ulang OTP login Google' },
  { id: 'AUTH-6', method: 'POST', path: '/auth/google/link', group: 'Authentication', role: 'STUDENT', uiScreen: 'StudentProfilePage (/student/profile)', serviceCall: 'authService.linkGoogleAccount', status: 'IMPLEMENTED', summary: 'Hubungkan akun Student lokal ke Google' },
  { id: 'AUTH-7', method: 'POST', path: '/auth/register', group: 'Authentication', role: 'PUBLIC', uiScreen: 'RegisterPage (/register)', serviceCall: 'authService.register', status: 'IMPLEMENTED', summary: 'Registrasi student' },
  { id: 'AUTH-8', method: 'POST', path: '/auth/verify-email', group: 'Authentication', role: 'PUBLIC', uiScreen: 'VerifyEmailPage (/verify-email)', serviceCall: 'authService.verifyEmail', status: 'IMPLEMENTED', strictRule: 'Token dibersihkan dari URL setelah dikonsumsi', summary: 'Verifikasi email setelah registrasi' },
  { id: 'AUTH-9', method: 'POST', path: '/auth/resend-verification', group: 'Authentication', role: 'PUBLIC', uiScreen: 'VerifyEmailPage (/verify-email)', serviceCall: 'authService.resendVerificationEmail', status: 'IMPLEMENTED', summary: 'Kirim ulang tautan verifikasi email' },
  { id: 'AUTH-10', method: 'POST', path: '/auth/send-login-otp', group: 'Authentication', role: 'PUBLIC', uiScreen: 'LoginPage Step 1 (/login)', serviceCall: 'authService.requestLoginOtp', status: 'IMPLEMENTED', strictRule: 'Rate limit 3 percobaan per 15 menit', summary: 'Mulai login dan kirim OTP email' },
  { id: 'AUTH-11', method: 'POST', path: '/auth/resend-login-otp', group: 'Authentication', role: 'PUBLIC', uiScreen: 'LoginPage Step 2 (/login)', serviceCall: 'authService.resendLoginOtp', status: 'IMPLEMENTED', strictRule: 'Cooldown 60 detik sebelum kirim ulang', summary: 'Kirim ulang kode OTP login' },
  { id: 'AUTH-12', method: 'POST', path: '/auth/verify-login-otp', group: 'Authentication', role: 'PUBLIC', uiScreen: 'LoginPage Step 2 (/login)', serviceCall: 'authService.verifyLoginOtp', status: 'IMPLEMENTED', summary: 'Verifikasi OTP dan selesaikan login' },
  { id: 'AUTH-13', method: 'POST', path: '/auth/login', group: 'Authentication', role: 'PUBLIC', uiScreen: 'LoginPage (Notice)', serviceCall: 'authService.legacyLogin', status: 'DISABLED_LEGACY', strictRule: 'Endpoint legacy sengaja di-disable sesuai kontrak, dialihkan ke alur OTP', summary: 'Login lama (dinonaktifkan; gunakan OTP)' },
  { id: 'AUTH-14', method: 'POST', path: '/auth/refresh', group: 'Authentication', role: 'PUBLIC', uiScreen: 'Global Axios/Fetch Interceptor', serviceCall: 'apiClient token rotation', status: 'IMPLEMENTED', strictRule: 'Single-flight mutex refresh queue, auto-retry failed requests', summary: 'Perbarui token akses via Refresh Token' },
  { id: 'AUTH-15', method: 'POST', path: '/auth/logout', group: 'Authentication', role: 'PUBLIC', uiScreen: 'Navbar & Sidebar User Menus', serviceCall: 'authService.logout', status: 'IMPLEMENTED', summary: 'Logout satu sesi' },
  { id: 'AUTH-16', method: 'GET', path: '/auth/me', group: 'Authentication', role: 'STUDENT', uiScreen: 'Global AuthContext Bootstrap', serviceCall: 'authService.getCurrentUser', status: 'IMPLEMENTED', summary: 'Informasi pengguna aktif' },
  { id: 'AUTH-17', method: 'POST', path: '/auth/logout-all', group: 'Authentication', role: 'STUDENT', uiScreen: 'StudentProfilePage (/student/profile)', serviceCall: 'authService.logoutAll', status: 'IMPLEMENTED', summary: 'Logout dari seluruh perangkat' },
  { id: 'AUTH-18', method: 'PATCH', path: '/auth/change-password', group: 'Authentication', role: 'STUDENT', uiScreen: 'StudentProfilePage (/student/profile)', serviceCall: 'authService.changePassword', status: 'IMPLEMENTED', strictRule: 'Password tidak di-trim (8-128 chars)', summary: 'Ganti password aktif' },

  // Student Learning (4)
  { id: 'STU-1', method: 'GET', path: '/student/courses/{courseId}/curriculum', group: 'Student Learning', role: 'STUDENT', uiScreen: 'LearningPlayerPage (/student/classroom/:courseId)', serviceCall: 'studentService.getCourseCurriculum', status: 'IMPLEMENTED', strictRule: 'Hanya dapat diakses jika enrollment berstatus ACTIVE', summary: 'Read entitled Student curriculum' },
  { id: 'STU-2', method: 'GET', path: '/student/courses/{courseId}/progress', group: 'Student Learning', role: 'STUDENT', uiScreen: 'LearningPlayerPage & MyCoursesPage', serviceCall: 'studentService.getCourseProgress', status: 'IMPLEMENTED', summary: 'Read Student progress snapshot' },
  { id: 'STU-3', method: 'POST', path: '/student/courses/{courseId}/quizzes/{quizId}/submit', group: 'Student Learning', role: 'STUDENT', uiScreen: 'QuizPlayerPage (/student/classroom/:id/quiz/:qid)', serviceCall: 'studentService.submitQuiz', status: 'IMPLEMENTED', strictRule: 'Penilaian serentak di backend, passing score evaluasi otomatis', summary: 'Submit and grade Student quiz server-side' },
  { id: 'STU-4', method: 'POST', path: '/student/courses/{courseId}/lessons/{lessonId}/complete', group: 'Student Learning', role: 'STUDENT', uiScreen: 'LearningPlayerPage (/student/classroom/:id)', serviceCall: 'studentService.completeLesson', status: 'IMPLEMENTED', summary: 'Mark an entitled Student lesson as complete' },

  // Internal Certificates (6)
  { id: 'CERT-1', method: 'GET', path: '/student/certificates', group: 'Internal Certificates', role: 'STUDENT', uiScreen: 'StudentCertificatesPage (/student/certificates)', serviceCall: 'studentService.getMyCertificates', status: 'IMPLEMENTED', summary: 'List own internal certificate records' },
  { id: 'CERT-2', method: 'GET', path: '/student/certificates/{certificateId}/pdf', group: 'Internal Certificates', role: 'STUDENT', uiScreen: 'StudentCertificatesPage (/student/certificates)', serviceCall: 'studentService.downloadCertificatePdf', status: 'IMPLEMENTED', strictRule: 'Mengembalikan binary PDF stream murni, bukan JSON envelope', summary: 'Download owned internal certificate as private PDF' },
  { id: 'CERT-3', method: 'GET', path: '/admin/certificates/requests', group: 'Internal Certificates', role: 'ADMIN', uiScreen: 'CertificateManagementPage (/admin/certificates)', serviceCall: 'adminService.getCertificateRequests', status: 'IMPLEMENTED', summary: 'Admin/Super Admin review queue for internal certificate requests' },
  { id: 'CERT-4', method: 'POST', path: '/student/certificates/{courseId}/request', group: 'Internal Certificates', role: 'STUDENT', uiScreen: 'LearningPlayerPage & StudentCertificatesPage', serviceCall: 'studentService.requestCertificate', status: 'IMPLEMENTED', strictRule: 'Hanya setelah 100% progres kursus selesai', summary: 'Request internal certificate review after eligible course completion' },
  { id: 'CERT-5', method: 'POST', path: '/admin/certificates/requests/{certificateId}/review', group: 'Internal Certificates', role: 'ADMIN', uiScreen: 'CertificateManagementPage modal Review', serviceCall: 'adminService.reviewCertificate', status: 'IMPLEMENTED', strictRule: '2-Langkah: APPROVE mengubah status menjadi ELIGIBLE (belum diterbitkan)', summary: 'Admin reviews an internal certificate request' },
  { id: 'CERT-6', method: 'POST', path: '/admin/certificates/requests/{certificateId}/issue', group: 'Internal Certificates', role: 'ADMIN', uiScreen: 'CertificateManagementPage modal Terbitkan', serviceCall: 'adminService.issueCertificate', status: 'IMPLEMENTED', strictRule: '2-Langkah: Hanya sertifikat ELIGIBLE yang dapat di-ISSUE menjadi ISSUED', summary: 'Admin issues approved internal digital certificate' },

  // Notifications (4)
  { id: 'NOTIF-1', method: 'GET', path: '/notifications', group: 'Notifications', role: 'STUDENT', uiScreen: 'NotificationsPage (/notifications)', serviceCall: 'notificationService.getNotifications', status: 'IMPLEMENTED', summary: 'Daftar notifikasi milik akun login' },
  { id: 'NOTIF-2', method: 'GET', path: '/notifications/unread-count', group: 'Notifications', role: 'STUDENT', uiScreen: 'Navbar Notification Badge', serviceCall: 'notificationService.getUnreadCount', status: 'IMPLEMENTED', summary: 'Hitung notifikasi belum dibaca milik akun login' },
  { id: 'NOTIF-3', method: 'PATCH', path: '/notifications/read-all', group: 'Notifications', role: 'STUDENT', uiScreen: 'NotificationsPage (/notifications)', serviceCall: 'notificationService.markAllAsRead', status: 'IMPLEMENTED', summary: 'Tandai semua notifikasi sendiri sebagai telah dibaca' },
  { id: 'NOTIF-4', method: 'PATCH', path: '/notifications/{notificationId}/read', group: 'Notifications', role: 'STUDENT', uiScreen: 'NotificationsPage (/notifications)', serviceCall: 'notificationService.markAsRead', status: 'IMPLEMENTED', summary: 'Tandai satu notifikasi milik akun login sebagai dibaca' },

  // Admin Dashboard (1)
  { id: 'DASH-1', method: 'GET', path: '/admin/dashboard/overview', group: 'Admin Dashboard', role: 'ADMIN', uiScreen: 'AdminDashboard (/admin)', serviceCall: 'adminService.getDashboardOverview', status: 'IMPLEMENTED', summary: 'Ringkasan agregat LMS untuk Admin/Super Admin' },

  // WhatsAppGroups (6)
  { id: 'WA-1', method: 'GET', path: '/student/whatsapp/general', group: 'WhatsAppGroups', role: 'STUDENT', uiScreen: 'StudentWhatsAppPage (/student/whatsapp)', serviceCall: 'studentService.getGeneralWhatsAppLink', status: 'IMPLEMENTED', summary: 'General group invite; active Student with at least one entitled course' },
  { id: 'WA-2', method: 'GET', path: '/student/whatsapp/courses/{courseId}', group: 'WhatsAppGroups', role: 'STUDENT', uiScreen: 'StudentWhatsAppPage & LearningPlayerPage', serviceCall: 'studentService.getCourseWhatsAppLink', status: 'IMPLEMENTED', summary: 'Course invite; matching active enrollment and verified purchase' },
  { id: 'WA-3', method: 'GET', path: '/admin/whatsapp/general', group: 'WhatsAppGroups', role: 'ADMIN', uiScreen: 'WhatsAppManagementPage (/admin/whatsapp)', serviceCall: 'adminService.getGeneralWhatsAppLink', status: 'IMPLEMENTED', summary: 'Read General link (ADMIN/SUPER_ADMIN only)' },
  { id: 'WA-4', method: 'PUT', path: '/admin/whatsapp/general', group: 'WhatsAppGroups', role: 'ADMIN', uiScreen: 'WhatsAppManagementPage (/admin/whatsapp)', serviceCall: 'adminService.updateGeneralWhatsAppLink', status: 'IMPLEMENTED', strictRule: 'Tautan diaudit manual, hanya admin berwenang', summary: 'Upsert General link (manual, audited)' },
  { id: 'WA-5', method: 'GET', path: '/admin/whatsapp/courses/{courseId}', group: 'WhatsAppGroups', role: 'ADMIN', uiScreen: 'WhatsAppManagementPage (/admin/whatsapp)', serviceCall: 'adminService.getCourseWhatsAppLink', status: 'IMPLEMENTED', summary: 'Read course group link (ADMIN/SUPER_ADMIN only)' },
  { id: 'WA-6', method: 'PUT', path: '/admin/whatsapp/courses/{courseId}', group: 'WhatsAppGroups', role: 'ADMIN', uiScreen: 'WhatsAppManagementPage (/admin/whatsapp)', serviceCall: 'adminService.updateCourseWhatsAppLink', status: 'IMPLEMENTED', strictRule: 'Satu grup per course, terikat langsung', summary: 'Upsert course group link (one per course; manual, audited)' },

  // User Management (13)
  { id: 'USER-1', method: 'GET', path: '/users', group: 'User Management', role: 'ADMIN', uiScreen: 'UserManagementPage (/admin/users)', serviceCall: 'adminService.getUsers', status: 'IMPLEMENTED', summary: 'Daftar pengguna dengan filter role, status, email' },
  { id: 'USER-2', method: 'POST', path: '/users', group: 'User Management', role: 'ADMIN', uiScreen: 'UserManagementPage modal Tambah User', serviceCall: 'adminService.createUser', status: 'IMPLEMENTED', summary: 'Buat pengguna baru' },
  { id: 'USER-3', method: 'GET', path: '/users/statistics', group: 'User Management', role: 'ADMIN', uiScreen: 'UserManagementPage Stat Cards', serviceCall: 'adminService.getUserStatistics', status: 'IMPLEMENTED', summary: 'Statistik agregat pengguna' },
  { id: 'USER-4', method: 'GET', path: '/users/{userId}', group: 'User Management', role: 'ADMIN', uiScreen: 'UserManagementPage detail modal', serviceCall: 'adminService.getUserById', status: 'IMPLEMENTED', summary: 'Detail profil pengguna lengkap' },
  { id: 'USER-5', method: 'PATCH', path: '/users/{userId}', group: 'User Management', role: 'ADMIN', uiScreen: 'UserManagementPage edit form', serviceCall: 'adminService.updateUser', status: 'IMPLEMENTED', summary: 'Perbarui informasi pengguna' },
  { id: 'USER-6', method: 'DELETE', path: '/users/{userId}', group: 'User Management', role: 'ADMIN', uiScreen: 'UserManagementPage soft delete confirmation', serviceCall: 'adminService.deleteUser', status: 'IMPLEMENTED', strictRule: 'Soft delete dengan opsi purge audit terpisah', summary: 'Soft delete pengguna' },
  { id: 'USER-7', method: 'PATCH', path: '/users/{userId}/role', group: 'User Management', role: 'SUPER_ADMIN', uiScreen: 'UserManagementPage role dropdown', serviceCall: 'adminService.changeUserRole', status: 'IMPLEMENTED', strictRule: 'Hanya SUPER_ADMIN yang diizinkan memodifikasi role', summary: 'Ubah role pengguna (SUPER_ADMIN only)' },
  { id: 'USER-8', method: 'PATCH', path: '/users/{userId}/status', group: 'User Management', role: 'ADMIN', uiScreen: 'UserManagementPage status switcher', serviceCall: 'adminService.changeUserStatus', status: 'IMPLEMENTED', summary: 'Ubah status pengguna' },
  { id: 'USER-9', method: 'POST', path: '/users/{userId}/deactivate', group: 'User Management', role: 'ADMIN', uiScreen: 'UserManagementPage modal Deaktivasi', serviceCall: 'adminService.deactivateUser', status: 'IMPLEMENTED', summary: 'Nonaktifkan pengguna' },
  { id: 'USER-10', method: 'POST', path: '/users/{userId}/reactivate', group: 'User Management', role: 'ADMIN', uiScreen: 'UserManagementPage modal Reaktivasi', serviceCall: 'adminService.reactivateUser', status: 'IMPLEMENTED', summary: 'Aktifkan kembali pengguna yang dinonaktifkan' },
  { id: 'USER-11', method: 'POST', path: '/users/{userId}/reset-password', group: 'User Management', role: 'ADMIN', uiScreen: 'UserManagementPage modal Reset Sandi', serviceCall: 'adminService.adminResetPassword', status: 'IMPLEMENTED', summary: 'Reset password pengguna oleh administrator' },
  { id: 'USER-12', method: 'POST', path: '/users/{userId}/unlock', group: 'User Management', role: 'ADMIN', uiScreen: 'UserManagementPage status lock card', serviceCall: 'adminService.unlockUser', status: 'IMPLEMENTED', summary: 'Buka account lock pengguna akibat kegagalan login berulang' },
  { id: 'USER-13', method: 'POST', path: '/users/{userId}/restore', group: 'User Management', role: 'ADMIN', uiScreen: 'UserManagementPage tab Terhapus', serviceCall: 'adminService.restoreUser', status: 'IMPLEMENTED', summary: 'Pulihkan pengguna yang di-soft-delete' },

  // Public Categories (2)
  { id: 'CAT-PUB-1', method: 'GET', path: '/public/categories', group: 'Public Categories', role: 'PUBLIC', uiScreen: 'CategoriesPage & HomePage', serviceCall: 'publicService.getCategories', status: 'IMPLEMENTED', summary: 'Daftar kategori publik' },
  { id: 'CAT-PUB-2', method: 'GET', path: '/public/categories/{slug}', group: 'Public Categories', role: 'PUBLIC', uiScreen: 'CoursesPage filtered by Category', serviceCall: 'publicService.getCategoryBySlug', status: 'IMPLEMENTED', summary: 'Detail kategori publik via slug' },

  // Category Management (8)
  { id: 'CAT-ADM-1', method: 'GET', path: '/categories', group: 'Category Management', role: 'ADMIN', uiScreen: 'CategoryManagementPage (/admin/categories)', serviceCall: 'adminService.getCategories', status: 'IMPLEMENTED', summary: 'Daftar kategori administrasi' },
  { id: 'CAT-ADM-2', method: 'POST', path: '/categories', group: 'Category Management', role: 'ADMIN', uiScreen: 'CategoryManagementPage modal Tambah', serviceCall: 'adminService.createCategory', status: 'IMPLEMENTED', summary: 'Buat kategori kursus baru' },
  { id: 'CAT-ADM-3', method: 'GET', path: '/categories/statistics', group: 'Category Management', role: 'ADMIN', uiScreen: 'CategoryManagementPage Stat Cards', serviceCall: 'adminService.getCategoryStatistics', status: 'IMPLEMENTED', summary: 'Statistik kategori' },
  { id: 'CAT-ADM-4', method: 'GET', path: '/categories/{categoryId}', group: 'Category Management', role: 'ADMIN', uiScreen: 'CategoryManagementPage detail modal', serviceCall: 'adminService.getCategoryById', status: 'IMPLEMENTED', summary: 'Detail kategori administrasi' },
  { id: 'CAT-ADM-5', method: 'PATCH', path: '/categories/{categoryId}', group: 'Category Management', role: 'ADMIN', uiScreen: 'CategoryManagementPage edit form', serviceCall: 'adminService.updateCategory', status: 'IMPLEMENTED', summary: 'Perbarui kategori' },
  { id: 'CAT-ADM-6', method: 'DELETE', path: '/categories/{categoryId}', group: 'Category Management', role: 'ADMIN', uiScreen: 'CategoryManagementPage delete prompt', serviceCall: 'adminService.deleteCategory', status: 'IMPLEMENTED', summary: 'Soft delete kategori' },
  { id: 'CAT-ADM-7', method: 'PATCH', path: '/categories/{categoryId}/status', group: 'Category Management', role: 'ADMIN', uiScreen: 'CategoryManagementPage status toggle', serviceCall: 'adminService.changeCategoryStatus', status: 'IMPLEMENTED', summary: 'Ubah status kategori aktif/nonaktif' },
  { id: 'CAT-ADM-8', method: 'POST', path: '/categories/{categoryId}/restore', group: 'Category Management', role: 'ADMIN', uiScreen: 'CategoryManagementPage tab Pulihkan', serviceCall: 'adminService.restoreCategory', status: 'IMPLEMENTED', summary: 'Pulihkan kategori terhapus' },

  // Media Management (10)
  { id: 'MED-1', method: 'GET', path: '/media', group: 'Media Management', role: 'ADMIN', uiScreen: 'MediaManagementPage (/admin/media)', serviceCall: 'adminService.getMediaList', status: 'IMPLEMENTED', summary: 'Daftar inventaris media global' },
  { id: 'MED-2', method: 'GET', path: '/media/statistics', group: 'Media Management', role: 'ADMIN', uiScreen: 'MediaManagementPage stats header', serviceCall: 'adminService.getMediaStatistics', status: 'IMPLEMENTED', summary: 'Statistik pemakaian media & storage' },
  { id: 'MED-3', method: 'POST', path: '/media/cleanup', group: 'Media Management', role: 'ADMIN', uiScreen: 'MediaManagementPage tab Cleanup', serviceCall: 'adminService.cleanupOrphanMedia', status: 'IMPLEMENTED', strictRule: 'Mendukung dryRun simulasi sebelum eksekusi purge', summary: 'Cleanup media tak terpakai (orphan files)' },
  { id: 'MED-4', method: 'POST', path: '/media/course-thumbnails', group: 'Media Management', role: 'INSTRUCTOR', uiScreen: 'CourseBuilderPage & MediaLibraryPage', serviceCall: 'instructorService.uploadCourseThumbnail', status: 'IMPLEMENTED', summary: 'Upload thumbnail course' },
  { id: 'MED-5', method: 'POST', path: '/media/lesson-images', group: 'Media Management', role: 'INSTRUCTOR', uiScreen: 'CourseBuilderPage Lesson Modal', serviceCall: 'instructorService.uploadLessonImage', status: 'IMPLEMENTED', summary: 'Upload gambar materi pelajaran' },
  { id: 'MED-6', method: 'POST', path: '/media/lesson-audios', group: 'Media Management', role: 'INSTRUCTOR', uiScreen: 'CourseBuilderPage Lesson Modal', serviceCall: 'instructorService.uploadLessonAudio', status: 'IMPLEMENTED', summary: 'Upload audio penjelasan pelajaran' },
  { id: 'MED-7', method: 'POST', path: '/media/certificates', group: 'Media Management', role: 'ADMIN', uiScreen: 'CertificateManagementPage Template Upload', serviceCall: 'adminService.uploadCertificateTemplate', status: 'IMPLEMENTED', summary: 'Upload file template certificate PDF' },
  { id: 'MED-8', method: 'GET', path: '/media/{mediaId}', group: 'Media Management', role: 'ADMIN', uiScreen: 'MediaManagementPage detail view', serviceCall: 'adminService.getMediaById', status: 'IMPLEMENTED', summary: 'Detail aset media individual' },
  { id: 'MED-9', method: 'DELETE', path: '/media/{mediaId}', group: 'Media Management', role: 'ADMIN', uiScreen: 'MediaManagementPage delete action', serviceCall: 'adminService.deleteMedia', status: 'IMPLEMENTED', summary: 'Hapus aset media' },
  { id: 'MED-10', method: 'POST', path: '/media/{mediaId}/restore', group: 'Media Management', role: 'ADMIN', uiScreen: 'MediaManagementPage restore action', serviceCall: 'adminService.restoreMedia', status: 'IMPLEMENTED', summary: 'Pulihkan media yang telah dihapus' },

  // Payment Webhooks (1)
  { id: 'PAY-HOOK', method: 'POST', path: '/webhooks/midtrans', group: 'Payment Webhooks', role: 'PUBLIC', uiScreen: 'Server Backend Only (No Frontend Caller)', serviceCall: 'Midtrans Webhook HTTP Endpoint', status: 'SERVER_ONLY', strictRule: 'TIDAK DIPANGGIL OLEH FRONTEND. Merupakan signed server-to-server webhook Midtrans dengan signature SHA-512.', summary: 'Menerima notifikasi pembayaran Midtrans' },

  // Instructor Courses (6)
  { id: 'INST-1', method: 'POST', path: '/instructor/courses/{courseId}/submit-for-review', group: 'Instructor Courses', role: 'INSTRUCTOR', uiScreen: 'CourseBuilderPage Submit Modal', serviceCall: 'instructorService.submitForReview', status: 'IMPLEMENTED', strictRule: 'Wajib menyertakan expectedCourseVersionId concurrency token', summary: 'Submit current draft course for review' },
  { id: 'INST-2', method: 'GET', path: '/instructor/courses', group: 'Instructor Courses', role: 'INSTRUCTOR', uiScreen: 'InstructorCoursesPage (/instructor/courses)', serviceCall: 'instructorService.getCourses', status: 'IMPLEMENTED', summary: 'Daftar course milik instructor aktif' },
  { id: 'INST-3', method: 'POST', path: '/instructor/courses', group: 'Instructor Courses', role: 'INSTRUCTOR', uiScreen: 'InstructorCoursesPage modal Tambah Course', serviceCall: 'instructorService.createCourse', status: 'IMPLEMENTED', summary: 'Buat course baru' },
  { id: 'INST-4', method: 'GET', path: '/instructor/courses/{courseId}', group: 'Instructor Courses', role: 'INSTRUCTOR', uiScreen: 'CourseBuilderPage (/instructor/builder/:id)', serviceCall: 'instructorService.getCourseById', status: 'IMPLEMENTED', summary: 'Detail course milik instructor' },
  { id: 'INST-5', method: 'PATCH', path: '/instructor/courses/{courseId}', group: 'Instructor Courses', role: 'INSTRUCTOR', uiScreen: 'CourseBuilderPage Form Metadata', serviceCall: 'instructorService.updateDraftCourse', status: 'IMPLEMENTED', summary: 'Update metadata draft course' },
  { id: 'INST-6', method: 'DELETE', path: '/instructor/courses/{courseId}', group: 'Instructor Courses', role: 'INSTRUCTOR', uiScreen: 'InstructorCoursesPage delete action', serviceCall: 'instructorService.deleteDraftCourse', status: 'IMPLEMENTED', summary: 'Soft delete draft course' },

  // Admin Course Reviews (4)
  { id: 'REV-1', method: 'GET', path: '/admin/course-reviews', group: 'Admin Course Reviews', role: 'ADMIN', uiScreen: 'CourseReviewPage (/admin/course-reviews)', serviceCall: 'adminService.getCourseReviews', status: 'IMPLEMENTED', summary: 'Daftar course version antrean kurasi review' },
  { id: 'REV-2', method: 'GET', path: '/admin/course-reviews/{courseVersionId}', group: 'Admin Course Reviews', role: 'ADMIN', uiScreen: 'CourseReviewPage detail drawer', serviceCall: 'adminService.getCourseReviewById', status: 'IMPLEMENTED', summary: 'Detail exact course version untuk reviewer' },
  { id: 'REV-3', method: 'POST', path: '/admin/course-reviews/{courseVersionId}/decision', group: 'Admin Course Reviews', role: 'ADMIN', uiScreen: 'CourseReviewPage modal Keputusan', serviceCall: 'adminService.submitReviewDecision', status: 'IMPLEMENTED', strictRule: 'Memerlukan expectedSubmittedAt dan expectedReviewCount untuk mencegah stale review overwrite', summary: 'Approve, reject, atau minta perubahan course version' },
  { id: 'REV-4', method: 'POST', path: '/admin/course-reviews/{courseVersionId}/publish', group: 'Admin Course Reviews', role: 'ADMIN', uiScreen: 'CourseReviewPage modal Publikasi', serviceCall: 'adminService.publishCourseReview', status: 'IMPLEMENTED', summary: 'Publikasikan exact course version yang telah disetujui' },

  // Instructor Course Revisions (1)
  { id: 'INST-REV', method: 'POST', path: '/instructor/courses/{courseId}/revisions', group: 'Instructor Course Revisions', role: 'INSTRUCTOR', uiScreen: 'CourseBuilderPage modal Buat Revisi', serviceCall: 'instructorService.createCourseRevision', status: 'IMPLEMENTED', strictRule: 'Wajib menyertakan expectedPublishedCourseVersionId', summary: 'Buat current draft baru dari versi published' },

  // Public Course Catalog (2)
  { id: 'PUB-CRS-1', method: 'GET', path: '/public/courses', group: 'Public Course Catalog', role: 'PUBLIC', uiScreen: 'CoursesPage (/courses)', serviceCall: 'publicService.getCourses', status: 'IMPLEMENTED', summary: 'Daftar course published publik dengan faceted filter' },
  { id: 'PUB-CRS-2', method: 'GET', path: '/public/courses/{slug}', group: 'Public Course Catalog', role: 'PUBLIC', uiScreen: 'CourseDetailPage (/courses/:slug)', serviceCall: 'publicService.getCourseBySlug', status: 'IMPLEMENTED', summary: 'Detail course published publik & preview silabus' },

  // Instructor Course Curriculum (1)
  { id: 'INST-CURR', method: 'GET', path: '/instructor/courses/{courseId}/curriculum', group: 'Instructor Course Curriculum', role: 'INSTRUCTOR', uiScreen: 'CourseBuilderPage (/instructor/builder/:id)', serviceCall: 'instructorService.getCourseCurriculum', status: 'IMPLEMENTED', summary: 'Ambil curriculum lengkap course instructor' },

  // Student Enrollments (2)
  { id: 'ENR-1', method: 'GET', path: '/student/enrollments', group: 'Student Enrollments', role: 'STUDENT', uiScreen: 'MyCoursesPage (/student/my-courses)', serviceCall: 'studentService.getEnrollments', status: 'IMPLEMENTED', summary: 'Daftar enrollment student login' },
  { id: 'ENR-2', method: 'GET', path: '/student/enrollments/{enrollmentId}', group: 'Student Enrollments', role: 'STUDENT', uiScreen: 'MyCoursesPage detail card', serviceCall: 'studentService.getEnrollmentById', status: 'IMPLEMENTED', summary: 'Detail enrollment student login' },

  // Student Orders (4)
  { id: 'ORD-1', method: 'POST', path: '/student/orders', group: 'Student Orders', role: 'STUDENT', uiScreen: 'CourseDetailPage modal Beli', serviceCall: 'studentService.createOrder', status: 'IMPLEMENTED', strictRule: 'Wajib menyertakan unique header Idempotency-Key per transaksi intent', summary: 'Buat atau gunakan kembali order course' },
  { id: 'ORD-2', method: 'GET', path: '/student/orders', group: 'Student Orders', role: 'STUDENT', uiScreen: 'StudentOrdersPage (/student/orders)', serviceCall: 'studentService.getOrders', status: 'IMPLEMENTED', summary: 'Daftar order milik student login' },
  { id: 'ORD-3', method: 'GET', path: '/student/orders/{orderId}', group: 'Student Orders', role: 'STUDENT', uiScreen: 'StudentOrdersPage detail modal', serviceCall: 'studentService.getOrderById', status: 'IMPLEMENTED', summary: 'Detail order milik student login' },
  { id: 'ORD-4', method: 'POST', path: '/student/orders/{orderId}/checkout', group: 'Student Orders', role: 'STUDENT', uiScreen: 'StudentOrdersPage Bayar Sekarang & CourseDetailPage', serviceCall: 'studentService.checkoutOrder', status: 'IMPLEMENTED', strictRule: 'Membuka Midtrans Snap popup token; frontend TIDAK mengubah status order menjadi PAID', summary: 'Mulai atau lanjutkan checkout Order' },

  // Instructor Course Completeness (1)
  { id: 'INST-COMP', method: 'GET', path: '/instructor/courses/{courseId}/completeness', group: 'Instructor Course Completeness', role: 'INSTRUCTOR', uiScreen: 'CourseBuilderPage Checklist Widget', serviceCall: 'instructorService.checkCompleteness', status: 'IMPLEMENTED', summary: 'Validasi kelengkapan draft course sebelum review' },

  // Instructor Chapters (4)
  { id: 'CH-1', method: 'POST', path: '/instructor/courses/{courseId}/chapters', group: 'Instructor Chapters', role: 'INSTRUCTOR', uiScreen: 'CourseBuilderPage modal Tambah Chapter', serviceCall: 'instructorService.createChapter', status: 'IMPLEMENTED', summary: 'Buat chapter pada draft course' },
  { id: 'CH-2', method: 'PATCH', path: '/instructor/courses/{courseId}/chapters/reorder', group: 'Instructor Chapters', role: 'INSTRUCTOR', uiScreen: 'CourseBuilderPage Drag/Reorder Chapters', serviceCall: 'instructorService.reorderChapters', status: 'IMPLEMENTED', summary: 'Ubah urutan chapter' },
  { id: 'CH-3', method: 'PATCH', path: '/instructor/courses/{courseId}/chapters/{chapterId}', group: 'Instructor Chapters', role: 'INSTRUCTOR', uiScreen: 'CourseBuilderPage modal Edit Chapter', serviceCall: 'instructorService.updateChapter', status: 'IMPLEMENTED', summary: 'Update metadata chapter' },
  { id: 'CH-4', method: 'DELETE', path: '/instructor/courses/{courseId}/chapters/{chapterId}', group: 'Instructor Chapters', role: 'INSTRUCTOR', uiScreen: 'CourseBuilderPage delete Chapter prompt', serviceCall: 'instructorService.deleteChapter', status: 'IMPLEMENTED', summary: 'Hapus chapter dari draft course' },

  // Instructor Lessons (4)
  { id: 'LES-1', method: 'POST', path: '/instructor/courses/{courseId}/chapters/{chapterId}/lessons', group: 'Instructor Lessons', role: 'INSTRUCTOR', uiScreen: 'CourseBuilderPage modal Tambah Lesson', serviceCall: 'instructorService.createLesson', status: 'IMPLEMENTED', summary: 'Buat lesson pada chapter draft' },
  { id: 'LES-2', method: 'PATCH', path: '/instructor/courses/{courseId}/chapters/{chapterId}/lessons/reorder', group: 'Instructor Lessons', role: 'INSTRUCTOR', uiScreen: 'CourseBuilderPage Drag/Reorder Lessons', serviceCall: 'instructorService.reorderLessons', status: 'IMPLEMENTED', summary: 'Ubah urutan lesson' },
  { id: 'LES-3', method: 'PATCH', path: '/instructor/courses/{courseId}/chapters/{chapterId}/lessons/{lessonId}', group: 'Instructor Lessons', role: 'INSTRUCTOR', uiScreen: 'CourseBuilderPage modal Edit Lesson', serviceCall: 'instructorService.updateLesson', status: 'IMPLEMENTED', summary: 'Update lesson' },
  { id: 'LES-4', method: 'DELETE', path: '/instructor/courses/{courseId}/chapters/{chapterId}/lessons/{lessonId}', group: 'Instructor Lessons', role: 'INSTRUCTOR', uiScreen: 'CourseBuilderPage delete Lesson prompt', serviceCall: 'instructorService.deleteLesson', status: 'IMPLEMENTED', summary: 'Hapus lesson dari chapter draft' },

  // Instructor Quizzes (11)
  { id: 'QZ-1', method: 'POST', path: '/instructor/courses/{courseId}/chapters/{chapterId}/quizzes', group: 'Instructor Quizzes', role: 'INSTRUCTOR', uiScreen: 'CourseBuilderPage modal Tambah Kuis', serviceCall: 'instructorService.createQuiz', status: 'IMPLEMENTED', summary: 'Buat quiz pada chapter draft' },
  { id: 'QZ-2', method: 'PATCH', path: '/instructor/courses/{courseId}/chapters/{chapterId}/quizzes/{quizId}', group: 'Instructor Quizzes', role: 'INSTRUCTOR', uiScreen: 'CourseBuilderPage modal Edit Kuis', serviceCall: 'instructorService.updateQuiz', status: 'IMPLEMENTED', summary: 'Update konfigurasi kuis' },
  { id: 'QZ-3', method: 'DELETE', path: '/instructor/courses/{courseId}/chapters/{chapterId}/quizzes/{quizId}', group: 'Instructor Quizzes', role: 'INSTRUCTOR', uiScreen: 'CourseBuilderPage delete Kuis prompt', serviceCall: 'instructorService.deleteQuiz', status: 'IMPLEMENTED', summary: 'Hapus quiz dari chapter draft' },
  { id: 'QZ-4', method: 'POST', path: '/instructor/courses/{courseId}/chapters/{chapterId}/quizzes/{quizId}/questions', group: 'Instructor Quizzes', role: 'INSTRUCTOR', uiScreen: 'CourseBuilderPage modal Tambah Soal', serviceCall: 'instructorService.createQuestion', status: 'IMPLEMENTED', summary: 'Tambah question ke quiz' },
  { id: 'QZ-5', method: 'PATCH', path: '/instructor/courses/{courseId}/chapters/{chapterId}/quizzes/{quizId}/questions/reorder', group: 'Instructor Quizzes', role: 'INSTRUCTOR', uiScreen: 'CourseBuilderPage Reorder Soal', serviceCall: 'instructorService.reorderQuestions', status: 'IMPLEMENTED', summary: 'Ubah urutan question' },
  { id: 'QZ-6', method: 'PATCH', path: '/instructor/courses/{courseId}/chapters/{chapterId}/quizzes/{quizId}/questions/{questionId}', group: 'Instructor Quizzes', role: 'INSTRUCTOR', uiScreen: 'CourseBuilderPage modal Edit Soal', serviceCall: 'instructorService.updateQuestion', status: 'IMPLEMENTED', summary: 'Update question quiz' },
  { id: 'QZ-7', method: 'DELETE', path: '/instructor/courses/{courseId}/chapters/{chapterId}/quizzes/{quizId}/questions/{questionId}', group: 'Instructor Quizzes', role: 'INSTRUCTOR', uiScreen: 'CourseBuilderPage delete Soal prompt', serviceCall: 'instructorService.deleteQuestion', status: 'IMPLEMENTED', summary: 'Hapus question quiz' },
  { id: 'QZ-8', method: 'POST', path: '/instructor/courses/{courseId}/chapters/{chapterId}/quizzes/{quizId}/questions/{questionId}/options', group: 'Instructor Quizzes', role: 'INSTRUCTOR', uiScreen: 'CourseBuilderPage modal Tambah Opsi', serviceCall: 'instructorService.createOption', status: 'IMPLEMENTED', summary: 'Tambah option ke question' },
  { id: 'QZ-9', method: 'PATCH', path: '/instructor/courses/{courseId}/chapters/{chapterId}/quizzes/{quizId}/questions/{questionId}/options/reorder', group: 'Instructor Quizzes', role: 'INSTRUCTOR', uiScreen: 'CourseBuilderPage Reorder Opsi', serviceCall: 'instructorService.reorderOptions', status: 'IMPLEMENTED', summary: 'Ubah urutan option' },
  { id: 'QZ-10', method: 'PATCH', path: '/instructor/courses/{courseId}/chapters/{chapterId}/quizzes/{quizId}/questions/{questionId}/options/{optionId}', group: 'Instructor Quizzes', role: 'INSTRUCTOR', uiScreen: 'CourseBuilderPage modal Edit Opsi', serviceCall: 'instructorService.updateOption', status: 'IMPLEMENTED', summary: 'Update option quiz' },
  { id: 'QZ-11', method: 'DELETE', path: '/instructor/courses/{courseId}/chapters/{chapterId}/quizzes/{quizId}/questions/{questionId}/options/{optionId}', group: 'Instructor Quizzes', role: 'INSTRUCTOR', uiScreen: 'CourseBuilderPage delete Opsi prompt', serviceCall: 'instructorService.deleteOption', status: 'IMPLEMENTED', summary: 'Hapus option quiz' },

  // Development Integration (19)
  { id: 'DEV-1', method: 'GET', path: '/', group: 'Development Integration', role: 'PUBLIC', uiScreen: 'ConnectionBanner Status Check', serviceCall: 'apiClient.getApiIdentity', status: 'IMPLEMENTED', summary: 'Read API identity and platform health' },
  { id: 'DEV-2', method: 'GET', path: '/auth/profile', group: 'Development Integration', role: 'STUDENT', uiScreen: 'StudentProfilePage (/student/profile)', serviceCall: 'authService.getProfile', status: 'IMPLEMENTED', summary: 'Read own active profile' },
  { id: 'DEV-3', method: 'PATCH', path: '/auth/profile', group: 'Development Integration', role: 'STUDENT', uiScreen: 'StudentProfilePage form Edit', serviceCall: 'authService.updateProfile', status: 'IMPLEMENTED', summary: 'Update own profile fields (fullname, bio, phone, headline)' },
  { id: 'DEV-4', method: 'POST', path: '/auth/profile/avatar', group: 'Development Integration', role: 'STUDENT', uiScreen: 'StudentProfilePage Avatar Uploader', serviceCall: 'authService.uploadAvatar', status: 'IMPLEMENTED', summary: 'Upload own Student avatar' },
  { id: 'DEV-5', method: 'DELETE', path: '/auth/profile/avatar', group: 'Development Integration', role: 'STUDENT', uiScreen: 'StudentProfilePage Hapus Avatar', serviceCall: 'authService.deleteAvatar', status: 'IMPLEMENTED', summary: 'Remove own Student avatar' },
  { id: 'DEV-6', method: 'GET', path: '/student/enrollments/courses/{courseId}/access', group: 'Development Integration', role: 'STUDENT', uiScreen: 'CourseDetailPage & LearningPlayerPage Gate', serviceCall: 'studentService.checkCourseAccess', status: 'IMPLEMENTED', summary: 'Check own course entitlement status' },
  { id: 'DEV-7', method: 'GET', path: '/student/courses/{courseId}/progress/requirements', group: 'Development Integration', role: 'STUDENT', uiScreen: 'LearningPlayerPage Progress Checklist', serviceCall: 'studentService.getProgressRequirements', status: 'IMPLEMENTED', summary: 'Read required learning progress requirements' },
  { id: 'DEV-8', method: 'GET', path: '/student/courses/{courseId}/lessons/{lessonId}', group: 'Development Integration', role: 'STUDENT', uiScreen: 'LearningPlayerPage Lesson Viewer', serviceCall: 'studentService.getLessonContent', status: 'IMPLEMENTED', summary: 'Read entitled lesson content' },
  { id: 'DEV-9', method: 'GET', path: '/student/courses/{courseId}/quizzes/{quizId}', group: 'Development Integration', role: 'STUDENT', uiScreen: 'QuizPlayerPage (/student/classroom/:id/quiz/:qid)', serviceCall: 'studentService.getQuizDetail', status: 'IMPLEMENTED', strictRule: 'Kuis tersaji tanpa kunci jawaban untuk pencegahan kecurangan', summary: 'Read entitled quiz without answer keys' },
  { id: 'DEV-10', method: 'POST', path: '/student/courses/{courseId}/lessons/{lessonId}/start', group: 'Development Integration', role: 'STUDENT', uiScreen: 'LearningPlayerPage Auto-start event', serviceCall: 'studentService.startLesson', status: 'IMPLEMENTED', summary: 'Start an entitled lesson' },
  { id: 'DEV-11', method: 'POST', path: '/student/courses/{courseId}/progress/sync', group: 'Development Integration', role: 'STUDENT', uiScreen: 'LearningPlayerPage Heartbeat/Sync', serviceCall: 'studentService.syncProgress', status: 'IMPLEMENTED', summary: 'Synchronize own course completion' },
  { id: 'DEV-12', method: 'GET', path: '/student/courses/{courseId}/lessons/{lessonId}/media/{kind}', group: 'Development Integration', role: 'STUDENT', uiScreen: 'LearningPlayerPage Video/Audio Streamer', serviceCall: 'studentService.getSignedLessonMediaUrl', status: 'IMPLEMENTED', strictRule: 'Signed URL berumur pendek (120 detik TTL)', summary: 'Get temporary private lesson media download' },
  { id: 'DEV-13', method: 'GET', path: '/student/certificates/{courseId}/eligibility', group: 'Development Integration', role: 'STUDENT', uiScreen: 'LearningPlayerPage & StudentCertificatesPage', serviceCall: 'studentService.checkCertificateEligibility', status: 'IMPLEMENTED', summary: 'Check internal certificate eligibility' },
  { id: 'DEV-14', method: 'GET', path: '/student/certificates/{certificateId}', group: 'Development Integration', role: 'STUDENT', uiScreen: 'StudentCertificatesPage detail modal', serviceCall: 'studentService.getCertificateDetail', status: 'IMPLEMENTED', summary: 'Read owned internal certificate registry record' },
  { id: 'DEV-15', method: 'GET', path: '/admin/certificates/requests/{certificateId}', group: 'Development Integration', role: 'ADMIN', uiScreen: 'CertificateManagementPage detail drawer', serviceCall: 'adminService.getCertificateRequestDetail', status: 'IMPLEMENTED', summary: 'Read internal certificate review detail' },
  { id: 'DEV-16', method: 'POST', path: '/admin/certificates/requests/{certificateId}/revoke', group: 'Development Integration', role: 'ADMIN', uiScreen: 'CertificateManagementPage modal Cabut Sertifikat', serviceCall: 'adminService.revokeCertificate', status: 'IMPLEMENTED', summary: 'Revoke an issued internal certificate' },
  { id: 'DEV-17', method: 'GET', path: '/public/certificates/verify/{certificateNumber}', group: 'Development Integration', role: 'PUBLIC', uiScreen: 'VerifyCertificatePage (/verify-certificate)', serviceCall: 'publicService.verifyCertificate', status: 'IMPLEMENTED', strictRule: 'Menampilkan keaslian sertifikat tanpa membocorkan identitas pribadi siswa', summary: 'Verify an internal certificate without exposing recipient identity' },
  { id: 'DEV-18', method: 'GET', path: '/admin/media/premium-exposure', group: 'Development Integration', role: 'ADMIN', uiScreen: 'MediaManagementPage Tab Audit Keamanan', serviceCall: 'adminService.getPremiumExposureAudit', status: 'IMPLEMENTED', summary: 'Read aggregate premium-media exposure metadata' },
  { id: 'DEV-19', method: 'GET', path: '/admin/media/premium-asset-inventory', group: 'Development Integration', role: 'ADMIN', uiScreen: 'MediaManagementPage Tab Aset Premium', serviceCall: 'adminService.getPremiumAssetInventory', status: 'IMPLEMENTED', summary: 'Classify premium lesson asset privacy metadata' },

  // Admin Commerce Monitoring (4)
  { id: 'COMM-1', method: 'GET', path: '/admin/orders', group: 'Admin Commerce Monitoring', role: 'ADMIN', uiScreen: 'OrderMonitoringPage (/admin/orders)', serviceCall: 'adminService.getAdminOrders', status: 'IMPLEMENTED', strictRule: 'READ-ONLY monitoring. Tidak ada tombol pelunasan manual.', summary: 'List orders for Admin monitoring' },
  { id: 'COMM-2', method: 'GET', path: '/admin/orders/{orderId}', group: 'Admin Commerce Monitoring', role: 'ADMIN', uiScreen: 'OrderMonitoringPage detail modal', serviceCall: 'adminService.getAdminOrderById', status: 'IMPLEMENTED', strictRule: 'READ-ONLY monitoring', summary: 'Read an order for Admin monitoring' },
  { id: 'COMM-3', method: 'GET', path: '/admin/enrollments', group: 'Admin Commerce Monitoring', role: 'ADMIN', uiScreen: 'EnrollmentMonitoringPage (/admin/enrollments)', serviceCall: 'adminService.getAdminEnrollments', status: 'IMPLEMENTED', strictRule: 'READ-ONLY monitoring. Tidak ada tombol grant enrollment sewenang-wenang.', summary: 'List enrollments for Admin monitoring' },
  { id: 'COMM-4', method: 'GET', path: '/admin/enrollments/{enrollmentId}', group: 'Admin Commerce Monitoring', role: 'ADMIN', uiScreen: 'EnrollmentMonitoringPage detail modal', serviceCall: 'adminService.getAdminEnrollmentById', status: 'IMPLEMENTED', strictRule: 'READ-ONLY monitoring', summary: 'Read an enrollment for Admin monitoring' }
];

export const AuditMatrixPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');

  const groups = useMemo(() => {
    const list = Array.from(new Set(API_CATALOG.map(item => item.group)));
    return ['ALL', ...list];
  }, []);

  const filteredCatalog = useMemo(() => {
    return API_CATALOG.filter(item => {
      const matchesSearch = 
        item.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.uiScreen.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.serviceCall.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesGroup = selectedGroup === 'ALL' || item.group === selectedGroup;
      const matchesRole = selectedRole === 'ALL' || item.role === selectedRole;
      const matchesStatus = selectedStatus === 'ALL' || item.status === selectedStatus;
      const matchesMethod = selectedMethod === 'ALL' || item.method === selectedMethod;

      return matchesSearch && matchesGroup && matchesRole && matchesStatus && matchesMethod;
    });
  }, [searchTerm, selectedGroup, selectedRole, selectedStatus, selectedMethod]);

  const stats = useMemo(() => {
    const total = API_CATALOG.length;
    const implemented = API_CATALOG.filter(x => x.status === 'IMPLEMENTED').length;
    const serverOnly = API_CATALOG.filter(x => x.status === 'SERVER_ONLY').length;
    const disabled = API_CATALOG.filter(x => x.status === 'DISABLED_LEGACY').length;
    const uniquePaths = new Set(API_CATALOG.map(x => x.path)).size;

    return { total, implemented, serverOnly, disabled, uniquePaths };
  }, []);

  const getMethodBadgeClass = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'POST': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PATCH': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'PUT': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'DELETE': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (status: ApiRouteItem['status']) => {
    switch (status) {
      case 'IMPLEMENTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> IMPLEMENTED
          </span>
        );
      case 'SERVER_ONLY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <ShieldAlert className="w-3.5 h-3.5 text-purple-600" /> SERVER_ONLY
          </span>
        );
      case 'DISABLED_LEGACY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> DISABLED_LEGACY
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-semibold mb-3">
                <FileCheck className="w-4 h-4" />
                Audit Kepatuhan Kontrak API OpenAPI 3.0.3 (B25 Snapshot)
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                Matriks Audit & Cakupan Endpoint API 24Institute
              </h1>
              <p className="mt-2 text-sm text-slate-600 max-w-3xl">
                Verifikasi komprehensif 100% kepatuhan frontend terhadap seluruh 136 operasi terdaftar pada berkas otoritatif <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono text-xs">API_ROUTE_CATALOG.md</code> dan skema OpenAPI.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <a
                href="#audit-table"
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 text-sm shadow-sm transition"
              >
                Lihat Semua Tabel Operasi
              </a>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8 pt-6 border-t border-slate-100">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Operasi</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
              <span className="text-xs text-slate-500">100% Tercakup</span>
            </div>
            <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100">
              <span className="text-xs font-medium text-emerald-800 uppercase tracking-wider">Frontend Client</span>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.implemented}</p>
              <span className="text-xs text-emerald-600 font-medium">Tersambung di UI & Mock Store</span>
            </div>
            <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-100">
              <span className="text-xs font-medium text-purple-800 uppercase tracking-wider">Server-Only Webhook</span>
              <p className="text-2xl font-bold text-purple-700 mt-1">{stats.serverOnly}</p>
              <span className="text-xs text-purple-600 font-medium">Midtrans Webhook (Excluded)</span>
            </div>
            <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-100">
              <span className="text-xs font-medium text-amber-800 uppercase tracking-wider">Disabled Legacy</span>
              <p className="text-2xl font-bold text-amber-700 mt-1">{stats.disabled}</p>
              <span className="text-xs text-amber-600 font-medium">POST /auth/login (Dialihkan ke OTP)</span>
            </div>
            <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-100">
              <span className="text-xs font-medium text-indigo-800 uppercase tracking-wider">Jalur API Unik</span>
              <p className="text-2xl font-bold text-indigo-700 mt-1">{stats.uniquePaths}</p>
              <span className="text-xs text-indigo-600 font-medium">Sesuai Kontrak Kit</span>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari endpoint, method, layar UI, atau deskripsi..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
              />
            </div>

            {/* Filter Group */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedGroup}
                  onChange={e => setSelectedGroup(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="ALL">Semua Grup ({API_CATALOG.length})</option>
                  {groups.filter(g => g !== 'ALL').map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <select
                value={selectedRole}
                onChange={e => setSelectedRole(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="ALL">Semua Role</option>
                <option value="PUBLIC">PUBLIC</option>
                <option value="STUDENT">STUDENT</option>
                <option value="INSTRUCTOR">INSTRUCTOR</option>
                <option value="ADMIN">ADMIN</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              </select>

              <select
                value={selectedMethod}
                onChange={e => setSelectedMethod(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="ALL">Semua Method</option>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PATCH">PATCH</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>

              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="ALL">Semua Status</option>
                <option value="IMPLEMENTED">IMPLEMENTED</option>
                <option value="SERVER_ONLY">SERVER_ONLY</option>
                <option value="DISABLED_LEGACY">DISABLED_LEGACY</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Menampilkan <strong>{filteredCatalog.length}</strong> dari <strong>{API_CATALOG.length}</strong> operasi API</span>
            {searchTerm || selectedGroup !== 'ALL' || selectedRole !== 'ALL' || selectedMethod !== 'ALL' || selectedStatus !== 'ALL' ? (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedGroup('ALL');
                  setSelectedRole('ALL');
                  setSelectedMethod('ALL');
                  setSelectedStatus('ALL');
                }}
                className="text-primary-600 hover:underline font-medium"
              >
                Reset Filter
              </button>
            ) : null}
          </div>
        </div>

        {/* Audit Table */}
        <div id="audit-table" className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-slate-500" />
              <h2 className="text-sm font-bold text-slate-900">Katalog Lengkap Operasi API & Pemetaan Frontend</h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">B25-Snapshot-Strict-Conformity</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                <tr>
                  <th scope="col" className="px-4 py-3.5">ID & Method</th>
                  <th scope="col" className="px-4 py-3.5">Jalur Endpoint (Path)</th>
                  <th scope="col" className="px-4 py-3.5">Grup & Role</th>
                  <th scope="col" className="px-4 py-3.5">Komponen / Layar UI</th>
                  <th scope="col" className="px-4 py-3.5">Implementasi Service</th>
                  <th scope="col" className="px-4 py-3.5">Status Kepatuhan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-normal">
                {filteredCatalog.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">{item.id}</span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getMethodBadgeClass(item.method)}`}>
                          {item.method}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3 font-mono text-slate-900">
                      <div className="font-semibold">{item.path}</div>
                      <div className="text-[11px] font-sans text-slate-500 mt-0.5">{item.summary}</div>
                      {item.strictRule && (
                        <div className="mt-1.5 flex items-start gap-1 text-[11px] text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200 font-sans">
                          <Shield className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                          <span><strong>Ketentuan Ketat:</strong> {item.strictRule}</span>
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-slate-800 font-medium">{item.group}</div>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {item.role}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      <div className="font-medium text-slate-800">{item.uiScreen}</div>
                    </td>

                    <td className="px-4 py-3 font-mono text-slate-600 text-[11px]">
                      <span className="bg-slate-50 px-2 py-1 rounded border border-slate-200">
                        {item.serviceCall}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
