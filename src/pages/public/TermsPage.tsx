import React from 'react';
import { BookOpen } from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
          <BookOpen className="w-4 h-4" />
          <span>Aturan Layanan & Ketentuan Penggunaan</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Syarat & Ketentuan Layanan</h1>
        <p className="text-xs text-slate-400">Terakhir diperbarui: 02 November 2026</p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-6 text-sm text-slate-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">1. Persetujuan Layanan</h2>
          <p>
            Dengan mendaftar, mengakses, atau menggunakan layanan 24Institute, Anda menyetujui untuk terikat secara hukum dengan seluruh syarat dan ketentuan ini.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">2. Akun & Keamanan Autentikasi</h2>
          <p>
            Anda bertanggung jawab penuh untuk menjaga kerahasiaan kredensial akun, termasuk kode OTP 6-digit yang dikirimkan ke email Anda. Dilarang membagikan akun kepada pihak ketiga tanpa izin.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">3. Hak Akses & Pembelian Kursus</h2>
          <p>
            Pembelian kursus memberikan hak akses personal terhadap kurikulum dan materi pembelajaran yang dipilih. Hak akses ini tidak dapat dipindahtangankan atau dijual kembali kepada pihak lain.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">4. Sertifikat Digital Internal</h2>
          <p>
            Sertifikat yang diterbitkan setelah kelulusan merupakan sertifikat internal resmi 24Institute yang memvalidasi partisipasi dan pemahaman materi. Sertifikat ini bukan sertifikat profesi resmi dari Badan Nasional Sertifikasi Profesi (BNSP).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">5. Komunitas Diskusi WhatsApp</h2>
          <p>
            Tautan grup WhatsApp disediakan secara manual sebagai sarana komunikasi antar siswa terdaftar. Pengguna diwajibkan menjaga kesopanan dan etika diskusi profesional dalam setiap forum resmi.
          </p>
        </section>
      </div>
    </div>
  );
};
