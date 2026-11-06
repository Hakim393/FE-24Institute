import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useConnection } from '../../context/ConnectionContext';
import { useAuth } from '../../context/AuthContext';
import { studentService } from '../../services/student.service';
import { readDashboardPagination } from '../../utils/dashboard-data-guards';
import { Enrollment } from '../../types/order';
import { Certificate } from '../../types/certificate';
import {
  GraduationCap,
  Award,
  BookOpen,
  ArrowRight,
  PlayCircle,
  MessageCircle,
  Bell,
  Clock,
  CheckCircle2,
  Sparkles,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { isForcedMock } = useConnection();
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);
  const [certificateError, setCertificateError] = useState<string | null>(null);
  const [enrollmentTotal, setEnrollmentTotal] = useState<number | null>(null);
  const [countsComplete, setCountsComplete] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchDashboardData = async () => {
      const [enr, cert] = await Promise.allSettled([
        studentService.getEnrollments({ page: 1, limit: 100 }),
        studentService.getCertificates(),
      ]);
      if (!mounted) return;
      if (enr.status === 'fulfilled' && enr.value.success && Array.isArray(enr.value.data)) {
        const page = readDashboardPagination(enr.value.data, enr.value.meta?.pagination);
        setEnrollments(enr.value.data);
        setEnrollmentTotal(page.total);
        setCountsComplete(page.isComplete);
      } else {
        setEnrollmentError('Data kursus belum dapat dimuat. Periksa koneksi API dan coba lagi.');
      }
      if (cert.status === 'fulfilled' && cert.value.success && Array.isArray(cert.value.data)) {
        setCertificates(cert.value.data);
      } else {
        setCertificateError('Data sertifikat belum dapat dimuat.');
      }
      setIsLoading(false);
    };
    void fetchDashboardData();
    return () => { mounted = false; };
  }, []);

  const activeEnrollments = enrollments.filter((e) => e.status === 'ACTIVE');
  const completedCoursesCount = enrollments.filter((e) => e.progressPercentage === 100).length;
  // Status counts are exact only when the server confirms this is the complete result set.
  const statusMetric = (n: number) => !isLoading && !enrollmentError && countsComplete ? n : '—';

  return (
    <div className="space-y-8">
      {/* Welcome Greeting */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-sky-300 text-xs font-semibold border border-blue-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ruang Belajar Siswa</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Selamat Datang, {user?.profile?.fullName || 'Siswa'}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Lanjutkan progres belajar Anda hari ini. Evaluasi pemahaman Anda melalui kuis dan klaim sertifikat digital setelah menyelesaikan kurikulum.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/student/my-courses"
            className="px-5 py-2.5 rounded-xl font-bold text-xs bg-white text-blue-900 hover:bg-slate-100 transition shadow-sm"
          >
            Kursus Saya
          </Link>
          <Link
            to="/courses"
            className="px-5 py-2.5 rounded-xl font-semibold text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20 transition"
          >
            Jelajahi Kursus Lain
          </Link>
        </div>
      </div>

      {import.meta.env.DEV && isForcedMock && (
        <p data-testid="simulation-data-disclaimer" role="note" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-relaxed text-amber-900">
          Data simulasi untuk pratinjau UI — bukan riwayat belajar atau sertifikat siswa sungguhan.
        </p>
      )}

      {enrollmentError && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{enrollmentError}
        </div>
      )}
      {!isLoading && !enrollmentError && !countsComplete && (
        <p className="text-xs text-amber-700" role="status">Ringkasan status kursus belum lengkap karena data ditampilkan bertahap. Buka Kursus Saya untuk melihat daftar lengkap.</p>
      )}
      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400">Kursus Terdaftar</div>
            <div className="text-2xl font-black text-slate-900">{!isLoading && !enrollmentError && enrollmentTotal !== null ? enrollmentTotal : '—'}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400">Sedang Dipelajari</div>
            <div className="text-2xl font-black text-slate-900">{statusMetric(activeEnrollments.length)}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400">Kursus Selesai</div>
            <div className="text-2xl font-black text-slate-900">{statusMetric(completedCoursesCount)}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400">Sertifikat Digital</div>
            <div className="text-2xl font-black text-slate-900">{!isLoading && !certificateError ? certificates.length : '—'}</div>
          </div>
        </div>
      </div>

      {/* Continue Learning List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-blue-600" />
              <span>Lanjutkan Pembelajaran</span>
            </h2>
            <Link to="/student/my-courses" className="text-xs font-bold text-blue-600 hover:underline">
              Lihat Semua ({enrollmentTotal ?? '—'})
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : enrollmentError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Daftar pembelajaran tidak tersedia.</div>
          ) : enrollments.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">Belum ada kursus yang Anda ikuti</h3>
              <p className="text-xs text-slate-500">
                Pilih kursus yang sesuai dari katalog dan mulai perjalanan belajar Anda.
              </p>
              <Link
                to="/courses"
                className="inline-block px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs"
              >
                Jelajahi Kursus Sekarang
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {enrollments.map((enr) => (
                <div
                  key={enr.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={enr.courseThumbnailUrl || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80'}
                      alt={enr.courseTitle}
                      className="w-20 h-14 rounded-xl object-cover shrink-0"
                    />
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                        STATUS: {enr.status}
                      </span>
                      <h3 className="font-bold text-sm text-slate-900 leading-snug">
                        {enr.courseTitle}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>Progres Belajar:</span>
                        <div className="w-28 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${enr.progressPercentage}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-700">{enr.progressPercentage}%</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    to={`/student/classroom/${enr.courseId}`}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-xs"
                  >
                    <span>Buka Ruang Belajar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar: WhatsApp & Certificates Widgets */}
        <div className="lg:col-span-4 space-y-6">
          {/* WhatsApp Community Box */}
          <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white p-6 rounded-3xl shadow-lg space-y-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Komunitas Diskusi Siswa</h3>
              <p className="text-xs text-emerald-200 mt-1 leading-relaxed">
                Bergabunglah ke grup WhatsApp resmi untuk berdiskusi dengan mentor dan sesama peserta kursus.
              </p>
            </div>
            <Link
              to="/student/whatsapp"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-xs transition"
            >
              <span>Akses Tautan WhatsApp</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Certificates Widget */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-600" />
                <span>Sertifikat Digital Saya</span>
              </h3>
              <Link to="/student/certificates" className="text-xs font-bold text-purple-600 hover:underline">
                Kelola
              </Link>
            </div>

            {certificateError ? (
              <p role="alert" className="text-xs text-red-700">{certificateError}</p>
            ) : certificates.length === 0 ? (
              <p className="text-xs text-slate-500">
                Selesaikan 100% persyaratan kursus untuk mengklaim sertifikat digital internal resmi 24Institute.
              </p>
            ) : (
              <div className="space-y-3">
                {certificates.slice(0, 2).map((cert) => (
                  <div
                    key={cert.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                  >
                    <div className="font-bold text-slate-900 truncate">{cert.courseTitle}</div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <Link to="/student/certificates" className="font-semibold text-purple-700 hover:underline">Lihat Detail</Link>
                      <span className="font-semibold text-emerald-600">{cert.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
