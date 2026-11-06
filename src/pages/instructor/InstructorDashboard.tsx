import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useConnection } from '../../context/ConnectionContext';
import { instructorService } from '../../services/instructor.service';
import { readDashboardPagination } from '../../utils/dashboard-data-guards';
import { Course } from '../../types/course';
import { formatIDR } from '../../utils/formatters';
import { StatusPill } from '../../components/common/StatusPill';
import {
  Layers,
  BookPlus,
  FileCheck2,
  AlertCircle,
  Clock,
  CheckCircle,
  Plus,
  ArrowRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export const InstructorDashboard: React.FC = () => {
  const { isForcedMock } = useConnection();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [totalFromServer, setTotalFromServer] = useState<number | null>(null);
  const [countsComplete, setCountsComplete] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchCourses = async () => {
      try {
        const res = await instructorService.getCourses({ page: 1, limit: 100 });
        if (!mounted) return;
        if (!res.success || !Array.isArray(res.data)) throw Error('Invalid course list');
        const page = readDashboardPagination(res.data, res.meta?.pagination);
        setCourses(res.data);
        setTotalFromServer(page.total);
        setCountsComplete(page.isComplete);
      } catch {
        if (mounted) setLoadError('Daftar kursus belum dapat dimuat. Periksa koneksi API atau izin akun.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void fetchCourses();
    return () => { mounted = false; };
  }, []);

  const publishedCourses = courses.filter((c) => c.publishedVersionId).length;
  const draftCourses = courses.filter((c) => c.currentDraftVersionId).length;
  const metric = (n: number) => !isLoading && !loadError && countsComplete ? n : '—';

  return (
    <div className="space-y-8">
      {/* Studio Header Banner */}
      <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-indigo-950 border border-teal-800/40 p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Course Authoring Studio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Learning Content Management Studio
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Kelola pembuatan draf kurikulum, materi multimedia terproteksi, kuis evaluasi, validasi kelengkapan, dan pengajuan peninjauan kepada Admin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/instructor/courses"
            className="px-5 py-2.5 rounded-xl font-bold text-xs bg-teal-500 hover:bg-teal-400 text-slate-950 transition shadow-md flex items-center gap-1.5"
          >
            <BookPlus className="w-4 h-4" />
            <span>Kelola Kursus Saya</span>
          </Link>
          <Link
            to="/instructor/media"
            className="px-5 py-2.5 rounded-xl font-semibold text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20 transition"
          >
            Media Library
          </Link>
        </div>
      </div>

      {import.meta.env.DEV && isForcedMock && (
        <p data-testid="simulation-data-disclaimer" role="note" className="rounded-xl border border-amber-700/50 bg-amber-950/70 px-3 py-2 text-xs font-semibold leading-relaxed text-amber-100">
          Data simulasi untuk pratinjau UI — bukan katalog kursus atau statistik instruktur sungguhan.
        </p>
      )}

      {loadError && (
        <div role="alert" className="rounded-xl border border-rose-700 bg-rose-950 p-4 text-sm text-rose-200">{loadError}</div>
      )}
      {!isLoading && !loadError && !countsComplete && (
        <p role="status" className="text-xs text-amber-700">Sebagian kursus saja yang termuat. Statistik per status belum tersedia sampai seluruh halaman dikonfirmasi backend.</p>
      )}
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400">Total Kursus Dikelola</div>
            <div className="text-2xl font-black text-white">{!isLoading && !loadError && totalFromServer !== null ? totalFromServer : '—'}</div>
          </div>
        </div>

        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400">Telah Dipublikasikan</div>
            <div className="text-2xl font-black text-white">{metric(publishedCourses)}</div>
          </div>
        </div>

        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400">Draf & Dalam Revisi</div>
            <div className="text-2xl font-black text-white">{metric(draftCourses)}</div>
          </div>
        </div>
      </div>

      {/* Recent Courses Management */}
      <div className="bg-slate-950 rounded-3xl border border-slate-800 p-6 sm:p-7 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-teal-400" />
            <span>Katalog Kursus Dikelola</span>
          </h2>
          <Link
            to="/instructor/courses"
            className="text-xs font-bold text-teal-400 hover:underline flex items-center gap-1"
          >
            <span>Semua Kursus</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="h-28 rounded-xl bg-slate-800 animate-pulse" />
        ) : loadError ? (
          <p role="alert" className="text-sm text-rose-300">Daftar kursus tidak dapat ditampilkan.</p>
        ) : courses.length === 0 ? (
          <div className="text-center py-12 text-slate-500 space-y-3">
            <Layers className="w-10 h-10 mx-auto text-slate-700" />
            <p className="text-xs">Belum ada kursus yang dibuat.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {courses.slice(0, 3).map((course) => (
              <div
                key={course.id}
                className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-teal-400 uppercase">
                      {course.category?.name || 'Kursus'}
                    </span>
                    <span className="text-slate-600">&middot;</span>
                    <span className="text-[10px] font-mono text-slate-400">{course.slug}</span>
                  </div>
                  <h3 className="font-bold text-base text-white">{course.title}</h3>
                  <div className="text-xs text-slate-400 flex items-center gap-3">
                    <span>Investasi: <strong className="text-white">{formatIDR(course.price)}</strong></span>
                    <span>&middot;</span>
                    <span>Tingkat: <strong className="text-white">{course.level}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/instructor/builder/${course.id}`}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition"
                  >
                    Buka Course Builder
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
