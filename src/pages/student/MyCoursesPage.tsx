import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { studentService } from '../../services/student.service';
import { Enrollment } from '../../types/order';
import { StatusPill } from '../../components/common/StatusPill';
import {
  GraduationCap,
  PlayCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react';

export const MyCoursesPage: React.FC = () => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEnrollments = async () => {
      try {
        const res = await studentService.getEnrollments();
        if (res.success && res.data) setEnrollments(res.data);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEnrollments();
  }, []);

  const filtered = enrollments.filter((e) => {
    if (filter === 'ACTIVE') return e.status === 'ACTIVE' && e.progressPercentage < 100;
    if (filter === 'COMPLETED') return e.progressPercentage === 100;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <GraduationCap className="w-7 h-7 text-blue-600" />
            <span>Kursus Saya</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Daftar seluruh materi kursus yang telah berhasil Anda beli dan terdaftar resmi.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
          {(['ALL', 'ACTIVE', 'COMPLETED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filter === tab
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab === 'ALL' ? 'Semua Kursus' : tab === 'ACTIVE' ? 'Sedang Belajar' : 'Selesai'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-4">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Tidak ada kursus pada filter ini</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {filter === 'ALL'
              ? 'Anda belum memiliki kursus terdaftar. Silakan jelajahi katalog kursus resmi kami.'
              : 'Belum ada kursus dengan kriteria ini.'}
          </p>
          <Link
            to="/courses"
            className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs"
          >
            Buka Katalog Kursus
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((enr) => (
            <div
              key={enr.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-xl hover:border-blue-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-video bg-slate-100">
                  <img
                    src={enr.courseThumbnailUrl || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80'}
                    alt={enr.courseTitle}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3">
                    <StatusPill status={enr.status} size="sm" />
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <h3 className="font-bold text-base text-slate-900 leading-snug line-clamp-2">
                    {enr.courseTitle}
                  </h3>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Progres Belajar</span>
                      <span className="font-bold text-blue-700">{enr.progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-sky-500 h-2 rounded-full"
                        style={{ width: `${enr.progressPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0">
                <Link
                  to={`/student/classroom/${enr.courseId}`}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>
                    {enr.progressPercentage === 100 ? 'Pelajari Ulang' : 'Lanjutkan Belajar'}
                  </span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
