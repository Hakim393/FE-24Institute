import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/admin.service';
import { useNotification } from '../../context/NotificationContext';
import { adaptReviewQueue, adaptReviewDetail, type ReviewQueueEntry, type ReviewVersionDetail } from '../../services/adapters/admin-review-contract';
import { StatusPill } from '../../components/common/StatusPill';
import { formatDateTimeIndo, formatIDR } from '../../utils/formatters';
import {
  FileCheck2,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  Loader2,
  BookOpen,
  Globe,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const CourseReviewPage: React.FC = () => {
  const { showToast } = useNotification();
  const [reviews, setReviews] = useState<ReviewQueueEntry[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING_REVIEW');
  const [isLoading, setIsLoading] = useState(true);

  // Detail & Decision Modal
  const [selectedVersion, setSelectedVersion] = useState<ReviewVersionDetail | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Decision State
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | 'REQUEST_CHANGES'>('APPROVED');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const res = await adminService.getCourseReviews({
        status: statusFilter || undefined,
      });
      if (!res.success) throw new Error('API antrean review gagal');
      setReviews(adaptReviewQueue(res.data));
    } catch (err: any) {
      setReviews([]);
      showToast(err.message || 'Gagal memuat antrean review kursus.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [statusFilter]);

  const handleOpenDetail = async (courseVersionId: string) => {
    setSelectedVersion(null);
    setIsLoadingDetail(true);
    setDetailModalOpen(true);
    try {
      const res = await adminService.getCourseReviewDetail(courseVersionId);
      if (!res.success) throw new Error('API detail review gagal');
      setSelectedVersion(adaptReviewDetail(res.data, courseVersionId));
    } catch (err: any) {
      setDetailModalOpen(false);
      showToast(err.message || 'Gagal memuat detail versi kursus.', 'error');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVersion || !selectedVersion.reviewable || selectedVersion.status !== 'PENDING_REVIEW') {
      showToast('Versi ini tidak berada dalam status menunggu peninjauan.', 'error');
      return;
    }

    if ((decision === 'REJECTED' || decision === 'REQUEST_CHANGES') && !decisionNotes.trim()) {
      showToast('Catatan review wajib diisi untuk keputusan REJECTED atau REQUEST_CHANGES.', 'error');
      return;
    }

    setIsSubmittingDecision(true);
    try {
      const res = await adminService.decideCourseReview(selectedVersion.id, {
        decision,
        expectedSubmittedAt: selectedVersion.submittedAt,
        expectedReviewCount: selectedVersion.reviewCount,
        notes: decisionNotes.trim() || undefined,
      });

      if (res.success) {
        showToast(`Keputusan review '${decision}' berhasil disimpan.`, 'success');
        setDetailModalOpen(false);
        setDecisionNotes('');
        fetchReviews();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan keputusan review.', 'error');
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const handlePublish = async (courseVersionId: string) => {
    if (!selectedVersion || selectedVersion.id !== courseVersionId || selectedVersion.status !== 'APPROVED' || !selectedVersion.isCurrentDraft) {
      showToast('Versi belum dapat dipublikasikan. Muat ulang detail review.', 'error');
      return;
    }
    if (!confirm('Publikasikan versi kursus ini ke katalog siswa sekarang?')) return;
    setIsPublishing(true);
    try {
      const res = await adminService.publishCourseReview(courseVersionId);
      if (res.success) {
        showToast('Versi kursus resmi berhasil DIPUBLIKASIKAN ke publik!', 'success');
        setDetailModalOpen(false);
        fetchReviews();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal mempublikasikan kursus.', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileCheck2 className="w-7 h-7 text-amber-600" />
            <span>Review & Publikasi Kursus</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tinjau pengajuan kurikulum dari instruktur, lakukan verifikasi silabus, dan terbitkan kursus resmi.
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-hidden"
        >
          <option value="PENDING_REVIEW">Menunggu Review (PENDING_REVIEW)</option>
          <option value="APPROVED">Disetujui (APPROVED)</option>
          <option value="REJECTED">Ditolak (REJECTED)</option>
          <option value="PUBLISHED">Dipublikasikan (PUBLISHED)</option>
          <option value="ARCHIVED">Diarsipkan (ARCHIVED)</option>
        </select>
      </div>

      {/* Note about distinct Approve vs Publish */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <p>
          <strong>Aturan Keamanan Publikasi:</strong> Tindakan <em>Approve</em> hanya menyatakan versi kurikulum memenuhi standar, tidak otomatis mempublikasikannya. Publikasi (<em>Publish</em>) adalah aksi terpisah yang mengaktifkan kursus di katalog publik.
        </p>
      </div>

      {/* Reviews Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-amber-600 animate-spin mx-auto" />
            <p className="mt-3 text-xs text-slate-500">Memuat antrean review kursus...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            Tidak ada pengajuan review kursus pada status ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Kursus & Versi</th>
                  <th className="py-3 px-4">Harga & Instruktur</th>
                  <th className="py-3 px-4">Status Review</th>
                  <th className="py-3 px-4">Waktu Diajukan</th>
                  <th className="py-3 px-4 text-right">Aksi Reviewer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reviews.map((rev) => (
                  <tr key={rev.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">{rev.title}</div>
                      <div className="text-[11px] font-mono text-slate-400">
                        Versi #{rev.versionNumber} &middot; ID: {rev.id}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800"><span className="text-slate-500">Lihat detail versi</span></div>
                      <div className="text-[11px] text-slate-500">{rev.instructorName}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusPill status={rev.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {formatDateTimeIndo(rev.submittedAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenDetail(rev.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs transition inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Periksa Versi</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* REVIEW & DECISION MODAL */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">Pemeriksaan Kurikulum Kursus</h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  Versi: {selectedVersion?.id}
                </span>
              </div>
              <button onClick={() => setDetailModalOpen(false)} className="text-slate-400">
                ✕
              </button>
            </div>

            {isLoadingDetail || !selectedVersion ? (
              <div className="py-12 text-center">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                <p className="mt-3 text-xs text-slate-500">Memuat snapshot kurikulum...</p>
              </div>
            ) : (
              <div className="space-y-6 text-xs text-slate-700">
                {/* Meta details */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 font-semibold">Judul Kursus</span>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">
                      {selectedVersion.title}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold">Instruktur Pengampu</span>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">
                      {selectedVersion.instructorName}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold">Biaya Draf</span>
                    <div className="font-bold text-slate-900 mt-0.5 font-mono">
                      {formatIDR(selectedVersion.price)}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold">Tingkat Kursus</span>
                    <div className="font-bold text-slate-900 mt-0.5">{selectedVersion.level}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold">Status Saat Ini</span>
                    <div className="mt-0.5">
                      <StatusPill status={selectedVersion.status} size="sm" />
                    </div>
                  </div>
                </div>

                {/* Curriculum Snapshot Preview */}
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>Snapshot Bab & Pelajaran ({selectedVersion.chapters?.length || 0} Bab)</span>
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedVersion.chapters?.map((chap: any, cIdx: number) => (
                      <div key={chap.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                        <div className="font-bold text-slate-800">
                          Bab {cIdx + 1}: {chap.title}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {chap.lessonCount} pelajaran &middot; {chap.quizCount} kuis evaluasi
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* DECISION FORM */}
                {selectedVersion.reviewable && selectedVersion.status === 'PENDING_REVIEW' && (
                <form onSubmit={handleDecision} className="space-y-4 pt-4 border-t border-slate-200">
                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                      Pilih Keputusan Review *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setDecision('APPROVED')}
                        className={`py-2 px-3 rounded-xl font-bold text-xs border transition ${
                          decision === 'APPROVED'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        ✓ APPROVED
                      </button>
                      <button
                        type="button"
                        onClick={() => setDecision('REQUEST_CHANGES')}
                        className={`py-2 px-3 rounded-xl font-bold text-xs border transition ${
                          decision === 'REQUEST_CHANGES'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        ⚠ REVISI
                      </button>
                      <button
                        type="button"
                        onClick={() => setDecision('REJECTED')}
                        className={`py-2 px-3 rounded-xl font-bold text-xs border transition ${
                          decision === 'REJECTED'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        ✕ REJECTED
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                      Catatan Peninjauan Reviewer {decision !== 'APPROVED' && '*'}
                    </label>
                    <textarea
                      rows={3}
                      value={decisionNotes}
                      onChange={(e) => setDecisionNotes(e.target.value)}
                      placeholder="Umpan balik kurikulum untuk instruktur..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end ml-auto">
                      <button
                        type="button"
                        onClick={() => setDetailModalOpen(false)}
                        className="px-4 py-2 text-slate-500 font-semibold"
                      >
                        Tutup
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingDecision}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition disabled:opacity-50"
                      >
                        {isSubmittingDecision ? 'Menyimpan...' : 'Simpan Keputusan'}
                      </button>
                    </div>
                  </div>
                </form>
                  )}
                  {selectedVersion.status === 'APPROVED' && selectedVersion.isCurrentDraft && (
                    <button type="button" onClick={() => handlePublish(selectedVersion.id)} disabled={isPublishing} className="w-full px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs disabled:opacity-50">
                      {isPublishing ? 'Memproses publikasi...' : 'Publikasikan Versi Ini ke Katalog'}
                    </button>
                  )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
