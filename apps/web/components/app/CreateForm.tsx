'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import {
  Captions,
  Check,
  Film,
  Layers,
  Lock,
  Mic,
  MoveHorizontal,
  MoveVertical,
  Type,
  UploadCloud,
  Volume2,
  VolumeX,
  X,
  Zap,
  ZoomIn,
} from 'lucide-react';
import {
  PLANS,
  BATCH_MIN,
  BATCH_MAX,
  MIN_SCALE,
  MAX_SCALE,
  MIN_SPLIT,
  MAX_SPLIT,
  CUSTOM_BACKGROUND_PREFIX,
  CAPTION_PRESETS,
  CAPTION_BASE_FONT,
  DEFAULT_CAPTION_PRESET,
  MIN_CAPTION_SCALE,
  MAX_CAPTION_SCALE,
  captionPreset,
  planAllowsCustomBackground,
  validateUploadMeta,
  validateDuration,
  ACCEPTED_VIDEO_MIME,
  type CaptionPreset,
  type PlanId,
  type VideoFormat,
} from '@rotpitch/shared';
import { FREE_STYLE_COUNT, type BackgroundStyle } from '@/lib/backgrounds';
import { OutOfCreditsModal } from '@/components/app/OutOfCreditsModal';
import { UpgradeModal } from '@/components/app/UpgradeModal';
import {
  uploadRawVideo,
  uploadCustomBackground,
  generateVideo,
  autoGenerateVideos,
} from '@/lib/api';
import { cn } from '@/lib/cn';

/** Sentinel style id for the in-progress custom upload (before it has a storage
 * path). Never a real catalog object name (those end in a video extension). */
const CUSTOM_STYLE_KEY = '__custom__';

/** Seek target for the still preview — just past 0 so the browser paints a frame. */
const POSTER_TIME = 0.05;

/** Read a video file's duration (seconds) by loading metadata off-DOM. Resolves
 * NaN if the browser can't decode it (treated as an invalid file upstream). */
function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(v.duration);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(NaN);
    };
    v.src = url;
  });
}

