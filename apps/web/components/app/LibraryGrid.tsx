'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { VideoCard, type VideoCardData } from '@/components/app/VideoCard';
import { DeleteVideoModal } from '@/components/app/DeleteVideoModal';
import { deleteVideo } from '@/lib/api';
import { cn } from '@/lib/cn';

const FILTERS = ['All', '9:16', '16:9', 'Status'] as const;
type Filter = (typeof FILTERS)[number];

/** Does a card match the active filter pill? */
function matchesFilter(v: VideoCardData, filter: Filter): boolean {
  switch (filter) {
    case '9:16':
      return v.format === 'vertical';
    case '16:9':
      return v.format === 'horizontal';
    case 'Status':
      // Renders still in progress or that failed — things worth checking on.
      return v.status !== 'done';
    case 'All':
    default:
      return true;
  }
}

/**
 * Client wrapper around the video grid: owns the heading + filter pills, adds a
 * hover delete affordance to each finished/failed card, and drives the Stitch
 * delete-confirmation modal. Confirming calls the delete API and refreshes.
 */
export function LibraryGrid({ videos }: { videos: VideoCardData[] }) {
  const router = useRouter();
  const [target, setTarget] = useState<VideoCardData | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('All');

  const shown = videos.filter((v) => matchesFilter(v, filter));

  function flashToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3500);
  }

  async function confirmDelete() {
    if (!target) return;
    setDeleting(true);
    try {
      await deleteVideo(target.id);
      setTarget(null);
      router.refresh();
    } catch (err) {
      setTarget(null);
      flashToast(err instanceof Error ? err.message : 'Could not delete that video.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center gap-x-8 gap-y-4">
        <h1 className="font-syne text-2xl font-bold tracking-tight text-t1">Your Videos</h1>
        <div className="flex items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={cn(
                'rounded-full border px-4 py-1.5 font-mono text-[12px] transition-colors',
                filter === f
                  ? 'border-volt bg-elevated text-volt'
                  : 'border-border text-t2 hover:border-t2',
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {shown.map((v) => (
          <div key={v.id} className="group/card relative">
            <VideoCard {...v} />
            {v.status !== 'processing' && (
              <button
                type="button"
                onClick={() => setTarget(v)}
                aria-label={`Delete ${v.title}`}
                className={cn(
                  'absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-md',
                  'border border-border bg-[var(--glass)] text-t2 backdrop-blur-glass',
                  'opacity-0 transition-all hover:border-error hover:text-error group-hover/card:opacity-100',
                )}
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
              </button>
            )}
          </div>
        ))}

        {/* Add-new placeholder */}
        <Link
          href="/app/create"
          className="group flex aspect-[9/16] cursor-pointer flex-col items-center justify-center gap-4 rounded-[16px] border-2 border-dashed border-border bg-base transition-all hover:border-volt/50 hover:bg-elevated/40"
        >
          <span className="grid h-12 w-12 place-items-center rounded-full bg-card transition-transform group-hover:scale-110">
            <Plus className="h-5 w-5 text-volt" strokeWidth={1.5} />
          </span>
          <span className="font-mono text-[12px] text-t2">Create New Video</span>
        </Link>
      </div>

      <DeleteVideoModal
        open={target !== null}
        onClose={() => setTarget(null)}
        onConfirm={confirmDelete}
        title={target?.title}
        format={target?.format}
        tone={target?.tone}
        pending={deleting}
      />

      {toast && (
        <div className="rp-overlay-in fixed bottom-6 right-6 z-[110] rounded-md border border-border bg-[var(--glass)] px-4 py-3 font-mono text-[12px] text-t1 shadow-lg backdrop-blur-glass">
          {toast}
        </div>
      )}
    </>
  );
}
