import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { renderGoogleButton, isGoogleAuthAvailable } from '../../services/google-auth';
import { postAuthRoute } from '../../utils/post-auth-route';
import { requireCompleteSession } from '../../utils/auth-completion-guard';
import { useNotification } from '../../context/NotificationContext';
import { isValidEmail, isValidFullName, isValidPassword, isValidOtpCode } from '../../utils/validation';
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  KeyRound,
  RefreshCw,
} from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { showToast } = useNotification();

  const navigate = useNavigate();
  const { setUser } = useAuth();
  const googleContainerRef = useRef<HTMLDivElement>(null);
  const googleRequestInFlight = useRef(false);
  const [googleStep, setGoogleStep] = useState<'CHOOSER' | 'OTP'>('CHOOSER');
  const [googleChallengeId, setGoogleChallengeId] = useState('');
  const [googleOtpTicket, setGoogleOtpTicket] = useState('');
  const [googleOtpCode, setGoogleOtpCode] = useState('');
  const [googleCooldown, setGoogleCooldown] = useState(0);

  useEffect(() => {
    if (googleCooldown <= 0) return;
    const timer = setTimeout(() => setGoogleCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearTimeout(timer);
  }, [googleCooldown]);

  useEffect(() => {
    if (isSuccess || googleStep !== 'CHOOSER' || !googleContainerRef.current || !isGoogleAuthAvailable()) return;
    const container = googleContainerRef.current;
    // Google account chooser runs directly on Register, as on Login.
    void renderGoogleButton(container, handleGoogleCredential, {
      text: 'signup_with', theme: 'outline', width: Math.min(320, container.clientWidth || 280),
    }).then((ready) => {
      if (!ready) setErrorMsg('Google Sign-In belum dapat dimuat. Silakan coba kembali atau daftar lewat email.');
    });
  }, [googleStep, isSuccess]);

  const handleGoogleCredential = async (idToken: string) => {
    if (googleRequestInFlight.current || isLoading) return;
    googleRequestInFlight.current = true;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const response = await authService.googleSignIn(idToken);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Pendaftaran Google tidak berhasil.');
      }
      if (response.data.otpRequired) {
        // OTP-required response must not establish an authenticated session.
        api.setTokens(null);
        if (!response.data.challengeId || !response.data.googleOtpTicket) {
          throw new Error('Tantangan OTP Google tidak lengkap. Tidak ada sesi yang dibuat.');
        }
        setGoogleChallengeId(response.data.challengeId);
        setGoogleOtpTicket(response.data.googleOtpTicket);
        setGoogleOtpCode('');
        setGoogleCooldown(60);
        setGoogleStep('OTP');
        showToast('Masukkan OTP email untuk melanjutkan dengan akun Google.', 'info');
      } else {
        requireCompleteSession(response.data);
        api.setTokens(response.data.tokens);
        setUser(response.data.user);
        showToast('Berhasil masuk menggunakan Google.', 'success');
        navigate(postAuthRoute(response.data.user.role), { replace: true });
      }
    } catch (error: any) {
      api.setTokens(null);
      setUser(null);
      setErrorMsg(error?.message || 'Gagal mengautentikasi akun Google.');
    } finally {
      googleRequestInFlight.current = false;
      setIsLoading(false);
    }
  };

  const verifyGoogleOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValidOtpCode(googleOtpCode) || !googleChallengeId || !googleOtpTicket) {
      setErrorMsg('Masukkan kode OTP 6 digit yang valid.');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    try {
      const result = await authService.googleVerifyOtp(googleChallengeId, googleOtpCode, googleOtpTicket);
      if (!result.success) throw new Error(result.message || 'Verifikasi OTP Google gagal.');
      requireCompleteSession(result.data);
      api.setTokens(result.data.tokens);
      setUser(result.data.user);
      showToast('Verifikasi Google berhasil.', 'success');
      navigate(postAuthRoute(result.data.user.role), { replace: true });
    } catch (error: any) {
      api.setTokens(null);
      setUser(null);
      setErrorMsg(error?.message || 'Gagal memverifikasi OTP Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const resendGoogleOtp = async () => {
    if (googleCooldown > 0 || isLoading || !googleChallengeId || !googleOtpTicket) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const result = await authService.googleResendOtp(googleChallengeId, googleOtpTicket);
      if (!result.success || !result.data?.challengeId || !result.data.googleOtpTicket) {
        throw new Error(result.message || 'Gagal mengirim ulang OTP Google.');
      }
      setGoogleChallengeId(result.data.challengeId);
      setGoogleOtpTicket(result.data.googleOtpTicket);
      setGoogleCooldown(result.data.cooldownSeconds ?? 60);
      showToast('Kode OTP Google baru telah diminta.', 'success');
    } catch (error: any) {
      setErrorMsg(error?.message || 'Gagal meminta OTP baru.');
    } finally {
      setIsLoading(false);
    }
  };


  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidFullName(fullName)) {
      setErrorMsg('Nama lengkap harus terdiri dari 3 hingga 150 karakter.');
      return;
    }
    if (!isValidEmail(email)) {
      setErrorMsg('Alamat email tidak valid.');
      return;
    }
    if (!isValidPassword(password)) {
      setErrorMsg('Kata sandi harus terdiri dari 8 hingga 128 karakter.');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await authService.register({ fullName, email, password });
      if (res.success) {
        setIsSuccess(true);
        showToast('Pendaftaran akun siswa berhasil. Silakan cek email Anda.', 'success');
      } else {
        setErrorMsg(res.message || 'Pendaftaran gagal.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat pendaftaran.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-5 sm:p-8 rounded-3xl border border-slate-200 shadow-xl">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-block">
            <img
              src="/brand/logo-24institute.png"
              alt="24Institute"
              className="h-12 w-auto mx-auto object-contain"
            />
          </Link>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Daftar Akun Siswa</h2>
          <p className="text-xs text-slate-500">
            Buat akun untuk mulai belajar bisnis dan teknologi bersama 24Institute.
          </p>
        </div>

        {errorMsg && (
          <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isSuccess ? (
          <div className="text-center space-y-5 py-4 animate-scale-in">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900">Pendaftaran Berhasil!</h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                Tautan verifikasi email telah dikirimkan ke <strong className="text-slate-900">{email}</strong>. Silakan periksa inbox atau folder spam Anda untuk mengaktifkan akun.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition shadow-md"
              >
                <span>Lanjut ke Halaman Masuk</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : googleStep === 'OTP' ? (
          <form onSubmit={verifyGoogleOtp} className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Verifikasi Akun Google</h3>
            <p className="text-sm text-slate-600">Akun Google ini memerlukan verifikasi OTP email sebelum sesi login dibuat.</p>
            <label htmlFor="google-register-otp" className="block text-xs font-bold text-slate-700">Kode OTP (6 angka)</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                id="google-register-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={googleOtpCode}
                onChange={(event) => setGoogleOtpCode(event.target.value.replace(/\D/g, ''))}
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-center font-mono tracking-widest"
                placeholder="123456"
              />
            </div>
            <button type="submit" disabled={isLoading || !isValidOtpCode(googleOtpCode)} className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white disabled:opacity-50">
              {isLoading ? 'Memverifikasi...' : 'Verifikasi & Masuk'}
            </button>
            <div className="flex flex-wrap justify-between gap-3 text-xs">
              <button type="button" disabled={isLoading || googleCooldown > 0} onClick={resendGoogleOtp} className="inline-flex items-center gap-1 text-blue-600 disabled:text-slate-400">
                <RefreshCw className="h-3.5 w-3.5" /> {googleCooldown ? `Kirim ulang (${googleCooldown}s)` : 'Kirim ulang OTP'}
              </button>
              <button type="button" disabled={isLoading} onClick={() => { setGoogleStep('CHOOSER'); setGoogleOtpCode(''); setErrorMsg(''); }} className="text-slate-500">Pilih akun lain</button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nama Lengkap
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nama Lengkap Anda"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:bg-white focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:bg-white focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Kata Sandi (Min. 8 Karakter)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Kata Sandi Kuat"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:bg-white focus:border-blue-500"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Dengan mendaftar, Anda menyetujui Ketentuan Layanan dan Kebijakan Privasi 24Institute.
            </p>

            <button
              type="submit"
              disabled={isLoading || !fullName || !email || !password}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mendaftarkan Akun...</span>
                </>
              ) : (
                <>
                  <span>Daftar Sebagai Siswa</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="relative my-5 text-center text-xs text-slate-400" aria-hidden="true">
              <span className="bg-white px-2">atau daftar dengan Google</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div ref={googleContainerRef} className="min-h-[44px] w-full flex items-center justify-center" />
              {!isGoogleAuthAvailable() && (
                <p className="text-center text-xs text-slate-500">Google Sign-In memerlukan konfigurasi OAuth Client ID untuk domain aplikasi.</p>
              )}
            </div>

            <div className="text-center pt-2">
              <span className="text-xs text-slate-500">Sudah memiliki akun? </span>
              <Link to="/login" className="text-xs font-bold text-blue-600 hover:underline">
                Masuk ke Akun
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
