import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { studentService } from '../../services/student.service';
import { useNotification } from '../../context/NotificationContext';
import { requireCertificateRequest, requirePdfBlob } from '../../utils/connected-contract-guards';
import {
  adaptStudentCertificateEligibility,
  adaptStudentCertificateList,
  requireIssuedCertificateDetail,
  type CertificateClaimEligibility,
  type StudentCertificateRecord,
} from '../../utils/student-certificate-contract';
import type { Enrollment } from '../../types/order';
import { formatDateIndo } from '../../utils/formatters';
import { StatusPill } from '../../components/common/StatusPill';
import { Award, Download, CheckCircle2, Clock, AlertCircle, FileCheck, Loader2, ShieldCheck, Send, RotateCcw } from 'lucide-react';

export const StudentCertificatesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const courseIdParam = searchParams.get('courseId');
  const [certificates, setCertificates] = useState<StudentCertificateRecord[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState(courseIdParam || '');
  const [eligibility, setEligibility] = useState<CertificateClaimEligibility | null>(null);
  const [eligibilityError, setEligibilityError] = useState('');
  const [listError, setListError] = useState('');
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [downloadingCertId, setDownloadingCertId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const requestSerial = useRef(0);
  const { showToast } = useNotification();

  const fetchCertificatesAndEnrollments = async () => {
    setIsLoading(true);
    setListError('');
    try {
      const [certRes, enrRes] = await Promise.all([
        studentService.getCertificates(),
        studentService.getEnrollments(),
      ]);
      if (certRes.success !== true || enrRes.success !== true || !Array.isArray(enrRes.data)) {
        throw new Error('Daftar sertifikat atau enrollment belum dikonfirmasi server.');
      }
      const normalized = adaptStudentCertificateList(certRes.data);
      setCertificates(normalized);
      setEnrollments(enrRes.data);
      setSelectedCourseId(current => current || enrRes.data[0]?.courseId || '');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal memuat sertifikat.';
      setListError(message);
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const checkEligibility = async (courseId: string) => {
    const serial = ++requestSerial.current;
    setEligibility(null);
    setEligibilityError('');
    if (!courseId) { setIsCheckingEligibility(false); return; }
    setIsCheckingEligibility(true);
    try {
      const result = await studentService.getCertificateEligibility(courseId);
      if (serial !== requestSerial.current) return;
      if (result.success !== true) throw new Error('Server belum mengonfirmasi hasil kelayakan.');
      setEligibility(adaptStudentCertificateEligibility(result.data, courseId));
    } catch (error: unknown) {
      if (serial !== requestSerial.current) return;
      setEligibilityError(error instanceof Error ? error.message : 'Gagal memeriksa kelayakan.');
    } finally {
      if (serial === requestSerial.current) setIsCheckingEligibility(false);
    }
  };

  useEffect(() => {
    void fetchCertificatesAndEnrollments();
  }, []);
  useEffect(() => {
    void checkEligibility(selectedCourseId);
    return () => { requestSerial.current += 1; };
  }, [selectedCourseId]);

  const handleClaim = async () => {
    if (!selectedCourseId || !eligibility?.eligible || eligibility.certificate || isRequesting) return;
    setIsRequesting(true);
    try {
      const result = await studentService.requestCertificate(selectedCourseId);
      const confirmed = requireCertificateRequest(result);
      showToast(confirmed.existing
        ? 'Klaim sebelumnya sudah tercatat. Status sertifikat diperbarui.'
        : 'Klaim berhasil dikirim! Menunggu peninjauan Admin.', 'success');
      await fetchCertificatesAndEnrollments();
      await checkEligibility(selectedCourseId);
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Gagal mengklaim sertifikat. Periksa status sebelum mencoba lagi.', 'error');
      await checkEligibility(selectedCourseId);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDownload = async (certificateId: string) => {
    if (downloadingCertId) return;
    setDownloadingCertId(certificateId);
    try {
      // The list endpoint deliberately omits certificateNumber. Fetch owner-only detail first.
      const detail = await studentService.getCertificate(certificateId);
      if (detail.success !== true) throw new Error('Detail sertifikat belum dikonfirmasi server.');
      const number = requireIssuedCertificateDetail(detail.data, certificateId);
      const pdf = await studentService.downloadCertificatePdf(certificateId);
      requirePdfBlob(pdf);
      const url = window.URL.createObjectURL(pdf);
      const link = document.createElement('a');
      try {
        link.href = url;
        link.download = `Sertifikat-24Institute-${number}.pdf`;
        document.body.appendChild(link);
        link.click();
      } finally {
        link.remove();
        // Defer revocation until the browser has consumed the download link.
        window.setTimeout(() => window.URL.revokeObjectURL(url), 15_000);
      }
      showToast('Unduhan PDF sertifikat dimulai.', 'success');
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Gagal mengunduh sertifikat.', 'error');
    } finally {
      setDownloadingCertId(null);
    }
  };

  const r = eligibility?.requirements;
  const c = eligibility?.certificate;
  const selectedEnrollment = enrollments.find((item) => item.courseId === selectedCourseId);
  const missingLessons = r ? r.requiredLessons - r.completedRequiredLessons : 0;
  const missingQuizzes = r ? r.requiredQuizzes - r.passedRequiredQuizzes : 0;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <Award className="w-7 h-7 text-purple-600" />
          <span>Klaim Sertifikat Digital 24Institute</span>
        </h1>
        <p className="text-xs text-slate-500">Selesaikan materi wajib dan lulus semua kuis wajib, lalu klaim sertifikat internal untuk ditinjau Admin.</p>
      </div>

      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <p><strong className="text-slate-800">Sertifikat internal 24Institute.</strong> Sertifikat diterbitkan setelah peninjauan dan persetujuan Admin, bukan sertifikat resmi BNSP. Klaim tidak otomatis menerbitkan sertifikat.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2"><FileCheck className="w-4 h-4 text-blue-600" /> Status Klaim Sertifikat</h2>
          {isLoading ? (
            <div className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
          ) : listError ? (
            <div className="bg-rose-50 text-rose-800 p-5 rounded-2xl border border-rose-200 space-y-3">
              <p className="text-xs">{listError}</p>
              <button type="button" className="text-xs font-bold underline" onClick={() => void fetchCertificatesAndEnrollments()}>Coba muat ulang</button>
            </div>
          ) : certificates.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3">
              <Award className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">Belum ada sertifikat yang diklaim</h3>
              <p className="text-xs text-slate-500">Pilih course di panel klaim untuk memeriksa kelayakan dan mengirim permintaan penerbitan.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {certificates.map((cert) => (
                <div key={cert.id} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-bold text-sm text-slate-900">{cert.courseTitle}</h3>
                    <StatusPill status={cert.status} size="sm" />
                  </div>
                  <p className="text-xs text-slate-500">Diklaim: {formatDateIndo(cert.createdAt)}{cert.issuedAt ? ` · Terbit: ${formatDateIndo(cert.issuedAt)}` : ''}</p>
                  {cert.status === 'PROCESSING' && <p className="text-xs text-amber-700 flex gap-2 items-center"><Clock className="w-4 h-4" /> Klaim diterima, menunggu review Admin.</p>}
                  {cert.status === 'ELIGIBLE' && <p className="text-xs text-blue-700 flex gap-2 items-center"><CheckCircle2 className="w-4 h-4" /> Disetujui Admin, menunggu penerbitan sertifikat.</p>}
                  {cert.status === 'REJECTED' && <p className="text-xs text-rose-700">Pengajuan ditolak. Hubungi Admin untuk peninjauan lanjutan.</p>}
                  {cert.status === 'REVOKED' && <p className="text-xs text-rose-700">Sertifikat telah dicabut dan tidak dapat diunduh.</p>}
                  {cert.status === 'ISSUED' && (
                    <button type="button" onClick={() => void handleDownload(cert.id)} disabled={downloadingCertId !== null}
                      className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 bg-purple-600 text-white text-xs font-bold hover:bg-purple-500 disabled:opacity-50">
                      {downloadingCertId === cert.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      Unduh Sertifikat PDF
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
          <div className="space-y-1">
            <h3 className="font-extrabold text-base text-slate-900">Klaim Sertifikat</h3>
            <p className="text-xs text-slate-500">Pilih kursus. Kelayakan dikonfirmasi oleh backend berdasarkan versi course dalam enrollment lu.</p>
          </div>
          <div>
            <label htmlFor="claim-course" className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Kursus Terdaftar</label>
            <select id="claim-course" value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold">
              <option value="">-- Pilih Kursus --</option>
              {enrollments.map((enr) => <option key={enr.id} value={enr.courseId}>{enr.courseTitle} ({enr.progressPercentage}%)</option>)}
            </select>
          </div>
          {isCheckingEligibility ? (
            <div className="text-xs text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Memeriksa kelayakan di server...</div>
          ) : eligibilityError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs p-3 space-y-2">
              <p><AlertCircle className="w-4 h-4 inline mr-1" /> {eligibilityError}</p>
              <button type="button" className="font-bold underline" onClick={() => void checkEligibility(selectedCourseId)}>Coba periksa lagi</button>
            </div>
          ) : eligibility ? (
            <div className="space-y-4 pt-3 border-t border-slate-100">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 text-xs">
                <div className="flex justify-between gap-3"><span className="text-slate-600">Persyaratan kelulusan</span><strong>{eligibility.completedRequirements}/{eligibility.totalRequirements} ({eligibility.requirementsPercentage}%)</strong></div>
                <div className="w-full rounded-full h-2 bg-slate-200 overflow-hidden"><div className="bg-blue-600 h-2 rounded-full" style={{ width: `${eligibility.requirementsPercentage}%` }}/></div>
                <div className="flex justify-between gap-3"><span>Materi wajib selesai</span><strong>{r?.completedRequiredLessons}/{r?.requiredLessons}</strong></div>
                <div className="flex justify-between gap-3"><span>Kuis wajib lulus</span><strong>{r?.passedRequiredQuizzes}/{r?.requiredQuizzes}</strong></div>
                <div className="flex justify-between gap-3 border-t border-slate-200 pt-2"><span>Status klaim</span><strong className={eligibility.eligible ? 'text-emerald-700' : 'text-amber-700'}>{eligibility.eligible ? 'Siap Diklaim' : 'Belum Memenuhi Syarat'}</strong></div>
              </div>
              {c ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 space-y-2">
                  <p><strong>Klaim sudah tercatat.</strong> Status: <StatusPill status={c.status} size="sm" /></p>
                  <p>{c.status === 'ISSUED' ? 'Sertifikat sudah terbit. Unduh lewat daftar di sebelah kiri.' : c.status === 'REJECTED' || c.status === 'REVOKED' ? 'Hubungi Admin untuk peninjauan lanjutan.' : 'Tidak perlu mengirim klaim ulang.'}</p>
                </div>
              ) : eligibility.eligible ? (
                <button type="button" onClick={() => void handleClaim()} disabled={isRequesting}
                  className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50">
                  {isRequesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {isRequesting ? 'Mengirim Klaim...' : 'Klaim Sertifikat Sekarang'}
                </button>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-2">
                  <p>{missingLessons > 0 || missingQuizzes > 0 ? `Selesaikan ${missingLessons} materi wajib dan lulus ${missingQuizzes} kuis wajib yang tersisa.` : 'Seluruh persyaratan materi dan kuis tampak terpenuhi, tetapi backend belum mengonfirmasi kelayakan. Periksa status enrollment resmi terlebih dahulu.'}</p>
                  {selectedEnrollment && <p>Enrollment saat ini: <strong>{selectedEnrollment.status}</strong>.</p>}
                </div>
              )}
              <button type="button" onClick={() => void checkEligibility(selectedCourseId)} className="flex items-center justify-center gap-2 text-xs text-blue-700 font-semibold underline">
                <RotateCcw className="w-3.5 h-3.5" /> Periksa ulang kelayakan
              </button>
            </div>
          ) : selectedCourseId && !isLoading ? <p className="text-xs text-slate-500">Pilih kursus dan periksa kelayakan.</p> : null}
        </div>
      </div>
    </div>
  );
};
