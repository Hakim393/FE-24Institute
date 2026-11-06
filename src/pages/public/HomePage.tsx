import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { publicService } from '../../services/public.service';
import { Course, PublicCategory } from '../../types/course';
import { formatIDR } from '../../utils/formatters';
import { StatusPill } from '../../components/common/StatusPill';
import {
  Compass,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  BookOpen,
  Award,
  Users,
  Search,
  Sparkles,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [certSearch, setCertSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cRes, catRes] = await Promise.all([
          publicService.getCourses({ limit: 6 }),
          publicService.getCategories({ limit: 4 }),
        ]);
        if (cRes.success && cRes.data) setCourses(cRes.data);
        if (catRes.success && catRes.data) setCategories(catRes.data);
      } catch {
        setLoadError(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-900 via-blue-950 to-slate-900 text-white pt-12 pb-16 sm:pt-16 sm:pb-24 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-sky-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Platform LMS Resmi Pendidikan Bisnis & Teknologi</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
                Kuasai Keterampilan Masa Depan Bersama{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-200">
                  24Institute
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
                Akses kurikulum terstruktur, materi interaktif dari praktisi industri, evaluasi kuis otomatis, alur pemesanan kursus, dan sertifikat digital internal.
              </p>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  to="/courses"
                  className="px-6 py-3.5 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition flex items-center gap-2"
                >
                  <Compass className="w-4 h-4" />
                  Mulai Belajar Sekarang
                </Link>
                <Link
                  to="/verify-certificate"
                  className="px-6 py-3.5 rounded-xl font-semibold text-sm bg-white/10 hover:bg-white/20 text-white border border-white/20 transition flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Verifikasi Sertifikat
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="pt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-white/10 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-400" />
                  <span>Kurikulum Terstruktur</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-400" />
                  <span>Alur Pemesanan Kursus</span>
                </div>
                <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                  <CheckCircle2 className="w-4 h-4 text-sky-400" />
                  <span>Verifikasi Sertifikat Digital</span>
                </div>
              </div>
            </div>

            {/* Hero Image Showcase */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-md bg-gradient-to-tr from-blue-600/20 to-sky-400/20 p-2 rounded-3xl border border-white/20 shadow-2xl backdrop-blur-md">
                <div className="bg-slate-900 rounded-2xl overflow-hidden p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <img
                        src="/brand/logo-24institute.png"
                        alt="24Institute"
                        className="h-10 w-auto"
                      />
                      <div>
                        <div className="font-bold text-sm text-white">24Institute Classroom</div>
                        <div className="text-xs text-sky-400">Contoh Dashboard Siswa</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                      ILUSTRASI UI
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60">
                      <div className="text-xs font-semibold text-slate-300">Contoh Progres Kursus</div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-white font-medium">Fullstack TypeScript Masterclass</span>
                        <span className="text-sky-400 font-bold">65%</span>
                      </div>
                      <div className="mt-1.5 w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-500 to-sky-400 h-2 rounded-full w-[65%]" />
                      </div>
                    </div>

                    <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Award className="w-5 h-5 text-amber-400" />
                        <div>
                          <div className="text-xs font-bold text-white">Contoh Tampilan Sertifikat</div>
                          <div className="text-[10px] text-slate-400">Verifikasi Nomor: 24I-A1B2...</div>
                        </div>
                      </div>
                      <span className="text-xs text-emerald-400 font-semibold">Tersedia</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Courses Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Katalog Kursus Pilihan
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Pelajari materi resmi yang telah dipublikasikan dan siap dipelajari.
            </p>
          </div>
          <Link
            to="/courses"
            className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-800 transition"
          >
            <span>Lihat Semua Kursus</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-80 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : loadError ? (
          <div role="status" className="text-center py-12 px-4 bg-amber-50 rounded-2xl border border-amber-200">
            <p className="text-amber-900 font-semibold">Katalog belum dapat dimuat.</p>
            <p className="text-amber-800 text-sm mt-1">Periksa koneksi backend, lalu muat ulang halaman.</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <p className="text-slate-500">Belum ada kursus published yang tersedia.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Link
                key={course.id}
                to={`/courses/${course.slug}`}
                className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-xl hover:border-blue-300 transition-all duration-300 flex flex-col"
              >
                <div className="relative aspect-video bg-slate-100 overflow-hidden">
                  <img
                    src={course.thumbnailUrl || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80'}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 right-3">
                    <StatusPill status={course.level} size="sm" />
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                      {course.category?.name || 'Kursus'}
                    </span>
                    <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition leading-snug line-clamp-2">
                      {course.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {course.subtitle || course.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">Investasi Belajar</div>
                      <div className="text-base font-extrabold text-blue-900">
                        {formatIDR(course.price)}
                      </div>
                    </div>
                    <span className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold group-hover:bg-blue-600 group-hover:text-white transition">
                      Detail Kursus
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Categories Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Kategori Pembelajaran
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Pilih jalur bidang studi yang relevan dengan tujuan karir dan bisnis Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/courses?categoryId=${cat.id}`}
              className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-4 group-hover:bg-blue-600 group-hover:text-white transition">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition">
                  {cat.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {cat.description || 'Koleksi kursus pilihan'}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-blue-600">
                <span>{cat.publishedCourseCount} Kursus Aktif</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick Certificate Verification Callout */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-xl">
          <div className="max-w-3xl space-y-4 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Verifikasi Keaslian Sertifikat Digital</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black">
              Cek Validitas Sertifikat Resmi 24Institute
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Setiap sertifikat yang diterbitkan oleh 24Institute memiliki nomor registri unik dengan format{' '}
              <code className="bg-black/30 px-2 py-0.5 rounded font-mono text-xs text-sky-300">
                24I-[HEX]
              </code>
              . Verifikasi secara instan tanpa mengekspos data pribadi siswa.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (certSearch.trim()) {
                  window.location.href = `/verify-certificate?number=${encodeURIComponent(certSearch.trim())}`;
                }
              }}
              className="pt-2 flex flex-col sm:flex-row gap-3 max-w-lg"
            >
              <input
                type="text"
                value={certSearch}
                onChange={(e) => setCertSearch(e.target.value)}
                placeholder="Contoh: 24I-A1B2C3D4..."
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-hidden focus:border-sky-400 font-mono"
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm transition flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                <span>Verifikasi</span>
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};
