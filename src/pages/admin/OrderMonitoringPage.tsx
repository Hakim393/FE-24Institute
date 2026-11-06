import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/admin.service';
import { useNotification } from '../../context/NotificationContext';
import { Order } from '../../types/order';
import { StatusPill } from '../../components/common/StatusPill';
import { formatIDR, formatDateTimeIndo } from '../../utils/formatters';
import {
  Receipt,
  Search,
  Eye,
  RefreshCw,
  Loader2,
  Calendar,
  Lock,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

export const OrderMonitoringPage: React.FC = () => {
  const { showToast } = useNotification();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [checkoutFilter, setCheckoutFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const handleOpenDetail = async (order: Order) => {
    setSelectedOrder(order);
    setIsLoadingDetail(true);
    try {
      const res = await adminService.getAdminOrderById(order.id);
      if (res.success && res.data) {
        setSelectedOrder(res.data);
      }
    } catch {
      // Keep existing row snapshot if detail fetch fails
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await adminService.getOrdersMonitoring({
        status: statusFilter || undefined,
        checkoutState: checkoutFilter || undefined,
      });
      if (res.success && res.data) {
        setOrders(res.data);
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal memuat monitoring transaksi.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, checkoutFilter]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-emerald-600" />
            <span>Monitoring Transaksi Pesanan (Read-Only)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pengawasan riwayat pembayaran Midtrans Sandbox siswa. Sesuai kontrak backend, modul ini murni pengawasan tanpa mutasi manual.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="p-2.5 rounded-xl bg-white border border-slate-300 text-slate-600 hover:text-emerald-700 transition"
          title="Muat Ulang Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Contract Policy Callout */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
        <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p>
          <strong>Prinsip Integritas Keuangan:</strong> Perubahan status pembayaran hanya dilakukan secara otomatis oleh verifikasi webhook signature Midtrans Sandbox ke server. Tombol pemaksaan status (Force Paid/Manual Settlement) tidak disediakan.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden"
        >
          <option value="">Semua Status Order</option>
          <option value="PAID">Lunas (PAID)</option>
          <option value="PENDING">Menunggu (PENDING)</option>
          <option value="FAILED">Gagal (FAILED)</option>
          <option value="EXPIRED">Kedaluwarsa (EXPIRED)</option>
          <option value="CANCELLED">Dibatalkan (CANCELLED)</option>
          <option value="REFUNDED">Dikembalikan (REFUNDED)</option>
        </select>

        <select
          value={checkoutFilter}
          onChange={(e) => setCheckoutFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden"
        >
          <option value="">Semua Checkout State</option>
          <option value="NOT_STARTED">NOT_STARTED</option>
          <option value="INITIATING">INITIATING</option>
          <option value="READY">READY</option>
          <option value="UNKNOWN">UNKNOWN</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
            <p className="mt-3 text-xs text-slate-500">Memuat monitoring order...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            Tidak ada transaksi pesanan yang sesuai filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">No. Order & Kursus</th>
                  <th className="py-3 px-4">Siswa</th>
                  <th className="py-3 px-4">Nominal</th>
                  <th className="py-3 px-4">Status Transaksi</th>
                  <th className="py-3 px-4">Checkout State</th>
                  <th className="py-3 px-4">Waktu Dibuat</th>
                  <th className="py-3 px-4 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{o.courseTitle}</div>
                      <div className="font-mono text-[11px] text-slate-500">{o.orderNumber}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">
                        {o.student?.fullName || o.studentId}
                      </div>
                      <div className="text-[11px] text-slate-400">{o.student?.email}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {formatIDR(o.amount)}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusPill status={o.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {o.checkoutState}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {formatDateTimeIndo(o.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenDetail(o)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs transition inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detail</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Detail Monitoring Transaksi</h3>
              <button onClick={() => setSelectedOrder(null)} className="text-slate-400">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nomor Pesanan:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedOrder.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status Pembayaran:</span>
                  <StatusPill status={selectedOrder.status} size="sm" />
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Checkout State:</span>
                  <span className="font-mono font-bold text-slate-700">{selectedOrder.checkoutState}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Nominal:</span>
                  <span className="font-black text-blue-900 text-sm font-mono">
                    {formatIDR(selectedOrder.amount)}
                  </span>
                </div>
              </div>

              <div className="space-y-1 text-slate-600">
                <div>Kursus: <strong className="text-slate-900">{selectedOrder.courseTitle}</strong></div>
                <div>Siswa: <strong className="text-slate-900">{selectedOrder.student?.fullName}</strong> ({selectedOrder.student?.email})</div>
                <div>Waktu Dibuat: {formatDateTimeIndo(selectedOrder.createdAt)}</div>
                {selectedOrder.paidAt && (
                  <div>Waktu Lunas: {formatDateTimeIndo(selectedOrder.paidAt)}</div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
