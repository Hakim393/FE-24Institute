import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/admin.service';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { AuthUser } from '../../types/auth';
import { UserRole, AccountStatus } from '../../types/api';
import { StatusPill } from '../../components/common/StatusPill';
import { formatDateIndo } from '../../utils/formatters';
import { isValidEmail, isValidPassword } from '../../utils/validation';
import { requireMutationSuccess } from '../../utils/mutation-guards';
import {
  Users,
  Search,
  Plus,
  Shield,
  Lock,
  Unlock,
  KeyRound,
  Trash2,
  RotateCcw,
  UserX,
  UserCheck,
  Edit2,
  RefreshCw,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export const UserManagementPage: React.FC = () => {
  const { role: currentUserRole } = useAuth();
  const { showToast } = useNotification();

  const [users, setUsers] = useState<AuthUser[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Create User Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createFullName, setCreateFullName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<UserRole>('STUDENT');
  const [isCreating, setIsCreating] = useState(false);

  // Action Modals
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [targetRole, setTargetRole] = useState<UserRole>('STUDENT');
  const [recoveryTarget, setRecoveryTarget] = useState<AuthUser | null>(null);
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryMethod, setRecoveryMethod] = useState<'KNOWN_NUMBER_VOICE_CALL' | 'IN_PERSON'>('KNOWN_NUMBER_VOICE_CALL');
  const [recoveryReference, setRecoveryReference] = useState('');
  const [isRecoverySending, setIsRecoverySending] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await adminService.getUsers({
        search: search || undefined,
        role: (roleFilter as UserRole) || undefined,
        status: (statusFilter as AccountStatus) || undefined,
      });
      if (!res.success || !Array.isArray(res.data)) {
        throw new Error(res.message || 'Respons daftar pengguna tidak valid.');
      }
      setUsers(res.data);
    } catch (err: any) {
      setUsers([]);
      showToast(err.message || 'Gagal memuat pengguna.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter, statusFilter]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFullName.trim() || !isValidEmail(createEmail) || !isValidPassword(createPassword)) {
      showToast('Data input pengguna baru belum valid.', 'error');
      return;
    }

    setIsCreating(true);
    try {
      const res = await adminService.createUser({
        fullName: createFullName.trim(),
        email: createEmail.trim(),
        password: createPassword,
        role: createRole,
      });
      requireMutationSuccess(res);
      if (res.success) {
        showToast('Pengguna baru berhasil dibuat.', 'success');
        setCreateModalOpen(false);
        setCreateFullName('');
        setCreateEmail('');
        setCreatePassword('');
        fetchUsers();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal membuat pengguna.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleChangeRole = async () => {
    if (!selectedUser) return;
    try {
      const res = await adminService.changeUserRole(selectedUser.id, targetRole);
      requireMutationSuccess(res);
      if (res.success) {
        showToast(`Role pengguna berhasil diubah menjadi ${targetRole}.`, 'success');
        setRoleModalOpen(false);
        fetchUsers();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal mengubah role pengguna.', 'error');
    }
  };

  const handleUnlockAccount = async (userId: string) => {
    try {
      const res = await adminService.unlockUser(userId);
      requireMutationSuccess(res);
      if (res.success) {
        showToast('Kunci akun berhasil dibuka.', 'success');
        fetchUsers();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal membuka akun.', 'error');
    }
  };

  const handleInstructorRecovery = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isRecoverySending || !recoveryTarget || recoveryTarget.role !== 'INSTRUCTOR') return;
    if (!recoveryPassword || !/^[A-Za-z0-9_-]{8,64}$/.test(recoveryReference.trim())) {
      showToast('Password admin dan referensi verifikasi (8-64 karakter) diperlukan.', 'error');
      return;
    }
    setIsRecoverySending(true);
    try {
      const res = await adminService.requestInstructorPasswordRecovery(recoveryTarget.id, {
        actorPassword: recoveryPassword,
        verificationMethod: recoveryMethod,
        verificationReference: recoveryReference.trim(),
      });
      requireMutationSuccess(res);
      if (res.success && res.data?.accepted === true) {
        showToast('Instruksi pemulihan telah dikirim ke email Instructor.', 'success');
        setRecoveryTarget(null);
        setRecoveryReference('');
      } else {
        throw new Error('Respons pemulihan Instructor tidak lengkap.');
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal mengirim instruksi pemulihan.', 'error');
    } finally {
      setRecoveryPassword('');
      setIsRecoverySending(false);
    }
  };

  const handleToggleDeactivate = async (user: AuthUser) => {
    try {
      if (user.status === 'ACTIVE') {
        const enteredReason = prompt('Masukkan alasan penonaktifan akun:');
        if (enteredReason === null) return;
        const reason = enteredReason.trim();
        if (!reason) {
          showToast('Alasan penonaktifan akun wajib diisi.', 'error');
          return;
        }
        const res = await adminService.deactivateUser(user.id, reason);
        requireMutationSuccess(res);
        if (res.success) showToast('Akun berhasil dinonaktifkan.', 'info');
      } else {
        const res = await adminService.reactivateUser(user.id);
        requireMutationSuccess(res);
        if (res.success) showToast('Akun berhasil diaktifkan kembali.', 'success');
      }
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Gagal mengubah status akun.', 'error');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Apakah Anda yakin ingin melakukan soft-delete pada akun ini?')) return;
    try {
      const res = await adminService.deleteUser(userId, 'Penghapusan oleh Admin');
      requireMutationSuccess(res);
      if (res.success) {
        showToast('Akun pengguna berhasil di-soft delete.', 'info');
        fetchUsers();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus pengguna.', 'error');
    }
  };

  const handleRestoreUser = async (userId: string) => {
    try {
      const res = await adminService.restoreUser(userId);
      requireMutationSuccess(res);
      if (res.success) {
        showToast('Akun pengguna berhasil dipulihkan.', 'success');
        fetchUsers();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal memulihkan pengguna.', 'error');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-indigo-600" />
            <span>Manajemen Pengguna</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pengelolaan akun Siswa, Instruktur, dan Administrator sesuai batas hak akses server.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center gap-2 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Pengguna Baru</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari berdasarkan nama lengkap atau email..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:bg-white focus:border-indigo-500"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden"
            >
              <option value="">Semua Peran (Role)</option>
              <option value="STUDENT">STUDENT</option>
              <option value="INSTRUCTOR">INSTRUCTOR</option>
              <option value="ADMIN">ADMIN</option>
              {currentUserRole === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">SUPER_ADMIN</option>}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden"
            >
              <option value="">Semua Status Akun</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="LOCKED">LOCKED</option>
              <option value="DELETED">DELETED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="mt-3 text-xs text-slate-500">Memuat daftar pengguna...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            Tidak ada data pengguna yang sesuai dengan filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Pengguna</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status Akun</th>
                  <th className="py-3 px-4">Verifikasi Email</th>
                  <th className="py-3 px-4">Terdaftar</th>
                  <th className="py-3 px-4 text-right">Aksi Manajemen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{u.profile?.fullName || 'Pengguna'}</div>
                      <div className="text-[11px] font-mono text-slate-500">{u.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusPill status={u.role} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <StatusPill status={u.status} size="sm" />
                        {u.isLocked && (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            Terkunci
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        ✓ Terverifikasi
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {formatDateIndo(u.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Change Role Button */}
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setTargetRole(u.role);
                            setRoleModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-100"
                          title="Ubah Role"
                        >
                          <Shield className="w-4 h-4" />
                        </button>

                        {/* Unlock account if locked */}
                        {u.isLocked && (
                          <button
                            onClick={() => handleUnlockAccount(u.id)}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50"
                            title="Buka Kunci Akun"
                          >
                            <Unlock className="w-4 h-4" />
                          </button>
                        )}

                        {/* Admin-approved recovery is only for Instructor. */}
                        {u.role === 'INSTRUCTOR' && (
                          <button
                            onClick={() => {
                              setRecoveryTarget(u);
                              setRecoveryPassword('');
                              setRecoveryReference('');
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-100"
                            title="Ajukan Pemulihan Password Instructor"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                        )}

                        {/* Deactivate/Reactivate */}
                        <button
                          onClick={() => handleToggleDeactivate(u)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-amber-600 hover:bg-slate-100"
                          title={u.status === 'ACTIVE' ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                        >
                          {u.status === 'ACTIVE' ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </button>

                        {/* Soft Delete or Restore */}
                        {u.status === 'DELETED' ? (
                          <button
                            onClick={() => handleRestoreUser(u.id)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"
                            title="Pulihkan Akun"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                            title="Soft Delete Pengguna"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* CREATE USER MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Buat Pengguna Baru</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={createFullName}
                  onChange={(e) => setCreateFullName(e.target.value)}
                  placeholder="Nama Lengkap"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">
                  Alamat Email *
                </label>
                <input
                  type="email"
                  required
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">
                  Kata Sandi Sementara (Min. 8) *
                </label>
                <input
                  type="password"
                  required
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Peran (Role) *</label>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  <option value="STUDENT">STUDENT</option>
                  <option value="INSTRUCTOR">INSTRUCTOR</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  *Super Admin tidak dapat dibuat melalui form pembuatan biasa sesuai policy backend.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3 py-2 text-slate-500 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                >
                  {isCreating ? 'Menyimpan...' : 'Buat Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSTRUCTOR RECOVERY MODAL — verified off-email, with admin password step-up */}
      {recoveryTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleInstructorRecovery}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-lg text-slate-900">Pemulihan Akun Instructor</h3>
            <p className="text-sm text-slate-600">
              Pastikan identitas <strong>{recoveryTarget.email}</strong> diverifikasi melalui
              kontak yang sudah dikenal secara independen, bukan hanya melalui email.
              Administrator tidak menentukan password baru.
            </p>
            <label className="block text-sm font-semibold text-slate-700">
              Metode verifikasi identitas
              <select value={recoveryMethod} onChange={e => setRecoveryMethod(e.target.value as 'KNOWN_NUMBER_VOICE_CALL' | 'IN_PERSON')}
                className="mt-1 w-full rounded-lg border p-2" required>
                <option value="KNOWN_NUMBER_VOICE_CALL">Panggilan ke nomor terdaftar sebelumnya</option>
                <option value="IN_PERSON">Verifikasi langsung tatap muka</option>
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Nomor tiket/catatan verifikasi (tanpa data pribadi)
              <input value={recoveryReference} onChange={e => setRecoveryReference(e.target.value)}
                placeholder="CASE_20261104_01" minLength={8} maxLength={64}
                pattern="[A-Za-z0-9_-]{8,64}" autoComplete="off"
                className="mt-1 w-full rounded-lg border p-2" required />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Konfirmasi password Administrator
              <input type="password" value={recoveryPassword} onChange={e => setRecoveryPassword(e.target.value)}
                autoComplete="current-password" minLength={8} maxLength={128}
                className="mt-1 w-full rounded-lg border p-2" required />
            </label>
            <p className="text-xs text-amber-700">
              Lanjutkan hanya jika verifikasi independen sudah benar-benar dilakukan.
              Persetujuan dan referensi akan dicatat dalam audit.
            </p>
            <div className="flex gap-2 justify-end">
              <button type="button" disabled={isRecoverySending}
                onClick={() => { setRecoveryTarget(null); setRecoveryPassword(''); setRecoveryReference(''); }}
                className="rounded-lg border px-4 py-2">Batal</button>
              <button type="submit" disabled={isRecoverySending}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-50">
                {isRecoverySending ? 'Memproses...' : 'Setujui & Kirim Link'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CHANGE ROLE MODAL */}
      {roleModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-in">
            <h3 className="font-bold text-base text-slate-900">Ubah Peran Pengguna</h3>
            <p className="text-xs text-slate-500">
              Pilih peran baru untuk <strong className="text-slate-800">{selectedUser.email}</strong>.
            </p>

            <div>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as UserRole)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
              >
                <option value="STUDENT">STUDENT</option>
                <option value="INSTRUCTOR">INSTRUCTOR</option>
                <option value="ADMIN">ADMIN</option>
                {currentUserRole === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">SUPER_ADMIN</option>}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setRoleModalOpen(false)}
                className="px-3 py-2 text-slate-500 font-semibold text-xs"
              >
                Batal
              </button>
              <button
                onClick={handleChangeRole}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
              >
                Simpan Peran
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