export function CreateForm({
  plan,
  credits,
  backgrounds,
}: {
  plan: PlanId;
  credits: number;
  backgrounds: BackgroundStyle[];
}) {
  const router = useRouter();
  const features = PLANS[plan].features;
  const allowAllStyles = features.backgroundStyles === 'all';
  const styleLimit = allowAllStyles ? backgrounds.length : FREE_STYLE_COUNT;
  const allowCustom = planAllowsCustomBackground(plan);

  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // User-uploaded background loop (paid plans). Held locally with a blob preview
  // and only uploaded to storage at generate time, mirroring the demo flow.
  const customInput = useRef<HTMLInputElement>(null);
  const [customBg, setCustomBg] = useState<File | null>(null);
  const [customBgUrl, setCustomBgUrl] = useState<string | null>(null);

  // Local object URL so the user can play back the demo before generating.
  // Revoked whenever the file changes/clears so we never leak blob URLs.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Same blob-preview lifecycle for the custom background.
  useEffect(() => {
    if (!customBg) {
      setCustomBgUrl(null);
      return;
    }
    const url = URL.createObjectURL(customBg);
    setCustomBgUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [customBg]);

  const [format, setFormat] = useState<VideoFormat>('vertical');
  const [captions, setCaptions] = useState(false);
  // AI voiceover is "Coming soon" — shipping after we gather user feedback. The
  // value stays false (never sent as enabled) and the toggle is non-interactive.
  const voiceover = false;

  // Caption placement/style (editor → render). Position is the normalized centre
  // of the caption block; scale multiplies the base font. Applied to every output.
  const [captionStyle, setCaptionStyle] = useState<string>(DEFAULT_CAPTION_PRESET);
  const [captionPos, setCaptionPos] = useState({ x: 0.5, y: 0.8 });
  const [captionScale, setCaptionScale] = useState(1);

  // Edit phase — panel zoom, split, + mute, applied to every output (incl. batches).
  const [productScale, setProductScale] = useState(1);
  const [backgroundScale, setBackgroundScale] = useState(1);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [muted, setMuted] = useState(false);
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Premium upsell + credit-shortfall modals (Stitch).
  const [showOutOfCredits, setShowOutOfCredits] = useState(false);
  const [upgradeFor, setUpgradeFor] = useState<PlanId | null>(null);

  // Credits required: 1 for single, N for a batch.
  const cost = autoGenerate ? Math.max(selected.length, BATCH_MIN) : 1;
  const insufficient = credits < cost;

  /** Open the upgrade modal targeting the plan a locked feature requires. */
  function requestUpgrade(target: PlanId) {
    setUpgradeFor(target);
  }

  function pickStyle(key: string, locked: boolean) {
    if (locked) {
      // Background styles beyond the free set unlock at Basic.
      requestUpgrade('basic');
      return;
    }
    setNotice(null);
    if (autoGenerate) {
      setSelected((prev) =>
        prev.includes(key)
          ? prev.filter((k) => k !== key)
          : prev.length >= BATCH_MAX
            ? prev
            : [...prev, key],
      );
    } else {
      setSelected([key]);
    }
  }

  function toggleAuto() {
    const next = !autoGenerate;
    setAutoGenerate(next);
    setSelected((prev) => (next ? prev.slice(0, BATCH_MAX) : prev.slice(0, 1)));
  }

  async function onFiles(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    // Layer A — instant, client-side checks (type + size, then duration). These
    // are UX-only; the worker re-validates with ffprobe (the authoritative pass).
    const metaErr = validateUploadMeta({ name: f.name, type: f.type, size: f.size });
    if (metaErr) {
      setNotice(metaErr);
      return;
    }
    const durErr = validateDuration(await readVideoDuration(f));
    if (durErr) {
      setNotice(durErr);
      return;
    }
    setFile(f);
    setNotice(null);
  }

  function onCustomFiles(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    // Background loops are looped + length-trimmed at render, so only the type +
    // size limits apply (no duration cap).
    const metaErr = validateUploadMeta({ name: f.name, type: f.type, size: f.size });
    if (metaErr) {
      setNotice(metaErr);
      return;
    }
    setCustomBg(f);
    setNotice(null);
    pickStyle(CUSTOM_STYLE_KEY, false); // auto-select the freshly uploaded background
  }

  function removeCustom() {
    setCustomBg(null);
    setSelected((prev) => prev.filter((k) => k !== CUSTOM_STYLE_KEY));
    if (customInput.current) customInput.current.value = '';
  }

  // The custom upload presented as a selectable style (blob preview), plus a
  // combined list used for the preview lookup. Catalog gating stays positional
  // over `backgrounds` only — the custom tile is gated separately by plan.
  const customStyle: BackgroundStyle | null = customBgUrl
    ? { name: CUSTOM_STYLE_KEY, label: 'Your background', previewUrl: customBgUrl }
    : null;
  const allStyles = customStyle ? [customStyle, ...backgrounds] : backgrounds;

  // Field-level readiness (file + background selection). Credit shortfall is
  // handled separately via the Out-of-Credits modal, so the button stays
  // clickable when the only problem is insufficient credits.
  const fieldError = useMemo(() => {
    if (!file) return 'Upload a video to continue';
    if (autoGenerate && selected.length < BATCH_MIN)
      return `Pick at least ${BATCH_MIN} backgrounds for Auto Generate`;
    if (!autoGenerate && selected.length === 0) return 'Pick a background';
    return null;
  }, [file, autoGenerate, selected.length]);

  async function onGenerate() {
    if (fieldError) {
      setNotice(fieldError);
      return;
    }
    if (insufficient) {
      setShowOutOfCredits(true);
      return;
    }

    setSubmitting(true);
    setNotice('Uploading your video…');
    try {
      const inputUrl = await uploadRawVideo(file!);

      // Swap the custom-upload sentinel for its real `custom:<path>` id, uploading
      // the background once if the user picked one.
      let customId: string | null = null;
      const resolveStyle = async (key: string): Promise<string> => {
        if (key !== CUSTOM_STYLE_KEY) return key;
        if (!customId) {
          setNotice('Uploading your background…');
          customId = `${CUSTOM_BACKGROUND_PREFIX}${await uploadCustomBackground(customBg!)}`;
        }
        return customId;
      };
      const styles: string[] = [];
      for (const key of selected) styles.push(await resolveStyle(key));

      setNotice('Queuing your render…');
      if (autoGenerate) {
        await autoGenerateVideos({
          inputUrl,
          format,
          hasCaptions: captions,
          hasVoiceover: voiceover,
          backgroundStyles: styles,
          productScale,
          backgroundScale,
          splitRatio,
          muted,
          captionStyle,
          captionX: captionPos.x,
          captionY: captionPos.y,
          captionScale,
        });
      } else {
        await generateVideo({
          inputUrl,
          backgroundStyle: styles[0]!,
          format,
          hasCaptions: captions,
          hasVoiceover: voiceover,
          productScale,
          backgroundScale,
          splitRatio,
          muted,
          captionStyle,
          captionX: captionPos.x,
          captionY: captionPos.y,
          captionScale,
        });
      }
      // Land in the library, which polls until the render finishes.
      router.push('/app');
      router.refresh();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Something went wrong — please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* 1 · Upload */}
      <Section step={1} title="Upload your demo">
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPTED_VIDEO_MIME.join(',')}
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
        {file ? (
          <div className="rounded-[16px] border border-border bg-elevated p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-volt-dim">
                  <Film className="h-5 w-5 text-volt" strokeWidth={1.5} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[14px] text-t1">{file.name}</p>
                  <p className="font-mono text-[11px] text-t3">
                    {(file.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="shrink-0 text-t2 transition-colors hover:text-error"
                aria-label="Remove file"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
            {previewUrl && (
              <video
                src={previewUrl}
                controls
                playsInline
                className="mt-4 mx-auto block max-h-[420px] w-auto max-w-full rounded-[12px] border border-border bg-base"
              />
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              onFiles(e.dataTransfer.files);
            }}
            className={cn(
              'flex w-full flex-col items-center justify-center gap-3 rounded-[20px] border-2 border-dashed py-14 transition-all',
              dragging
                ? 'border-volt bg-volt-dim'
                : 'border-border bg-base hover:border-volt/60 hover:bg-elevated/40',
            )}
          >
            <span className="grid h-14 w-14 place-items-center rounded-full bg-card">
              <UploadCloud className="h-6 w-6 text-volt" strokeWidth={1.5} />
            </span>
            <span className="text-[15px] text-t1">Drop your video here, or click to browse</span>
            <span className="font-mono text-[11px] text-t3">MP4, MOV or WebM</span>
          </button>
        )}
      </Section>

      {/* 2 · Background */}
      <Section
        step={2}
        title="Pick a background"
        aside={
          autoGenerate ? (
            <span className="font-mono text-[12px] text-t2">
              {selected.length}/{BATCH_MAX} selected
            </span>
          ) : null
        }
      >
        <input
          ref={customInput}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => onCustomFiles(e.target.files)}
        />
        {backgrounds.length === 0 && !allowCustom ? (
          <div className="rounded-[14px] border border-dashed border-border bg-base p-8 text-center font-mono text-[12px] text-t3">
            No backgrounds available yet. Upload loops to the `backgrounds` bucket to see them here.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {/* Custom background slot — gated to paid plans. */}
            <CustomBackgroundSlot
              style={customStyle}
              allowCustom={allowCustom}
              active={selected.includes(CUSTOM_STYLE_KEY)}
              badge={
                selected.includes(CUSTOM_STYLE_KEY)
                  ? autoGenerate
                    ? String(selected.indexOf(CUSTOM_STYLE_KEY) + 1)
                    : <Check className="h-3 w-3" strokeWidth={3} />
                  : null
              }
              onUploadClick={() => customInput.current?.click()}
              onSelect={() => pickStyle(CUSTOM_STYLE_KEY, false)}
              onRemove={removeCustom}
              onLockedClick={() => requestUpgrade('basic')}
            />
            {backgrounds.map((style, i) => {
              const locked = i >= styleLimit;
              const active = selected.includes(style.name);
              return (
                <BackgroundCard
                  key={style.name}
                  style={style}
                  locked={locked}
                  active={active}
                  badge={
                    active
                      ? autoGenerate
                        ? String(selected.indexOf(style.name) + 1)
                        : <Check className="h-3 w-3" strokeWidth={3} />
                      : null
                  }
                  onSelect={() => pickStyle(style.name, locked)}
                />
              );
            })}
          </div>
        )}
        {!allowAllStyles && backgrounds.length > 0 && (
          <p className="mt-3 font-mono text-[11px] text-t3">
            Free plan unlocks {Math.min(FREE_STYLE_COUNT, backgrounds.length)} styles. Upgrade for all{' '}
            {backgrounds.length}.
          </p>
        )}
      </Section>

      {/* 3 · Options */}
      <Section step={3} title="Options">
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Format */}
          <div className="rounded-[14px] border border-border bg-card p-4">
            <p className="mb-3 flex items-center gap-2 text-[14px] text-t1">
              <Film className="h-4 w-4 text-t2" strokeWidth={1.5} /> Format
            </p>
            <div className="flex gap-2">
              <FormatChip
                label="9:16"
                active={format === 'vertical'}
                onClick={() => setFormat('vertical')}
              />
              <FormatChip
                label="16:9"
                active={format === 'horizontal'}
                locked={!features.formats.includes('horizontal')}
                onClick={() => setFormat('horizontal')}
                onLocked={() => requestUpgrade('popular')}
              />
            </div>
          </div>

          {/* Auto Generate */}
          <Toggle
            icon={Layers}
            label="Auto Generate"
            hint={`Render ${BATCH_MIN}–${BATCH_MAX} variants at once`}
            checked={autoGenerate}
            locked={!features.autoGenerate}
            onChange={toggleAuto}
            onLocked={() => requestUpgrade('basic')}
          />

          {/* Captions */}
          <Toggle
            icon={Captions}
            label="Auto captions"
            hint="Burned-in captions via Whisper"
            checked={captions}
            locked={!features.autoCaptions}
            onChange={() => setCaptions((v) => !v)}
            onLocked={() => requestUpgrade('basic')}
          />

          {/* Voiceover — coming soon */}
          <Toggle
            icon={Mic}
            label="AI voiceover"
            hint="Re-narrate in an AI voice"
            checked={false}
            comingSoon
            onChange={() => {}}
          />
        </div>
      </Section>

      {/* 4 · Edit & preview — only once there's a demo + a background to compose. */}
      {file && previewUrl && selected.length > 0 && (
        <Section
          step={4}
          title="Edit & preview"
          aside={
            autoGenerate ? (
              <span className="font-mono text-[12px] text-t2">
                Applies to all {selected.length} variants
              </span>
            ) : null
          }
        >
          <div className="grid gap-6 md:grid-cols-[auto,1fr] md:items-start">
            <PreviewComposite
              format={format}
              productUrl={previewUrl}
              backgroundUrl={allStyles.find((b) => b.name === selected[0])?.previewUrl}
              productScale={productScale}
              backgroundScale={backgroundScale}
              splitRatio={splitRatio}
              caption={
                captions
                  ? { preset: captionPreset(captionStyle), pos: captionPos, scale: captionScale }
                  : null
              }
              onCaptionPos={setCaptionPos}
              onCaptionScale={setCaptionScale}
            />
            <div className="space-y-4">
              {captions && (
                <CaptionStylePicker
                  value={captionStyle}
                  onChange={setCaptionStyle}
                  size={captionScale}
                  onSize={setCaptionScale}
                />
              )}
              <SplitSlider format={format} value={splitRatio} onChange={setSplitRatio} />
              <ZoomSlider
                label="Demo zoom"
                value={productScale}
                onChange={setProductScale}
              />
              <ZoomSlider
                label="Background zoom"
                value={backgroundScale}
                onChange={setBackgroundScale}
              />
              <Toggle
                icon={muted ? VolumeX : Volume2}
                label="Mute demo audio"
                hint="Export the clip without the original sound"
                checked={muted}
                onChange={() => setMuted((v) => !v)}
              />
              <p className="font-mono text-[11px] text-t3">
                {captions
                  ? 'Drag the caption to reposition it; drag its corner to resize. Text is a placeholder — your real captions are transcribed at render.'
                  : 'Preview is silent — the mute toggle only affects the exported file.'}
              </p>
            </div>
          </div>
        </Section>
      )}

      {/* Generate */}
      <div className="sticky bottom-6 flex flex-col gap-3 rounded-[20px] border border-border bg-[var(--glass)] p-5 backdrop-blur-glass sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-[12px] uppercase tracking-wider text-t2">Cost</p>
          <p className="font-mono text-[15px] text-t1">
            <span className={insufficient ? 'text-error' : 'text-volt'}>{cost}</span> credit
            {cost > 1 ? 's' : ''} · {credits} available
          </p>
          {notice && <p className="mt-1 text-[12px] text-warning">{notice}</p>}
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={!!fieldError || submitting}
          className={cn(
            'flex items-center justify-center gap-2 rounded-md px-8 py-3 text-[15px] font-bold transition-transform',
            fieldError || submitting
              ? 'cursor-not-allowed bg-elevated text-t3'
              : 'signal-gradient text-base hover:scale-[1.02] active:scale-[0.98]',
          )}
        >
          {submitting ? (
            <>
              Working… <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
            </>
          ) : (
            <>
              Generate <Zap className="h-4 w-4" strokeWidth={1.5} />
            </>
          )}
        </button>
      </div>

      <OutOfCreditsModal
        open={showOutOfCredits}
        onClose={() => setShowOutOfCredits(false)}
        needed={cost}
        available={credits}
      />
      <UpgradeModal
        open={upgradeFor !== null}
        onClose={() => setUpgradeFor(null)}
        targetPlan={upgradeFor ?? 'popular'}
      />
    </div>
  );
}

