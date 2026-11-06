import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useConnection } from '../../context/ConnectionContext';
import { adminService } from '../../services/admin.service';
import { useAuth } from '../../context/AuthContext';
import { AdminDashboardOverview } from '../../types/admin';
import {
  Users,
  Layers,
  Award,
  Receipt,
  FolderTree,
  FileCheck2,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  Shield,
  Loader2,
  Sparkles,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { isForcedMock } = useConnection();
  const { user, role } = useAuth();
  const [overview, setOverview] = useState<AdminDashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setLoadError(null);
        const res = await adminService.getDashboardOverview();
        if (res.success && res.data && typeof res.data.totalUsers === 'number' && typeof res.data.publishedCourses === 'number') {
          setOverview(res.data);
        } else {
          setOverview(null);
          setLoadError('Backend belum memberikan ringkasan Admin yang valid.');
        }
      } catch {
        setOverview(null);
        setLoadError('Gagal memuat data Admin. Periksa koneksi API dan hak akses.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchOverview();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-400/30">
            <Shield className="w-3.5 h-3.5" />
            <span>{role === 'SUPER_ADMIN' ? 'Super Admin Console' : 'Administrator Operasional'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            24Institute LMS Management System
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Pusat kendali operasional platform: pantau metrik pengguna, kelola review kurikulum, verifikasi penerbitan sertifikat, dan awasi transaksi penjualan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/admin/users"
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm"
          >
            Manajemen Pengguna
          </Link>
          <Link
            to="/admin/course-reviews"
            className="px-4 py-2.5 rounded-xl font-semibold text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20 transition"
          >
            Review Kursus
          </Link>
        </div>
      </div>

      {import.meta.env.DEV && isForcedMock && (
        <p data-testid="simulation-data-disclaimer" role="note" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-relaxed text-amber-900">
          Data simulasi untuk pratinjau UI — angka pengguna, sertifikat, dan transaksi bukan metrik operasional sungguhan.
        </p>
      )}

      {loadError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{loadError}</div>}

      {/* KPI Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : overview && !loadError ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase">Siswa + Instruktur</div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {overview?.totalUsers.toLocaleString('id-ID')}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {overview?.totalStudents} Siswa &middot; {overview?.totalInstructors} Instruktur
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase">Versi Terpublikasi</div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {overview?.publishedCourses}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {overview?.draftCourses !== undefined ? `${overview.draftCourses} Draf` : ''}
                {overview?.submittedReviews !== undefined ? ` · ${overview.submittedReviews} Menunggu Review` : ''}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase">Sertifikat Diterbitkan</div>
              <div className="text-2xl font-black text-purple-700 mt-1">
                {overview?.totalCertificatesIssued !== undefined ? overview.totalCertificatesIssued : 'Tersedia'}
              </div>
              <div className="text-[11px] text-purple-600 font-semibold mt-0.5">
                {overview?.pendingCertificateRequests !== undefined ? `${overview.pendingCertificateRequests} Antrean Review` : 'Manajemen Sertifikat'}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Award className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase">Transaksi Penjualan</div>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {overview?.paidOrders}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Subtotal PAID + PENDING: {overview?.totalOrders}; status lain tidak termasuk
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Receipt className="w-6 h-6" />
            </div>
          </div>
        </div>
      ) : null}

      {/* Operational Modules Quick Access Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Modul Operasional Utama</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/admin/course-reviews"
            className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-lg transition group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold mb-3 group-hover:bg-amber-600 group-hover:text-white transition">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900 group-hover:text-indigo-600">
                Review & Publikasi Kursus
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Tinjau kurikulum versi submitted dari instruktur, berikan keputusan (APPROVE/REJECT), dan publikasikan.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600">
              <span>Buka Review Queue</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          <Link
            to="/admin/certificates"
            className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-lg transition group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold mb-3 group-hover:bg-purple-600 group-hover:text-white transition">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900 group-hover:text-indigo-600">
                Manajemen Sertifikat Digital
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Verifikasi kelayakan siswa, setujui permintaan, terbitkan nomor registri resmi, atau lakukan pencabutan (revoke).
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600">
              <span>Buka Antrean Sertifikat</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          <Link
            to="/admin/orders"
            className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-lg transition group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold mb-3 group-hover:bg-emerald-600 group-hover:text-white transition">
                <Receipt className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900 group-hover:text-indigo-600">
                Monitoring Transaksi Midtrans
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Pengawasan read-only status order siswa, token checkout, rekonsiliasi pembayaran, dan enrollment access.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600">
              <span>Buka Monitoring</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};
