import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/admin.service';
import { useNotification } from '../../context/NotificationContext';
import { MediaItem, MediaStatistics, PremiumExposure, PremiumAssetInventory } from '../../types/admin';
import { formatBytes, formatDateIndo } from '../../utils/formatters';
import {
  Image as ImageIcon,
  HardDrive,
  ShieldCheck,
  Trash2,
  RotateCcw,
  RefreshCw,
  Loader2,
  Upload,
  CheckCircle2,
  Eye,
} from 'lucide-react';

export const MediaManagementPage: React.FC = () => {
  const { showToast } = useNotification();
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [stats, setStats] = useState<MediaStatistics | null>(null);
  const [exposure, setExposure] = useState<PremiumExposure | null>(null);
  const [inventory, setInventory] = useState<PremiumAssetInventory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCleaning, setIsCleaning] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isLoadingMediaDetail, setIsLoadingMediaDetail] = useState(false);

  const handleOpenDetail = async (media: MediaItem) => {
    setSelectedMedia(media);
    setIsLoadingMediaDetail(true);
    try {
      const res = await adminService.getMediaById(media.id);
      if (res.success && res.data) {
        setSelectedMedia(res.data);
      }
    } catch {
      // Keep existing row snapshot
    } finally {
      setIsLoadingMediaDetail(false);
    }
  };

  const fetchMediaData = async () => {
    setIsLoading(true);
    try {
      const [listRes, statRes, expRes, invRes] = await Promise.all([
        adminService.getMediaList(),
        adminService.getMediaStatistics(),
        adminService.getPremiumExposure(),
        adminService.getPremiumAssetInventory(),
      ]);
      if (listRes.success && listRes.data) setMediaList(listRes.data);
      if (statRes.success && statRes.data) setStats(statRes.data);
      if (expRes.success && expRes.data) setExposure(expRes.data);
      if (invRes.success && invRes.data) setInventory(invRes.data);
    } catch (err: any) {
      showToast(err.message || 'Gagal memuat media storage.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMediaData();
  }, []);

  const handleCleanup = async () => {
    if (!confirm('Jalankan pembersihan aset media yatim/lama (olderThanDays: 30)?')) return;
    setIsCleaning(true);
    try {
      const res = await adminService.cleanupMedia(30);
      if (res.success) {
        showToast(`Pembersihan selesai: ${res.data.cleanedCount} aset dibersihkan.`, 'success');
        fetchMediaData();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menjalankan cleanup.', 'error');
    } finally {
      setIsCleaning(false);
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (!confirm('Hapus media ini?')) return;
    try {
      const res = await adminService.deleteMedia(mediaId);
      if (res.success) {
        showToast('Media berhasil dihapus.', 'info');
        fetchMediaData();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus media.', 'error');
    }
  };

  const handleRestoreMedia = async (mediaId: string) => {
    try {
      const res = await adminService.restoreMedia(mediaId);
      if (res.success) {
        showToast('Media berhasil dipulihkan.', 'success');
        fetchMediaData();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal memulihkan media.', 'error');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <HardDrive className="w-7 h-7 text-indigo-600" />
            <span>Inventaris & Proteksi Media</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pengelolaan aset Cloudinary, pemantauan URL bertanda tangan (120s TTL), dan pembersihan media lama.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCleanup}
            disabled={isCleaning}
            className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition flex items-center gap-1.5 disabled:opacity-50"
          >
            {isCleaning && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Cleanup Media Lama</span>
          </button>

          <button
            onClick={fetchMediaData}
            className="p-2.5 rounded-xl bg-white border border-slate-300 text-slate-600 hover:text-indigo-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Total Aset Media</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats?.totalItems || 0}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Kapasitas: {formatBytes(stats?.totalStorageBytes)}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Materi Terproteksi</span>
          <div className="text-2xl font-black text-indigo-600 mt-1">
            {exposure?.totalProtectedLessons || 0}
          </div>
          <div className="text-[11px] text-indigo-500 mt-0.5 font-semibold">
            {exposure?.activeExpiringUrlsCount || 0} URL aktif (TTL 120s)
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Signed URLs (24 Jam)</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {exposure?.totalSignedUrlsGenerated24h || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Permintaan unduh temporer</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Aset Yatim (Orphaned)</span>
          <div className="text-2xl font-black text-slate-700 mt-1">
            {inventory?.orphanedAssetsCount || 0}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">Semua terhubung</div>
        </div>
      </div>

      {/* Media Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">Daftar Inventaris Media Terdaftar</h3>
          <span className="text-xs text-slate-400 font-mono">{mediaList.length} item</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="mt-3 text-xs text-slate-500">Memuat inventaris media...</p>
          </div>
        ) : mediaList.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            Belum ada media tersimpan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Nama File</th>
                  <th className="py-3 px-4">Tujuan (Purpose)</th>
                  <th className="py-3 px-4">Ukuran</th>
                  <th className="py-3 px-4">Pengunggah</th>
                  <th className="py-3 px-4">Waktu Unggah</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mediaList.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 truncate max-w-xs">{m.filename}</div>
                      <div className="text-[10px] font-mono text-slate-400">{m.mimeType}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] font-semibold text-slate-700">
                      {m.purpose}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {formatBytes(m.sizeBytes)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {m.uploadedByName || m.uploadedById}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {formatDateIndo(m.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenDetail(m)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                          title="Inspeksi Detail Media"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {m.isDeleted ? (
                          <button
                            onClick={() => handleRestoreMedia(m.id)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"
                            title="Pulihkan Media"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDeleteMedia(m.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Hapus Media"
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

      {/* Media Detail Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Inspeksi Aset Media</h3>
              <button onClick={() => setSelectedMedia(null)} className="text-slate-400">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Media ID:</span>
                  <span className="font-bold text-slate-900">{selectedMedia.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Filename:</span>
                  <span className="text-slate-900 font-sans font-bold">{selectedMedia.filename}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Purpose:</span>
                  <span className="text-indigo-600 font-bold">{selectedMedia.purpose}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">MIME Type:</span>
                  <span className="text-slate-700">{selectedMedia.mimeType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Ukuran File:</span>
                  <span className="text-slate-700">{formatBytes(selectedMedia.sizeBytes)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Waktu Unggah:</span>
                  <span className="text-slate-700">{formatDateIndo(selectedMedia.createdAt)}</span>
                </div>
              </div>

              {selectedMedia.url && (
                <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 truncate max-w-xs">{selectedMedia.url}</span>
                  <a
                    href={selectedMedia.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-indigo-600 text-white rounded-lg font-bold text-[11px] hover:bg-indigo-500"
                  >
                    Buka Aset
                  </a>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedMedia(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
