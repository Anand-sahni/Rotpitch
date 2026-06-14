'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';

interface QA {
  q: string;
  a: string;
}

const FAQS: QA[] = [
  {
    q: 'Is this just CapCut with extra steps?',
    a: "No — it's CapCut with no steps. There is no timeline, no keyframes, no font shopping. Upload a demo, pick a background, render. That's the entire interface, and that's the point.",
  },
  {
    q: 'How long does a render take?',
    a: 'Under 60 seconds, typically around 8. Your clip goes through the same pipeline every time: probed, queued, composited, captioned, shipped.',
  },
  {
    q: 'What happens if a render fails?',
    a: "The credit refunds itself automatically and the failure is logged with a reason you can read. You're never charged for a video that didn't finish.",
  },
  {
    q: 'Why is there a watermark on the free plan?',
    a: "It's our growth hack. You understand. Every paid plan removes it entirely.",
  },
  {
    q: 'Do you support landscape 16:9?',
    a: 'Yes — Popular and Pro export 16:9 for YouTube and LinkedIn alongside the default 9:16 vertical. Free and Basic are vertical-only.',
  },
  {
    q: 'When is AI voiceover coming?',
    a: "Soon, and we won't promise a date. It narrates your video's own transcript in a studio-grade AI voice — no script writing, no microphone.",
  },
];

/**
 * Debrief: the FAQ as a terminal log — mono Q_xx indices, hairline dividers,
 * no card chrome. The arrow prefix rotates when a row is open.
 */
export function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <div className="border-t border-border">
      {FAQS.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className="border-b border-border">
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? -1 : i)}
              className="flex w-full items-baseline gap-4 py-5 text-left"
            >
              <span
                className={cn(
                  'shrink-0 font-mono text-[12px] tracking-wide transition-colors',
                  isOpen ? 'text-volt' : 'text-t4',
                )}
              >
                Q_{String(i + 1).padStart(2, '0')}
              </span>
              <span
                aria-hidden
                className={cn(
                  'inline-block shrink-0 font-mono text-[12px] transition-transform duration-200',
                  isOpen ? 'rotate-90 text-volt' : 'text-t4',
                )}
              >
                →
              </span>
              <span className="flex-1 font-medium text-t1">{item.q}</span>
            </button>
            <div
              className={cn(
                'grid transition-all duration-200',
                isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
              )}
            >
              <div className="overflow-hidden">
                <p className="max-w-[60ch] pb-6 pl-[4.6rem] pr-4 text-t2">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
