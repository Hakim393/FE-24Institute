import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { publicService } from '../../services/public.service';
import { studentService } from '../../services/student.service';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Course, Chapter, type Lesson } from '../../types/course';
import type { PublicPreviewLesson } from '../../utils/public-lesson-preview';
import { formatIDR } from '../../utils/formatters';
import { resolveCoursePaymentAccess } from '../../utils/payment-access';
import type { OrderStatus } from '../../types/order';
import { StatusPill } from '../../components/common/StatusPill';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Globe,
  Award,
  Layers,
  ArrowRight,
  ShieldCheck,
  PlayCircle,
  HelpCircle,
  Lock,
  ExternalLink,
  Loader2,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Unlock,
  Linkedin,
  Github,
  Link2,
  UserRound,
} from 'lucide-react';

export const CourseDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOrdering, setIsOrdering] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewLesson, setPreviewLesson] = useState<PublicPreviewLesson | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutData, setCheckoutData] = useState<{ orderId: string; redirectUrl?: string; token?: string } | null>(null);
  const [lastServerOrderStatus, setLastServerOrderStatus] = useState<OrderStatus | null>(null);
  const [paymentStatusMessage, setPaymentStatusMessage] = useState<string | null>(null);
  const checkingPaymentRef = useRef(false);
  const lastPaymentAutoCheckRef = useRef(0);

  const { isAuthenticated, user } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDetail = async () => {
      if (!slug) return;
      setIsLoading(true);
      setHasAccess(false);
      setExpandedChapters({});
      try {
        const res = await publicService.getCourseBySlug(slug);
        if (res.success && res.data) {
          setCourse(res.data);
          // Check access if authenticated
          if (isAuthenticated) {
            try {
              const accRes = await studentService.checkCourseAccess(res.data.id);
              if (accRes.success && accRes.data?.allowed === true) {
                setHasAccess(true);
              }
            } catch {
              // ignore
            }
          }
        }
      } catch (err: any) {
        showToast(err.message || 'Gagal memuat detail kursus', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [slug, isAuthenticated]);

  const handleOpenPreview = async (lesson: Lesson) => {
    if (!lesson.isPreview || !slug || previewLoading) return;
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewLesson(null);
    setPreviewError(null);
    try {
      const response = await publicService.getLessonPreview(slug, lesson.id);
      if (response.success !== true || !response.data?.lesson) {
        throw new Error('Preview materi tidak tersedia.');
      }
      setPreviewLesson(response.data.lesson);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal memuat preview gratis. Silakan coba kembali.';
      setPreviewError(message);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Stable purchase intent idempotency key per purchase session (persisted across retries)
  const [purchaseIntentKey, setPurchaseIntentKey] = useState<string>('');
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);

  const getOrGenerateIntentKey = () => {
    if (purchaseIntentKey) return purchaseIntentKey;
    const newKey = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : '00000000-0000-4000-8000-' + Math.random().toString(16).substring(2, 14);
    setPurchaseIntentKey(newKey);
    return newKey;
  };

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/courses/${slug}`);
      return;
    }
    if (!course) return;

    setIsOrdering(true);
    try {
      // Stable RFC4122 v4 UUID for purchase intent idempotency compliant with OpenAPI contract
      const idempotencyKey = getOrGenerateIntentKey();
      const orderRes = await studentService.createOrder(course.id, idempotencyKey);
      
      if (orderRes.success && orderRes.data) {
        // Proceed to initiate checkout session
        const checkoutRes = await studentService.checkoutOrder(orderRes.data.id);
        if (checkoutRes.success && checkoutRes.data) {
          setCheckoutData({
            orderId: orderRes.data.id,
            redirectUrl: checkoutRes.data.redirectUrl,
            token: checkoutRes.data.token,
          });
          setLastServerOrderStatus(orderRes.data.status);
          setPaymentStatusMessage(null);
          lastPaymentAutoCheckRef.current = 0;
          setCheckoutModalOpen(true);
          // Preserve the idempotency key until entitlement is confirmed; retries reuse the purchase intent.
          showToast('Pesanan berhasil dibuat. Silakan konfirmasi pembayaran.', 'success');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal membuat pesanan. Anda dapat mencoba kembali.', 'error');
    } finally {
      setIsOrdering(false);
    }
  };

  const handleCheckPaymentStatus = async () => {
    if (!checkoutData?.orderId || !course || checkingPaymentRef.current) return;
    checkingPaymentRef.current = true;
    setIsCheckingPayment(true);
    setPaymentStatusMessage(null);
    try {
      // Both results are fresh backend reads, never Midtrans browser/UI assumptions.
      const [orderRes, accessRes] = await Promise.all([
        studentService.getOrder(checkoutData.orderId),
        studentService.checkCourseAccess(course.id),
      ]);
      if (orderRes.success !== true || !orderRes.data ||
          orderRes.data.id !== checkoutData.orderId ||
          orderRes.data.courseId !== course.id ||
          accessRes.success !== true || accessRes.data?.courseId !== course.id) {
        throw new Error('Data pembayaran atau hak akses tidak sesuai. Silakan muat ulang status.');
      }
      const status = orderRes.data.status;
      setLastServerOrderStatus(status);
      const accessState = resolveCoursePaymentAccess(status, accessRes.data.allowed === true);
      if (accessState === 'GRANTED') {
        setHasAccess(true);
        setPurchaseIntentKey('');
        setCheckoutModalOpen(false);
        showToast('Akses kursus sudah aktif dan dikonfirmasi oleh backend.', 'success');
      } else if (accessState === 'PAID_AWAITING_ENTITLEMENT') {
        const message = 'Pembayaran sudah PAID, tetapi hak akses kursus belum aktif. Jangan membayar ulang; periksa lagi nanti.';
        setPaymentStatusMessage(message);
        showToast(message, 'info');
      } else {
        const message = status === 'PENDING'
          ? 'Pembayaran belum dikonfirmasi oleh server 24Institute (PENDING). Jika Midtrans sudah Settlement, tunggu sinkronisasi status dan periksa kembali. Jangan membayar ulang.'
          : `Status pesanan di server: ${status}. Hak akses kursus belum aktif.`;
        setPaymentStatusMessage(message);
        showToast(message, 'info');
      }
    } catch (err: any) {
      const message = err?.message || 'Gagal memeriksa status pembayaran.';
      setPaymentStatusMessage(message);
      showToast(message, 'error');
    } finally {
      checkingPaymentRef.current = false;
      setIsCheckingPayment(false);
    }
  };

  // Re-check once when returning to this tab after the external Midtrans checkout.
  // Never mark an order PAID or grant access from browser state.
  useEffect(() => {
    if (!checkoutModalOpen || !checkoutData?.orderId || !course) return;
    const checkOnReturn = () => {
      if (document.visibilityState !== 'visible' || checkingPaymentRef.current) return;
      const now = Date.now();
      if (now - lastPaymentAutoCheckRef.current < 4000) return;
      lastPaymentAutoCheckRef.current = now;
      void handleCheckPaymentStatus();
    };
    window.addEventListener('focus', checkOnReturn);
    document.addEventListener('visibilitychange', checkOnReturn);
    return () => {
      window.removeEventListener('focus', checkOnReturn);
      document.removeEventListener('visibilitychange', checkOnReturn);
    };
  }, [checkoutModalOpen, checkoutData?.orderId, course?.id]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
        <p className="mt-4 text-sm text-slate-500">Memuat detail kursus...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-800">Kursus Tidak Ditemukan</h2>
        <p className="text-sm text-slate-500">Kursus yang Anda cari mungkin belum dipublikasikan atau URL tidak valid.</p>
        <Link to="/courses" className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm">
          Kembali ke Katalog
        </Link>
      </div>
    );
  }

  const ver = course.publishedVersion;
  const chapters: Chapter[] = ver?.chapters || [];

  return (
    <div className="space-y-12 pb-20">
      {/* Header Banner */}
      <section className="bg-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider bg-sky-950/60 px-2.5 py-1 rounded-md border border-sky-800">
                {course.category?.name || 'Kursus'}
              </span>
              <StatusPill status={course.level} size="sm" />
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />
                {course.language || 'Bahasa Indonesia'}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {course.title}
            </h1>

            <p className="text-base text-slate-300 leading-relaxed max-w-3xl">
              {course.subtitle || course.description}
            </p>

            {/* Public professional instructor section. Only server-authorized safe fields are rendered. */}
            <div className="pt-5 max-w-3xl">
              <div className="group relative overflow-hidden rounded-2xl border border-sky-700/40 bg-white/[0.06] p-5 sm:p-6 shadow-xl shadow-slate-950/20 transition-all duration-300 hover:border-sky-400/60 hover:shadow-sky-950/40">
                <div className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-sky-500/10 blur-3xl transition-all duration-500 group-hover:bg-sky-400/20" />
                <div className="relative flex flex-col sm:flex-row gap-5">
                  <div className="shrink-0 self-start overflow-hidden rounded-2xl border-2 border-white/20 bg-gradient-to-br from-sky-500 to-indigo-700 shadow-lg shadow-black/30 transition-transform duration-500 group-hover:-translate-y-1 group-hover:rotate-1">
                    {course.instructor?.avatarUrl ? (
                      <img src={course.instructor.avatarUrl} alt={`Foto ${course.instructor.fullName}`} loading="lazy" className="h-40 w-36 sm:h-44 sm:w-40 object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="h-40 w-36 sm:h-44 sm:w-40 flex items-center justify-center text-5xl font-extrabold text-white" aria-label="Avatar default instruktur">{course.instructor?.fullName?.slice(0,1).toUpperCase() || <UserRound className="h-14 w-14" />}</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold text-sky-200">
                      <ShieldCheck className="h-3.5 w-3.5" /> Instruktur 24Institute
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-white">{course.instructor?.fullName || 'Instruktur 24Institute'}</h2>
                    {course.instructor?.headline && <p className="text-sm font-semibold text-sky-300">{course.instructor.headline}</p>}
                    {course.instructor?.biography && <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300 line-clamp-5">{course.instructor.biography}</p>}
                    {course.instructor?.expertise && course.instructor.expertise.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">{course.instructor.expertise.map(skill => <span key={skill} className="rounded-md border border-slate-600 bg-slate-800/80 px-2 py-1 text-[11px] text-slate-200">{skill}</span>)}</div>
                    )}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {([
                        {label:'LinkedIn', url:course.instructor?.linkedinUrl, Icon:Linkedin},
                        {label:'GitHub', url:course.instructor?.githubUrl, Icon:Github},
                        {label:'Portofolio', url:course.instructor?.websiteUrl, Icon:Link2},
                      ] as const).filter(item => item.url?.startsWith('https://')).map(({label,url,Icon}) => (
                        <a key={label} href={url!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-sky-400 hover:bg-sky-900/50 hover:text-white"><Icon className="h-3.5 w-3.5" />{label}<ExternalLink className="h-3 w-3 opacity-60" /></a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing & CTA Card (Desktop Floating) */}
          <div className="lg:col-span-4 bg-white text-slate-900 rounded-2xl p-6 shadow-xl border border-slate-200 space-y-5">
            <div className="aspect-video rounded-xl overflow-hidden bg-slate-100">
              <img
                src={course.thumbnailUrl || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80'}
                alt={course.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase">Investasi Belajar</div>
              <div className="text-3xl font-black text-blue-900 mt-1">{formatIDR(course.price)}</div>
            </div>

            {hasAccess ? (
              <Link
                to={`/student/classroom/${course.id}`}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
              >
                <BookOpen className="w-4 h-4" />
                <span>Lanjutkan Belajar Sekarang</span>
              </Link>
            ) : (
              <button
                onClick={handlePurchase}
                disabled={isOrdering}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white transition flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 disabled:opacity-50"
              >
                {isOrdering ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyiapkan Pesanan...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Daftar / Beli Kursus Sekarang</span>
                  </>
                )}
              </button>
            )}

            <div className="pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Akses penuh kurikulum pembelajaran & video</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Kuis evaluasi pemahaman teruji otomatis</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>Sertifikat digital internal resmi 24Institute</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Pembayaran resmi via Midtrans Sandbox</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Details */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-10">
          {/* Learning Objectives */}
          {ver?.learningObjectives && ver.learningObjectives.length > 0 && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Apa yang Akan Anda Pelajari</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ver.learningObjectives.map((obj, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>{obj}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Course Description */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Pengenalan Kursus</h2>
            <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {course.description}
            </div>
          </div>

          {/* Curriculum Structure */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Silabus & Kurikulum</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {chapters.length} Bab &middot; {chapters.reduce((acc, c) => acc + (c.lessons?.length || 0), 0)} Pelajaran
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>Ketuk judul bab untuk membuka atau menutup materi.</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setExpandedChapters(Object.fromEntries(chapters.map(ch => [ch.id, true])))} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-blue-700 hover:bg-slate-50">Buka Semua</button>
                <button type="button" onClick={() => setExpandedChapters(Object.fromEntries(chapters.map(ch => [ch.id, false])))} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">Tutup Semua</button>
              </div>
            </div>
            <div className="space-y-3">
              {chapters.map((chap, idx) => (
                <div key={chap.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  <button type="button" aria-expanded={expandedChapters[chap.id] ?? idx === 0} aria-controls={`curriculum-${chap.id}`} onClick={() => setExpandedChapters(prev => ({...prev, [chap.id]: !(prev[chap.id] ?? idx === 0)}))} className="w-full bg-slate-50 px-4 py-3 font-semibold text-sm text-slate-800 flex items-center justify-between gap-3 text-left hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 shrink-0 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">{idx + 1}</span>
                      <span className="truncate sm:whitespace-normal">{chap.title}</span>
                    </span>
                    <span className="shrink-0 inline-flex items-center gap-2 text-xs text-slate-500 font-normal">
                      {chap.lessons?.length || 0} materi
                      {(expandedChapters[chap.id] ?? idx === 0) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </span>
                  </button>

                  {(expandedChapters[chap.id] ?? idx === 0) && <div id={`curriculum-${chap.id}`} className="divide-y divide-slate-100 px-4">
                    {chap.lessons?.map((les) => (
                      <div key={les.id} className="py-2.5 flex items-center justify-between text-xs text-slate-600">
                        {les.isPreview ? (
                          <button type="button" onClick={() => void handleOpenPreview(les)} aria-label={`Buka preview gratis: ${les.title}`} className="flex items-center gap-2 text-left font-semibold text-blue-700 hover:text-blue-900 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 rounded">
                            <PlayCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{les.title}</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <PlayCircle className="w-3.5 h-3.5 text-blue-500" />
                            <span>{les.title}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-slate-400 shrink-0">
                          {les.isPreview && <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700"><Unlock className="w-3 h-3" /> Preview Gratis</span>}
                          <span className="uppercase text-[10px] font-semibold hidden sm:inline">{les.type}</span>
                          {!hasAccess && !les.isPreview && <Lock className="w-3 h-3 text-slate-400" />}
                        </div>
                      </div>
                    ))}
                    {chap.quizzes?.map((quiz) => (
                      <div key={quiz.id} className="py-2.5 flex items-center justify-between text-xs text-amber-700 bg-amber-50/50 px-2 rounded-md my-1">
                        <div className="flex items-center gap-2 font-medium">
                          <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Kuis: {quiz.title}</span>
                        </div>
                        <span className="text-[10px] font-bold">Passing Grade {quiz.passingGrade}%</span>
                      </div>
                    ))}
                  </div>}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500">Preview Gratis menandai pelajaran yang dapat dicoba tanpa pembelian. Akses konten tetap mengikuti otorisasi backend.</p>
          </div>

          {/* Requirements & Target Audience */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {ver?.requirements && ver.requirements.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
                <h3 className="font-bold text-base text-slate-900">Persyaratan</h3>
                <ul className="space-y-2 text-xs text-slate-600 list-disc list-inside">
                  {ver.requirements.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              </div>
            )}
            {ver?.targetAudience && ver.targetAudience.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
                <h3 className="font-bold text-base text-slate-900">Target Peserta</h3>
                <ul className="space-y-2 text-xs text-slate-600 list-disc list-inside">
                  {ver.targetAudience.map((aud, i) => (
                    <li key={i}>{aud}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Read-only public preview. Backend checks published snapshot and isPreview on every GET. */}
      {previewOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setPreviewOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="preview-title" className="bg-white text-slate-900 max-w-3xl w-full max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-200 shadow-2xl p-5 sm:p-8 space-y-4">
            <div className="flex justify-between items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider">Preview Gratis — Materi Contoh</p>
                <h2 id="preview-title" className="text-xl font-extrabold mt-1">{previewLesson?.title ?? 'Memuat materi...'}</h2>
              </div>
              <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500" onClick={() => setPreviewOpen(false)} aria-label="Tutup preview">Tutup ✕</button>
            </div>
            {previewLoading && <p role="status" className="flex gap-2 text-slate-500 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Memuat materi dari backend...</p>}
            {previewError && <p role="alert" className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 text-sm">{previewError}</p>}
            {previewLesson && !previewError && (
              <div className="space-y-5">
                {previewLesson.description && <p className="text-sm text-slate-600 whitespace-pre-wrap">{previewLesson.description}</p>}
                {previewLesson.textContent && <article className="text-sm leading-7 text-slate-700 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 border border-slate-100">{previewLesson.textContent}</article>}
                {previewLesson.youtubeVideoId && (
                  <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
                    <iframe title={`Video preview: ${previewLesson.title}`} src={`https://www.youtube-nocookie.com/embed/${previewLesson.youtubeVideoId}`} referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full border-0" />
                  </div>
                )}
                {(previewLesson.type === 'IMAGE' || previewLesson.type === 'AUDIO' || previewLesson.type === 'MIXED') && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 text-sm">File gambar/audio privat belum tersedia untuk preview publik. Fitur ini memerlukan endpoint media dengan otorisasi dan URL bertanda tangan.</p>
                )}
                {!previewLesson.textContent && !previewLesson.youtubeVideoId && previewLesson.type !== 'IMAGE' && previewLesson.type !== 'AUDIO' && previewLesson.type !== 'MIXED' && (
                  <p className="text-slate-500 text-sm">Materi preview belum mempunyai konten yang bisa ditampilkan.</p>
                )}
                <p className="border-t border-slate-100 pt-4 text-xs text-slate-500">Pratinjau ini tidak memberikan akses ke Lesson berbayar atau mencatat progres belajar.</p>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Checkout Modal (Midtrans Sandbox Simulator / Redirect) */}
      {checkoutModalOpen && checkoutData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-base">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span>Checkout Midtrans Sandbox</span>
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
                Status terakhir dari server: <strong className={lastServerOrderStatus === 'PAID' ? 'text-emerald-700' : 'text-amber-600'}>{lastServerOrderStatus ?? 'BELUM DIPERIKSA'}</strong>. Pembayaran diverifikasi melalui server 24Institute.
              </p>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 font-mono text-[11px]">
                <div>Order ID: {checkoutData.orderId}</div>
                <div>Snap Token: {checkoutData.token?.substring(0, 20)}...</div>
                <div>Total Tagihan: {formatIDR(course.price)}</div>
              </div>
              <p className="text-[11px] text-slate-500 italic">
                *Catatan: Pembayaran diproses melalui Midtrans Sandbox Simulator resmi. Tidak ada dana nyata yang ditarik.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {checkoutData.redirectUrl && lastServerOrderStatus !== 'PAID' && (
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
              {paymentStatusMessage && (
                <p role="status" aria-live="polite" className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-950">
                  {paymentStatusMessage}
                </p>
              )}
              <button
                type="button"
                onClick={handleCheckPaymentStatus}
                disabled={isCheckingPayment}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs text-center transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {isCheckingPayment ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Periksa Konfirmasi Pembayaran</span>
              </button>
              <Link
                to="/student/orders"
                onClick={() => setCheckoutModalOpen(false)}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs text-center hover:bg-slate-50 transition"
              >
                Lihat di Riwayat Pembelian Siswa
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
