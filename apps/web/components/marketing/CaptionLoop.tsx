'use client';

import { useEffect, useRef } from 'react';
import { marketingAssetUrl } from '@/lib/marketing';

/**
 * Mini 9:16 frame for the captions card — a real render, not a mock. The card
 * claims Whisper hears the audio and libass burns the words in; a CSS
 * animation of fake caption words was the one thing on the page asserting a
 * feature it wasn't showing. This is an actual pipeline output, so the timing,
 * wrapping and outline are whatever the renderer really produced.
 *
 * Plays only while on screen (`preload="none"` + poster, IntersectionObserver),
 * so the card costs a 24KB image until someone scrolls to it. Under
 * reduced-motion it never fetches the mp4 and the poster is the finished state.
 */

const SRC = marketingAssetUrl('captions-demo-v1.mp4');
const POSTER = marketingAssetUrl('captions-demo-v1.jpg');

export function CaptionLoop() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        if (entry.isIntersecting) void video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.3 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative mx-auto aspect-[9/16] h-full max-h-[340px] overflow-hidden rounded-lg border border-border bg-base">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        src={SRC}
        poster={POSTER}
        preload="none"
        muted
        loop
        playsInline
        aria-hidden
        tabIndex={-1}
      />
      <span className="absolute bottom-2 left-2 rounded-xs bg-black/55 px-1.5 py-0.5 font-mono text-[10px] lowercase text-volt">
        captions: burned_in (libass)
      </span>
    </div>
  );
}
