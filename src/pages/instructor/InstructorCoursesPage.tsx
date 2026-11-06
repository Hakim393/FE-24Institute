import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { instructorService } from '../../services/instructor.service';
import { requireCreatedId, requireMutationSuccess } from '../../utils/mutation-guards';
import { publicService } from '../../services/public.service';
import { useNotification } from '../../context/NotificationContext';
import { Course, PublicCategory, CourseLevel } from '../../types/course';
import { formatIDR } from '../../utils/formatters';
import { isValidDecimalPrice } from '../../utils/validation';
import {
  Layers,
  Plus,
  Search,
  BookPlus,
  Trash2,
  ExternalLink,
  Edit3,
  Loader2,
  AlertCircle,
  FileCode,
} from 'lucide-react';

export const InstructorCoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Create course modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('299000');
  const [level, setLevel] = useState<CourseLevel>('BEGINNER');
  const [language, setLanguage] = useState('id');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const { showToast } = useNotification();
  const navigate = useNavigate();

  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const [cRes, catRes] = await Promise.all([
        instructorService.getCourses({ search: search || undefined }),
        publicService.getCategories(),
      ]);
      if (!cRes.success || !Array.isArray(cRes.data)) throw new Error(cRes.message || 'Kursus instruktur tidak dapat dimuat.');
      if (!catRes.success || !Array.isArray(catRes.data)) throw new Error(catRes.message || 'Kategori tidak dapat dimuat.');
      setCourses(cRes.data);
      if (catRes.success && catRes.data) {
        setCategories(catRes.data);
        if (!categoryId && catRes.data.length > 0) setCategoryId(catRes.data[0].id);
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal memuat kursus.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [search]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subtitle.trim() || !description.trim() || !categoryId) {
      setCreateError('Judul, deskripsi singkat, deskripsi lengkap, dan kategori wajib diisi.');
      return;
    }
    if (!isValidDecimalPrice(price)) {
      setCreateError('Harga harus berupa nominal angka valid.');
      return;
    }

    setCreateError('');
    setIsCreating(true);

    try {
      const res = await instructorService.createCourse({
        title: title.trim(),
        shortDescription: subtitle.trim(),
        description: description.trim(),
        categoryId,
        price: price.trim(),
        currency: 'IDR',
        level,
        language,
      });

      const createdCourseId = requireCreatedId(res);
      {
        showToast('Draft kursus baru berhasil dibuat!', 'success');
        setCreateModalOpen(false);
        // Reset
        setTitle('');
        setSubtitle('');
        setDescription('');
        setPrice('299000');
        // Navigate to Builder
        navigate(`/instructor/builder/${createdCourseId}`);
      }
    } catch (err: any) {
      setCreateError(err.message || 'Gagal membuat draft kursus.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus draft kursus ini?')) return;
    try {
      const res = await instructorService.deleteDraftCourse(courseId);
      requireMutationSuccess(res);
      {
        showToast('Draft kursus dihapus.', 'info');
        fetchCourses();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus kursus.', 'error');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <FileCode className="w-7 h-7 text-teal-400" />
            <span>Katalog Kursus Dikelola</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Kelola draf materi, silabus kurikulum, dan versi publikasi kursus instruktur Anda.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition flex items-center gap-2 shadow-md shadow-teal-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Kursus Baru</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari judul kursus atau slug..."
          className="bg-transparent border-0 text-white placeholder-slate-500 text-xs w-full focus:outline-hidden"
        />
      </div>

      {/* Courses List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slate-950 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-slate-950 p-12 rounded-3xl border border-slate-800 text-center space-y-4">
          <BookPlus className="w-12 h-12 text-slate-700 mx-auto" />
          <h3 className="text-base font-bold text-white">Belum Ada Kursus</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Mulailah merancang kurikulum pertama Anda sekarang menggunakan tombol di bawah.
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 transition"
          >
            Buat Kursus Pertama
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-slate-950 p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800/40">
                    {course.category?.name || 'Kursus'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded">
                    slug: {course.slug}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-900 px-2 py-0.5 rounded">
                    Level: {course.level}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white leading-snug">{course.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {course.subtitle || course.description}
                </p>

                <div className="text-xs text-slate-400 flex items-center gap-3 pt-1">
                  <span>
                    {course.publishedVersionId && !course.currentDraftVersionId ? 'Harga Terbit' : 'Harga Draf'}: <strong className="text-white font-mono">{formatIDR(course.price)}</strong>
                  </span>
                  {course.publishedVersionId && !course.currentDraftVersionId && <span className="text-emerald-300 font-semibold">Terbit · Revisi tersedia</span>}
                  {course.publishedVersionId && course.currentDraftVersionId && <span className="text-amber-300 font-semibold">Draft revisi aktif</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                <Link
                  to={`/instructor/builder/${course.id}`}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{course.publishedVersionId && !course.currentDraftVersionId ? 'Buat Revisi' : 'Course Builder'}</span>
                </Link>

                {!course.publishedVersionId && course.draftVersion?.status === 'DRAFT' && (
                  <button
                    onClick={() => handleDeleteCourse(course.id)}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-rose-400 hover:bg-rose-950/40 hover:border-rose-900 transition"
                    title="Hapus Draft Kursus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Course Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-950 text-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <BookPlus className="w-5 h-5 text-teal-400" />
                <span>Buat Draft Kursus Baru</span>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCourse} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">
                  Judul Kursus *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Arsitektur Microservices dengan TypeScript"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-teal-400 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">
                  Deskripsi Singkat * (maks. 500 karakter)
                </label>
                <input
                  type="text"
                  required
                  maxLength={500}
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Ringkasan 1 kalimat"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-teal-400 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">
                  Deskripsi Lengkap *
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Penjelasan mendalam tentang materi kursus..."
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-teal-400 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-1">
                    Kategori *
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-teal-400 text-xs"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-1">
                    Biaya (IDR Decimal String) *
                  </label>
                  <input
                    type="text"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="299000.00"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono focus:outline-hidden focus:border-teal-400 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-1">Tingkat</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value as CourseLevel)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-teal-400 text-xs"
                  >
                    <option value="BEGINNER">BEGINNER</option>
                    <option value="INTERMEDIATE">INTERMEDIATE</option>
                    <option value="ADVANCED">ADVANCED</option>
                    <option value="ALL_LEVELS">ALL_LEVELS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-1">Bahasa</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-teal-400 text-xs"
                  >
                    <option value="id">Bahasa Indonesia (id)</option>
                    <option value="en">English (en)</option>
                    <option value="id-ID">Indonesia (id-ID)</option>
                    <option value="en-US">English US (en-US)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white font-semibold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isCreating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Buat & Lanjut ke Kurikulum</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
