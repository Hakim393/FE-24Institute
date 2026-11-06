import React, { useEffect, useRef, useState } from 'react';
import { adminService } from '../../services/admin.service';
import { useNotification } from '../../context/NotificationContext';
import { Enrollment } from '../../types/order';
import { StatusPill } from '../../components/common/StatusPill';
import { formatDateIndo } from '../../utils/formatters';
import {
  GraduationCap,
  Search,
  Eye,
  RefreshCw,
  Loader2,
  Lock,
} from 'lucide-react';

export const EnrollmentMonitoringPage: React.FC = () => {
  const { showToast } = useNotification();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState('');
  const listRequestRef = useRef(0);
  const detailRequestRef = useRef(0);
  const [selectedEnr, setSelectedEnr] = useState<Enrollment | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const handleOpenDetail = async (enr: Enrollment) => {
    const requestId = ++detailRequestRef.current;
    setSelectedEnr(enr);
    setIsLoadingDetail(true);
    try {
      const res = await adminService.getAdminEnrollmentById(enr.id);
      if (requestId !== detailRequestRef.current) return;
      if (!res.success || !res.data || res.data.id !== enr.id) {
        throw new Error(res.message || 'Detail enrollment tidak valid.');
      }
      setSelectedEnr(res.data);
    } catch (err: any) {
      if (requestId !== detailRequestRef.current) return;
      setSelectedEnr(null);
      showToast(err.message || 'Gagal memuat detail enrollment.', 'error');
    } finally {
      if (requestId === detailRequestRef.current) setIsLoadingDetail(false);
    }
  };

  const closeDetail = () => {
    detailRequestRef.current += 1;
    setSelectedEnr(null);
    setIsLoadingDetail(false);
  };

  const fetchEnrollments = async () => {
    const requestId = ++listRequestRef.current;
    setIsLoading(true);
    setListError('');
    try {
      const res = await adminService.getEnrollmentsMonitoring({
        status: statusFilter || undefined,
      });
      if (requestId !== listRequestRef.current) return;
      if (!res.success || !Array.isArray(res.data)) {
        throw new Error(res.message || 'Server tidak mengembalikan daftar enrollment yang valid.');
      }
      setEnrollments(res.data);
    } catch (err: any) {
      if (requestId !== listRequestRef.current) return;
      setEnrollments([]);
      setListError(err.message || 'Gagal memuat monitoring enrollment.');
    } finally {
      if (requestId === listRequestRef.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, [statusFilter]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <GraduationCap className="w-7 h-7 text-indigo-600" />
            <span>Monitoring Hak Akses & Enrollment (Read-Only)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pengawasan keabsahan pendaftaran siswa terhadap kursus berbayar.
          </p>
        </div>

        <button
          onClick={fetchEnrollments}
          className="p-2.5 rounded-xl bg-white border border-slate-300 text-slate-600 hover:text-indigo-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Contract Policy Callout */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
        <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p>
          <strong>Prinsip Hak Akses:</strong> Status pendaftaran (Enrollment) dikaitkan langsung dengan verifikasi order settlement atau grant resmi sistem. Perubahan status manual tidak disediakan melalui browser.
        </p>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden"
        >
          <option value="">Semua Status Enrollment</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="CANCELLED">CANCELLED</option>
          <option value="REFUNDED">REFUNDED</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="mt-3 text-xs text-slate-500">Memuat data enrollment...</p>
          </div>
        ) : listError ? (
          <div role="alert" className="p-8 space-y-3 bg-rose-50 text-rose-900">
            <p className="font-bold text-sm">Monitoring enrollment belum dapat dimuat</p>
            <p className="text-xs">{listError}</p>
            <button onClick={fetchEnrollments} className="rounded-xl bg-rose-900 text-white px-4 py-2 font-bold text-xs">Coba Lagi</button>
          </div>
        ) : enrollments.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            Belum ada data pendaftaran kursus.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Kursus</th>
                  <th className="py-3 px-4">Siswa</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Progres Belajar</th>
                  <th className="py-3 px-4">Tanggal Terdaftar</th>
                  <th className="py-3 px-4 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enrollments.map((enr) => (
                  <tr key={enr.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{enr.courseTitle}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">
                        {enr.student?.fullName || enr.studentId}
                      </div>
                      <div className="text-[11px] text-slate-400">{enr.student?.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusPill status={enr.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 font-bold text-blue-700">
                      {enr.progressPercentage}%
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {formatDateIndo(enr.enrolledAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenDetail(enr)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detail</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedEnr && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Detail Monitoring Enrollment</h3>
              <button onClick={closeDetail} className="text-slate-400">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              {isLoadingDetail && <div role="status" className="text-indigo-700 font-bold">Memverifikasi detail dari server...</div>}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div>Enrollment ID: <span className="font-mono font-bold">{selectedEnr.id}</span></div>
                <div>Status: <StatusPill status={selectedEnr.status} size="sm" /></div>
                <div>Progres Belajar: <strong className="text-blue-700 font-bold">{selectedEnr.progressPercentage}%</strong></div>
                <div>Terdaftar: {formatDateIndo(selectedEnr.enrolledAt)}</div>
              </div>
              <div>Kursus: <strong className="text-slate-900">{selectedEnr.courseTitle}</strong></div>
              <div>Siswa: <strong className="text-slate-900">{selectedEnr.student?.fullName}</strong> ({selectedEnr.student?.email})</div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={closeDetail}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
