import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth.service';
import { api } from '../../services/api';

type BackendProfile = {
  avatarUrl: string | null;
  phone: string | null;
  address: string | null;
  dateOfBirth: string | null;
  headline?: string | null;
  biography?: string | null;
  expertise?: string[];
};

type BackendProfileUser = {
  id: string;
  fullName: string;
  email: string;
  role: 'INSTRUCTOR' | 'ADMIN' | 'SUPER_ADMIN' | 'STUDENT';
  profile: BackendProfile | null;
};

type ProfileForm = {
  fullName: string;
  phone: string;
  address: string;
  dateOfBirth: string;
};

type ProfessionalForm = {
  headline: string;
  biography: string;
  expertise: string;
};
const emptyProfessionalForm: ProfessionalForm = {
  headline: '', biography: '', expertise: '',
};
const toProfessionalForm = (user: BackendProfileUser): ProfessionalForm => ({
  headline: user.profile?.headline ?? '',
  biography: user.profile?.biography ?? '',
  expertise: (user.profile?.expertise ?? []).join('\n'),
});

const emptyForm: ProfileForm = { fullName: '', phone: '', address: '', dateOfBirth: '' };

const toForm = (user: BackendProfileUser): ProfileForm => ({
  fullName: user.fullName,
  phone: user.profile?.phone ?? '',
  address: user.profile?.address ?? '',
  dateOfBirth: user.profile?.dateOfBirth ?? '',
});

const errorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    const value = (error as { message?: unknown }).message;
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return 'Permintaan gagal. Periksa koneksi atau coba kembali.';
};

const safeProfileUser = (value: unknown): value is BackendProfileUser => {
  if (!value || typeof value !== 'object') return false;
  const user = value as Partial<BackendProfileUser>;
  return typeof user.id === 'string' && user.id.length > 0 &&
    typeof user.fullName === 'string' && typeof user.email === 'string' &&
    typeof user.role === 'string' &&
    (user.profile === null || (typeof user.profile === 'object' && user.profile !== undefined));
};