/**
 * The "upload your own background" tile, shown first in the picker grid. Three
 * states: an empty upload prompt, the uploaded loop as a selectable tile (with a
 * remove button), or — on the free plan — a locked tile that opens the upgrade
 * modal. Custom uploads are a paid feature, so the free tier sees the lock.
 */
function CustomBackgroundSlot({
  style,
  allowCustom,
  active,
  badge,
  onUploadClick,
  onSelect,
  onRemove,
  onLockedClick,
}: {
  style: BackgroundStyle | null;
  allowCustom: boolean;
  active: boolean;
  badge: React.ReactNode;
  onUploadClick: () => void;
  onSelect: () => void;
  onRemove: () => void;
  onLockedClick: () => void;
}) {
  // Uploaded — reuse the standard tile, with a remove affordance layered on top.
  if (style) {
    return (
      <div className="relative">
        <BackgroundCard style={style} locked={false} active={active} badge={badge} onSelect={onSelect} />
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove custom background"
          className="absolute left-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-full border border-border bg-base/80 text-t2 backdrop-blur-sm transition-colors hover:border-error hover:text-error"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
    );
  }

  // Free plan — locked; clicking opens the upgrade modal.
  if (!allowCustom) {
    return (
      <button
        type="button"
        onClick={onLockedClick}
        className="group flex aspect-[9/16] flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-border bg-base p-3 text-center transition-all hover:border-volt/50 hover:bg-elevated/40"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-card">
          <Lock className="h-4 w-4 text-t2" strokeWidth={1.5} />
        </span>
        <span className="font-mono text-[10px] leading-tight text-t2">Upload your own</span>
        <span className="font-mono text-[9px] uppercase tracking-wider text-volt">Upgrade</span>
      </button>
    );
  }

  // Empty upload prompt.
  return (
    <button
      type="button"
      onClick={onUploadClick}
      className="group flex aspect-[9/16] flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-border bg-base p-3 text-center transition-all hover:border-volt/60 hover:bg-elevated/40"
    >
      <span className="grid h-9 w-9 place-items-center rounded-full bg-card transition-transform group-hover:scale-110">
        <UploadCloud className="h-4 w-4 text-volt" strokeWidth={1.5} />
      </span>
      <span className="font-mono text-[10px] leading-tight text-t1">Upload your own</span>
      <span className="font-mono text-[9px] text-t3">MP4 · MOV · WebM</span>
    </button>
  );
}

