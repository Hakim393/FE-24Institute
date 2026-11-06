import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { useNotification } from '../../context/NotificationContext';
import { isValidEmail } from '../../utils/validation';
import { CheckCircle2, XCircle, Loader2, Mail, ArrowRight, RefreshCw } from 'lucide-react';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useNotification();

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      handleVerify(token);
    }
  }, [token]);

  const handleVerify = async (rawToken: string) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await authService.verifyEmail(rawToken);
      if (res.success) {
        setIsSuccess(true);
        // Clean token from address bar per security specification
        window.history.replaceState({}, document.title, window.location.pathname);
        showToast('Email berhasil diverifikasi.', 'success');
      } else {
        setErrorMsg(res.message || 'Token verifikasi tidak valid atau telah kedaluwarsa.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memverifikasi email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(resendEmail)) {
      showToast('Masukkan alamat email yang valid.', 'error');
      return;
    }
    setIsResending(true);
    try {
      const res = await authService.resendVerification(resendEmail);
      if (res.success) {
        showToast('Jika email terdaftar, tautan verifikasi baru telah dikirimkan.', 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal mengirim ulang verifikasi.', 'error');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6 text-center">
        <Link to="/" className="inline-block">
          <img
            src="/brand/logo-24institute.png"
            alt="24Institute"
            className="h-12 w-auto mx-auto object-contain"
          />
        </Link>

        {isLoading ? (
          <div className="py-8 space-y-4">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
            <p className="text-sm text-slate-600 font-medium">Memverifikasi token email Anda...</p>
          </div>
        ) : isSuccess ? (
          <div className="py-6 space-y-4 animate-scale-in">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Email Berhasil Diverifikasi!</h2>
            <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
              Akun Anda telah aktif secara resmi. Sekarang Anda dapat masuk menggunakan email dan kode OTP keamanan.
            </p>
            <div className="pt-4">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 transition shadow-md"
              >
                <span>Masuk dengan OTP</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-5">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-9 h-9" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Verifikasi Email</h2>
            <p className="text-xs text-slate-500">
              {errorMsg || 'Tautan verifikasi belum diberikan atau telah kedaluwarsa.'}
            </p>

            {/* Resend Verification Form */}
            <form onSubmit={handleResend} className="pt-4 border-t border-slate-100 space-y-3 text-left">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Kirim Ulang Tautan Verifikasi
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="Masukkan email Anda"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:bg-white focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={isResending || !resendEmail}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isResending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>Kirim Ulang Email Verifikasi</span>
              </button>
            </form>

            <div className="pt-2">
              <Link to="/login" className="text-xs font-bold text-blue-600 hover:underline">
                Kembali ke Halaman Masuk
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