export const AccountOverviewPage: React.FC = () => {
  const { user: sessionUser, role, refreshProfile } = useAuth();
  const [record, setRecord] = useState<BackendProfileUser | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [professional, setProfessional] = useState<ProfessionalForm>(emptyProfessionalForm);
  const [professionalBusy, setProfessionalBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);


  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.request<{ user: BackendProfileUser }>('/auth/profile');
        if (!res.success || !safeProfileUser(res.data?.user)) {
          throw new Error('Respons profil dari server tidak lengkap.');
        }
        if (!mounted) return;
        setRecord(res.data.user);
        setForm(toForm(res.data.user));
        setProfessional(toProfessionalForm(res.data.user));
      } catch (err) {
        if (mounted) setError(errorMessage(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, [sessionUser?.id]);

  useEffect(() => {
    if (!avatarFile) { setAvatarPreview(null); return; }
    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [avatarFile]);

  const pickAvatar = (file: File | null) => {
    setError('');
    setSuccess('');
    if (file && (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size < 1 || file.size > 2 * 1024 * 1024 ||
      !/\.(jpe?g|png|webp)$/i.test(file.name))) {
      setAvatarFile(null);
      setError('Foto harus JPG, PNG, atau WebP dengan ukuran maksimal 2 MiB.');
      return;
    }
    setAvatarFile(file);
  };

  const reloadVerifiedProfile = async (expectedAvatar: string | null) => {
    const res = await api.request<{ user: BackendProfileUser }>('/auth/profile');
    if (!res.success || !safeProfileUser(res.data?.user) ||
      res.data.user.id !== record?.id || res.data.user.profile?.avatarUrl !== expectedAvatar) {
      throw new Error('Server belum mengonfirmasi perubahan foto profil.');
    }
    setRecord(res.data.user);
    setForm(toForm(res.data.user));
    setProfessional(toProfessionalForm(res.data.user));
    await refreshProfile();
  };

  const handleUploadAvatar = async () => {
    if (!record || role !== 'INSTRUCTOR' || !avatarFile || avatarBusy) return;
    setError(''); setSuccess(''); setAvatarBusy(true);
    try {
      const result = await authService.uploadAvatar(avatarFile);
      const newUrl = result.data?.avatarUrl;
      if (!result.success || typeof newUrl !== 'string' ||
        !newUrl.startsWith('https://res.cloudinary.com/')) {
        throw new Error('Upload tidak dikonfirmasi oleh backend.');
      }
      await reloadVerifiedProfile(newUrl);
      setAvatarFile(null);
      setSuccess('Foto profil Instructor berhasil disimpan.');
    } catch (err) { setError(errorMessage(err)); }
    finally { setAvatarBusy(false); }
  };

  const handleDeleteAvatar = async () => {
    if (!record || role !== 'INSTRUCTOR' || !record.profile?.avatarUrl || avatarBusy) return;
    setError(''); setSuccess(''); setAvatarBusy(true);
    try {
      const result = await authService.deleteAvatar();
      if (!result.success || result.data?.avatarUrl !== null) {
        throw new Error('Penghapusan tidak dikonfirmasi oleh backend.');
      }
      await reloadVerifiedProfile(null);
      setAvatarFile(null);
      setSuccess('Foto profil Instructor berhasil dihapus.');
    } catch (err) { setError(errorMessage(err)); }
    finally { setAvatarBusy(false); }
  };

  const updateField = (key: keyof ProfileForm, value: string) => {
    setForm(previous => ({ ...previous, [key]: value }));
    setError('');
    setSuccess('');
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !record) return;
    setError('');
    setSuccess('');

    const name = form.fullName.trim();
    const phone = form.phone.trim();
    const address = form.address.trim();
    const dob = form.dateOfBirth;
    if (name.length < 1 || name.length > 150) {
      setError('Nama lengkap wajib diisi, maksimal 150 karakter.');
      return;
    }
    if (phone.length > 30 || address.length > 2000) {
      setError('Nomor telepon atau alamat terlalu panjang.');
      return;
    }

    const old = toForm(record);
    const payload: { fullName?: string; phone?: string | null; address?: string | null; dateOfBirth?: string | null } = {};
    if (name !== old.fullName) payload.fullName = name;
    if (phone !== old.phone) payload.phone = phone || null;
    if (address !== old.address) payload.address = address || null;
    if (dob !== old.dateOfBirth) payload.dateOfBirth = dob || null;
    if (Object.keys(payload).length === 0) {
      setSuccess('Tidak ada perubahan profil yang perlu disimpan.');
      return;
    }

    setBusy(true);
    try {
      const res = await api.request<{ user: BackendProfileUser }>('/auth/profile', { method: 'PATCH', body: payload });
      if (!res.success || !safeProfileUser(res.data?.user) || res.data.user.id !== record.id) {
        throw new Error('Server tidak mengonfirmasi perubahan profil.');
      }
      setRecord(res.data.user);
      setForm(toForm(res.data.user));
    setProfessional(toProfessionalForm(res.data.user));
      setSuccess('Profil berhasil disimpan.');
      await refreshProfile();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSaveProfessional = async (event: React.FormEvent) => {
    event.preventDefault();
    if (professionalBusy || !record || role !== 'INSTRUCTOR') return;
    setError(''); setSuccess('');
    const expertise = professional.expertise.split('\n').map(s => s.trim()).filter(Boolean);
    if (professional.headline.length > 150 || professional.biography.length > 2000 ||
      expertise.length > 12 || expertise.some(s => s.length > 60) ||
      new Set(expertise.map(s => s.toLowerCase())).size !== expertise.length) {
      setError('Headline, bio, atau daftar keahlian tidak valid (maks. 12 keahlian).');
      return;
    }
    const old = toProfessionalForm(record);
    const payload: Record<string, string | null | string[]> = {};
    if (professional.headline.trim() !== old.headline) payload.headline = professional.headline.trim() || null;
    if (professional.biography.trim() !== old.biography) payload.biography = professional.biography.trim() || null;
    if (professional.expertise.trim() !== old.expertise) payload.expertise = expertise;
    if (!Object.keys(payload).length) { setSuccess('Tidak ada perubahan profil profesional.'); return; }
    setProfessionalBusy(true);
    try {
      const res = await api.request<{ user: BackendProfileUser }>('/auth/profile', {
        method: 'PATCH', body: payload,
      });
      if (!res.success || !safeProfileUser(res.data?.user) || res.data.user.id !== record.id) {
        throw new Error('Server belum mengonfirmasi perubahan profil profesional.');
      }
      setRecord(res.data.user);
      setProfessional(toProfessionalForm(res.data.user));
      setSuccess('Profil profesional Instructor berhasil disimpan.');
    } catch (err) { setError(errorMessage(err)); }
    finally { setProfessionalBusy(false); }
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (passwordBusy) return;
    setError('');
    setSuccess('');
    if (!currentPassword || !newPassword || newPassword !== confirmPassword) {
      setError('Masukkan password lama dan konfirmasi password baru dengan benar.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('Password baru harus berbeda dari password sebelumnya.');
      return;
    }
    setPasswordBusy(true);
    try {
      const res = await authService.changePassword(currentPassword, newPassword);
      if (!res.success) throw new Error('Server tidak mengonfirmasi pergantian password.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Password berhasil diperbarui.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPasswordBusy(false);
    }
  };

  const inputClass = 'w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-white outline-none focus:border-teal-400 disabled:opacity-50';
  const labelClass = 'block mb-1.5 text-sm font-semibold text-slate-200';

  return (
    <section className="max-w-4xl mx-auto space-y-6 p-4 md:p-8 text-slate-100">
      <div>
        <h1 className="text-2xl font-extrabold">{role === 'INSTRUCTOR' ? 'Profil Instruktur' : 'Profil Administrator'}</h1>
        <p className="text-sm text-slate-400 mt-1">Kelola informasi akun sendiri. Email dan role hanya dapat diubah melalui proses administratif yang berwenang.</p>
      </div>
      {error && <div role="alert" className="rounded-lg border border-red-600 bg-red-950/50 px-4 py-3 text-sm text-red-200">{error}</div>}
      {success && <div role="status" className="rounded-lg border border-teal-700 bg-teal-950/50 px-4 py-3 text-sm text-teal-200">{success}</div>}
      {loading ? <p className="text-slate-400">Memuat profil dari server...</p> : record ? (
        <>
          <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-5 md:p-7 space-y-5">
            <div className="flex items-center gap-4">
              {(avatarPreview || record.profile?.avatarUrl) ? (
                <img alt="Foto profil" src={avatarPreview || record.profile!.avatarUrl!} className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="h-16 w-16 rounded-full bg-teal-700 flex items-center justify-center text-2xl font-bold">{record.fullName.slice(0,1).toUpperCase() || 'U'}</div>
              )}
              <div>
                <h2 className="text-lg font-bold">{record.fullName}</h2>
                <p className="text-sm text-slate-400">{record.email} · {record.role}</p>
                {role === 'INSTRUCTOR' && <p className="mt-1 text-xs text-slate-400">Foto profil bisa diganti kapan saja. JPG, PNG, WebP maksimal 2 MiB.</p>}
              </div>
            </div>
            {role === 'INSTRUCTOR' && (
              <div className="space-y-2 rounded-lg border border-slate-700 p-4">
                <label htmlFor="instructor-avatar-file" className={labelClass}>Foto profil Instructor</label>
                <input id="instructor-avatar-file" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={event => pickAvatar(event.target.files?.[0] ?? null)} disabled={avatarBusy}
                  className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-md file:border-0 file:bg-teal-500 file:px-4 file:py-2 file:font-semibold file:text-slate-950" />
                {avatarFile && <p className="text-sm text-teal-300">Dipilih: {avatarFile.name}</p>}
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void handleUploadAvatar()} disabled={avatarBusy || !avatarFile}
                    className="rounded-lg bg-teal-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50">{avatarBusy ? 'Memproses...' : 'Upload & Simpan Foto'}</button>
                  {record.profile?.avatarUrl && <button type="button" onClick={() => void handleDeleteAvatar()} disabled={avatarBusy}
                    className="rounded-lg border border-red-500 px-4 py-2 font-semibold text-red-200 disabled:opacity-50">Hapus Foto</button>}
                </div>
              </div>
            )}
            <form onSubmit={handleSave} className="space-y-4">
              <div><label className={labelClass} htmlFor="profile-name">Nama lengkap</label><input id="profile-name" className={inputClass} maxLength={150} required value={form.fullName} onChange={e => updateField('fullName', e.target.value)} disabled={busy} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className={labelClass} htmlFor="profile-phone">Nomor telepon (opsional)</label><input id="profile-phone" type="tel" className={inputClass} maxLength={30} value={form.phone} onChange={e => updateField('phone', e.target.value)} disabled={busy} /></div>
                <div><label className={labelClass} htmlFor="profile-dob">Tanggal lahir (opsional)</label><input id="profile-dob" type="date" className={inputClass} value={form.dateOfBirth} onChange={e => updateField('dateOfBirth', e.target.value)} disabled={busy} /></div>
              </div>
              <div><label className={labelClass} htmlFor="profile-address">Alamat (opsional)</label><textarea id="profile-address" className={inputClass} rows={3} maxLength={2000} value={form.address} onChange={e => updateField('address', e.target.value)} disabled={busy} /></div>
              <div className="flex justify-end"><button type="submit" disabled={busy} className="rounded-lg bg-teal-500 px-5 py-2.5 font-bold text-slate-950 disabled:opacity-50">{busy ? 'Menyimpan...' : 'Simpan Profil'}</button></div>
            </form>
          </div>
          {role === 'INSTRUCTOR' && (
            <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-5 md:p-7 space-y-4">
              <h2 className="font-bold text-lg">Profil Profesional Publik</h2>
              <p className="text-sm text-slate-400">Headline, bio, dan keahlian tampil di halaman course. Tautan LinkedIn/GitHub akan diaktifkan setelah migrasi terkontrol; jangan masukkan kontak pribadi ke bio.</p>
              <form onSubmit={handleSaveProfessional} className="space-y-4">
                <div><label className={labelClass} htmlFor="pro-headline">Headline profesi</label><input id="pro-headline" className={inputClass} maxLength={150} value={professional.headline} onChange={e => setProfessional(p => ({...p, headline: e.target.value}))} placeholder="Fullstack Web Developer & Instructor" /></div>
                <div><label className={labelClass} htmlFor="pro-bio">Biografi profesional</label><textarea id="pro-bio" className={inputClass} rows={5} maxLength={2000} value={professional.biography} onChange={e => setProfessional(p => ({...p, biography: e.target.value}))} placeholder="Ceritakan pengalaman, spesialisasi, dan metode mengajar Anda..." /></div>
                <div><label className={labelClass} htmlFor="pro-skills">Bidang keahlian (satu per baris, maksimal 12)</label><textarea id="pro-skills" className={inputClass} rows={3} value={professional.expertise} onChange={e => setProfessional(p => ({...p, expertise: e.target.value}))} placeholder={'React\nNode.js\nPostgreSQL'} /></div>
                <div className="flex justify-end"><button type="submit" disabled={professionalBusy} className="rounded-lg bg-teal-500 px-5 py-2.5 font-bold text-slate-950 disabled:opacity-50">{professionalBusy ? 'Menyimpan...' : 'Simpan Profil Profesional'}</button></div>
              </form>
            </div>
          )}
          <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-5 md:p-7">
            <h2 className="font-bold text-lg mb-4">Ganti Password</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div><label className={labelClass} htmlFor="current-password">Password saat ini</label><input id="current-password" type="password" autoComplete="current-password" className={inputClass} required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} disabled={passwordBusy} /></div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className={labelClass} htmlFor="new-password">Password baru</label><input id="new-password" type="password" autoComplete="new-password" className={inputClass} required value={newPassword} onChange={e => setNewPassword(e.target.value)} disabled={passwordBusy} /></div>
                <div><label className={labelClass} htmlFor="confirm-password">Konfirmasi password baru</label><input id="confirm-password" type="password" autoComplete="new-password" className={inputClass} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={passwordBusy} /></div>
              </div>
              <div className="flex justify-end"><button type="submit" disabled={passwordBusy} className="rounded-lg border border-teal-400 px-5 py-2.5 font-semibold text-teal-200 disabled:opacity-50">{passwordBusy ? 'Memperbarui...' : 'Perbarui Password'}</button></div>
            </form>
          </div>
        </>
      ) : <div className="text-slate-400">Profil tidak tersedia. Periksa sesi login dan koneksi API.</div>}
    </section>
  );
};