/**
 * One background tile. Shows the loop's first frame (preload="metadata") and
 * plays it on hover; the decorative gradient sits behind as a fallback and the
 * video hides itself if the file isn't in the bucket yet (onError). Wrapping the
 * <video> in a <button> is valid — video is not an interactive form control.
 */
function BackgroundCard({
  style,
  locked,
  active,
  badge,
  onSelect,
}: {
  style: BackgroundStyle;
  locked: boolean;
  active: boolean;
  badge: React.ReactNode;
  onSelect: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(true);

  function play() {
    const v = videoRef.current;
    if (v) void v.play().catch(() => {});
  }
  function stop() {
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.currentTime = POSTER_TIME;
    }
  }
  // Nudge to a frame just past 0 so a still preview actually paints. With
  // preload="metadata" and no playback (e.g. a freshly-picked blob URL) the
  // browser otherwise never decodes a frame and the tile shows black.
  function showFirstFrame() {
    const v = videoRef.current;
    if (v && v.currentTime === 0) v.currentTime = POSTER_TIME;
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={locked}
      onMouseEnter={!locked && hasVideo ? play : undefined}
      onMouseLeave={!locked && hasVideo ? stop : undefined}
      className={cn(
        'group relative aspect-[9/16] w-full overflow-hidden rounded-[14px] border text-left transition-all',
        active ? 'border-volt ring-2 ring-volt/40' : 'border-border hover:border-border-strong',
        locked && 'cursor-not-allowed opacity-50',
      )}
    >
      {/* Neutral fallback — always behind the video. */}
      <span className="absolute inset-0 bg-gradient-to-br from-elevated to-base" />
      {hasVideo && (
        <video
          ref={videoRef}
          src={style.previewUrl}
          className="absolute inset-0 h-full w-full object-cover"
          muted
          loop
          playsInline
          preload="metadata"
          onLoadedMetadata={showFirstFrame}
          onError={() => setHasVideo(false)}
        />
      )}
      {locked && (
        <span className="absolute inset-0 grid place-items-center bg-base/60">
          <Lock className="h-5 w-5 text-t2" strokeWidth={1.5} />
        </span>
      )}
      {badge && (
        <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-volt font-mono text-[10px] font-bold leading-none text-base">
          {badge}
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-base via-base/80 to-transparent px-2 pb-2 pt-6 font-mono text-[10px] text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
        {style.label}
      </span>
    </button>
  );
}

/**
 * Live split-screen preview of the render: the demo and background stacked
 * (9:16) or side by side (16:9), each filling its 50% panel. The zoom sliders
 * drive a CSS `scale` transform that mirrors the FFmpeg centre-crop zoom, so
 * what the user sees here matches the exported composite. Both previews are
 * muted+looped so they autoplay reliably.
 */
interface CaptionPreviewState {
  preset: CaptionPreset;
  pos: { x: number; y: number };
  scale: number;
}

function PreviewComposite({
  format,
  productUrl,
  backgroundUrl,
  productScale,
  backgroundScale,
  splitRatio,
  caption,
  onCaptionPos,
  onCaptionScale,
}: {
  format: VideoFormat;
  productUrl: string;
  backgroundUrl: string | undefined;
  productScale: number;
  backgroundScale: number;
  splitRatio: number;
  caption: CaptionPreviewState | null;
  onCaptionPos: (p: { x: number; y: number }) => void;
  onCaptionScale: (s: number) => void;
}) {
  const vertical = format === 'vertical';
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameW, setFrameW] = useState(0);

  // Track the rendered frame width so caption text scales to the same fraction
  // of the frame it will occupy in the full-res export.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const update = () => setFrameW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={frameRef}
      className={cn(
        'relative mx-auto flex overflow-hidden rounded-[14px] border border-border bg-base',
        vertical ? 'aspect-[9/16] w-[220px] flex-col' : 'aspect-[16/9] w-[440px] max-w-full flex-row',
      )}
    >
      <PreviewPanel label="Your video" src={productUrl} scale={productScale} share={splitRatio} />
      <PreviewPanel label="Background" src={backgroundUrl} scale={backgroundScale} share={1 - splitRatio} />
      {caption && frameW > 0 && (
        <CaptionOverlay
          format={format}
          preset={caption.preset}
          pos={caption.pos}
          scale={caption.scale}
          frameRef={frameRef}
          frameW={frameW}
          onPos={onCaptionPos}
          onScale={onCaptionScale}
        />
      )}
    </div>
  );
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Placeholder shown in the editor — real text is transcribed at render. */
const CAPTION_PLACEHOLDER = 'Your captions appear here';

/** CSS for the preview caption text, mirroring the ASS look as closely as the DOM allows. */
function captionTextStyle(preset: CaptionPreset, fontPx: number, pxPerUnit: number): React.CSSProperties {
  const base: React.CSSProperties = {
    fontFamily: `${preset.fontFamily}, system-ui, sans-serif`,
    fontWeight: preset.bold ? 800 : 500,
    fontSize: `${Math.max(7, fontPx)}px`,
    color: preset.textColor,
    textTransform: preset.uppercase ? 'uppercase' : 'none',
    lineHeight: 1.15,
  };
  if (preset.box) {
    return {
      ...base,
      backgroundColor: preset.outlineColor,
      padding: `${0.12 * fontPx}px ${0.28 * fontPx}px`,
      borderRadius: `${0.14 * fontPx}px`,
    };
  }
  return {
    ...base,
    WebkitTextStrokeWidth: `${preset.outlineWidth * pxPerUnit}px`,
    WebkitTextStrokeColor: preset.outlineColor,
    paintOrder: 'stroke fill',
    textShadow: `0 ${0.03 * fontPx}px ${0.06 * fontPx}px rgba(0,0,0,0.55)`,
  };
}

/**
 * Draggable + resizable caption placeholder layered over the preview. Drag the
 * block to set its normalized centre; drag the corner handle to scale the font.
 * Position/size flow back up and are sent with the render so the export matches.
 */
function CaptionOverlay({
  format,
  preset,
  pos,
  scale,
  frameRef,
  frameW,
  onPos,
  onScale,
}: {
  format: VideoFormat;
  preset: CaptionPreset;
  pos: { x: number; y: number };
  scale: number;
  frameRef: React.RefObject<HTMLDivElement>;
  frameW: number;
  onPos: (p: { x: number; y: number }) => void;
  onScale: (s: number) => void;
}) {
  const baseW = format === 'vertical' ? 1080 : 1920;
  const pxPerUnit = frameW / baseW; // full-res px → preview px
  const fontPx = CAPTION_BASE_FONT[format] * scale * pxPerUnit;
  const drag = useRef<{ mode: 'move' | 'resize'; startScale: number; startDist: number; cx: number; cy: number } | null>(
    null,
  );

  function beginMove(e: React.PointerEvent) {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode: 'move', startScale: scale, startDist: 0, cx: 0, cy: 0 };
  }
  function beginResize(e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const rect = frameRef.current!.getBoundingClientRect();
    const cx = rect.left + pos.x * rect.width;
    const cy = rect.top + pos.y * rect.height;
    const dist = Math.hypot(e.clientX - cx, e.clientY - cy) || 1;
    drag.current = { mode: 'resize', startScale: scale, startDist: dist, cx, cy };
  }
  function onMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const rect = frameRef.current!.getBoundingClientRect();
    if (d.mode === 'move') {
      onPos({
        x: clamp((e.clientX - rect.left) / rect.width, 0.06, 0.94),
        y: clamp((e.clientY - rect.top) / rect.height, 0.06, 0.94),
      });
    } else {
      const dist = Math.hypot(e.clientX - d.cx, e.clientY - d.cy);
      onScale(clamp(d.startScale * (dist / d.startDist), MIN_CAPTION_SCALE, MAX_CAPTION_SCALE));
    }
  }
  function end(e: React.PointerEvent) {
    drag.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* capture may already be released */
    }
  }

  return (
    <div
      className="absolute z-20 cursor-move touch-none select-none"
      style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, transform: 'translate(-50%, -50%)', maxWidth: '88%' }}
      onPointerDown={beginMove}
      onPointerMove={onMove}
      onPointerUp={end}
    >
      <span style={captionTextStyle(preset, fontPx, pxPerUnit)} className="block text-center">
        {CAPTION_PLACEHOLDER}
      </span>
      <span className="pointer-events-none absolute -inset-1.5 rounded-[5px] border border-dashed border-volt/70" />
      <span
        className="absolute -bottom-2 -right-2 h-3.5 w-3.5 cursor-nwse-resize touch-none rounded-full border-2 border-base bg-volt shadow"
        onPointerDown={beginResize}
        onPointerMove={onMove}
        onPointerUp={end}
        aria-label="Resize captions"
      />
    </div>
  );
}

