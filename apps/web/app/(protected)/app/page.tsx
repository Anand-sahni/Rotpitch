import Link from 'next/link';
import { Clapperboard, Sparkles } from 'lucide-react';
import { LibraryGrid } from '@/components/app/LibraryGrid';
import { AutoRefresh } from '@/components/app/AutoRefresh';
import { getVideos } from '@/lib/data';
import { videoRowToCard } from '@/lib/format';

export const metadata = { title: 'Library · RotPitch' };

// Always render fresh — the library reflects in-flight renders.
export const dynamic = 'force-dynamic';

/** Video Library (Stitch dashboard), backed by the real `videos` query. */
export default async function LibraryPage() {
  const rows = await getVideos();
  const videos = rows.map(videoRowToCard);
  const hasActive = rows.some((r) => r.status === 'pending' || r.status === 'processing');

  return (
    <div>
      {hasActive && <AutoRefresh />}
      {videos.length === 0 ? (
        <>
          <h1 className="mb-8 font-syne text-2xl font-bold tracking-tight text-t1">Your Videos</h1>
          <EmptyState />
        </>
      ) : (
        <LibraryGrid videos={videos} />
      )}
    </div>
  );
}

/** No-videos state (Stitch "Video Library — Empty State"). */
function EmptyState() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
      <div className="relative mb-10 grid h-[340px] w-48 place-items-center">
        <div className="signal-gradient absolute inset-0 animate-pulse rounded-full opacity-20 blur-[80px]" />
        <div className="glass-panel relative flex h-full w-full flex-col items-center justify-center rounded-xl">
          <div className="absolute left-4 top-4 flex items-center gap-1.5">
            <span className="h-2 w-2 animate-ping rounded-full bg-error" />
            <span className="font-mono text-[10px] uppercase tracking-tight text-t2">REC</span>
          </div>
          <div className="mb-4 grid h-20 w-20 place-items-center rounded-full border border-border bg-elevated">
            <Clapperboard className="h-10 w-10 text-volt" strokeWidth={1.5} />
          </div>
          <div className="mb-2 h-2 w-2/3 rounded-full bg-border" />
          <div className="h-2 w-1/2 rounded-full bg-border" />
          <div className="glass-panel absolute -right-4 top-1/4 rounded-lg p-2 shadow-xl">
            <Sparkles className="h-5 w-5 text-cyan" strokeWidth={1.5} />
          </div>
        </div>
      </div>
      <h2 className="mb-3 font-syne text-[clamp(28px,4vw,40px)] font-semibold tracking-tight text-t1">
        No videos yet
      </h2>
      <p className="mb-10 text-[18px] leading-relaxed text-t2">
        Upload a product video and generate your first viral clip in under a minute.
      </p>
      <Link
        href="/app/create"
        className="signal-gradient flex items-center gap-2 rounded-md px-8 py-4 text-[18px] font-bold text-base transition-transform hover:scale-[1.02] active:scale-[0.98]"
      >
        Create your first video
      </Link>
    </div>
  );
}
