'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

interface QA {
  q: string;
  a: string;
}

const FAQS: QA[] = [
  {
    q: 'How long does it take to generate?',
    a: 'Typically under 60 seconds. Our cloud-rendering engine handles all the complex layering so you can get back to building.',
  },
  {
    q: 'Do you support landscape video?',
    a: 'Yes. While we specialize in 9:16 vertical content, Popular and Pro plans export in 16:9 for YouTube and LinkedIn too.',
  },
  {
    q: 'What happens if a render fails?',
    a: "We refund the credit instantly and log it — you're never charged for a video that didn't finish.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <div className="space-y-4">
      {FAQS.map((item, i) => {
        const isOpen = open === i;
        return (
          <div
            key={item.q}
            className={cn(
              'glass-panel cursor-pointer overflow-hidden rounded-xl transition-colors',
              isOpen ? 'border-volt' : 'hover:border-border-strong',
            )}
          >
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? -1 : i)}
              className="flex w-full items-center justify-between gap-6 p-6 text-left"
            >
              <span className="flex items-center gap-6">
                <span className="font-mono text-[12px] tracking-wide text-t3">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="font-bold text-t1">{item.q}</span>
              </span>
              <ChevronDown
                className={cn(
                  'h-5 w-5 shrink-0 transition-transform',
                  isOpen ? 'rotate-180 text-volt' : 'text-t2',
                )}
                strokeWidth={1.5}
              />
            </button>
            <div
              className={cn(
                'grid transition-all duration-300',
                isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
              )}
            >
              <div className="overflow-hidden">
                <p className="px-6 pb-6 pl-[3.4rem] text-t2">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
