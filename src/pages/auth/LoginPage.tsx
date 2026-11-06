import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { postAuthRoute } from '../../utils/post-auth-route';
import { requireCompleteSession } from '../../utils/auth-completion-guard';
import { api } from '../../services/api';
import { isDevPreviewActive } from '../../services/mode';
import { authService } from '../../services/auth.service';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { isValidEmail, isValidOtpCode } from '../../utils/validation';
import { UserRole } from '../../types/api';
import { renderGoogleButton, isGoogleAuthAvailable } from '../../services/google-auth';
import {
  Mail,
  Lock,
  ArrowRight,
  KeyRound,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser, loginAsDemoUser } = useAuth();
  const { showToast } = useNotification();

  // Multi-step flow state
  const [step, setStep] = useState<'CREDENTIALS' | 'OTP' | 'GOOGLE_OTP'>('CREDENTIALS');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [googleTicket, setGoogleTicket] = useState('');
  const [demoRole, setDemoRole] = useState<UserRole>('STUDENT');

  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const googleContainerRef = useRef<HTMLDivElement>(null);
  const googleRequestInFlight = useRef(false);
  const redirectUrl = searchParams.get('from') || searchParams.get('redirect');

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Mount real Google Identity Services button
  useEffect(() => {
    if (step === 'CREDENTIALS' && googleContainerRef.current && isGoogleAuthAvailable()) {
      const container = googleContainerRef.current;
      void renderGoogleButton(
        container,
        (idToken) => { void handleGoogleCredential(idToken); },
        { text: 'signin_with', theme: 'outline', width: Math.min(320, container.clientWidth || 280) }
      ).then((ready) => {
        if (!ready) setErrorMsg('Google Sign-In belum dapat dimuat. Coba login email atau periksa koneksi.');
      });
    }
  }, [step]);

  // STEP 1: Request OTP with Email & Password
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setErrorMsg('Alamat email tidak valid.');
      return;
    }
    if (!password) {
      setErrorMsg('Kata sandi wajib diisi.');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await authService.sendLoginOtp(email, password);
      if (!res.success || !res.data?.challengeId) {
        throw new Error(res.message || 'Tantangan OTP dari backend tidak lengkap.');
      }
      setChallengeId(res.data.challengeId);
      setPassword('');
      setStep('OTP');
      setCountdown(res.data.cooldownSeconds ?? 60);
      showToast('Kode OTP 6-digit telah dikirimkan ke email Anda.', 'success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memulai proses autentikasi OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidOtpCode(otpCode)) {
      setErrorMsg('Kode OTP harus terdiri dari tepat 6 digit angka.');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);

    try {
      if (step === 'GOOGLE_OTP') {
        if (!googleTicket || !challengeId) throw new Error('Tantangan Google OTP tidak valid.');
        const res = await authService.googleVerifyOtp(challengeId, otpCode, googleTicket);
        if (!res.success) throw new Error(res.message || 'Verifikasi Google OTP gagal.');
        requireCompleteSession(res.data);
        api.setTokens(res.data.tokens);
        setUser(res.data.user);
        showToast('Autentikasi Google berhasil!', 'success');
        routeUser(res.data.user.role);
      } else {
        if (!challengeId) throw new Error('Tantangan OTP tidak valid.');
        const res = await authService.verifyLoginOtp(challengeId, otpCode, demoRole);
        if (!res.success) throw new Error(res.message || 'Verifikasi OTP gagal.');
        requireCompleteSession(res.data);
        api.setTokens(res.data.tokens);
        setUser(res.data.user);
        showToast('Login berhasil. Selamat datang kembali!', 'success');
        routeUser(res.data.user.role);
      }
    } catch (err: any) {
      api.setTokens(null);
      setUser(null);
      setErrorMsg(err?.message || 'Verifikasi kode OTP gagal.');
    } finally {
      setIsLoading(false);
    }
  };

  // RESEND OTP
  const handleResendOtp = async () => {
    if (countdown > 0 || isLoading || !challengeId) return;
    setIsLoading(true);
    setErrorMsg('');

    try {
      if (step === 'GOOGLE_OTP') {
        const res = await authService.googleResendOtp(challengeId, googleTicket);
        if (!res.success || !res.data?.challengeId || !res.data.googleOtpTicket) {
          throw new Error(res.message || 'Tantangan resend Google OTP tidak lengkap.');
        }
        setChallengeId(res.data.challengeId);
        setGoogleTicket(res.data.googleOtpTicket);
        setCountdown(res.data.cooldownSeconds ?? 60);
        showToast('Kode OTP Google baru telah dikirimkan.', 'success');
      } else {
        const res = await authService.resendLoginOtp(challengeId);
        if (!res.success || !res.data?.challengeId) {
          throw new Error(res.message || 'Tantangan resend OTP tidak lengkap.');
        }
        setChallengeId(res.data.challengeId);
        setCountdown(res.data.cooldownSeconds ?? 60);
        showToast('Kode OTP baru telah dikirimkan ke email Anda.', 'success');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal mengirim ulang OTP.');
      showToast(err?.message || 'Gagal mengirim ulang OTP.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Real Google Sign-In Credential Handler
  const handleGoogleCredential = async (idToken: string) => {
    if (googleRequestInFlight.current || isLoading) return;
    googleRequestInFlight.current = true;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await authService.googleSignIn(idToken);
      if (!res.success || !res.data) throw new Error(res.message || 'Google Sign-In gagal.');
      if (res.data.otpRequired) {
        // A pending OTP challenge is NOT an authenticated session.
        api.setTokens(null);
        if (!res.data.challengeId || !res.data.googleOtpTicket) {
          throw new Error('Tantangan OTP Google tidak lengkap.');
        }
        setChallengeId(res.data.challengeId);
        setGoogleTicket(res.data.googleOtpTicket);
        setOtpCode('');
        setStep('GOOGLE_OTP');
        setCountdown(60);
        showToast('Akun Google Anda memerlukan verifikasi OTP tambahan.', 'info');
      } else {
        requireCompleteSession(res.data);
        api.setTokens(res.data.tokens);
        setUser(res.data.user);
        showToast('Login Google Sign-In berhasil.', 'success');
        routeUser(res.data.user.role);
      }
    } catch (err: any) {
      api.setTokens(null);
      setUser(null);
      setErrorMsg(err?.message || 'Gagal melakukan autentikasi Google.');
    } finally {
      googleRequestInFlight.current = false;
      setIsLoading(false);
    }
  };

  const routeUser = (role: UserRole) => {
    // Accept only an internal, role-authorized destination.
    navigate(postAuthRoute(role, redirectUrl), { replace: true });
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-5 sm:p-8 rounded-3xl border border-slate-200 shadow-xl">
        {/* Brand & Heading */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold text-xs border border-blue-100">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Autentikasi Aman 24Institute</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {step === 'CREDENTIALS' ? 'Masuk ke Platform' : 'Verifikasi OTP'}
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {step === 'CREDENTIALS'
              ? 'Masukkan email dan kata sandi untuk menerima tantangan kode OTP 6-digit.'
              : `Kode verifikasi 6-digit telah dikirimkan ke email ${email || 'Anda'}.`}
          </p>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div role="alert" className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <div className="leading-relaxed">{errorMsg}</div>
          </div>
        )}

        {/* STEP 1: CREDENTIALS */}
        {step === 'CREDENTIALS' && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
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
                  placeholder="nama@domain.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Kata Sandi
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-blue-600 hover:text-blue-500 transition"
                >
                  Lupa sandi?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengirim Kode OTP...</span>
                </>
              ) : (
                <>
                  <span>Kirim Kode OTP Masuk</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Separator */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-slate-400 font-semibold">atau masuk dengan</span>
              </div>
            </div>

            {/* Real Google Sign In Button via Google Identity Services */}
            <div className="flex flex-col items-center justify-center gap-2">
              <div ref={googleContainerRef} className="min-h-[44px] flex items-center justify-center w-full" />
              {!isGoogleAuthAvailable() && (
                <p className="text-[11px] text-slate-400 text-center">
                  *Google Sign-In memerlukan konfigurasi OAuth Client ID pada <code className="bg-slate-100 px-1 py-0.5 rounded">VITE_GOOGLE_CLIENT_ID</code>.
                </p>
              )}
            </div>
          </form>
        )}

        {/* STEP 2: OTP VERIFICATION */}
        {(step === 'OTP' || step === 'GOOGLE_OTP') && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Kode Verifikasi OTP (6 Digit)
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-center text-lg tracking-widest font-bold text-slate-900 focus:outline-hidden focus:bg-white focus:border-blue-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Masukkan 6 angka yang diterima. Angka nol di depan tetap valid.
              </p>
            </div>

            {/* In offline dev mode only, allow selecting role for test simulation */}
            {!import.meta.env.PROD && isDevPreviewActive() && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <span className="font-semibold text-slate-700">Simulasi Role (Khusus Mode Dev):</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['STUDENT', 'INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setDemoRole(r)}
                      className={`py-1 px-2 rounded text-[11px] font-bold border transition ${
                        demoRole === r
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || otpCode.length !== 6}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi OTP...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verifikasi & Masuk Dashboard</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                onClick={() => setStep('CREDENTIALS')}
                className="text-slate-500 hover:text-slate-700 font-medium"
              >
                &larr; Ubah Email
              </button>
              <button
                type="button"
                disabled={countdown > 0 || isLoading}
                onClick={handleResendOtp}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-500 font-semibold disabled:text-slate-400"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{countdown > 0 ? `Kirim Ulang (${countdown}s)` : 'Kirim Ulang OTP'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Notice for Legacy endpoint */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-500 space-y-1">
          <div className="font-semibold text-slate-700 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Standar Keamanan OTP 2-Langkah</span>
          </div>
          <p>
            Platform 24Institute menerapkan autentikasi OTP email 6-digit untuk melindungi seluruh akun pengguna.
          </p>
        </div>

        {/* Footer Link */}
        <div className="text-center text-xs text-slate-600">
          Belum memiliki akun?{' '}
          <Link to="/register" className="font-bold text-blue-600 hover:text-blue-500 underline">
            Daftar Siswa Baru
          </Link>
        </div>
      </div>
    </div>
  );
};
