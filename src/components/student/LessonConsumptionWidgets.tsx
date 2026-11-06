import React, { useEffect, useRef, useState } from 'react';
import { youtubeEmbedUrl } from '../../utils/student-learning-guards';
import type { EngagementPart, EngagementResume } from '../../utils/lesson-consumption';

export type TrackedProps = {
  initialPercent?: number;
  resume?: EngagementResume;
  report: (kind: EngagementPart, percentage: number, resume?: EngagementResume) => void;
};

/** Scroll progress is relative to the text content, never to the browser page/sidebar. */
export const TrackedText: React.FC<TrackedProps & { text: string }> = ({ text, initialPercent = 0, report }) => {
  const ref = useRef<HTMLDivElement>(null);
  const reportRef = useRef(report);
  reportRef.current = report;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const timer = window.setTimeout(() => {
      const max = Math.max(0, el.scrollHeight - el.clientHeight);
      if (max <= 1) reportRef.current('text', 100);
    }, 4500);
    const frame = window.requestAnimationFrame(() => {
      const max = Math.max(0, el.scrollHeight - el.clientHeight);
      if (max > 0 && initialPercent > 0) el.scrollTop = max * initialPercent / 100;
    });
    return () => { window.clearTimeout(timer); window.cancelAnimationFrame(frame); };
  }, [text]);
  const onScroll: React.UIEventHandler<HTMLDivElement> = (event) => {
    const el = event.currentTarget;
    const max = Math.max(0, el.scrollHeight - el.clientHeight);
    if (max > 0) report('text', Math.round(100 * el.scrollTop / max));
  };
  return <div ref={ref} onScroll={onScroll} tabIndex={0} aria-label="Teks pembelajaran, gulir untuk membaca"
    className="max-h-[55vh] overflow-y-auto whitespace-pre-line text-sm sm:text-base text-slate-700 leading-relaxed rounded-xl bg-slate-50 border border-slate-200 p-4 focus:outline-blue-600">{text}</div>;
};

/** A single image counts as viewed after 4 seconds while substantially visible. */
export const TrackedImage: React.FC<TrackedProps & { src: string; alt: string }> = ({ src, alt, report }) => {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const reportRef = useRef(report); reportRef.current = report;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer: number | undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && el.complete && el.naturalWidth > 0) {
        if (timer === undefined) timer = window.setTimeout(() => reportRef.current('image', 100), 4000);
      } else if (timer !== undefined) { window.clearTimeout(timer); timer = undefined; }
    }, { threshold: 0.5 });
    observer.observe(el);
    return () => { observer.disconnect(); if (timer !== undefined) window.clearTimeout(timer); };
  }, [src, loaded]);
  return <img ref={ref} src={src} alt={alt} onLoad={() => setLoaded(true)} className="max-h-[500px] w-auto mx-auto rounded-xl object-contain" />;
};

/** Cumulative playback time is counted, not the seekbar position. Advisory, not exam evidence. */
export const TrackedAudio: React.FC<TrackedProps & { src: string }> = ({ src, resume, initialPercent = 0, report }) => {
  const last = useRef<number | null>(null);
  const played = useRef<number>(0);
  const reportRef = useRef(report); reportRef.current = report;
  const restored = useRef(false);
  useEffect(() => { last.current = null; played.current = 0; restored.current = false; }, [src]);
  const timeUpdate: React.ReactEventHandler<HTMLAudioElement> = (event) => {
    const el = event.currentTarget;
    if (!Number.isFinite(el.duration) || el.duration <= 0) return;
    const at = el.currentTime;
    if (!restored.current) {
      restored.current = true;
      played.current = Math.max(0, initialPercent / 100 * el.duration);
      if (resume?.kind === 'audio') { el.currentTime = Math.min(Math.max(0, el.duration - 1), resume.seconds); last.current = null; return; }
    }
    const delta = last.current === null ? 0 : at - last.current;
    last.current = at;
    if (!el.paused && delta > 0 && delta <= 2) {
      played.current = Math.min(el.duration, played.current + delta);
      reportRef.current('audio', Math.floor(100 * played.current / el.duration), { kind: 'audio', seconds: Math.floor(at) });
    }
  };
  return <audio controls className="w-full rounded-lg" src={src} onTimeUpdate={timeUpdate} onSeeked={() => { last.current = null; }} />;
};

