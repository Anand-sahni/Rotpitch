'use client';

import { Trash2 } from 'lucide-react';
import type { VideoFormat } from '@rotpitch/shared';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';

/**
 * Destructive-confirm modal for removing a video (Stitch "Delete Video
 * Confirmation"). Shows a small thumbnail of the target with a destructive glow.
 */
export function DeleteVideoModal({
  open,
  onClose,
  onConfirm,
  title,
  format = 'vertical',
  tone = 'from-violet/40 to-cyan/20',
  pending = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  format?: VideoFormat;
  /** Tailwind gradient classes for the decorative thumb. */
  tone?: string;
  /** Disable the buttons while the delete request is in flight. */
  pending?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="delete-video-title" className="max-w-[360px]">
      <div className="flex flex-col items-center p-8 text-center">
        {/* Target thumbnail with destructive glow */}
        <div className="relative mb-6 h-40 w-24 overflow-hidden rounded-lg border border-error/40 shadow-[0_0_30px_-4px_var(--error)]">
          <span
            className={cn(
              'absolute inset-0 bg-gradient-to-br opacity-60 grayscale',
              format === 'horizontal' ? 'rotate-90 scale-150' : '',
              tone,
            )}
          />
          <span className="absolute inset-0 bg-gradient-to-t from-base/80 to-transparent" />
          <span className="absolute inset-0 grid place-items-center">
            <Trash2 className="h-7 w-7 text-error" strokeWidth={1.5} />
          </span>
        </div>

        <h2 id="delete-video-title" className="mb-2 font-syne text-[22px] font-semibold text-t1">
          Delete this video?
        </h2>
        <p className="mb-8 text-[15px] leading-relaxed text-t2">
          {title ? (
            <>
              <span className="text-t1">{title}</span> will be removed from your library. This
              can&apos;t be undone.
            </>
          ) : (
            <>This can&apos;t be undone. The video will be removed from your library.</>
          )}
        </p>

        <div className="flex w-full flex-col gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-error font-bold text-white transition-transform hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
            {pending ? 'Deleting…' : 'Delete'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="h-12 w-full rounded-md border border-border font-medium text-t1 transition-colors hover:border-border-strong hover:bg-elevated disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
