import React, { useState } from 'react';
import { accountNotificationsRoute, accountProfileRoute } from './account-role-routes';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  BookOpen,
  Bell,
  User,
  LogOut,
  LayoutDashboard,
  ShieldCheck,
  Menu,
  X,
  Compass,
  FolderTree,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, role, isAuthenticated, logout } = useAuth();
  const { unreadCount } = useNotification();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getPortalLink = () => {
    if (!isAuthenticated) return '/login';
    if (role === 'INSTRUCTOR') return '/instructor';
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') return '/admin';
    return '/student';
  };

  const getPortalLabel = () => {
    if (role === 'INSTRUCTOR') return 'Authoring Studio';
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') return 'Admin LMS';
    return 'Portal Belajar';
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/brand/logo-24institute.png"
              alt="Logo Resmi 24Institute"
              className="h-10 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-blue-900 leading-none">
                24Institute
              </span>
              <span className="text-[10px] font-semibold text-sky-600 tracking-wider uppercase mt-0.5">
                Pendidikan Bisnis & Teknologi
              </span>
            </div>
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <Link
              to="/courses"
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-blue-700 hover:bg-blue-50/60 transition flex items-center gap-1.5"
            >
              <Compass className="w-4 h-4 text-blue-600" />
              Jelajahi Kursus
            </Link>
            <Link
              to="/categories"
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-blue-700 hover:bg-blue-50/60 transition flex items-center gap-1.5"
            >
              <FolderTree className="w-4 h-4 text-sky-600" />
              Kategori
            </Link>
            <Link
              to="/verify-certificate"
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-blue-700 hover:bg-blue-50/60 transition flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Verifikasi Sertifikat
            </Link>
          </nav>

          {/* User Section & Action CTAs */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  to={getPortalLink()}
                  className="px-3.5 py-2 rounded-lg text-sm font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition flex items-center gap-2"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  {getPortalLabel()}
                </Link>

                {/* Notifications Bell */}
                <Link
                  to={accountNotificationsRoute(role)}
                  className="relative p-2 rounded-lg text-gray-600 hover:text-blue-700 hover:bg-gray-100 transition"
                  title="Notifikasi"
                  aria-label="Lihat notifikasi"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Profile Avatar & Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition focus:outline-hidden"
                    aria-label="Menu akun pengguna"
                  >
                    {user?.profile?.avatarUrl ? (
                      <img
                        src={user.profile.avatarUrl}
                        alt="Avatar"
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/20"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 text-white flex items-center justify-center font-bold text-xs ring-2 ring-blue-500/20">
                        {user?.profile?.fullName?.charAt(0) || 'U'}
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-800 max-w-[120px] truncate">
                      {user?.profile?.fullName || user?.email}
                    </span>
                  </button>

                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 text-sm">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="font-semibold text-gray-900 truncate">
                          {user?.profile?.fullName || 'Pengguna'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                          {role}
                        </span>
                      </div>
                      <Link
                        to={accountProfileRoute(role)}
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition"
                      >
                        <User className="w-4 h-4" />
                        Profil & Akun
                      </Link>
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-rose-600 hover:bg-rose-50 transition text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        Keluar (Logout)
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:text-blue-700 hover:bg-gray-100 transition"
                >
                  Masuk
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition"
                >
                  Daftar Sekarang
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              aria-label="Buka menu navigasi"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 pt-3 pb-5 space-y-2">
          <Link
            to="/courses"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 font-medium hover:bg-blue-50"
          >
            <Compass className="w-4 h-4 text-blue-600" />
            Jelajahi Kursus
          </Link>
          <Link
            to="/categories"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 font-medium hover:bg-blue-50"
          >
            <FolderTree className="w-4 h-4 text-sky-600" />
            Kategori
          </Link>
          <Link
            to="/verify-certificate"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 font-medium hover:bg-blue-50"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Verifikasi Sertifikat
          </Link>
          {import.meta.env.DEV && (
<Link
            to="/audit-matrix"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 font-medium hover:bg-blue-50"
          >
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            Matriks 136 Operasi API
          </Link>
)}

          <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <Link
                  to={getPortalLink()}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-sm"
                >
                  Buka {getPortalLabel()}
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-center py-2 rounded-lg text-rose-600 font-semibold text-sm hover:bg-rose-50"
                >
                  Keluar
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2 rounded-lg border border-gray-200 text-gray-700 font-semibold text-sm"
                >
                  Masuk
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2 rounded-lg bg-blue-600 text-white font-semibold text-sm"
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
