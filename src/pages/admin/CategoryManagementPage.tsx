import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/admin.service';
import { requireMutationSuccess } from '../../utils/mutation-guards';
import { useNotification } from '../../context/NotificationContext';
import { Category } from '../../types/course';
import { CategoryStatistics } from '../../types/admin';
import { formatDateIndo } from '../../utils/formatters';
import {
  FolderTree,
  Plus,
  Search,
  Edit2,
  Trash2,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Loader2,
  BookOpen,
} from 'lucide-react';

export const CategoryManagementPage: React.FC = () => {
  const { showToast } = useNotification();
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<CategoryStatistics | null>(null);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal create/edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const [catRes, statRes] = await Promise.all([
        adminService.getCategories({ search: search || undefined }),
        adminService.getCategoryStatistics(),
      ]);
      if (!catRes.success || !Array.isArray(catRes.data)) throw new Error(catRes.message || 'Kategori tidak dapat dimuat.');
      setCategories(catRes.data);
      if (statRes.success && statRes.data) setStats(statRes.data);
    } catch (err: any) {
      showToast(err.message || 'Gagal memuat kategori.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [search]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      if (editingCategory) {
        const res = await adminService.updateCategory(editingCategory.id, {
          name: name.trim(),
          description: description.trim() || undefined,
        });
        requireMutationSuccess(res);
        showToast('Kategori berhasil diperbarui.', 'success');
      } else {
        const res = await adminService.createCategory({
          name: name.trim(),
          description: description.trim() || undefined,
        });
        requireMutationSuccess(res);
        showToast('Kategori baru berhasil ditambahkan.', 'success');
      }
      setModalOpen(false);
      setEditingCategory(null);
      setName('');
      setDescription('');
      fetchCategories();
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan kategori.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (cat: Category) => {
    try {
      const res = await adminService.changeCategoryStatus(cat.id, !cat.isActive);
      requireMutationSuccess(res);
      {
        showToast(`Status kategori diubah menjadi ${!cat.isActive ? 'Aktif' : 'Nonaktif'}.`, 'success');
        fetchCategories();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal mengubah status.', 'error');
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus kategori ini?')) return;
    try {
      const res = await adminService.deleteCategory(categoryId);
      requireMutationSuccess(res);
      {
        showToast('Kategori berhasil dihapus.', 'info');
        fetchCategories();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus kategori.', 'error');
    }
  };

  const handleRestore = async (categoryId: string) => {
    try {
      const res = await adminService.restoreCategory(categoryId);
      requireMutationSuccess(res);
      {
        showToast('Kategori berhasil dipulihkan.', 'success');
        fetchCategories();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal memulihkan kategori.', 'error');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FolderTree className="w-7 h-7 text-indigo-600" />
            <span>Manajemen Kategori</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola pengelompokan bidang ilmu dan katalog kursus platform 24Institute.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingCategory(null);
            setName('');
            setDescription('');
            setModalOpen(true);
          }}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center gap-2 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kategori Baru</span>
        </button>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Kategori</span>
            <div className="text-xl font-black text-slate-900 mt-0.5">{stats.totalCategories}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400">Kategori Aktif</span>
            <div className="text-xl font-black text-emerald-600 mt-0.5">{stats.activeCategories}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400">Kategori Nonaktif</span>
            <div className="text-xl font-black text-slate-400 mt-0.5">{stats.inactiveCategories}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400">Kursus Terhubung</span>
            <div className="text-xl font-black text-indigo-600 mt-0.5">{stats.totalCoursesAssigned}</div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama kategori..."
          className="bg-transparent border-0 text-slate-900 text-xs w-full focus:outline-hidden"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="mt-3 text-xs text-slate-500">Memuat kategori...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            Belum ada kategori yang ditambahkan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Nama Kategori</th>
                  <th className="py-3 px-4">Slug Publik</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Total Kursus</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{cat.name}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">
                        {cat.description || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">/{cat.slug}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleStatus(cat)}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold border transition ${
                          cat.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {cat.isActive ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {cat.coursesCount || 0}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingCategory(cat);
                            setName(cat.name);
                            setDescription(cat.description || '');
                            setModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-100"
                          title="Edit Kategori"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Hapus Kategori"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE/EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400">
                ✕
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">
                  Nama Kategori *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Kecerdasan Buatan & Data"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">
                  Deskripsi Kategori
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Penjelasan cakupan materi kategori..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-2 text-slate-500 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Kategori'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
