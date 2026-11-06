import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ConnectionBanner } from '../common/ConnectionBanner';
import {
  Layers,
  BookPlus,
  FileCode,
  Image as ImageIcon,
  CheckCircle,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';

export const InstructorLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navItems = [
    { to: '/instructor', icon: Layers, label: 'Authoring Studio', end: true },
    { to: '/instructor/courses', icon: FileCode, label: 'Katalog Course Saya' },
    { to: '/instructor/media', icon: ImageIcon, label: 'Media Library' },
    { to: '/instructor/notifications', icon: Bell, label: 'Notifikasi Studio' },
    { to: '/instructor/profile', icon: User, label: 'Profil Instruktur' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100 font-sans antialiased">
      <ConnectionBanner />

      <div className="flex-1 flex">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Studio Sidebar */}
        <aside
          className={`fixed md:sticky top-0 z-50 md:z-30 h-screen w-64 bg-slate-950 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          {/* Studio Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <img
                src="/brand/logo-24institute.png"
                alt="24Institute"
                className="h-8 w-auto object-contain brightness-110"
              />
              <div>
                <div className="font-extrabold text-sm text-white leading-tight">24Institute</div>
                <div className="text-[10px] text-teal-400 font-semibold uppercase tracking-wider">
                  Course Studio
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

          {/* Instructor badge */}
          <div className="p-3 mx-3 my-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-teal-500/20">
              {user?.profile?.fullName?.charAt(0) || 'I'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">
                {user?.profile?.fullName || user?.email}
              </div>
              <div className="text-[10px] text-teal-400 font-medium">Instruktur Resmi</div>
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
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Bottom links */}
          <div className="p-3 border-t border-slate-800 space-y-1">
            <Link
              to="/courses"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-900 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Lihat Katalog Publik</span>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/40 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </aside>

        {/* Studio Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-900">
          <header className="md:hidden sticky top-0 z-20 bg-slate-950 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-bold text-sm text-white">Course Authoring Studio</span>
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
