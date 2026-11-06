import React, { useEffect, useState, useRef } from 'react';
import { authService } from '../../services/auth.service';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { UserProfile } from '../../types/auth';
import { isGoogleAuthAvailable } from '../../services/google-auth';
import { readDetailedStudentProfile } from '../../utils/student-profile-contract';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Camera,
  Trash2,
  Lock,
  ShieldCheck,
  Link as LinkIcon,
  LogOut,
  Loader2,
  Save,
  CheckCircle2,
} from 'lucide-react';

export const StudentProfilePage: React.FC = () => {
  const { user, refreshProfile, logout } = useAuth();
  const { showToast } = useNotification();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Avatar upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Google Link
  const [googleLinkPassword, setGoogleLinkPassword] = useState('');
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const userId = user.id;

    // Show the reliable canonical account name immediately. /auth/me only
    // contains a small avatar/headline profile, not personal contact fields.
    setFullName(user.fullName || user.profile?.fullName || '');
    setAvatarUrl(user.profile?.avatarUrl || null);

    void authService.getProfile().then((response) => {
      if (!active) return;
      const detailed = readDetailedStudentProfile(response.data?.user, userId);
      if (!response.success || !detailed) {
        throw new Error('Respons profil lengkap tidak sesuai kontrak backend.');
      }
      setFullName(detailed.fullName);
      setPhone(detailed.phone);
      setAddress(detailed.address);
      setDateOfBirth(detailed.dateOfBirth);
      setAvatarUrl(detailed.avatarUrl);
    }).catch(() => {
      if (active) showToast('Data profil lengkap belum dapat dimuat. Silakan muat ulang halaman.', 'error');
    });

    return () => { active = false; };
    // Only reload when the account changes; refreshing the summary /auth/me
    // must not replace editable contact fields with empty values.
  }, [user?.id]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const requested = {
      fullName: fullName.trim(),
      phone: phone.trim() || null,
      address: address.trim() || null,
      dateOfBirth: dateOfBirth || null,
    };
    if (!requested.fullName) {
      showToast('Nama lengkap wajib diisi untuk profil dan sertifikat.', 'error');
      return;
    }
    setIsSavingProfile(true);
    let acceptedByBackend = false;
    try {
      const response = await authService.updateProfile(requested);
      if (!response.success || !readDetailedStudentProfile(response.data?.user, user.id)) {
        throw new Error('Backend tidak mengonfirmasi data profil yang diperbarui.');
      }
      acceptedByBackend = true;

      // Confirm the persisted values using the full, private profile endpoint.
      // Do not claim success based solely on a toast or an /auth/me summary.
      const readBack = await authService.getProfile();
      const verified = readDetailedStudentProfile(readBack.data?.user, user.id);
      if (!readBack.success || !verified ||
          verified.fullName !== requested.fullName ||
          verified.phone !== (requested.phone ?? '') ||
          verified.address !== (requested.address ?? '') ||
          verified.dateOfBirth !== (requested.dateOfBirth ?? '')) {
        throw new Error('Data profil belum terkonfirmasi setelah dibaca ulang dari server.');
      }

      setFullName(verified.fullName);
      setPhone(verified.phone);
      setAddress(verified.address);
      setDateOfBirth(verified.dateOfBirth);
      setAvatarUrl(verified.avatarUrl);
      await refreshProfile();
      showToast('Profil tersimpan dan terverifikasi dari server.', 'success');
    } catch (err: any) {
      showToast(acceptedByBackend
        ? 'Penyimpanan mungkin berhasil, tetapi pembacaan ulang gagal. Muat ulang untuk memeriksa.'
        : err.message || 'Gagal menyimpan profil.', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size <= 2 MiB (2097152 bytes)
    if (file.size > 2 * 1024 * 1024) {
      showToast('Ukuran foto profil maksimal 2 MiB.', 'error');
      return;
    }
    // Validate MIME types
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Format foto profil harus berupa JPEG, PNG, atau WebP.', 'error');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const res = await authService.uploadAvatar(file);
      if (res.success && res.data) {
        setAvatarUrl(res.data.avatarUrl);
        showToast('Foto profil berhasil diunggah.', 'success');
        refreshProfile();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal mengunggah foto profil.', 'error');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus foto profil?')) return;
    try {
      const res = await authService.deleteAvatar();
      if (res.success) {
        setAvatarUrl(null);
        showToast('Foto profil dihapus.', 'info');
        refreshProfile();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus foto profil.', 'error');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showToast('Kata sandi baru minimal 8 karakter.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Konfirmasi kata sandi tidak cocok.', 'error');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await authService.changePassword(currentPassword, newPassword);
      if (res.success) {
        showToast('Kata sandi berhasil diubah.', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal mengubah kata sandi.', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLinkGoogleWithToken = async (idToken: string) => {
    if (!googleLinkPassword) {
      showToast('Masukkan kata sandi saat ini untuk konfirmasi keamanan sebelum memilih akun Google.', 'error');
      return;
    }

    setIsLinkingGoogle(true);
    try {
      const res = await authService.linkGoogleAccount(googleLinkPassword, idToken);
      if (res.success) {
        showToast('Akun Google berhasil ditautkan secara resmi.', 'success');
        setGoogleLinkPassword('');
        refreshProfile();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menautkan akun Google. Pastikan akun belum digunakan.', 'error');
    } finally {
      setIsLinkingGoogle(false);
    }
  };

  const handleLinkGoogle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleLinkPassword) {
      showToast('Masukkan kata sandi saat ini untuk konfirmasi keamanan.', 'error');
      return;
    }

    if (!isGoogleAuthAvailable()) {
      showToast('Google Client ID belum dikonfigurasi di environment variable VITE_GOOGLE_CLIENT_ID.', 'error');
      return;
    }

    // Trigger Google Sign-In prompt
    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim(),
        callback: (response) => {
          if (response?.credential) {
            handleLinkGoogleWithToken(response.credential);
          }
        },
        auto_select: false,
      });
      window.google.accounts.id.prompt?.();
    } else {
      showToast('Skrip Google Identity Services sedang dimuat, silakan coba sesaat lagi.', 'info');
    }
  };

  const handleLogoutAll = async () => {
    if (!confirm('Apakah Anda yakin ingin keluar dari seluruh perangkat?')) return;
    try {
      const result = await authService.logoutAll();
      if (result.success) {
        showToast('Pencabutan sesi seluruh perangkat dikonfirmasi server.', 'info');
      } else {
        showToast('Pencabutan sesi belum terkonfirmasi server.', 'error');
      }
    } catch {
      showToast('Sesi lokal ditutup, tetapi pencabutan seluruh perangkat belum terkonfirmasi.', 'error');
    } finally {
      await logout();
    }
  };

  return (
    <div className="max-w-4xl space-y-8 pb-12">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <User className="w-7 h-7 text-blue-600" />
          <span>Profil & Pengaturan Akun</span>
        </h1>
        <p className="text-xs text-slate-500">
          Kelola informasi identitas pribadi, foto avatar, kata sandi, dan keamanan sesi.
        </p>
      </div>

      {/* Profile & Avatar Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-8">
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100">
          <div className="relative group">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover ring-4 ring-blue-500/20"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 text-white flex items-center justify-center font-black text-3xl ring-4 ring-blue-500/20">
                {fullName.charAt(0) || 'U'}
              </div>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute bottom-0 right-0 p-2 rounded-full bg-blue-600 text-white hover:bg-blue-500 shadow-md transition disabled:opacity-50"
              title="Ganti Foto Avatar"
              aria-label="Unggah foto profil"
            >
              {isUploadingAvatar ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarFileSelected}
              className="hidden"
            />
          </div>

          <div className="space-y-1 text-center sm:text-left">
            <h2 className="text-lg font-extrabold text-slate-900">{fullName || user?.fullName || user?.email}</h2>
            <p className="text-xs text-slate-500 font-mono">{user?.email}</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                Role: {user?.role}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                Email Terverifikasi
              </span>
              {avatarUrl && (
                <button
                  onClick={handleDeleteAvatar}
                  className="text-[10px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 ml-2"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Hapus Avatar</span>
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400 pt-1">
              Maks. 2 MiB &middot; Format: JPEG, PNG, WebP
            </p>
          </div>
        </div>

        {/* Profile Details Form */}
        <form onSubmit={handleSaveProfile} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nama Lengkap (1-150 Karakter)
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:bg-white focus:border-blue-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nomor Telepon / WhatsApp
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:bg-white focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tanggal Lahir (YYYY-MM-DD)
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:bg-white focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Alamat Domisili
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Kota / Alamat tempat tinggal"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:bg-white focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingProfile}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {isSavingProfile ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Simpan Perubahan Profil</span>
            </button>
          </div>
        </form>
      </div>

      {/* Security & Password Change */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
          <Lock className="w-5 h-5 text-blue-600" />
          <span>Ganti Kata Sandi Akun</span>
        </h3>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Kata Sandi Saat Ini
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:bg-white focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Kata Sandi Baru (Min. 8)
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:bg-white focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Konfirmasi Kata Sandi Baru
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:bg-white focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isChangingPassword || !currentPassword || !newPassword}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 disabled:opacity-50"
          >
            {isChangingPassword ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>Perbarui Kata Sandi</span>
          </button>
        </form>
      </div>

      {/* Google Account Linking */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-sky-600" />
              <span>Tautkan Akun Google Sign-In</span>
            </h3>
            <p className="text-xs text-slate-500">
              {user?.googleLinked
                ? 'Akun Anda telah terhubung dengan Google Sign-In.'
                : 'Tautkan akun Google Anda untuk kemudahan masuk di masa depan.'}
            </p>
          </div>
          {user?.googleLinked && (
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
              Terhubung
            </span>
          )}
        </div>

        {!user?.googleLinked && (
          <form onSubmit={handleLinkGoogle} className="pt-2 space-y-3 max-w-md">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Masukkan Kata Sandi Saat Ini
              </label>
              <input
                type="password"
                required
                value={googleLinkPassword}
                onChange={(e) => setGoogleLinkPassword(e.target.value)}
                placeholder="Konfirmasi password sebelum penautan"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:bg-white focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={isLinkingGoogle || !googleLinkPassword}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 disabled:opacity-50"
            >
              {isLinkingGoogle ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LinkIcon className="w-4 h-4" />
              )}
              <span>Tautkan Akun Google Sekarang</span>
            </button>
          </form>
        )}
      </div>

      {/* Sessions & Logout All */}
      <div className="bg-rose-50/50 rounded-3xl p-6 sm:p-8 border border-rose-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-extrabold text-sm text-rose-950">Keluar dari Seluruh Perangkat</h3>
          <p className="text-xs text-rose-700 max-w-md">
            Cabut seluruh sesi login aktif di seluruh komputer, tablet, dan smartphone lain.
          </p>
        </div>
        <button
          onClick={handleLogoutAll}
          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 shrink-0 shadow-xs"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout All Devices</span>
        </button>
      </div>
    </div>
  );
};
