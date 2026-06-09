'use client';

import { useRef, useState } from 'react';
import { CircleAlert, CirclePlay, Download, Loader2 } from 'lucide-react';
import type { VideoFormat } from '@rotpitch/shared';
import { cn } from '@/lib/cn';

export type VideoStatus = 'done' | 'processing' | 'failed';

export interface VideoCardData {
  id: string;
  title: string;
  format: VideoFormat;
  status: VideoStatus;
  /** e.g. "0:48" — optional; duration isn't persisted yet. */
  duration?: string;
  /** relative time, e.g. "2 days ago" */
  when: string;
  /** processing progress 0–100; omit for an indeterminate bar. */
  progress?: number;
  /** batch label, e.g. "Batch #12" */
  batch?: string;
  /** decorative thumbnail gradient (Tailwind classes) */
  tone: string;
  /** public URL of the finished render (done videos only) */
  outputUrl?: string;
  /** why the render failed (failed videos only) */
  failureReason?: string;
}

const FORMAT_LABEL: Record<VideoFormat, string> = { vertical: '9:16', horizontal: '16:9' };

export function VideoCard(video: VideoCardData) {
  const aspect = video.format === 'vertical' ? 'aspect-[9/16]' : 'aspect-[16/9]';
  const failed = video.status === 'failed';
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(true);
  const hasPreview = video.status === 'done' && !!video.outputUrl && hasVideo;

  function play() {
    const v = videoRef.current;
    if (v) void v.play().catch(() => {});
  }
  function stop() {
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
  }

  return (
    <div
      onMouseEnter={hasPreview ? play : undefined}
      onMouseLeave={hasPreview ? stop : undefined}
      className={cn(
        'group overflow-hidden rounded-[16px] border border-border bg-elevated transition-all',
        failed ? 'hover:border-error/50' : 'hover:-translate-y-1 hover:border-volt/50',
      )}
    >
      <div className={cn('relative overflow-hidden bg-base', aspect)}>
        {/* decorative thumbnail — fallback behind the real preview */}
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-br transition-transform duration-500',
            video.tone,
            video.status === 'processing' && 'opacity-40',
            failed && 'opacity-50 grayscale',
            video.status === 'done' && !hasPreview && 'group-hover:scale-105',
          )}
        />

        {/* finished render preview (first frame; plays on hover) */}
        {hasPreview && (
          <video
            ref={videoRef}
            src={video.outputUrl}
            className="absolute inset-0 h-full w-full object-cover"
            muted
            loop
            playsInline
            preload="metadata"
            onError={() => setHasVideo(false)}
          />
        )}

        {/* batch badge */}
        {video.batch && (
          <span className="nebula-gradient absolute left-4 top-4 rounded-md px-2 py-0.5 font-mono text-[10px] text-white shadow-lg">
            {video.batch}
          </span>
        )}

        {video.status === 'done' && (
          <>
            <span className="absolute right-4 top-4 rounded-md bg-volt px-2 py-0.5 font-mono text-[10px] font-bold text-base">
              Done
            </span>
            <a
              href={video.outputUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(
                'absolute inset-0 grid place-items-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100',
                video.outputUrl ? 'cursor-pointer' : 'pointer-events-none',
              )}
              aria-label="Play video"
            >
              <CirclePlay className="h-12 w-12 fill-black/20 text-white drop-shadow" strokeWidth={1.5} />
            </a>
          </>
        )}

        {video.status === 'processing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full border border-volt/20">
              <Loader2 className="h-6 w-6 animate-spin text-volt" strokeWidth={1.5} />
            </span>
            <span className="rounded-full bg-volt-dim px-3 py-1 font-mono text-[11px] tracking-wide text-volt">
              {typeof video.progress === 'number' ? `Processing ${video.progress}%` : 'Processing…'}
            </span>
            <div className="absolute inset-x-6 bottom-6 h-1 overflow-hidden rounded-full bg-white/10">
              {typeof video.progress === 'number' ? (
                <div
                  className="signal-gradient h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${video.progress}%` }}
                />
              ) : (
                <span className="rp-indeterminate signal-gradient absolute inset-y-0 w-2/5 rounded-full" />
              )}
            </div>
          </div>
        )}

        {failed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <CircleAlert className="mb-2 h-9 w-9 text-error" strokeWidth={1.5} />
            <span className="font-mono text-[12px] text-error">Export Failed</span>
            {video.failureReason && (
              <p className="mt-1 max-w-[90%] text-[11px] leading-snug text-t2">{video.failureReason}</p>
            )}
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="mb-1 truncate font-syne text-[18px] font-semibold text-t1">{video.title}</h3>
            <p className="font-mono text-[11px] uppercase tracking-wide text-t2">
              {[FORMAT_LABEL[video.format], video.duration, video.when].filter(Boolean).join(' · ')}
            </p>
          </div>
          {video.status === 'done' && video.outputUrl && (
            <a
              href={video.outputUrl}
              download
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border text-t2 transition-colors hover:border-volt hover:text-volt"
              aria-label="Download video"
            >
              <Download className="h-4 w-4" strokeWidth={1.5} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
