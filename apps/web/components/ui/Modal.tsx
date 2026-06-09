'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';

/**
 * Base modal: dimmed + blurred backdrop with a centered glass card (Stitch modal
 * pattern). Closes on Escape or backdrop click; locks body scroll while open and
 * restores focus to the trigger on close. Entrance animation is neutralized under
 * `prefers-reduced-motion` (see globals.css).
 */
export function Modal({
  open,
  onClose,
  children,
  className,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Extra classes for the card container. */
  className?: string;
  /** id of the heading element, for aria-labelledby. */
  labelledBy?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cardRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="rp-overlay-in fixed inset-0 z-[100] flex items-center justify-center bg-base/70 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={cn(
          'rp-pop-in glass-panel relative w-full overflow-hidden rounded-[20px] shadow-lg outline-none',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
