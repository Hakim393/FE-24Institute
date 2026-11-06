import React, { useState } from 'react';
import { adminService } from '../../services/admin.service';
import { useNotification } from '../../context/NotificationContext';
import {
  Image as ImageIcon,
  Headphones,
  UploadCloud,
  FileCheck2,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

export const MediaLibraryPage: React.FC = () => {
  const { showToast } = useNotification();
  const [activeType, setActiveType] = useState<'THUMBNAIL' | 'IMAGE' | 'AUDIO'>('THUMBNAIL');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadedUrl(null);
    try {
      let res;
      if (activeType === 'THUMBNAIL') {
        res = await adminService.uploadCourseThumbnail(file);
      } else if (activeType === 'IMAGE') {
        res = await adminService.uploadLessonImage(file);
      } else {
        res = await adminService.uploadLessonAudio(file);
      }

      if (res.success !== true || !res.data?.mediaId || !res.data?.url) {
        throw new Error('Upload media belum dikonfirmasi server. Periksa daftar media sebelum mencoba lagi.');
      }
      setUploadedUrl(res.data.url);
      showToast('File media berhasil diunggah ke storage aman!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal mengunggah media.', 'error');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-8 max-w-4xl pb-12">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
          <ImageIcon className="w-7 h-7 text-teal-400" />
          <span>Media Library & Aset Kursus</span>
        </h1>
        <p className="text-xs text-slate-400">
          Unggah aset gambar thumbnail, ilustrasi materi, dan audio pelajaran untuk dihubungkan ke modul kurikulum.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => {
            setActiveType('THUMBNAIL');
            setUploadedUrl(null);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeType === 'THUMBNAIL'
              ? 'bg-teal-500 text-slate-950'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Thumbnail Kursus</span>
        </button>

        <button
          onClick={() => {
            setActiveType('IMAGE');
            setUploadedUrl(null);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeType === 'IMAGE'
              ? 'bg-teal-500 text-slate-950'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Gambar / Diagram Lesson</span>
        </button>

        <button
          onClick={() => {
            setActiveType('AUDIO');
            setUploadedUrl(null);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeType === 'AUDIO'
              ? 'bg-teal-500 text-slate-950'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Headphones className="w-4 h-4" />
          <span>Audio / Podcast Lesson</span>
        </button>
      </div>

      {/* Upload Zone */}
      <div className="bg-slate-950 p-8 rounded-3xl border-2 border-dashed border-slate-800 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 text-teal-400 flex items-center justify-center mx-auto">
          {isUploading ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : (
            <UploadCloud className="w-8 h-8" />
          )}
        </div>

        <div className="space-y-1">
          <h3 className="font-bold text-sm text-white">
            Unggah File{' '}
            {activeType === 'THUMBNAIL'
              ? 'Thumbnail'
              : activeType === 'IMAGE'
              ? 'Gambar'
              : 'Audio'}
          </h3>
          <p className="text-xs text-slate-400">
            {activeType === 'AUDIO'
              ? 'Format: MP3, WAV, AAC (Maks. 20 MB)'
              : 'Format: JPEG, PNG, WebP (Maks. 5 MB)'}
          </p>
        </div>

        <div>
          <label className="inline-block px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs cursor-pointer transition shadow-md">
            <span>Pilih File dari Komputer</span>
            <input
              type="file"
              accept={activeType === 'AUDIO' ? 'audio/*' : 'image/*'}
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
          </label>
        </div>
      </div>

      {/* Upload Result Preview */}
      {uploadedUrl && (
        <div className="bg-teal-950/30 p-5 rounded-2xl border border-teal-800/60 space-y-3 animate-scale-in">
          <div className="flex items-center gap-2 text-teal-400 font-bold text-xs">
            <CheckCircle2 className="w-4 h-4" />
            <span>Upload Berhasil! URL Media Tersedia:</span>
          </div>
          <div className="p-3 bg-slate-900 rounded-xl font-mono text-[11px] text-slate-300 break-all select-all">
            {uploadedUrl}
          </div>
        </div>
      )}
    </div>
  );
};
