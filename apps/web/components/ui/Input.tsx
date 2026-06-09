import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type InputProps = InputHTMLAttributes<HTMLInputElement>;

/** Sits on the base color; border turns volt on focus + soft focus ring. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-11 w-full rounded-sm bg-base px-[15px] font-ui text-[14px] text-t1',
        'border border-border-strong placeholder:text-t3 outline-none',
        'transition-shadow focus:border-volt focus:shadow-[0_0_0_3px_var(--volt-dim)]',
        className,
      )}
      {...props}
    />
  );
});
