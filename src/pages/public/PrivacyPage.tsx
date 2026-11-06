import React from 'react';
import { Shield } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
          <Shield className="w-4 h-4" />
          <span>Privasi & Perlindungan Data</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Kebijakan Privasi 24Institute</h1>
        <p className="text-xs text-slate-400">Terakhir diperbarui: 02 November 2026</p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-6 text-sm text-slate-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">1. Pendahuluan</h2>
          <p>
            24Institute berkomitmen untuk melindungi privasi setiap pengguna platform Learning Management System (LMS) kami, termasuk Siswa, Instruktur, dan Pengelola. Kebijakan ini menjelaskan bagaimana data pribadi Anda dikumpulkan, diproses, dan dilindungi.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">2. Informasi yang Kami Kumpulkan</h2>
          <p>Kami mengumpulkan data yang diperlukan untuk mendukung layanan pendidikan, meliputi:</p>
          <ul className="list-disc list-inside space-y-1 text-slate-600 pl-2">
            <li>Identitas dasar: Nama lengkap, alamat email, nomor telepon, dan alamat domisili.</li>
            <li>Data autentikasi: Password terenkripsi (Argon2), sesi login OTP, dan ID Token Google Sign-In.</li>
            <li>Aktivitas pembelajaran: Progres kursus, penyelesaian materi, nilai kuis evaluasi, dan riwayat sertifikat.</li>
            <li>Data transaksi: Catatan pesanan dan ID transaksi Midtrans Sandbox (kami tidak menyimpan nomor kartu kredit/debit secara langsung).</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">3. Keamanan & Proteksi Media</h2>
          <p>
            Media berbayar (video, gambar diagram, audio materi) dilindungi menggunakan tautan bertanda tangan digital berjangka waktu 120 detik. Pengguna dilarang mendistribusikan aset terproteksi di luar ekosistem resmi platform.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">4. Verifikasi Sertifikat Publik</h2>
          <p>
            Registri verifikasi publik hanya menampilkan keabsahan nomor sertifikat dan judul kursus yang diselesaikan, tanpa mengekspos data pribadi seperti alamat email, nomor telepon, atau data identitas siswa.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">5. Kontak Privasi</h2>
          <p>
            Jika Anda memiliki pertanyaan terkait kebijakan privasi ini atau ingin mengajukan hak privasi data akun, hubungi tim kami di{' '}
            <strong className="text-blue-600 font-mono">privacy@24institute.id</strong>.
          </p>
        </section>
      </div>
    </div>
  );
};
