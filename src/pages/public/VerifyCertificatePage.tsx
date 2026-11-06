import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { publicService } from '../../services/public.service';
import { CertificateVerificationResult } from '../../types/certificate';
import { formatDateIndo } from '../../utils/formatters';
import { StatusPill } from '../../components/common/StatusPill';
import { isValidCertificateNumber } from '../../utils/validation';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  Loader2,
  Calendar,
  BookOpen,
} from 'lucide-react';

export const VerifyCertificatePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [certNum, setCertNum] = useState('');
  const [verifiedNumber, setVerifiedNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CertificateVerificationResult | null>(null);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorKind, setErrorKind] = useState<'INVALID' | 'NOT_FOUND' | 'UNAVAILABLE' | null>(null);
  const verifyRequestRef = useRef(0);

  const numberFromQuery = searchParams.get('number');

  const handleVerify = async (queryNumber: string) => {
    const requestId = ++verifyRequestRef.current;
    const clean = queryNumber.trim().toUpperCase();
    setResult(null);
    setSearched(true);
    setErrorMsg('');
    setErrorKind(null);

    if (!isValidCertificateNumber(clean)) {
      setIsLoading(false);
      setErrorKind('INVALID');
      setErrorMsg('Format nomor sertifikat harus berformat: 24I- diikuti 36 karakter heksadesimal kapital.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await publicService.verifyCertificate(clean);
      if (requestId !== verifyRequestRef.current) return;
      if (res.success && res.data?.valid === true) {
        // Public endpoint intentionally omits status and number; valid:true implies an ISSUED credential.
        setVerifiedNumber(clean);
        setResult(res.data);
      } else {
        setErrorKind('NOT_FOUND');
        setErrorMsg('Nomor ini tidak tercatat sebagai sertifikat internal aktif pada registri 24Institute.');
      }
    } catch {
      if (requestId !== verifyRequestRef.current) return;
      setErrorKind('UNAVAILABLE');
      setErrorMsg('Layanan verifikasi belum dapat dihubungi. Silakan coba lagi; ini bukan bukti sertifikat tidak valid.');
    } finally {
      if (requestId === verifyRequestRef.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (numberFromQuery) {
      setCertNum(numberFromQuery);
      void handleVerify(numberFromQuery);
    } else {
      verifyRequestRef.current += 1;
      setResult(null);
      setSearched(false);
      setIsLoading(false);
    }
  }, [numberFromQuery]);

  const requestVerification = (raw: string) => {
    const normalized = raw.trim().toUpperCase();
    if (normalized === numberFromQuery) {
      void handleVerify(normalized);
    } else {
      setSearchParams({ number: normalized });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    requestVerification(certNum);
  };

  return (
    <div className="w-full min-w-0 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Registri Publik Sertifikasi Digital</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Verifikasi Sertifikat 24Institute
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
          Masukkan nomor registri sertifikat internal resmi 24Institute untuk memeriksa keaslian, status penerbitan, dan kelulusan program pembelajaran.
        </p>
      </div>

      {/* Verification Search Box */}
      <div className="min-w-0 bg-white p-5 sm:p-8 rounded-3xl border border-slate-200 shadow-xl space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <label htmlFor="certificate-registry-number"
            className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Nomor Registri Sertifikat
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="certificate-registry-number"
              type="text"
              maxLength={40}
              autoComplete="off"
              spellCheck={false}
              value={certNum}
              onChange={(e) => setCertNum(e.target.value.toUpperCase())}
              placeholder="Contoh: 24I-A1B2C3D4E5F67890123456789ABCDEF01234"
              className="w-full min-w-0 flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm uppercase tracking-wider focus:outline-hidden focus:bg-white focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={isLoading || !certNum.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memeriksa...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Verifikasi</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Format: Awalan <code className="font-mono font-bold text-slate-600">24I-</code> diikuti 36 karakter hex uppercase.
          </p>
        </form>

        {/* Example Quick Click */}
        <div className="min-w-0 pt-3 border-t border-slate-100 flex flex-wrap items-start sm:items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-600">Contoh format (bukan sertifikat asli):</span>
          <button
            type="button"
            onClick={() => {
              const sample = '24I-A1B2C3D4E5F67890123456789ABCDEF01234';
              setCertNum(sample);
            }}
            className="min-w-0 max-w-full break-all text-left leading-relaxed font-mono text-blue-600 hover:underline"
          >
            24I-A1B2C3D4E5F67890123456789ABCDEF01234
          </button>
        </div>
      </div>

      {/* Keep the pending state separate from an actual verification failure. */}
      {isLoading && (
        <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
          <span>Sedang memeriksa nomor sertifikat...</span>
        </div>
      )}

      {/* Result Card */}
      {searched && !isLoading && (
        <div aria-live="polite" className="min-w-0">
          {result && result.valid ? (
            <div className="bg-emerald-50/60 border-2 border-emerald-300 rounded-3xl p-6 sm:p-8 space-y-6 shadow-lg animate-scale-in">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-emerald-950">
                    Sertifikat Internal Terverifikasi
                  </h3>
                  <p className="text-xs text-emerald-800">
                    Nomor registri ini tercatat secara sah di basis data 24Institute.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-emerald-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-medium">Nomor Registri</span>
                  <div className="font-mono font-bold text-slate-900 text-sm mt-0.5 break-all">
                    {verifiedNumber}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-medium">Status Dokumen</span>
                  <div className="mt-0.5">
                    <StatusPill status="ISSUED" size="sm" />
                  </div>
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    Program Kursus yang Ditempuh
                  </span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    {result.courseTitle}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Tanggal Penerbitan Resmi
                  </span>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {formatDateIndo(result.issuedAt)}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" />
                    Otoritas Penerbit
                  </span>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {result.issuerName}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-emerald-800 bg-emerald-100/50 p-3 rounded-xl border border-emerald-200">
                <strong>Kebijakan Privasi:</strong> Sesuai protokol keamanan data siswa, verifikasi publik menampilkan status kelulusan dan validitas kursus tanpa mengekspos identitas pribadi penerima sertifikat.
              </div>
            </div>
          ) : (
            <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm animate-scale-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-rose-950">{errorKind === 'UNAVAILABLE' ? 'Layanan Verifikasi Tidak Tersedia' : errorKind === 'INVALID' ? 'Format Nomor Tidak Valid' : 'Sertifikat Tidak Ditemukan'}</h3>
                  <p className="text-xs text-rose-700">
                    {errorMsg || 'Nomor sertifikat tidak dapat diverifikasi saat ini.'}
                  </p>
                </div>
              </div>
              {errorKind !== 'UNAVAILABLE' && (
                <p className="text-xs text-rose-600">
                  Pastikan nomor lengkap dengan format <code className="font-mono font-bold">24I-</code> dan huruf kapital. Sertifikat yang belum diterbitkan Admin tidak akan terverifikasi.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Internal Certification Notice */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-700">Pemberitahuan Sertifikasi:</p>
        <p>
          Sertifikat digital ini merupakan sertifikat kompetensi internal resmi dari platform pendidikan 24Institute. Sertifikat ini bukan merupakan sertifikasi profesi resmi BNSP atau kementerian ketenagakerjaan.
        </p>
      </div>
    </div>
  );
};