/** Caption preset chips + a size slider; shown only when captions are on. */
function CaptionStylePicker({
  value,
  onChange,
  size,
  onSize,
}: {
  value: string;
  onChange: (id: string) => void;
  size: number;
  onSize: (s: number) => void;
}) {
  return (
    <div className="rounded-[14px] border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-[14px] text-t1">
          <Type className="h-4 w-4 text-t2" strokeWidth={1.5} /> Caption style
        </span>
        <span className="font-mono text-[12px] text-volt">{size.toFixed(2)}×</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {CAPTION_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-[12px] transition-colors',
              value === p.id ? 'border-volt bg-elevated' : 'border-border hover:border-t2',
            )}
          >
            <span
              style={{
                color: p.box ? '#FFFFFF' : p.textColor,
                fontWeight: p.bold ? 700 : 500,
                textTransform: p.uppercase ? 'uppercase' : 'none',
              }}
            >
              {p.label}
            </span>
          </button>
        ))}
      </div>
      <input
        type="range"
        min={MIN_CAPTION_SCALE}
        max={MAX_CAPTION_SCALE}
        step={0.05}
        value={size}
        onChange={(e) => onSize(Number(e.target.value))}
        className="mt-4 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-elevated accent-volt"
        aria-label="Caption size"
      />
      <div className="mt-1.5 flex justify-between font-mono text-[10px] uppercase tracking-wider text-t3">
        <span>Size</span>
        <span>Drag in preview to move</span>
      </div>
    </div>
  );
}

