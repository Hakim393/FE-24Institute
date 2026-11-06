import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { publicService } from '../../services/public.service';
import { Course, PublicCategory, CourseLevel } from '../../types/course';
import { formatIDR } from '../../utils/formatters';
import { StatusPill } from '../../components/common/StatusPill';
import { Search, Filter, BookOpen, Compass, ArrowUpDown } from 'lucide-react';

export const CoursesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const search = searchParams.get('search') || '';
  const categoryId = searchParams.get('categoryId') || '';
  const level = (searchParams.get('level') as CourseLevel) || '';
  const candidateSortBy = searchParams.get('sortBy');
  const sortBy = candidateSortBy === 'price' || candidateSortBy === 'title' ? candidateSortBy : 'publishedAt';
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

  useEffect(() => {
    const fetchCatalog = async () => {
      setIsLoading(true);
      try {
        const [cRes, catRes] = await Promise.all([
          publicService.getCourses({
            search: search || undefined,
            categoryId: categoryId || undefined,
            level: level || undefined,
            sortBy,
            sortOrder,
          }),
          publicService.getCategories(),
        ]);
        if (cRes.success && cRes.data) setCourses(cRes.data);
        if (catRes.success && catRes.data) setCategories(catRes.data);
      } catch {
        // handled
      } finally {
        setIsLoading(false);
      }
    };
    fetchCatalog();
  }, [search, categoryId, level, sortBy, sortOrder]);

  const updateParam = (key: string, val: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (val) {
      newParams.set(key, val);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
          <Compass className="w-4 h-4" />
          <span>Katalog Pendidikan</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Jelajahi Kursus Resmi</h1>
        <p className="text-sm text-slate-500 max-w-2xl">
          Pilih kurikulum pembelajaran terverifikasi dengan instruktur berpengalaman. Seluruh kursus yang tampil berstatus dipublikasikan.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search box */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => updateParam('search', e.target.value)}
              placeholder="Cari judul kursus atau materi..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:bg-white focus:border-blue-500 transition"
            />
          </div>

          {/* Category Filter */}
          <div className="sm:col-span-3">
            <select
              value={categoryId}
              onChange={(e) => updateParam('categoryId', e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:bg-white focus:border-blue-500 transition"
            >
              <option value="">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Level Filter */}
          <div className="sm:col-span-2">
            <select
              value={level}
              onChange={(e) => updateParam('level', e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:bg-white focus:border-blue-500 transition"
            >
              <option value="">Semua Tingkat</option>
              <option value="BEGINNER">Pemula (Beginner)</option>
              <option value="INTERMEDIATE">Menengah (Intermediate)</option>
              <option value="ADVANCED">Lanjutan (Advanced)</option>
              <option value="ALL_LEVELS">Semua Tingkat</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="sm:col-span-2">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-');
                const nextParams = new URLSearchParams(searchParams);
                nextParams.set('sortBy', sb);
                nextParams.set('sortOrder', so);
                setSearchParams(nextParams);
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:bg-white focus:border-blue-500 transition"
            >
              <option value="publishedAt-desc">Terbaru</option>
              <option value="price-asc">Harga Terendah</option>
              <option value="price-desc">Harga Tertinggi</option>
              <option value="title-asc">Abjad A-Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Courses List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-80 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 space-y-3">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Tidak ada kursus yang cocok</h3>
          <p className="text-xs text-slate-500">
            Coba sesuaikan kata kunci pencarian atau bersihkan filter kategori.
          </p>
          <button
            onClick={() => setSearchParams({})}
            className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition"
          >
            Reset Semua Filter
          </button>
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
                    <div className="text-[10px] text-slate-400 font-medium">Biaya Investasi</div>
                    <div className="text-base font-extrabold text-blue-900">
                      {formatIDR(course.price)}
                    </div>
                  </div>
                  <span className="px-3.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold group-hover:bg-blue-600 group-hover:text-white transition">
                    Lihat Materi
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
