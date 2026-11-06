import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, Link } from 'react-router-dom';
import { ConnectionProvider } from './context/ConnectionContext';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { PublicLayout } from './components/layouts/PublicLayout';
import { StudentLayout } from './components/layouts/StudentLayout';
import { InstructorLayout } from './components/layouts/InstructorLayout';
import { AdminLayout } from './components/layouts/AdminLayout';
import { HomePage } from './pages/public/HomePage';
import { CoursesPage } from './pages/public/CoursesPage';
import { CourseDetailPage } from './pages/public/CourseDetailPage';
import { CategoriesPage } from './pages/public/CategoriesPage';
import { VerifyCertificatePage } from './pages/public/VerifyCertificatePage';
import { PrivacyPage } from './pages/public/PrivacyPage';
import { TermsPage } from './pages/public/TermsPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { MyCoursesPage } from './pages/student/MyCoursesPage';
import { StudentOrdersPage } from './pages/student/StudentOrdersPage';
import { StudentCertificatesPage } from './pages/student/StudentCertificatesPage';
import { NotificationsPage } from './pages/student/NotificationsPage';
import { StudentWhatsAppPage } from './pages/student/StudentWhatsAppPage';
import { StudentProfilePage } from './pages/student/StudentProfilePage';
import { LearningPlayerPage } from './pages/student/LearningPlayerPage';
import { QuizPlayerPage } from './pages/student/QuizPlayerPage';
import { InstructorDashboard } from './pages/instructor/InstructorDashboard';
import { InstructorCoursesPage } from './pages/instructor/InstructorCoursesPage';
import { CourseBuilderPage } from './pages/instructor/CourseBuilderPage';
import { LessonCanvasPage } from './pages/instructor/LessonCanvasPage';
import { MediaLibraryPage } from './pages/instructor/MediaLibraryPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { CategoryManagementPage } from './pages/admin/CategoryManagementPage';
import { CourseReviewPage } from './pages/admin/CourseReviewPage';
import { CertificateManagementPage } from './pages/admin/CertificateManagementPage';
import { OrderMonitoringPage } from './pages/admin/OrderMonitoringPage';
import { EnrollmentMonitoringPage } from './pages/admin/EnrollmentMonitoringPage';
import { MediaManagementPage } from './pages/admin/MediaManagementPage';
import { WhatsAppManagementPage } from './pages/admin/WhatsAppManagementPage';
import { AccountOverviewPage } from './pages/shared/AccountOverviewPage';
import { AuditMatrixPage } from './pages/AuditMatrixPage';

const NotFound: React.FC = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 p-8 text-center">
    <h1 className="text-3xl font-bold">Halaman tidak ditemukan</h1>
    <Link className="text-blue-600 underline" to="/">Kembali ke beranda</Link>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <ConnectionProvider>
        <AuthProvider>
          <NotificationProvider>
            <Routes>
              <Route element={<PublicLayout />}>
                <Route index element={<HomePage />} />
                <Route path="courses" element={<CoursesPage />} />
                <Route path="courses/:slug" element={<CourseDetailPage />} />
                <Route path="categories" element={<CategoriesPage />} />
                <Route path="verify-certificate" element={<VerifyCertificatePage />} />
                <Route path="verify-certificate/:certificateNumber" element={<VerifyCertificatePage />} />
                <Route path="privacy" element={<PrivacyPage />} />
                <Route path="terms" element={<TermsPage />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />
                <Route path="verify-email" element={<VerifyEmailPage />} />
                <Route path="forgot-password" element={<ForgotPasswordPage />} />
                <Route path="reset-password" element={<ResetPasswordPage />} />
                <Route path="*" element={<NotFound />} />
              </Route>
              <Route path="student" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentLayout /></ProtectedRoute>}>
                <Route index element={<StudentDashboard />} />
                <Route path="my-courses" element={<MyCoursesPage />} />
                <Route path="orders" element={<StudentOrdersPage />} />
                <Route path="certificates" element={<StudentCertificatesPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="whatsapp" element={<StudentWhatsAppPage />} />
                <Route path="profile" element={<StudentProfilePage />} />
                <Route path="classroom/:courseId" element={<LearningPlayerPage />} />
                <Route path="classroom/:courseId/quiz/:quizId" element={<QuizPlayerPage />} />
                <Route path="*" element={<Navigate to="/student" replace />} />
              </Route>
              <Route path="instructor" element={<ProtectedRoute allowedRoles={['INSTRUCTOR']}><InstructorLayout /></ProtectedRoute>}>
                <Route index element={<InstructorDashboard />} />
                <Route path="courses" element={<InstructorCoursesPage />} />
                <Route path="builder/:courseId" element={<CourseBuilderPage />} />
                <Route path="builder/:courseId/chapters/:chapterId/lesson-canvas/:lessonId" element={<LessonCanvasPage />} />
                <Route path="media" element={<MediaLibraryPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="profile" element={<AccountOverviewPage />} />
                <Route path="*" element={<Navigate to="/instructor" replace />} />
              </Route>
              <Route path="admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminLayout /></ProtectedRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<UserManagementPage />} />
                <Route path="categories" element={<CategoryManagementPage />} />
                <Route path="course-reviews" element={<CourseReviewPage />} />
                <Route path="certificates" element={<CertificateManagementPage />} />
                <Route path="orders" element={<OrderMonitoringPage />} />
                <Route path="enrollments" element={<EnrollmentMonitoringPage />} />
                <Route path="media" element={<MediaManagementPage />} />
                <Route path="whatsapp" element={<WhatsAppManagementPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="profile" element={<AccountOverviewPage />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Route>
              {import.meta.env.DEV && <Route path="audit-matrix" element={<AuditMatrixPage />} />}
            </Routes>
          </NotificationProvider>
        </AuthProvider>
      </ConnectionProvider>
    </BrowserRouter>
  );
}