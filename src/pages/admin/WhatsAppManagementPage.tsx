import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/admin.service';
import { instructorService } from '../../services/instructor.service';
import { useNotification } from '../../context/NotificationContext';
import { WhatsAppGroupLink } from '../../types/admin';
import { Course } from '../../types/course';
import { isValidWhatsAppInviteUrl } from '../../utils/validation';
import { requireMutationSuccess } from '../../utils/mutation-guards';
import {
  MessageCircle,
  Save,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Loader2,
  BookOpen,
} from 'lucide-react';

export const WhatsAppManagementPage: React.FC = () => {
  const { showToast } = useNotification();
  const [generalLink, setGeneralLink] = useState<WhatsAppGroupLink | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [courseLink, setCourseLink] = useState<WhatsAppGroupLink | null>(null);

  // Form states
  const [genUrl, setGenUrl] = useState('');
  const [genActive, setGenActive] = useState(true);
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);

  const [courseUrl, setCourseUrl] = useState('');
  const [courseActive, setCourseActive] = useState(true);
  const [isSavingCourse, setIsSavingCourse] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [genRes, cRes] = await Promise.all([
        adminService.getGeneralWhatsApp(),
        instructorService.getCourses(),
      ]);
      if (genRes.success && genRes.data) {
        setGeneralLink(genRes.data);
        setGenUrl(genRes.data.inviteUrl);
        setGenActive(genRes.data.isActive);
      }
      if (cRes.success && cRes.data) {
        setCourses(cRes.data);
        if (cRes.data.length > 0) {
          setSelectedCourseId(cRes.data[0].id);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal memuat konfigurasi WhatsApp.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchCourseLink = async (courseId: string) => {
    if (!courseId) return;
    try {
      const res = await adminService.getCourseWhatsApp(courseId);
      if (res.success && res.data) {
        setCourseLink(res.data);
        setCourseUrl(res.data.inviteUrl);
        setCourseActive(res.data.isActive);
      }
    } catch {
      setCourseLink(null);
      setCourseUrl('');
      setCourseActive(true);
    }
  };

  useEffect(() => {
    if (selectedCourseId) {
      fetchCourseLink(selectedCourseId);
    }
  }, [selectedCourseId]);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidWhatsAppInviteUrl(genUrl)) {
      showToast('Tautan harus berformat https://chat.whatsapp.com/...', 'error');
      return;
    }
    setIsSavingGeneral(true);
    try {
      const res = await adminService.upsertGeneralWhatsApp(genUrl.trim(), genActive);
      requireMutationSuccess(res);
      if (!res.data) throw new Error('Backend tidak mengembalikan tautan WhatsApp umum terbaru.');
      showToast('Tautan WhatsApp umum berhasil disimpan.', 'success');
      setGeneralLink(res.data);
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan tautan umum.', 'error');
    } finally {
      setIsSavingGeneral(false);
    }
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return;
    if (!isValidWhatsAppInviteUrl(courseUrl)) {
      showToast('Tautan harus berformat https://chat.whatsapp.com/...', 'error');
      return;
    }
    setIsSavingCourse(true);
    try {
      const res = await adminService.upsertCourseWhatsApp(selectedCourseId, courseUrl.trim(), courseActive);
      requireMutationSuccess(res);
      if (!res.data) throw new Error('Backend tidak mengembalikan tautan WhatsApp kursus terbaru.');
      showToast('Tautan WhatsApp kursus berhasil diperbarui.', 'success');
      setCourseLink(res.data);
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan tautan kursus.', 'error');
    } finally {
      setIsSavingCourse(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <MessageCircle className="w-7 h-7 text-emerald-600" />
          <span>Pengelolaan Tautan Grup WhatsApp</span>
        </h1>
        <p className="text-xs text-slate-500">
          Kelola tautan undangan resmi untuk komunitas umum siswa dan grup per-kursus.
        </p>
      </div>

      {/* Contract Policy Callout */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <p>
          <strong>Format Wajib Server:</strong> Tautan undangan WhatsApp harus berupa URL valid berawalan <code className="font-mono font-bold text-slate-800">https://chat.whatsapp.com/...</code>. Tautan arbitrer atau domain lain akan ditolak oleh validasi server.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 1. GENERAL GROUP CONFIG */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-5">
          <div className="space-y-1">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Grup Komunitas Umum (General)</span>
            </h2>
            <p className="text-xs text-slate-500">
              Dapat diakses oleh seluruh siswa aktif yang memiliki setidaknya 1 kursus terdaftar.
            </p>
          </div>

          <form onSubmit={handleSaveGeneral} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold uppercase mb-1">
                Tautan Undangan (Invite URL) *
              </label>
              <input
                type="url"
                required
                value={genUrl}
                onChange={(e) => setGenUrl(e.target.value)}
                placeholder="https://chat.whatsapp.com/..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:outline-hidden focus:bg-white focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-semibold">
                <input
                  type="checkbox"
                  checked={genActive}
                  onChange={(e) => setGenActive(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Aktifkan tautan ini untuk siswa</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSavingGeneral}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              {isSavingGeneral ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Simpan Tautan Umum</span>
            </button>
          </form>
        </div>

        {/* 2. COURSE-SPECIFIC GROUP CONFIG */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-5">
          <div className="space-y-1">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>Grup Diskusi Spesifik Kursus</span>
            </h2>
            <p className="text-xs text-slate-500">
              Hanya dapat diakses oleh siswa yang memiliki hak akses aktif pada kursus terkait.
            </p>
          </div>

          <form onSubmit={handleSaveCourse} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold uppercase mb-1">
                Pilih Kursus Terdaftar *
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-hidden"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase mb-1">
                Tautan Grup Kursus *
              </label>
              <input
                type="url"
                required
                value={courseUrl}
                onChange={(e) => setCourseUrl(e.target.value)}
                placeholder="https://chat.whatsapp.com/..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:outline-hidden focus:bg-white focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-semibold">
                <input
                  type="checkbox"
                  checked={courseActive}
                  onChange={(e) => setCourseActive(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Aktifkan tautan ini untuk siswa kursus</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSavingCourse || !selectedCourseId}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              {isSavingCourse ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Simpan Tautan Kursus</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
