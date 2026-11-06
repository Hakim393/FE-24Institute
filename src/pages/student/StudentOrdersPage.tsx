import React, { useEffect, useRef, useState } from 'react';
import { studentService } from '../../services/student.service';
import { useNotification } from '../../context/NotificationContext';
import { Order, CheckoutResult } from '../../types/order';
import { formatIDR, formatDateTimeIndo } from '../../utils/formatters';
import { StatusPill } from '../../components/common/StatusPill';
import { isApprovedSandboxCheckout } from '../../utils/checkout-guards';
import {
  CreditCard,
  Receipt,
  ExternalLink,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
} from 'lucide-react';

export const StudentOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [ordersError, setOrdersError] = useState('');
  const latestOrdersRequest = useRef(0);
  const [checkoutData, setCheckoutData] = useState<CheckoutResult | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  const { showToast } = useNotification();

  const fetchOrders = async () => {
    const requestId = ++latestOrdersRequest.current;
    setIsLoading(true);
    setOrdersError('');
    try {
      const res = await studentService.getOrders({
        status: statusFilter || undefined,
      });
      if (requestId !== latestOrdersRequest.current) return;
      if (!res.success || !Array.isArray(res.data)) {
        throw new Error(res.message || 'Server tidak mengembalikan daftar transaksi yang valid.');
      }
      setOrders(res.data);
    } catch (err: any) {
      if (requestId !== latestOrdersRequest.current) return;
      setOrders([]);
      setOrdersError(err.message || 'Gagal memuat riwayat transaksi.');
    } finally {
      if (requestId === latestOrdersRequest.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleContinueCheckout = async (orderId: string) => {
    setIsProcessingCheckout(true);
    try {
      const res = await studentService.checkoutOrder(orderId);
      if (!res.success || !isApprovedSandboxCheckout(res.data, orderId)) {
        throw new Error('Checkout belum siap atau URL gateway tidak valid. Periksa status pesanan di server.');
      }
      setCheckoutData(res.data);
      setCheckoutModalOpen(true);
    } catch (err: any) {
      showToast(err.message || 'Gagal menyiapkan sesi checkout.', 'error');
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-blue-600" />
            <span>Riwayat Pembelian & Pesanan</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Daftar transaksi kursus terintegrasi dengan Payment Gateway Midtrans Sandbox.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-hidden"
          >
            <option value="">Semua Status Transaksi</option>
            <option value="PAID">Lunas (PAID)</option>
            <option value="PENDING">Menunggu Pembayaran (PENDING)</option>
            <option value="FAILED">Gagal (FAILED)</option>
            <option value="EXPIRED">Kedaluwarsa (EXPIRED)</option>
            <option value="CANCELLED">Dibatalkan (CANCELLED)</option>
            <option value="REFUNDED">Dana Dikembalikan (REFUNDED)</option>
          </select>

          <button
            onClick={fetchOrders}
            disabled={isLoading}
            className="p-2 bg-white border border-slate-300 rounded-xl text-slate-600 hover:text-blue-700 transition"
            title="Muat Ulang Status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : ordersError ? (
        <div role="alert" className="bg-rose-50 p-6 rounded-2xl border border-rose-200 space-y-3">
          <p className="font-bold text-rose-950 text-sm">Riwayat transaksi belum dapat dimuat</p>
          <p className="text-xs text-rose-800">{ordersError}</p>
          <button onClick={fetchOrders} className="rounded-xl bg-rose-900 text-white px-4 py-2 text-xs font-bold">Coba Lagi</button>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <CreditCard className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Belum ada riwayat pesanan</h3>
          <p className="text-xs text-slate-500">
            Transaksi pembelian kursus yang Anda buat akan tercatat secara resmi di sini.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-md">
                    {order.orderNumber}
                  </span>
                  <StatusPill status={order.status} size="sm" />
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                    Checkout: {order.checkoutState}
                  </span>
                </div>

                <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-snug">
                  {order.courseTitle}
                </h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {formatDateTimeIndo(order.createdAt)}
                  </span>
                  <span>&middot;</span>
                  <span className="font-extrabold text-blue-900 text-sm">
                    {formatIDR(order.amount)}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto">
                {order.status === 'PENDING' && order.checkoutState !== 'UNKNOWN' && (
                  <button
                    onClick={() => handleContinueCheckout(order.id)}
                    disabled={isProcessingCheckout}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Lanjutkan Pembayaran</span>
                  </button>
                )}

                {order.status === 'PENDING' && order.checkoutState === 'UNKNOWN' && (
                  <div className="flex items-center gap-1.5 text-amber-700 font-bold text-xs bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Menunggu Rekonsiliasi Server</span>
                  </div>
                )}

                {order.status === 'PAID' && (
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Akses Belajar Aktif</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Checkout Modal */}
      {checkoutModalOpen && checkoutData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-base">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span>Instruksi Checkout Midtrans Sandbox</span>
              </div>
              <button
                onClick={() => setCheckoutModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p>
                Sesi pembayaran untuk pesanan <code className="font-mono font-bold text-slate-900">{checkoutData.orderId}</code> siap diproses.
              </p>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 font-mono text-[11px]">
                <div>Gateway: Midtrans Sandbox (token disembunyikan)</div>
                <div>Batas Waktu: {checkoutData.expiresAt ? new Date(checkoutData.expiresAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Ikuti informasi gateway'}</div>
              </div>
              <p className="text-[11px] text-slate-500">
                Setelah pembayaran selesai di Midtrans Sandbox, webhook server backend akan memverifikasi signature dan memperbarui status menjadi <strong>PAID</strong>.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {checkoutData.redirectUrl && (
                <a
                  href={checkoutData.redirectUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs text-center transition flex items-center justify-center gap-1.5"
                >
                  <span>Buka Halaman Pembayaran Midtrans</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                onClick={() => {
                  setCheckoutModalOpen(false);
                  fetchOrders();
                }}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs text-center hover:bg-slate-50 transition"
              >
                Tutup & Muat Ulang Transaksi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
