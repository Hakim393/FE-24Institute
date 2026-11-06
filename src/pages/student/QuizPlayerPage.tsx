import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { studentService } from '../../services/student.service';
import { requireQuizScore } from '../../utils/student-learning-guards';
import { resolveAttemptedQuizView, type AttemptedQuizView } from '../../utils/quiz-attempt-view';
import { useNotification } from '../../context/NotificationContext';
import type { Quiz, QuizSubmitResult } from '../../types/course';
import { HelpCircle, CheckCircle2, XCircle, ArrowLeft, Send, Loader2, AlertTriangle, RefreshCw, Clock3 } from 'lucide-react';

/** A countdown for display only. The backend is the sole authority on eligibility. */
const formatCountdown = (seconds: number): string => {
  const total = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
};

export const QuizPlayerPage: React.FC = () => {
  const { courseId, quizId } = useParams<{ courseId: string; quizId: string }>();
  const { showToast } = useNotification();
  const submittingRef = useRef(false);

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attemptedQuiz, setAttemptedQuiz] = useState<AttemptedQuizView | null>(null);
  const [lockedQuiz, setLockedQuiz] = useState<{ title: string; remaining: number; previousQuizTitle: string | null } | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizSubmitResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [cooldownDeadlineMs, setCooldownDeadlineMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const [showCooldownPopup, setShowCooldownPopup] = useState(false);

  const remainingSeconds = cooldownDeadlineMs === null
    ? 0 : Math.max(0, Math.ceil((cooldownDeadlineMs - nowMs) / 1000));

  useEffect(() => {
    if (cooldownDeadlineMs === null) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [cooldownDeadlineMs]);

  /** Re-check the enrolled curriculum before showing questions, on every reopen/retry. */
  const loadQuizState = useCallback(async (openQuestions: boolean, isCancelled: () => boolean = () => false) => {
    if (!courseId || !quizId) return;
    const response = await studentService.getCurriculum(courseId);
    if (isCancelled()) return;
    if (!response.success || !response.data) throw new Error('Status remedial tidak dapat diverifikasi.');
    const matches = response.data.chapters.flatMap(ch => ch.quizzes ?? []).filter(q => q.id === quizId);
    if (matches.length !== 1) throw new Error('Identitas kuis pada kurikulum tidak valid.');
    const summary = matches[0];
    const previous = resolveAttemptedQuizView(response.data.chapters, quizId);
    // Fail closed if the backend has not yet been upgraded to the new contract.
    if (!summary.retry || typeof summary.retry.canRetry !== 'boolean') {
      throw new Error('Status cooldown remedial belum tersedia dari server.');
    }
    setQuiz(null);
    setAttemptedQuiz(previous);
    setResult(null);
    setSelectedAnswers({});
    setLockedQuiz(null);
    setCooldownDeadlineMs(null);
    if (previous?.status === 'PASSED') return;
    if (summary.retry.remainingSeconds > 0) {
      setNowMs(Date.now());
      setCooldownDeadlineMs(Date.now() + summary.retry.remainingSeconds * 1000);
      return;
    }
    if (!summary.retry.canRetry) throw new Error('Status remedial belum dapat dipastikan oleh server.');
    if (!summary.access || summary.access.canAttempt !== true) {
      const previousQuiz = response.data.chapters.flatMap(ch => ch.quizzes ?? [])
        .find(q => q.id === summary.access?.blockedByQuizId);
      setLockedQuiz({
        title: summary.title,
        remaining: summary.access?.remainingRequiredLessons ?? 0,
        previousQuizTitle: (summary.access?.remainingPriorQuizzes ?? 0) > 0
          ? (previousQuiz?.title ?? 'kuis sebelumnya') : null,
      });
      return;
    }
    if (previous && !openQuestions) return; // Show last grade and a deliberate "Coba Lagi" button.
    const quizResponse = await studentService.getQuiz(courseId, quizId);
    if (isCancelled()) return;
    if (!quizResponse.success || !quizResponse.data) throw new Error('Detail kuis tidak tersedia dari server.');
    setQuiz(quizResponse.data);
    setAttemptedQuiz(null);
  }, [courseId, quizId]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError('');
    setShowCooldownPopup(false);
    void loadQuizState(false, () => cancelled)
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : 'Kuis gagal dimuat.');
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [loadQuizState]);

  const handleStartRemedial = async () => {
    if (isLoading || isSubmitting) return;
    setIsLoading(true);
    setLoadError('');
    setShowCooldownPopup(false);
    try {
      await loadQuizState(true);
    } catch (err: unknown) {
      const code = (err as { error?: { code?: string } })?.error?.code;
      // A race with the server timer never exposes the raw 429 to the student.
      if (code === 'STUDENT_QUIZ_COOLDOWN') {
        try { await loadQuizState(false); } catch { setLoadError('Status remedial belum dapat diverifikasi.'); }
      } else {
        setLoadError(err instanceof Error ? err.message : 'Gagal memeriksa kesempatan remedial.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !quizId || !quiz || submittingRef.current || remainingSeconds > 0) return;
    const questions = quiz.questions || [];
    const unanswered = questions.filter(q => !selectedAnswers[q.id]);
    if (unanswered.length > 0) {
      setValidationError(`Masih ada ${unanswered.length} pertanyaan yang belum dijawab.`);
      return;
    }
    submittingRef.current = true;
    setValidationError('');
    setIsSubmitting(true);
    try {
      const answers = questions.map(q => ({ questionId: q.id, selectedOptionId: selectedAnswers[q.id] }));
      const response = await studentService.submitQuiz(courseId, quizId, answers);
      if (!response.success) throw new Error('Jawaban tidak dapat dinilai oleh server.');
      const graded = requireQuizScore(response.data);
      setResult(graded);
      setSelectedAnswers({});
      void studentService.syncProgress(courseId).catch(() => {});
      if (!graded.passed && graded.attemptNumber !== undefined && graded.attemptNumber >= 2) {
        // New contract: 30 minutes after the second and every later failure.
        const seconds = graded.retryAfterSeconds;
        if (!Number.isSafeInteger(seconds) || typeof seconds !== 'number' || seconds < 1 || seconds > 1800) {
          setLoadError('Waktu remedial belum dapat diverifikasi. Muat ulang halaman sebelum mencoba lagi.');
          return;
        }
        setNowMs(Date.now());
        setCooldownDeadlineMs(Date.now() + seconds * 1000);
        setShowCooldownPopup(true);
      } else if (graded.passed) {
        showToast('Selamat, kamu lulus kuis!', 'success');
      } else {
        showToast('Nilai belum memenuhi KKM. Kamu boleh langsung mencoba remedial pertama.', 'warning');
      }
    } catch (err: unknown) {
      const code = (err as { error?: { code?: string } })?.error?.code;
      if (code === 'STUDENT_QUIZ_COOLDOWN' || code === 'STUDENT_QUIZ_ALREADY_PASSED') {
        // No raw 429 toast. Refresh from server; backend decides when retry is allowed.
        try { await loadQuizState(false); }
        catch { setLoadError('Status kuis belum dapat diperiksa. Muat ulang halaman.'); }
      } else {
        const message = (err as { message?: string })?.message;
        showToast(message || 'Jawaban kuis gagal dikirim. Silakan coba kembali.', 'error');
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-[70vh] flex items-center justify-center"><div className="text-center space-y-3"><Loader2 className="w-10 h-10 text-amber-600 animate-spin mx-auto" /><p className="text-sm text-slate-500">Memeriksa status kuis dan remedial...</p></div></div>;
  }

  if (lockedQuiz) {
    return <div className="max-w-3xl mx-auto py-8 space-y-6">
      <Link to={`/student/classroom/${courseId}`} className="text-xs font-bold text-slate-600">← Kembali ke Ruang Belajar</Link>
      <section className="bg-white border border-amber-200 rounded-3xl shadow-md p-8 text-center space-y-4">
        <HelpCircle className="w-12 h-12 text-amber-500 mx-auto" />
        <h1 className="text-2xl font-black">Kuis Belum Bisa Diikuti</h1>
        {lockedQuiz.previousQuizTitle ? (
          <p className="text-sm text-slate-600">Kamu harus <strong>lulus {lockedQuiz.previousQuizTitle}</strong> terlebih dahulu sebelum mengikuti <strong>{lockedQuiz.title}</strong>. Jika masih remedial atau dalam cooldown, lanjutkan di kuis sebelumnya.</p>
        ) : (
          <p className="text-sm text-slate-600">Selesaikan materi wajib terlebih dahulu sebelum mengerjakan <strong>{lockedQuiz.title}</strong>.</p>
        )}
        {lockedQuiz.remaining > 0 && <p className="text-sm text-amber-700">Masih ada {lockedQuiz.remaining} materi wajib yang belum selesai.</p>}
        <Link to={`/student/classroom/${courseId}`} className="inline-block bg-blue-600 text-white px-5 py-3 rounded-xl font-bold">Kembali ke Materi</Link>
      </section>
    </div>;
  }

  // During cooldown, render ONLY the timer, never the quiz questions or submit form.
  if (remainingSeconds > 0) {
    return <div className="max-w-3xl mx-auto py-8 space-y-6">
      <Link to={`/student/classroom/${courseId}`} className="inline-flex items-center gap-2 text-xs font-bold text-slate-600"><ArrowLeft className="w-4 h-4" /> Kembali ke Ruang Belajar</Link>
      <section role="status" className="bg-white border border-amber-200 rounded-3xl shadow-md p-8 sm:p-12 text-center space-y-5">
        <div className="w-20 h-20 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center"><Clock3 className="w-10 h-10" /></div>
        <h1 className="text-2xl font-black text-slate-900">Remedial Belum Tersedia</h1>
        <p className="text-sm text-slate-600">Kamu sudah mengikuti remedial, tetapi nilainya belum memenuhi KKM. Silakan belajar lagi sambil menunggu.</p>
        <div className="text-5xl sm:text-6xl tabular-nums font-black tracking-wider text-amber-700" aria-label={`Sisa ${remainingSeconds} detik`}>{formatCountdown(remainingSeconds)}</div>
        <p className="text-xs text-slate-500">Waktu tunggu 30 menit dihitung dari pengiriman jawaban terakhir. Timer tetap berjalan ketika halaman ditutup.</p>
        <Link to={`/student/classroom/${courseId}`} className="inline-flex bg-blue-600 text-white px-5 py-3 rounded-xl font-bold text-sm">Kembali ke Ruang Belajar</Link>
      </section>
      {showCooldownPopup && <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4" role="presentation">
        <div role="dialog" aria-modal="true" aria-labelledby="quiz-cooldown-title" className="w-full max-w-md bg-white rounded-3xl p-7 shadow-2xl text-center space-y-4">
          <Clock3 className="w-12 h-12 text-amber-600 mx-auto" />
          <h2 id="quiz-cooldown-title" className="text-xl font-black text-slate-900">Remedial Ditunda 30 Menit</h2>
          <p className="text-sm text-slate-600">Percobaan remedial belum mencapai nilai minimum. Kamu bisa mencoba lagi setelah waktu tunggu selesai.</p>
          <div className="text-4xl font-black tabular-nums text-amber-700">{formatCountdown(remainingSeconds)}</div>
          <button autoFocus type="button" onClick={() => setShowCooldownPopup(false)} className="w-full rounded-xl bg-blue-600 text-white px-5 py-3 font-bold">Mengerti</button>
        </div>
      </div>}
    </div>;
  }

  if (attemptedQuiz) {
    const passed = attemptedQuiz.status === 'PASSED';
    return <div className="max-w-3xl mx-auto py-8 space-y-6">
      <Link to={`/student/classroom/${courseId}`} className="inline-flex items-center gap-2 text-xs font-bold text-slate-600"><ArrowLeft className="w-4 h-4" /> Kembali ke Ruang Belajar</Link>
      <section className="bg-white border border-slate-200 rounded-3xl shadow-md p-8 text-center space-y-4">
        <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${passed ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
          {passed ? <CheckCircle2 className="w-9 h-9" /> : <HelpCircle className="w-9 h-9" />}
        </div>
        <h1 className="text-2xl font-black text-slate-900">{passed ? 'Ujian Sudah Lulus' : 'Hasil Kuis Terakhir'}</h1>
        <p className="text-sm text-slate-600">{attemptedQuiz.title} — percobaan ke-{attemptedQuiz.attemptNumber}.</p>
        <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto py-3">
          <div className="bg-slate-50 rounded-xl p-3"><div className="text-xs text-slate-500">Nilai</div><div className="font-black text-lg">{attemptedQuiz.score}/100</div></div>
          <div className="bg-slate-50 rounded-xl p-3"><div className="text-xs text-slate-500">KKM</div><div className="font-black text-lg">{attemptedQuiz.passingGrade}</div></div>
          <div className="bg-slate-50 rounded-xl p-3"><div className="text-xs text-slate-500">Status</div><div className={`font-bold mt-1 ${passed ? 'text-emerald-700' : 'text-amber-700'}`}>{passed ? 'Lulus' : 'Belum Lulus'}</div></div>
        </div>
        {loadError && <p role="alert" className="text-sm text-rose-700">{loadError}</p>}
        {!passed && <button type="button" onClick={() => void handleStartRemedial()} className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl font-bold text-sm"><RefreshCw className="w-4 h-4" /> Periksa & Mulai Remedial</button>}
        <Link to={`/student/classroom/${courseId}`} className="block text-sm text-slate-600 hover:text-blue-700">Kembali ke Ruang Belajar</Link>
      </section>
    </div>;
  }

  if (!quiz) {
    return <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
      <h2 className="text-xl font-bold text-slate-800">Kuis Belum Dapat Dimuat</h2>
      {loadError && <p role="alert" className="text-sm text-amber-700">{loadError}</p>}
      <Link to={`/student/classroom/${courseId}`} className="inline-block px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs">Kembali ke Ruang Belajar</Link>
    </div>;
  }

  const questions = quiz.questions || [];
  return <div className="max-w-3xl mx-auto py-6 space-y-8">
    <header className="flex items-center justify-between pb-4 border-b border-slate-200">
      <Link to={`/student/classroom/${courseId}`} className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-700"><ArrowLeft className="w-4 h-4" /> Kembali ke Ruang Belajar</Link>
      <span className="text-xs font-semibold text-slate-400">KKM: <strong className="text-amber-700">{quiz.passingGrade}%</strong></span>
    </header>
    <section className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-8 space-y-6">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold"><HelpCircle className="w-4 h-4" /> Kuis Evaluasi Pemahaman</div>
        <h1 className="text-2xl font-black text-slate-900">{quiz.title}</h1>
        {quiz.description && <p className="text-xs text-slate-500">{quiz.description}</p>}
      </div>
      {result ? <div className={`rounded-2xl p-6 border-2 space-y-6 ${result.passed ? 'bg-emerald-50/70 border-emerald-300' : 'bg-rose-50/70 border-rose-300'}`}>
        <div className="flex items-center gap-4">
          {result.passed ? <CheckCircle2 className="w-12 h-12 text-emerald-600" /> : <XCircle className="w-12 h-12 text-rose-600" />}
          <div><h3 className="font-black text-lg">{result.passed ? 'Selamat! Kamu Lulus Kuis' : 'Nilai Belum Mencapai KKM'}</h3>
            <p className="text-sm text-slate-600">{result.passed ? 'Hasil disimpan oleh server.' : 'Kamu boleh langsung mencoba remedial pertama. Setelah kegagalan kedua, berlaku jeda 30 menit.'}</p></div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center bg-white border border-slate-200 rounded-xl p-4">
          <div><div className="text-xs text-slate-500">Nilai</div><div className="text-xl font-black">{result.score}/100</div></div>
          <div><div className="text-xs text-slate-500">KKM</div><div className="text-xl font-black">{result.passingGrade}</div></div>
          <div><div className="text-xs text-slate-500">Percobaan</div><div className="text-xl font-black">{result.attemptNumber ?? '—'}</div></div>
        </div>
        {loadError && <p role="alert" className="text-sm text-rose-700">{loadError}</p>}
        <div className="flex flex-wrap gap-3">
          <Link to={`/student/classroom/${courseId}`} className="rounded-xl bg-blue-600 px-5 py-3 text-white text-sm font-bold">Lanjutkan Pembelajaran</Link>
          {!result.passed && <button onClick={() => void handleStartRemedial()} type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold"><RefreshCw className="w-4 h-4" /> Coba Lagi Kuis</button>}
        </div>
      </div> : <form onSubmit={handleSubmit} className="space-y-8">
        {validationError && <p role="alert" className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 text-amber-800 text-sm"><AlertTriangle className="w-4 h-4" /> {validationError}</p>}
        <div className="space-y-8 divide-y divide-slate-100">{questions.map((q, idx) => <div key={q.id} className="pt-6 first:pt-0 space-y-4">
          <div className="flex items-start gap-3"><span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">{idx + 1}</span><h3 className="font-bold text-sm text-slate-900">{q.prompt}</h3></div>
          <div className="space-y-2 pl-9">{q.options.map(opt => <label key={opt.id} className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer text-xs ${selectedAnswers[q.id] === opt.id ? 'bg-blue-50 border-blue-500 text-blue-950 font-semibold' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
            <input type="radio" name={`question-${q.id}`} checked={selectedAnswers[q.id] === opt.id} onChange={() => { setSelectedAnswers(prev => ({ ...prev, [q.id]: opt.id })); setValidationError(''); }} className="w-4 h-4 border-slate-300" />
            <span className="flex-1">{opt.text}</span>
          </label>)}</div>
        </div>)}</div>
        <div className="pt-6 border-t border-slate-200 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">Terjawab: {Object.keys(selectedAnswers).length} dari {questions.length} soal</span>
          <button disabled={isSubmitting || questions.length === 0} type="submit" className="rounded-xl px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 disabled:opacity-50">
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Menilai di Server...</> : <><Send className="w-4 h-4" /> Kirim Jawaban Kuis</>}
          </button>
        </div>
      </form>}
    </section>
  </div>;
};
