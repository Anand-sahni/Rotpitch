import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'nebula' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const base =
  'inline-flex items-center justify-center gap-2 font-ui font-bold tracking-tight rounded-sm ' +
  'transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-base';

const variants: Record<Variant, string> = {
  // Signal gradient + soft volt glow; subtle -1px lift on hover.
  primary: 'bg-signal text-[#0a0a0a] shadow-glow hover:-translate-y-px hover:brightness-105',
  nebula: 'bg-nebula text-[#0a0a0a] hover:-translate-y-px hover:brightness-105',
  ghost: 'bg-elevated text-t1 border border-border-strong hover:border-volt hover:text-volt',
};

const sizes: Record<Size, string> = {
  sm: 'h-[34px] px-4 text-[13px]',
  md: 'h-11 px-[22px] text-[15px]',
  lg: 'h-[52px] px-7 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className, ...props },
  ref,
) {
  return (
    <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props} />
  );
});
