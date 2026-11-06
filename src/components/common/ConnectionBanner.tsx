import React, { useState } from 'react';
import { useConnection } from '../../context/ConnectionContext';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/api';
import { RefreshCw, Server, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ConnectionBanner: React.FC = () => {
  const { isConnected, isChecking, baseUrl, setBaseUrl, checkHealth, isForcedMock, setForceMock } = useConnection();
  const { role, loginAsDemoUser, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [customUrl, setCustomUrl] = useState(baseUrl);
  const [errorMsg, setErrorMsg] = useState('');

  // Strict rule: Demo role switcher is ONLY permitted in development mode when explicit preview mode is enabled.
  const isDevMode = !import.meta.env.PROD;
  const showRoleSwitcher = isDevMode && isForcedMock;

  const handleSaveUrl = () => {
    try {
      setErrorMsg('');
      setBaseUrl(customUrl);
      checkHealth();
    } catch (err: any) {
      setErrorMsg(err.message || 'URL tidak valid');
    }
  };

  return (
    <div
      data-testid="dev-preview-banner"
      className={`border-b text-xs transition-colors ${
        isConnected
          ? 'bg-emerald-950 text-emerald-200 border-emerald-800'
          : isForcedMock
          ? 'bg-amber-950 text-amber-200 border-amber-800'
          : 'bg-rose-950 text-rose-200 border-rose-800'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-1.5 sm:py-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {isConnected ? (
            <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              API CONNECTED: Terhubung ke {baseUrl || 'Backend API'}
            </span>
          ) : isForcedMock ? (
            <span className="flex items-center gap-1.5 font-semibold text-amber-300">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span className="sm:hidden">SIMULASI · DATA CONTOH</span>
              <span className="hidden sm:inline">MODE SIMULASI / UI PREVIEW (Eksplisit untuk Prototyping)</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 font-semibold text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              API DISCONNECTED: Backend offline di {baseUrl || 'belum dikonfigurasi'} (Fail-Closed)
            </span>
          )}
          <span className="hidden sm:inline-block text-gray-400">|</span>
          <span className="hidden sm:inline-block text-gray-300">
            Sesi: <strong className="text-white">{role ? `${role}` : 'Tamu (Belum Login)'}</strong>
            {user?.profile?.fullName ? ` (${user.profile.fullName})` : ''}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0 max-w-full">
          {/* Quick role switcher for testing all 3 UI families (Strictly gated to explicit dev preview mode) */}
          {showRoleSwitcher && (
            <div className="flex items-center gap-0.5 sm:gap-1 bg-black/30 px-1 py-0.5 rounded-lg border border-white/10 flex-wrap min-w-0 max-w-full">
              <span className="text-[10px] uppercase font-bold text-gray-400 mr-1 hidden md:inline">Dev Switcher:</span>
              {(['STUDENT', 'INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => loginAsDemoUser(r)}
                  className={`px-1 sm:px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-medium transition ${
                    role === r
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                  title={`Beralih ke simulasi role ${r}`}
                >
                  {r === 'SUPER_ADMIN' ? 'SuperAdmin' : r.charAt(0) + r.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          )}

          {import.meta.env.DEV && (
<Link
            to="/audit-matrix"
            className="flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-medium transition"
            title="Lihat matriks 136 operasi API"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden md:inline">136 API Matrix</span>
          </Link>
)}

          {isDevMode && (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-medium transition"
              aria-label="Pengaturan koneksi API (development)"
              title="Pengaturan koneksi API (development)"
            >
              <Server className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Koneksi</span>
              {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>

      {isOpen && isDevMode && (
        <div className="bg-black/40 border-t border-white/10 px-4 py-3 max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full">
            <label className="text-gray-300 whitespace-nowrap">API Base URL:</label>
            <input
              type="text"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="http://localhost:5000/api/v1"
              className="bg-black/60 border border-white/20 rounded px-2.5 py-1 text-white font-mono text-xs w-full sm:w-80 focus:outline-hidden focus:border-blue-400"
            />
            <button
              onClick={handleSaveUrl}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition"
            >
              Simpan URL
            </button>
            <button
              onClick={() => checkHealth()}
              disabled={isChecking}
              className="flex items-center gap-1 px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded font-medium transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
              Tes Koneksi
            </button>
            {errorMsg && <span className="text-rose-400 text-xs">{errorMsg}</span>}
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-gray-300">
              <input
                type="checkbox"
                checked={isForcedMock}
                onChange={(e) => setForceMock(e.target.checked)}
                className="rounded border-gray-600 bg-gray-800 text-blue-600"
              />
              <span>Paksa UI Preview Mode (Offline)</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