/** One panel of the preview — a cover-filled, zoomable looping video sized by `share`. */
function PreviewPanel({
  label,
  src,
  scale,
  share,
}: {
  label: string;
  src: string | undefined;
  scale: number;
  share: number;
}) {
  return (
    <div className="relative overflow-hidden" style={{ flexGrow: share, flexBasis: 0 }}>
      <span className="absolute inset-0 bg-gradient-to-br from-elevated to-base" />
      {src && (
        <video
          src={src}
          className="absolute inset-0 h-full w-full object-cover transition-transform"
          style={{ transform: `scale(${scale})` }}
          muted
          loop
          autoPlay
          playsInline
          preload="metadata"
        />
      )}
      <span className="absolute left-1.5 top-1.5 rounded-full bg-base/70 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-t2 backdrop-blur-sm">
        {label}
      </span>
    </div>
  );
}

/**
 * Split slider — sets the demo panel's share of the frame (its height in 9:16,
 * width in 16:9). The background takes the rest.
 */
function SplitSlider({
  format,
  value,
  onChange,
}: {
  format: VideoFormat;
  value: number;
  onChange: (v: number) => void;
}) {
  const vertical = format === 'vertical';
  const Icon = vertical ? MoveVertical : MoveHorizontal;
  const demoPct = Math.round(value * 100);
  return (
    <div className="rounded-[14px] border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-[14px] text-t1">
          <Icon className="h-4 w-4 text-t2" strokeWidth={1.5} /> Panel split
          <span className="text-[12px] text-t3">({vertical ? 'height' : 'width'})</span>
        </span>
        <span className="font-mono text-[12px] text-volt">
          {demoPct}% / {100 - demoPct}%
        </span>
      </div>
      <input
        type="range"
        min={MIN_SPLIT}
        max={MAX_SPLIT}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-elevated accent-volt"
        aria-label="Panel split"
      />
      <div className="mt-1.5 flex justify-between font-mono text-[10px] uppercase tracking-wider text-t3">
        <span>Demo</span>
        <span>Background</span>
      </div>
    </div>
  );
}

