import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ConnectionBanner } from '../common/ConnectionBanner';
import {
  LayoutDashboard,
  Users,
  FolderTree,
  FileCheck2,
  Award,
  Receipt,
  GraduationCap,
  Image as ImageIcon,
  MessageCircle,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  Shield,
  FileSpreadsheet,
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { user, role, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Ringkasan Dashboard', end: true },
    { to: '/admin/users', icon: Users, label: 'Manajemen Pengguna' },
    { to: '/admin/categories', icon: FolderTree, label: 'Manajemen Kategori' },
    { to: '/admin/course-reviews', icon: FileCheck2, label: 'Review & Publikasi Kursus' },
    { to: '/admin/certificates', icon: Award, label: 'Manajemen Sertifikat' },
    { to: '/admin/orders', icon: Receipt, label: 'Monitoring Transaksi (Read-Only)' },
    { to: '/admin/enrollments', icon: GraduationCap, label: 'Monitoring Enrollment' },
    { to: '/admin/media', icon: ImageIcon, label: 'Inventaris & Proteksi Media' },
    { to: '/admin/whatsapp', icon: MessageCircle, label: 'Tautan Grup WhatsApp' },
    { to: '/audit-matrix', icon: FileSpreadsheet, label: 'Matriks 136 Kontrak API' },
    { to: '/admin/notifications', icon: Bell, label: 'Notifikasi Sistem' },
    { to: '/admin/profile', icon: User, label: 'Profil Administrator' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900 font-sans antialiased">
      <ConnectionBanner />

      <div className="flex-1 flex">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Admin Sidebar */}
        <aside
          className={`fixed md:sticky top-0 z-50 md:z-30 h-screen w-64 bg-slate-900 text-slate-200 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <img
                src="/brand/logo-24institute.png"
                alt="24Institute"
                className="h-8 w-auto object-contain brightness-110"
              />
              <div>
                <div className="font-extrabold text-sm text-white leading-tight">24Institute</div>
                <div className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  {role === 'SUPER_ADMIN' ? 'Super Admin LMS' : 'Admin Operasional'}
                </div>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Admin user card */}
          <div className="p-3 mx-3 my-2 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-indigo-500/20">
              {user?.profile?.fullName?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">
                {user?.profile?.fullName || user?.email}
              </div>
              <div className="text-[10px] text-indigo-300 font-medium">
                {role === 'SUPER_ADMIN' ? 'Otoritas Super Admin' : 'Hak Akses Admin'}
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
            {navItems.filter((item) => import.meta.env.DEV || item.to !== '/audit-matrix').map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Logout */}
          <div className="p-3 border-t border-slate-800">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/40 transition"
            >
              <LogOut className="w-4 h-4" />
              Keluar Sesi
            </button>
          </div>
        </aside>

        {/* Content View */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="md:hidden sticky top-0 z-20 bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between text-white">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-bold text-sm">24Institute Admin Console</span>
            <div className="w-6" />
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
