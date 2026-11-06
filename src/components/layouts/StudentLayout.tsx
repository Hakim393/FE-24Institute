import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { ConnectionBanner } from '../common/ConnectionBanner';
import {
  LayoutDashboard,
  Compass,
  GraduationCap,
  CreditCard,
  Award,
  Bell,
  MessageCircle,
  User,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';

export const StudentLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotification();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navItems = [
    { to: '/student', icon: LayoutDashboard, label: 'Dashboard Siswa', end: true },
    { to: '/courses', icon: Compass, label: 'Jelajahi Kursus' },
    { to: '/student/my-courses', icon: GraduationCap, label: 'Kursus Saya' },
    { to: '/student/orders', icon: CreditCard, label: 'Riwayat Pembelian' },
    { to: '/student/certificates', icon: Award, label: 'Sertifikat Digital' },
    {
      to: '/student/notifications',
      icon: Bell,
      label: 'Notifikasi',
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    { to: '/student/whatsapp', icon: MessageCircle, label: 'Komunitas WhatsApp' },
    { to: '/student/profile', icon: User, label: 'Profil & Akun' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
      <ConnectionBanner />

      <div className="flex-1 flex">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Student Sidebar */}
        <aside
          className={`fixed md:sticky top-0 z-50 md:z-30 h-screen w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          {/* Brand header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <img
                src="/brand/logo-24institute.png"
                alt="24Institute"
                className="h-8 w-auto object-contain"
              />
              <div>
                <div className="font-extrabold text-sm text-blue-900 leading-tight">24Institute</div>
                <div className="text-[10px] text-sky-600 font-semibold uppercase">Portal Siswa</div>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 text-gray-400 hover:text-gray-600 md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Student Profile snippet */}
          <div className="p-4 mx-3 my-2 rounded-xl bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-100/60 flex items-center gap-3">
            {user?.profile?.avatarUrl ? (
              <img
                src={user.profile.avatarUrl}
                alt="Avatar"
                className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/30"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm ring-2 ring-blue-500/20">
                {user?.profile?.fullName?.charAt(0) || 'S'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-gray-900 truncate">
                {user?.profile?.fullName || user?.email}
              </div>
              <div className="text-[11px] text-sky-700 font-medium">Siswa Terdaftar</div>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50/70'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Bottom user action */}
          <div className="p-3 border-t border-slate-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
            >
              <LogOut className="w-4 h-4" />
              Keluar Akun
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top mobile navbar */}
          <header className="md:hidden sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                aria-label="Buka menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <span className="font-bold text-sm text-slate-900">Portal Belajar Siswa</span>
            </div>
            <Link to="/student/notifications" className="relative p-1.5 text-slate-600">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-rose-600 text-white text-[9px] flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </Link>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
