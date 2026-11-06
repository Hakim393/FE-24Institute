import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/admin.service';
import { useNotification } from '../../context/NotificationContext';
import { Certificate } from '../../types/certificate';
import { requireCertificateTransition } from '../../utils/connected-contract-guards';
import { StatusPill } from '../../components/common/StatusPill';
import { formatDateIndo } from '../../utils/formatters';
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Loader2,
  Send,
  Eye,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

export const CertificateManagementPage: React.FC = () => {
  const { showToast } = useNotification();
  const [requests, setRequests] = useState<Certificate[]>([]);
  const [statusFilter, setStatusFilter] = useState<'PROCESSING' | 'ELIGIBLE' | 'REJECTED'>('PROCESSING');
  const [isLoading, setIsLoading] = useState(true);

  // Detail & Action Modals
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [decision, setDecision] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Revoke modal
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);

  const handleUploadTemplate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      showToast('Template sertifikat harus berformat PDF (.pdf).', 'error');
      return;
    }
    setIsUploadingTemplate(true);
    try {
      const res = await adminService.uploadCertificatePdfFile(file);
      if (res.success !== true || !res.data?.mediaId || !res.data?.url) {
        throw new Error('Upload template belum dikonfirmasi server.');
      }
      showToast('Template sertifikat berhasil diunggah ke storage sistem.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal mengunggah template sertifikat.', 'error');
    } finally {
      setIsUploadingTemplate(false);
      e.target.value = '';
    }
  };

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const res = await adminService.getCertificateRequests(statusFilter);
      if (res.success !== true || !Array.isArray(res.data)) throw new Error('Respons antrean sertifikat tidak valid.');
      setRequests(res.data);
    } catch (err: any) {
      showToast(err.message || 'Gagal memuat antrean sertifikat.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCert) return;

    if (decision === 'REJECT' && !reviewNotes.trim()) {
      showToast('Catatan review wajib diisi untuk penolakan sertifikat.', 'error');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const res = await adminService.reviewCertificate(
        selectedCert.id,
        decision,
        reviewNotes.trim() || undefined
      );
      requireCertificateTransition(res, selectedCert.id, decision === 'APPROVE' ? 'ELIGIBLE' : 'REJECTED');
      {
        showToast(
          decision === 'APPROVE'
            ? 'Pengajuan disetujui. Status berubah menjadi ELIGIBLE (Siap Diterbitkan).'
            : 'Pengajuan sertifikat ditolak.',
          'success'
        );
        setReviewModalOpen(false);
        setReviewNotes('');
        fetchRequests();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan review sertifikat.', 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleIssueCertificate = async (certId: string) => {
    if (!confirm('Terbitkan sertifikat digital resmi untuk siswa ini sekarang?')) return;
    try {
      const res = await adminService.issueCertificate(certId);
      requireCertificateTransition(res, certId, 'ISSUED');
      showToast('Nomor sertifikat digital berhasil diterbitkan. Ketersediaan PDF diverifikasi terpisah.', 'success');
      fetchRequests();
    } catch (err: any) {
      showToast(err.message || 'Gagal menerbitkan sertifikat.', 'error');
    }
  };

  const handleRevokeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCert) return;

    if (revokeReason.trim().length < 10) {
      showToast('Alasan pencabutan sertifikat minimal 10 karakter.', 'error');
      return;
    }

    setIsRevoking(true);
    try {
      const res = await adminService.revokeCertificate(selectedCert.id, revokeReason.trim());
      requireCertificateTransition(res, selectedCert.id, 'REVOKED');
      {
        showToast('Sertifikat berhasil dicabut (REVOKED).', 'info');
        setRevokeModalOpen(false);
        setRevokeReason('');
        fetchRequests();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal mencabut sertifikat.', 'error');
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Award className="w-7 h-7 text-purple-600" />
            <span>Manajemen & Verifikasi Sertifikat</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Alur verifikasi 2-tahap resmi: Verifikasi kelayakan (APPROVE &rarr; ELIGIBLE) dan Penerbitan (ISSUE).
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
          {(['PROCESSING', 'ELIGIBLE', 'REJECTED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                statusFilter === tab
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab === 'PROCESSING'
                ? 'Menunggu Review'
                : tab === 'ELIGIBLE'
                ? 'Disetujui (Siap Terbit)'
                : 'Ditolak'}
            </button>
          ))}
        </div>
      </div>

      {/* Two-step issuance rule callout */}
      <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-xs text-purple-900 flex items-start gap-2.5">
        <Clock className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
        <p>
          <strong>Prinsip Verifikasi Backend:</strong> Menyetujui (APPROVE) pengajuan sertifikat mengubah status menjadi <strong>ELIGIBLE</strong>. Penerbitan nomor digital resmi (<strong>ISSUE</strong>) merupakan aksi terpisah untuk menjamin akuntabilitas audit.
        </p>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
            <p className="mt-3 text-xs text-slate-500">Memuat antrean sertifikat...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            Tidak ada permintaan sertifikat pada antrean ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Nomor Registri & Kursus</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-4">Status Pengajuan</th>
                  <th className="py-3 px-4">Tanggal Pengajuan</th>
                  <th className="py-3 px-4 text-right">Tindakan Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{req.courseTitle}</div>
                      <div className="text-[11px] font-mono text-purple-700 font-semibold">
                        {req.certificateNumber}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {req.studentName}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusPill status={req.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {formatDateIndo(req.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* If PROCESSING -> Review button */}
                        {req.status === 'PROCESSING' && (
                          <button
                            onClick={() => {
                              setSelectedCert(req);
                              setDecision('APPROVE');
                              setReviewModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs transition"
                          >
                            Review Permintaan
                          </button>
                        )}

                        {/* If ELIGIBLE -> Issue button */}
                        {req.status === 'ELIGIBLE' && (
                          <button
                            onClick={() => handleIssueCertificate(req.id)}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 font-bold text-xs transition flex items-center gap-1 shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Terbitkan Sertifikat (ISSUE)</span>
                          </button>
                        )}

                        {/* Revoke button */}
                        {req.status === 'ISSUED' && (
                          <button
                            onClick={() => {
                              setSelectedCert(req);
                              setRevokeModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs transition"
                          >
                            Cabut (Revoke)
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* REVIEW MODAL */}
      {reviewModalOpen && selectedCert && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Review Pengajuan Sertifikat</h3>
              <button onClick={() => setReviewModalOpen(false)} className="text-slate-400">
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1">
              <div>Siswa: <strong className="text-slate-900">{selectedCert.studentName}</strong></div>
              <div>Kursus: <strong className="text-slate-900">{selectedCert.courseTitle}</strong></div>
              <div>No. Registri: <span className="font-mono text-purple-700">{selectedCert.certificateNumber}</span></div>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1.5">
                  Keputusan Verifikasi
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDecision('APPROVE')}
                    className={`py-2 px-3 rounded-xl font-bold border transition ${
                      decision === 'APPROVE'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    ✓ Setujui (ELIGIBLE)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecision('REJECT')}
                    className={`py-2 px-3 rounded-xl font-bold border transition ${
                      decision === 'REJECT'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    ✕ Tolak Pengajuan
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">
                  Catatan Reviewer {decision === 'REJECT' && '*'}
                </label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Catatan konfirmasi atau alasan penolakan..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-3 py-2 text-slate-500 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                >
                  {isSubmittingReview ? 'Menyimpan...' : 'Simpan Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVOKE MODAL */}
      {revokeModalOpen && selectedCert && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-rose-900 flex items-center gap-1.5">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>Pencabutan Sertifikat (Revocation)</span>
              </h3>
              <button onClick={() => setRevokeModalOpen(false)} className="text-slate-400">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Tindakan ini akan membatalkan keabsahan sertifikat <strong className="font-mono text-slate-900">{selectedCert.certificateNumber}</strong> secara permanen.
            </p>

            <form onSubmit={handleRevokeSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">
                  Alasan Pencabutan (Wajib 10-1000 Karakter) *
                </label>
                <textarea
                  rows={4}
                  required
                  minLength={10}
                  maxLength={1000}
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="Jelaskan alasan pelanggaran integritas atau pembatalan sertifikat..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
                <span className="text-[10px] text-slate-400">
                  {revokeReason.length} / 1000 karakter
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRevokeModalOpen(false)}
                  className="px-3 py-2 text-slate-500 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isRevoking || revokeReason.trim().length < 10}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs disabled:opacity-50"
                >
                  {isRevoking ? 'Memproses...' : 'Cabut Sertifikat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
