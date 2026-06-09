import { Zap } from 'lucide-react';
import { cn } from '@/lib/cn';

interface CreditPillProps {
  credits: number;
  className?: string;
}

/** Mono credit counter pill — the canonical metadata treatment. */
export function CreditPill({ credits, className }: CreditPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-card',
        'px-3 py-1 font-mono text-[12px] tracking-wide text-volt',
        className,
      )}
    >
      <Zap size={13} strokeWidth={1.5} className="text-volt" />
      {credits} {credits === 1 ? 'credit' : 'credits'}
    </span>
  );
}
