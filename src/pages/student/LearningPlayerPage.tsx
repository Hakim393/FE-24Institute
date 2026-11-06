import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { studentService } from '../../services/student.service';
import { isDevPreviewActive } from '../../services/mode';
import { requireCompletedLesson, resolveLessonMediaUrl, youtubeEmbedUrl } from '../../utils/student-learning-guards';
import { useNotification } from '../../context/NotificationContext';
import { Chapter, Lesson, StudentProgress } from '../../types/course';
import { requestedStudentMediaKinds } from '../../utils/student-learning-contract';
import {CanvasLessonRenderer} from '../../components/student/CanvasLessonRenderer';
import { markEngagementCompleted, mergeEngagement, type EngagementRecord, type EngagementPart, type EngagementResume } from '../../utils/lesson-consumption';
import { TrackedText, TrackedAudio, TrackedImage, TrackedYoutube } from '../../components/student/LessonConsumptionWidgets';
import {
  BookOpen,
  CheckCircle2,
  PlayCircle,
  FileText,
  Image as ImageIcon,
  Headphones,
  Video,
  HelpCircle,
  Lock,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Award,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export const LearningPlayerPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { showToast } = useNotification();

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isLessonLoading, setIsLessonLoading] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const lessonRequestId = useRef(0);
  // Engagement is approximate, server-persisted, and distinct from official completion.
  const [engagement, setEngagement] = useState<Record<string, EngagementRecord>>({});
  const engagementRef = useRef<Record<string, EngagementRecord>>({});
  const activeLessonRef = useRef<Lesson | null>(null);
  const savePending = useRef<{ lessonId: string; report: { components: EngagementRecord['components']; resume?: EngagementResume } } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const flushEngagement = async () => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    const task = savePending.current;
    if (!task || !courseId) return;
    savePending.current = null;
    setSaveStatus('saving');
    let failed = false;
    try {
      const response = await studentService.saveConsumption(courseId, task.lessonId, task.report);
      if (!response.success) throw new Error(response.message || 'Progress konsumsi gagal disimpan.');
      setSaveStatus('saved');
    } catch {
      // Keep failure visible AND retain the unsaved report for explicit retry.
      if (!savePending.current) savePending.current = task;
      failed = true;
      setSaveStatus('error');
    }
    if (!failed && savePending.current && !saveTimer.current) saveTimer.current = setTimeout(() => { void flushEngagement(); }, 4500);
  };

  const reportEngagement = (kind: EngagementPart, pct: number, resume?: EngagementResume) => {
    const lesson = activeLessonRef.current;
    if (!courseId || !lesson) return;
    const existing = engagementRef.current[lesson.id];
    const updated = mergeEngagement(lesson, existing, { components: { [kind]: pct }, ...(resume ? { resume } : {}) });
    if (existing && updated.percentage === existing.percentage &&
        updated.resume?.seconds === existing.resume?.seconds &&
        updated.components[kind] === existing.components[kind]) return;
    engagementRef.current = { ...engagementRef.current, [lesson.id]: updated };
    setEngagement(engagementRef.current);
    savePending.current = {
      lessonId: lesson.id,
      report: { components: updated.components, ...(updated.resume ? { resume: updated.resume } : {}) },
    };
    setSaveStatus('idle');
    if (!saveTimer.current) saveTimer.current = setTimeout(() => { void flushEngagement(); }, 4500);
  };

  useEffect(() => () => { void flushEngagement(); }, [courseId]);

  // Separate short-lived URLs so MIXED image and audio never overwrite each other.
  const [signedImageUrl, setSignedImageUrl] = useState<string | null>(null);
  const [signedAudioUrl, setSignedAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchClassroom = async () => {
      if (!courseId) return;
      setIsLoading(true);
      lessonRequestId.current++;
      setActiveLesson(null);
      setSignedImageUrl(null);
      setSignedAudioUrl(null);
      setChapters([]);
      setProgress(null);
      engagementRef.current = {};
      setEngagement({});
      try {
        const [currRes, progRes, consumptionRes] = await Promise.all([
          studentService.getCurriculum(courseId),
          studentService.getProgress(courseId),
          studentService.getConsumption(courseId),
        ]);
        if (!consumptionRes.success || !consumptionRes.data) throw new Error('Data kemajuan materi tidak dapat dimuat.');
        engagementRef.current = consumptionRes.data.records;
        setEngagement(consumptionRes.data.records);

        if (!currRes.success || !Array.isArray(currRes.data?.chapters)) {
          throw new Error(currRes.message || 'Kurikulum kursus tidak tersedia.');
        }
        {
          setChapters(currRes.data.chapters);
          // Resume the last authorized lesson, or start at the beginning.
          const lessons = currRes.data.chapters.flatMap((chapter) => chapter.lessons || []);
          const lastLessonId = consumptionRes.data.lastAccessedLessonId;
          const firstLesson = lessons.find((lesson) => lesson.id === lastLessonId) ?? lessons[0];
          if (firstLesson) void loadLesson(firstLesson.id);
        }
        if (progRes.success && progRes.data) {
          setProgress(progRes.data);
        }
      } catch (err: any) {
        showToast(err.message || 'Gagal memuat materi kursus.', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchClassroom();
  }, [courseId]);

  const loadLesson = async (lessonId: string) => {
    if (!courseId) return;
    await flushEngagement();
    const requestId = ++lessonRequestId.current;
    activeLessonRef.current = null;
    setActiveLesson(null);
    setSignedImageUrl(null);
      setSignedAudioUrl(null);
    setLessonError(null);
    setIsLessonLoading(true);
    try {
      const res = await studentService.getLesson(courseId, lessonId);
      if (requestId !== lessonRequestId.current) return;
      if (!res.success || !res.data || res.data.id !== lessonId) {
        throw new Error(res.message || 'Materi tidak dapat dimuat dari backend.');
      }
      activeLessonRef.current = res.data;
      setActiveLesson(res.data);
      void studentService.startLesson(courseId, lessonId).catch(() => {});

      // MIXED may contain both authenticated assets. Fetch independently, bound to the selected lesson.
      const kinds = requestedStudentMediaKinds(res.data);
      if (kinds.length > 0) {
        const results = await Promise.allSettled(
          kinds.map((kind) => studentService.getTemporaryMediaUrl(courseId, lessonId, kind)),
        );
        if (requestId !== lessonRequestId.current) return;
        results.forEach((result, index) => {
          const url = result.status === 'fulfilled' && result.value.success
            ? resolveLessonMediaUrl(result.value.data?.url, null, false)
            : null;
          if (kinds[index] === 'image') setSignedImageUrl(url);
          if (kinds[index] === 'audio') setSignedAudioUrl(url);
        });
      }
    } catch (err: any) {
      if (requestId === lessonRequestId.current) {
        const errorMessage = err?.error?.code ? `Gagal memuat materi (${err.error.code}).` : (err?.message || 'Gagal memuat materi.');
        setLessonError(errorMessage);
        showToast(errorMessage, 'error');
      }
    } finally {
      if (requestId === lessonRequestId.current) setIsLessonLoading(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!courseId || !activeLesson) return;
    setIsCompleting(true);
    try {
      await flushEngagement();
      const res = await studentService.completeLesson(courseId, activeLesson.id);
      if (!res.success) throw new Error(res.message || 'Gagal menandai materi selesai.');
      requireCompletedLesson(res.data, courseId, activeLesson.id);
      // Server completed the lesson AND persisted its advisory percentage=100.
      // Keep component observations and resume intact, and update the sidebar now.
      const completedEngagement = markEngagementCompleted(activeLesson.id, engagementRef.current[activeLesson.id]);
      engagementRef.current = { ...engagementRef.current, [activeLesson.id]: completedEngagement };
      setEngagement(engagementRef.current);
      setActiveLesson((current) => current?.id === activeLesson.id ? { ...current, isCompleted: true } : current);
      setChapters((current) => current.map((chapter) => ({
        ...chapter,
        lessons: chapter.lessons.map((lesson) =>
          lesson.id === activeLesson.id ? { ...lesson, isCompleted: true } : lesson),
      })));
      showToast('Materi berhasil diselesaikan!', 'success');

        // Sync progress
        const syncRes = await studentService.syncProgress(courseId);
        if (syncRes.success && syncRes.data) {
          setProgress(syncRes.data);
        }
        // Refresh ONLY from the backend so quiz availability never depends on advisory video progress.
        try {
          const refreshed = await studentService.getCurriculum(courseId);
          if (refreshed.success && refreshed.data) setChapters(refreshed.data.chapters);
        } catch { /* Official completion succeeded; a later reload will recover quiz access. */ }

        // Auto move to next lesson
        handleNavigateLesson('NEXT');
    } catch (err: any) {
      showToast(err.message || 'Gagal menandai materi selesai.', 'error');
    } finally {
      setIsCompleting(false);
    }
  };

  // Find all lessons sequentially
  const allLessons: Lesson[] = [];
  chapters.forEach((c) => {
    if (c.lessons) allLessons.push(...c.lessons);
  });

  const currentIndex = allLessons.findIndex((l) => l.id === activeLesson?.id);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  const handleNavigateLesson = (dir: 'PREV' | 'NEXT') => {
    if (dir === 'PREV' && prevLesson) loadLesson(prevLesson.id);
    if (dir === 'NEXT' && nextLesson) loadLesson(nextLesson.id);
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
          <p className="text-sm text-slate-500 font-medium">Mempersiapkan Ruang Belajar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            to="/student/my-courses"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-700 hover:bg-slate-50 transition"
            title="Kembali ke Kursus Saya"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
              Ruang Belajar Interaktif
            </span>
            <h1 className="text-xl font-black text-slate-900 leading-tight">
              {activeLesson?.title || (isLessonLoading ? 'Memuat Materi...' : 'Pilih Materi')}
            </h1>
          </div>
        </div>

        {/* Progress pill & certificate trigger */}
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium" title="Penyelesaian resmi Lesson dan Quiz, bukan persentase baca">Progres resmi:</span>
            <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${progress?.completionPercentage || 0}%` }}
              />
            </div>
            <span className="font-bold text-blue-700">
              {progress?.completionPercentage || 0}%
            </span>
          </div>

          <Link
            to={`/student/certificates?courseId=${courseId}`}
            className="px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold hover:bg-purple-100 transition flex items-center gap-1.5"
          >
            <Award className="w-3.5 h-3.5" />
            <span>Klaim Sertifikat</span>
          </Link>
        </div>
      </div>

      {/* Classroom Layout: Main Viewer + Curriculum Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Content Viewer */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8 space-y-6">
            {/* Lesson Type Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 text-xs">
              <span className="font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
                {activeLesson?.type === 'TEXT' && <FileText className="w-4 h-4" />}
                {activeLesson?.type === 'YOUTUBE_VIDEO' && <Video className="w-4 h-4" />}
                {activeLesson?.type === 'IMAGE' && <ImageIcon className="w-4 h-4" />}
                {activeLesson?.type === 'AUDIO' && <Headphones className="w-4 h-4" />}
                <span>Format Materi: {activeLesson?.type}</span>
              </span>
              {activeLesson?.isCompleted ? (
                <span className="flex items-center gap-1 text-emerald-600 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Selesai Dipelajari</span>
                </span>
              ) : (
                <span className="text-slate-400 font-medium">Belum Selesai</span>
              )}
            </div>

            {/* Engagement is advisory and cannot award lessons/certificates. */}
            {activeLesson && (
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 space-y-1.5">
                <div className="flex justify-between gap-2 text-xs font-semibold text-blue-900">
                  <span>Materi telah dikonsumsi</span>
                  <span>{engagement[activeLesson.id]?.percentage ?? 0}%</span>
                </div>
                <div className="bg-blue-100 h-1.5 rounded-full overflow-hidden"><div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${engagement[activeLesson.id]?.percentage ?? 0}%` }} /></div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] text-blue-700">{saveStatus === 'error' ? 'Belum tersimpan di server.' : saveStatus === 'saving' ? 'Menyimpan...' : saveStatus === 'saved' ? 'Tersimpan di server' : 'Aktivitas belajar (perkiraan), bukan status kelulusan'}</span>
                  {saveStatus === 'error' && <button type="button" onClick={() => { void flushEngagement(); }} className="text-[10px] font-bold underline text-blue-800">Coba Simpan Lagi</button>}
                </div>
              </div>
            )}
            {/* Dynamic Content Renderer */}
            <div className="space-y-6 min-h-[300px]">
              {!activeLesson && (
                <div role="status" className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
                  {isLessonLoading ? 'Memuat konten materi...' : lessonError || 'Pilih materi dari daftar kurikulum.'}
                </div>
              )}
              {activeLesson?.canvasDocument && courseId && <CanvasLessonRenderer key={activeLesson.id} courseId={courseId} lessonId={activeLesson.id} doc={activeLesson.canvasDocument}/>}
              {/* 1. YOUTUBE VIDEO */}
              {!activeLesson?.canvasDocument && activeLesson?.type === 'YOUTUBE_VIDEO' && (
                <div className="space-y-4">
                  {youtubeEmbedUrl(activeLesson.youtubeVideoId) ? (
                    <TrackedYoutube videoId={activeLesson.youtubeVideoId!} title={activeLesson.title}
                      initialPercent={engagement[activeLesson.id]?.components.youtube} resume={engagement[activeLesson.id]?.resume} report={reportEngagement} />
                  ) : (
                    <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Video belum tersedia. Hubungi instruktur.</p>
                  )}
                  {activeLesson.textContent && (
                    <TrackedText text={activeLesson.textContent} initialPercent={engagement[activeLesson.id]?.components.text} report={reportEngagement} />
                  )}
                </div>
              )}

              {/* 2. IMAGE LESSON */}
              {!activeLesson?.canvasDocument && activeLesson?.type === 'IMAGE' && (
                <div className="space-y-4 text-center">
                  {resolveLessonMediaUrl(signedImageUrl, activeLesson.imageUrl, isDevPreviewActive()) ? (
                    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 p-2 shadow-xs inline-block">
                      <TrackedImage src={resolveLessonMediaUrl(signedImageUrl, activeLesson.imageUrl, isDevPreviewActive())!}
                        alt={activeLesson.title} report={reportEngagement} />
                    </div>
                  ) : (
                    <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Media gambar private belum tersedia. Coba buka kembali materi.</p>
                  )}
                  {activeLesson.textContent && (
                    <TrackedText text={activeLesson.textContent} initialPercent={engagement[activeLesson.id]?.components.text} report={reportEngagement} />
                  )}
                </div>
              )}

              {/* 3. AUDIO LESSON */}
              {!activeLesson?.canvasDocument && activeLesson?.type === 'AUDIO' && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-2xl shadow-md space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-sky-400 flex items-center justify-center">
                        <Headphones className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-xs text-sky-300 font-semibold uppercase">Podcast Pembelajaran</div>
                        <div className="text-base font-bold text-white">{activeLesson.title}</div>
                      </div>
                    </div>
                    {resolveLessonMediaUrl(signedAudioUrl, activeLesson.audioUrl, isDevPreviewActive()) ? (
                      <TrackedAudio src={resolveLessonMediaUrl(signedAudioUrl, activeLesson.audioUrl, isDevPreviewActive())!}
                        initialPercent={engagement[activeLesson.id]?.components.audio} resume={engagement[activeLesson.id]?.resume} report={reportEngagement} />
                    ) : (
                      <p role="status" className="text-sm text-amber-200">Audio private belum tersedia. Coba buka kembali materi.</p>
                    )}
                  </div>
                  {activeLesson.textContent && (
                    <TrackedText text={activeLesson.textContent} initialPercent={engagement[activeLesson.id]?.components.text} report={reportEngagement} />
                  )}
                </div>
              )}

              {/* 4. TEXT LESSON */}
              {!activeLesson?.canvasDocument && activeLesson?.type === 'TEXT' && (
                activeLesson.textContent
                  ? <TrackedText text={activeLesson.textContent} initialPercent={engagement[activeLesson.id]?.components.text} report={reportEngagement} />
                  : <p className="text-sm text-amber-800">Materi teks belum diterbitkan instruktur.</p>
              )}

              {/* 5. MIXED LESSON: TEXT + YOUTUBE + PRIVATE IMAGE + PRIVATE AUDIO */}
              {!activeLesson?.canvasDocument && activeLesson?.type === 'MIXED' && (
                <div className="space-y-6">
                  {activeLesson.textContent && (
                    <TrackedText text={activeLesson.textContent} initialPercent={engagement[activeLesson.id]?.components.text} report={reportEngagement} />
                  )}
                  {youtubeEmbedUrl(activeLesson.youtubeVideoId) && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Video className="w-4 h-4 text-blue-600" /> Video Pembelajaran</h3>
                      <TrackedYoutube videoId={activeLesson.youtubeVideoId!} title={activeLesson.title}
                        initialPercent={engagement[activeLesson.id]?.components.youtube} resume={engagement[activeLesson.id]?.resume} report={reportEngagement} />
                    </div>
                  )}
                  {activeLesson.youtubeVideoId && !youtubeEmbedUrl(activeLesson.youtubeVideoId) && (
                    <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">ID YouTube tidak valid. Hubungi instruktur.</p>
                  )}
                  {activeLesson.media?.hasImage && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><ImageIcon className="w-4 h-4 text-blue-600" /> Gambar Pembelajaran</h3>
                      {resolveLessonMediaUrl(signedImageUrl, null, false) ? (
                        <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 p-2">
                          <TrackedImage src={resolveLessonMediaUrl(signedImageUrl, null, false)!}
                            alt={`Gambar ${activeLesson.title}`} report={reportEngagement} />
                        </div>
                      ) : (
                        <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Gambar privat belum dapat dimuat. Pilih ulang materi; jika tetap gagal, hubungi instruktur.</p>
                      )}
                    </div>
                  )}
                  {activeLesson.media?.hasAudio && (
                    <div className="space-y-3 bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-2xl">
                      <h3 className="text-sm font-bold flex items-center gap-2"><Headphones className="w-4 h-4" /> Audio Pembelajaran</h3>
                      {resolveLessonMediaUrl(signedAudioUrl, null, false) ? (
                        <TrackedAudio src={resolveLessonMediaUrl(signedAudioUrl, null, false)!}
                          initialPercent={engagement[activeLesson.id]?.components.audio} resume={engagement[activeLesson.id]?.resume} report={reportEngagement} />
                      ) : (
                        <p role="status" className="text-sm text-amber-200">Audio privat belum dapat dimuat. Pilih ulang materi; jika tetap gagal, hubungi instruktur.</p>
                      )}
                    </div>
                  )}
                  {!activeLesson.textContent && !activeLesson.youtubeVideoId && !activeLesson.media?.hasImage && !activeLesson.media?.hasAudio && (
                    <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Materi MIXED belum memiliki konten terbit. Hubungi instruktur.</p>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Actions: Mark Complete & Prev / Next */}
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleNavigateLesson('PREV')}
                  disabled={!activeLesson || isLessonLoading || !prevLesson}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Materi Sebelumnya</span>
                </button>
                <button
                  onClick={() => handleNavigateLesson('NEXT')}
                  disabled={!activeLesson || isLessonLoading || !nextLesson}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-1.5"
                >
                  <span>Materi Selanjutnya</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleMarkComplete}
                disabled={!activeLesson || isLessonLoading || isCompleting || activeLesson.isCompleted}
                className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-xs ${
                  activeLesson?.isCompleted
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                }`}
              >
                {isCompleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>
                  {activeLesson?.isCompleted ? 'Materi Telah Selesai' : 'Tandai Selesai & Lanjut'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Curriculum Sidebar Navigation */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Daftar Kurikulum Kursus</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">
              {allLessons.length} Materi
            </span>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {chapters.map((chap, cIdx) => (
              <div key={chap.id} className="border border-slate-100 rounded-2xl overflow-hidden">
                <div className="bg-slate-50/80 px-3.5 py-2.5 font-bold text-xs text-slate-800 flex items-center justify-between">
                  <span className="truncate">
                    Bab {cIdx + 1}: {chap.title}
                  </span>
                </div>

                <div className="divide-y divide-slate-100 px-2 py-1 space-y-0.5">
                  {chap.lessons?.map((les) => (
                    <button
                      key={les.id}
                      onClick={() => loadLesson(les.id)}
                      disabled={isLessonLoading}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex flex-col gap-2 transition ${
                        activeLesson?.id === les.id
                          ? 'bg-blue-600 text-white font-bold shadow-xs'
                          : 'text-slate-700 hover:bg-slate-50 font-medium'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 w-full min-w-0">
                      <div className="flex items-center gap-2 truncate min-w-0">
                        {les.isCompleted ? (
                          <CheckCircle2
                            className={`w-3.5 h-3.5 shrink-0 ${
                              activeLesson?.id === les.id ? 'text-white' : 'text-emerald-500'
                            }`}
                          />
                        ) : (
                          <PlayCircle
                            className={`w-3.5 h-3.5 shrink-0 ${
                              activeLesson?.id === les.id ? 'text-white' : 'text-slate-400'
                            }`}
                          />
                        )}
                        <span className="truncate">{les.title}</span>
                      </div>
                      <span className="text-[10px] font-bold tabular-nums ml-2 shrink-0">
                        {engagement[les.id]?.percentage ?? 0}%
                      </span>
                      </div>
                      <div className={`w-full h-1 rounded-full overflow-hidden ${activeLesson?.id === les.id ? 'bg-blue-400' : 'bg-slate-200'}`}>
                        <div className={`h-full rounded-full ${activeLesson?.id === les.id ? 'bg-white' : 'bg-blue-600'}`} style={{ width: `${engagement[les.id]?.percentage ?? 0}%` }} />
                      </div>
                    </button>
                  ))}

                  {/* Latest graded quiz result comes from this Student's enrolled version. */}
                  {chap.quizzes?.map((quiz) => {
                    const locked = quiz.latestResult?.status !== 'PASSED' && quiz.access?.canAttempt !== true;
                    const requiredPreviousQuiz = quiz.access?.blockedByQuizId ? chapters.flatMap(ch => ch.quizzes ?? []).find(q => q.id === quiz.access?.blockedByQuizId) : null;
                    const item = (
                      <>
                        <div className="flex items-center gap-2 min-w-0">
                          {locked ? <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" /> : quiz.latestResult?.status === 'PASSED' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : <HelpCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                          <span className="truncate">Kuis: {quiz.title}</span>
                        </div>
                        {quiz.latestResult ? (
                          <span className={`text-[10px] shrink-0 text-right flex flex-col gap-0.5 ${quiz.latestResult.status === 'PASSED' ? 'text-emerald-700' : 'text-rose-700'}`}>
                            <strong className="tabular-nums">Nilai {quiz.latestResult.score}/100</strong>
                            <span>{quiz.latestResult.status === 'PASSED' ? 'Lulus' : 'Belum lulus'} · KKM {Number.isFinite(quiz.passingGrade) ? quiz.passingGrade : '—'}</span>
                          </span>
                        ) : locked ? (
                          <span className="text-[10px] text-slate-600 shrink-0 text-right">
                            {quiz.access?.remainingPriorQuizzes ? `Lulus ${requiredPreviousQuiz?.title ?? 'kuis sebelumnya'} dulu` :
                             quiz.access?.remainingRequiredLessons ? `${quiz.access.remainingRequiredLessons} materi lagi` : 'Status belum tersedia'}
                          </span>
                        ) : <span className="text-[10px] text-amber-700 shrink-0">Mulai kuis</span>}
                      </>
                    );
                    const className = `w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 font-bold transition my-1 border ${locked ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed' : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200/60'}`;
                    return locked
                      ? <div key={quiz.id} aria-disabled="true" title={quiz.access?.remainingPriorQuizzes ? `Lulus ${requiredPreviousQuiz?.title ?? "kuis sebelumnya"} dulu` : "Selesaikan materi wajib sebelum kuis"} className={className}>{item}</div>
                      : <Link key={quiz.id} to={`/student/classroom/${courseId}/quiz/${quiz.id}`} className={className}>{item}</Link>;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
