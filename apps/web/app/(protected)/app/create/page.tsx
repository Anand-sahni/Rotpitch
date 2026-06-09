import { getProfile, getBackgrounds } from '@/lib/data';
import { CreateForm } from '@/components/app/CreateForm';

export const metadata = { title: 'Create · RotPitch' };
export const dynamic = 'force-dynamic';

/**
 * Create screen (Stitch Upload → Pick Background → Generate, condensed into one
 * config surface). Plan + credits drive all gating client-side for instant
 * feedback; the API re-enforces every flag on submit (Phase 5).
 */
export default async function CreatePage() {
  const [profile, backgrounds] = await Promise.all([getProfile(), getBackgrounds()]);
  if (!profile) return null;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-2 font-syne text-2xl font-bold tracking-tight text-t1">Create a video</h1>
      <p className="mb-8 text-[15px] text-t2">
        Upload your demo, pick a background, and generate a scroll-stopping clip.
      </p>
      <CreateForm plan={profile.plan} credits={profile.creditsBalance} backgrounds={backgrounds} />
    </div>
  );
}
