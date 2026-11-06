import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, BookOpen, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-gray-400 text-sm border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/brand/logo-24institute.png"
                alt="Logo 24Institute"
                className="h-9 w-auto brightness-110"
              />
              <span className="font-extrabold text-xl text-white tracking-tight">24Institute</span>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed max-w-md">
              Platform Learning Management System (LMS) resmi untuk pendidikan bisnis, teknologi, dan kecakapan profesional modern. Terintegrasi penuh dengan arsitektur backend REST API, evaluasi kurikulum, dan sertifikasi digital internal.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Sertifikat Digital Internal Resmi 24Institute (Bukan Afiliasi BNSP)</span>
            </div>
          </div>

          {/* Navigation links */}
          <div>
            <h4 className="font-semibold text-white text-xs uppercase tracking-wider mb-3">Navigasi Utama</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/courses" className="hover:text-white transition">Katalog Kursus</Link>
              </li>
              <li>
                <Link to="/categories" className="hover:text-white transition">Daftar Kategori</Link>
              </li>
              <li>
                <Link to="/verify-certificate" className="hover:text-white transition">Verifikasi Sertifikat Publik</Link>
              </li>
              <li>
                {import.meta.env.DEV && (
<Link to="/audit-matrix" className="hover:text-white transition">136 API Route Coverage</Link>
)}
              </li>
            </ul>
          </div>

          {/* Legal and terms */}
          <div>
            <h4 className="font-semibold text-white text-xs uppercase tracking-wider mb-3">Kebijakan & Hukum</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/privacy" className="hover:text-white transition">Kebijakan Privasi (Privacy Policy)</Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-white transition">Syarat & Ketentuan (Terms of Service)</Link>
              </li>
              <li>
                <a
                  href="https://sandbox.midtrans.com"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition flex items-center gap-1"
                >
                  Midtrans Sandbox Gateway <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <p>© {new Date().getFullYear()} 24Institute. Hak Cipta Dilindungi Undang-Undang.</p>
          <p className="text-[11px] text-gray-400">
            Frontend Resmi Vercel-Ready &middot; Arsitektur Role-Based (Student, Instructor, Admin, Super Admin)
          </p>
        </div>
      </div>
    </footer>
  );
};