/** Labelled zoom slider (1×–2.5×) for a preview panel. */
function ZoomSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-[14px] border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-[14px] text-t1">
          <ZoomIn className="h-4 w-4 text-t2" strokeWidth={1.5} /> {label}
        </span>
        <span className="font-mono text-[12px] text-volt">{value.toFixed(2)}×</span>
      </div>
      <input
        type="range"
        min={MIN_SCALE}
        max={MAX_SCALE}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-elevated accent-volt"
        aria-label={label}
      />
    </div>
  );
}

function Section({
  step,
  title,
  aside,
  children,
}: {
  step: number;
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-3 font-syne text-[18px] font-semibold text-t1">
          <span className="grid h-6 w-6 place-items-center rounded-full border border-border font-mono text-[12px] text-t2">
            {step}
          </span>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function FormatChip({
  label,
  active,
  locked,
  onClick,
  onLocked,
}: {
  label: string;
  active: boolean;
  locked?: boolean;
  onClick: () => void;
  onLocked?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={locked ? onLocked : onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-4 py-1.5 font-mono text-[12px] transition-colors',
        active ? 'border-volt bg-elevated text-volt' : 'border-border text-t2 hover:border-t2',
        locked && 'opacity-50',
      )}
    >
      {locked && <Lock className="h-3 w-3" strokeWidth={1.5} />}
      {label}
    </button>
  );
}

function Toggle({
  icon: Icon,
  label,
  hint,
  checked,
  locked,
  comingSoon,
  onChange,
  onLocked,
}: {
  icon: typeof Layers;
  label: string;
  hint: string;
  checked: boolean;
  locked?: boolean;
  comingSoon?: boolean;
  onChange: () => void;
  onLocked?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={comingSoon ? undefined : locked ? onLocked : onChange}
      disabled={comingSoon}
      aria-disabled={comingSoon}
      className={cn(
        'flex items-center justify-between gap-3 rounded-[14px] border bg-card p-4 text-left transition-colors',
        checked && !locked && !comingSoon ? 'border-volt' : 'border-border',
        comingSoon
          ? 'cursor-default opacity-60'
          : locked
            ? 'opacity-60 hover:border-violet/50'
            : 'hover:border-border-strong',
      )}
    >
      <span className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-t2" strokeWidth={1.5} />
        <span>
          <span className="flex items-center gap-1.5 text-[14px] text-t1">
            {label}
            {locked && !comingSoon && <Lock className="h-3 w-3 text-t3" strokeWidth={1.5} />}
          </span>
          <span className="text-[12px] text-t3">{hint}</span>
        </span>
      </span>
      {comingSoon ? (
        <span className="shrink-0 whitespace-nowrap rounded-full border border-violet/40 bg-violet/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-violet">
          Coming soon
        </span>
      ) : (
        <span
          className={cn(
            'relative h-5 w-9 shrink-0 rounded-full transition-colors',
            checked && !locked ? 'bg-volt' : 'bg-elevated',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 h-4 w-4 rounded-full bg-base transition-transform',
              checked && !locked ? 'left-0.5 translate-x-4' : 'left-0.5',
            )}
          />
        </span>
      )}
    </button>
  );
}
