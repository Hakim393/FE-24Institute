import React from 'react';

interface StatusPillProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, size = 'sm' }) => {
  const s = status.toUpperCase();
  const padding = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  let colorClasses = 'bg-gray-100 text-gray-700 border-gray-200';

  if (s === 'PAID' || s === 'ACTIVE' || s === 'PUBLISHED' || s === 'ISSUED' || s === 'APPROVED') {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium';
  } else if (s === 'PENDING' || s === 'PROCESSING' || s === 'SUBMITTED' || s === 'READY') {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200 font-medium';
  } else if (s === 'DRAFT' || s === 'NOT_STARTED' || s === 'INACTIVE') {
    colorClasses = 'bg-slate-100 text-slate-700 border-slate-200 font-medium';
  } else if (s === 'FAILED' || s === 'EXPIRED' || s === 'CANCELLED' || s === 'REJECTED' || s === 'REVOKED' || s === 'SUSPENDED' || s === 'LOCKED' || s === 'DELETED') {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200 font-medium';
  } else if (s === 'ELIGIBLE' || s === 'REQUEST_CHANGES') {
    colorClasses = 'bg-blue-50 text-blue-700 border-blue-200 font-medium';
  } else if (s === 'SUPER_ADMIN') {
    colorClasses = 'bg-purple-50 text-purple-700 border-purple-200 font-semibold';
  } else if (s === 'ADMIN') {
    colorClasses = 'bg-indigo-50 text-indigo-700 border-indigo-200 font-medium';
  } else if (s === 'INSTRUCTOR') {
    colorClasses = 'bg-teal-50 text-teal-700 border-teal-200 font-medium';
  } else if (s === 'STUDENT') {
    colorClasses = 'bg-sky-50 text-sky-700 border-sky-200 font-medium';
  }

  // Indonesian label translations
  const labels: Record<string, string> = {
    PAID: 'Lunas',
    PENDING: 'Menunggu Pembayaran',
    FAILED: 'Gagal',
    EXPIRED: 'Kedaluwarsa',
    CANCELLED: 'Dibatalkan',
    REFUNDED: 'Dana Dikembalikan',
    READY: 'Siap Checkout',
    NOT_STARTED: 'Belum Mulai',
    DRAFT: 'Draf',
    SUBMITTED: 'Diajukan',
    APPROVED: 'Disetujui',
    REJECTED: 'Ditolak',
    PUBLISHED: 'Dipublikasikan',
    PROCESSING: 'Sedang Diproses',
    ELIGIBLE: 'Memenuhi Syarat (Eligible)',
    ISSUED: 'Diterbitkan (Issued)',
    REVOKED: 'Dicabut',
    ACTIVE: 'Aktif',
    INACTIVE: 'Nonaktif',
    SUSPENDED: 'Ditangguhkan',
    LOCKED: 'Terkunci',
    STUDENT: 'Siswa',
    INSTRUCTOR: 'Instruktur',
    ADMIN: 'Admin',
    SUPER_ADMIN: 'Super Admin',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${padding} ${colorClasses}`}
    >
      {labels[s] || status}
    </span>
  );
};
