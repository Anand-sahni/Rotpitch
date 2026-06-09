'use client';

import { useEffect, useRef } from 'react';

/**
 * Atmospheric aurora background for the auth screens (ported from the Stitch
 * Sign Up / Log In designs). Two of the three glows drift with the cursor for a
 * subtle parallax; disabled under prefers-reduced-motion.
 */
export function AuroraField() {
  const violet = useRef<HTMLDivElement>(null);
  const cyan = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const onMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      if (violet.current) violet.current.style.transform = `translate(${x * 20}px, ${y * 20}px)`;
      if (cyan.current) cyan.current.style.transform = `translate(${-x * 30}px, ${-y * 30}px)`;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0">
      <div
        ref={violet}
        className="absolute inset-0 transition-transform duration-300 ease-out"
        style={{ background: 'radial-gradient(circle at 0% 0%, rgba(157,123,255,0.15) 0%, transparent 50%)' }}
      />
      <div
        ref={cyan}
        className="absolute inset-0 transition-transform duration-300 ease-out"
        style={{ background: 'radial-gradient(circle at 100% 100%, rgba(61,240,200,0.10) 0%, transparent 50%)' }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(circle at 50% 0%, rgba(203,255,61,0.05) 0%, transparent 40%)' }}
      />
    </div>
  );
}