type YoutubePlayer = {
  destroy: () => void;
  getDuration: () => number;
  getCurrentTime: () => number;
  getPlayerState: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
};
type YoutubePlayerEvent = { target: YoutubePlayer };
type YoutubeWindow = Window & {
  YT?: { Player: new (element: HTMLElement, options: Record<string, unknown>) => YoutubePlayer };
  onYouTubeIframeAPIReady?: () => void;
};
let youtubeSdkPromise: Promise<void> | undefined;
function youtubeSdk(): Promise<void> {
  const win = window as YoutubeWindow;
  if (win.YT?.Player) return Promise.resolve();
  if (!youtubeSdkPromise) youtubeSdkPromise = new Promise<void>((resolve, reject) => {
    const prior = win.onYouTubeIframeAPIReady;
    const timeout = window.setTimeout(() => { youtubeSdkPromise = undefined; reject(new Error('YouTube API timed out')); }, 12000);
    win.onYouTubeIframeAPIReady = () => { window.clearTimeout(timeout); prior?.(); resolve(); };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => { window.clearTimeout(timeout); youtubeSdkPromise = undefined; reject(new Error('YouTube API blocked')); };
    document.head.appendChild(script);
  });
  return youtubeSdkPromise;
}

export const TrackedYoutube: React.FC<TrackedProps & { videoId: string; title: string }> = ({ videoId, title, report, initialPercent = 0, resume }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);
  const reportRef = useRef(report); reportRef.current = report;
  useEffect(() => {
    let cancelled = false;
    let player: YoutubePlayer | undefined;
    let interval: number | undefined;
    let seconds = 0;
    let lastTime: number | null = null;
    const mount = mountRef.current;
    if (!mount) return;
    void youtubeSdk().then(() => {
      if (cancelled || !mountRef.current) return;
      const win = window as YoutubeWindow;
      if (!win.YT?.Player) return;
      player = new win.YT.Player(mount, {
        width: '100%', height: '100%',
        videoId,
        playerVars: { origin: window.location.origin, rel: 0, modestbranding: 1 },
        events: {
          onReady: ({ target }: YoutubePlayerEvent) => {
            const duration = target.getDuration();
            if (duration > 0) seconds = initialPercent / 100 * duration;
            if (resume?.kind === 'youtube' && resume.seconds > 0) target.seekTo(resume.seconds, true);
            interval = window.setInterval(() => {
              if (!player) return;
              const time = player.getCurrentTime();
              const length = player.getDuration();
              if (!Number.isFinite(time) || !Number.isFinite(length) || length <= 0) return;
              const delta = lastTime === null ? 0 : time - lastTime;
              lastTime = time;
              if (player.getPlayerState() !== 1) { lastTime = null; return; }
              if (delta > 0 && delta <= 2.5) seconds = Math.min(length, seconds + delta);
              reportRef.current('youtube', Math.floor(100 * seconds / length), { kind: 'youtube', seconds: Math.floor(time) });
            }, 1000);
          },
        },
      });
    }).catch(() => { if (!cancelled) setFallback(true); });
    return () => { cancelled = true; if (interval !== undefined) window.clearInterval(interval); player?.destroy(); };
  }, [videoId]);
  return <div role="group" aria-label={`Pemutar video ${title}`} className="space-y-2"><div className="relative aspect-video rounded-2xl overflow-hidden bg-black text-white">{fallback ? <iframe className="w-full h-full border-0 absolute inset-0" src={youtubeEmbedUrl(videoId) ?? undefined} title={title} allowFullScreen /> : <div ref={mountRef} className="absolute inset-0" />}</div>{fallback && <p className="text-xs text-amber-700">Video tetap dapat diputar, tetapi pelacakan durasi belum tersedia pada browser ini.</p>}</div>;
};
