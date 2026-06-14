/**
 * Mini 9:16 frame demoing burned-in captions: three caption lines rotate on a
 * shared 9s clock with per-word stagger (rp-cap-word in globals.css — pure
 * CSS, no JS). Under reduced-motion only the first line shows, fully rendered.
 */

const LINES = [
  ['UPLOAD', 'YOUR', 'DEMO'],
  ['PICK', 'YOUR', 'POISON'],
  ['POST.', 'GO', 'VIRAL.'],
];

const LINE_OFFSET_S = 3; // each line owns a 3s window of the 9s cycle
const WORD_STAGGER_S = 0.14;

export function CaptionLoop() {
  return (
    <div className="relative mx-auto aspect-[9/16] h-full max-h-[340px] overflow-hidden rounded-lg border border-border bg-base">
      {/* top: product wireframe */}
      <div className="absolute inset-x-0 top-0 h-1/2 border-b border-border bg-elevated/50 p-3">
        <div className="grid h-full grid-cols-3 content-start gap-2 opacity-60">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-5 rounded-xs bg-card" />
          ))}
        </div>
      </div>
      {/* bottom: rot stripes */}
      <div
        className="rp-par-a absolute inset-x-0 bottom-0 h-1/2"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, rgba(61,240,200,0.18) 0 14px, transparent 14px 60px)',
          backgroundSize: '1280px 100%',
        }}
      />
      {/* burned captions cycling at the seam */}
      <div aria-hidden className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center">
        {LINES.map((words, lineIdx) => (
          <div key={lineIdx} className="rp-cap-line absolute inset-x-0 -translate-y-1/2">
            {words.map((word, wordIdx) => (
              <span
                key={word}
                className="rp-cap-word rp-burned mx-1 font-syne text-[26px] font-extrabold uppercase"
                style={{
                  ['--d' as string]: `${lineIdx * LINE_OFFSET_S + wordIdx * WORD_STAGGER_S}s`,
                }}
              >
                {word}
              </span>
            ))}
          </div>
        ))}
      </div>
      <span className="absolute bottom-2 left-2 rounded-xs bg-black/55 px-1.5 py-0.5 font-mono text-[10px] lowercase text-volt">
        captions: burned_in (libass)
      </span>
    </div>
  );
}
