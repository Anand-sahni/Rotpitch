import type { ReactNode } from 'react';

/**
 * Shared layout + typographic primitives for legal docs (/privacy, /terms).
 * Keeps both pages on the same grid, type scale, and theme tokens — Syne for
 * the title and section heads, DM Sans body, mono for the metadata furniture.
 */

export function LegalDoc({
  kicker,
  title,
  updated,
  intro,
  children,
}: {
  kicker: string;
  title: string;
  updated: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-[820px] px-6 py-20">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-t3">
        <span className="text-volt">{kicker}</span>
      </p>
      <h1 className="mt-4 font-syne text-[clamp(2.2rem,5vw,3.5rem)] font-extrabold leading-[1.02] tracking-[-0.02em] text-t1">
        {title}
      </h1>
      <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-t4">
        last_updated: {updated}
      </p>
      <p className="mt-6 max-w-[62ch] text-lg leading-relaxed text-t2">{intro}</p>
      <div className="mt-12 space-y-10">{children}</div>
    </article>
  );
}

export function LegalSection({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-border pt-8">
      <h2 className="flex items-baseline gap-3 font-syne text-xl font-bold tracking-tight text-t1">
        <span className="font-mono text-[12px] text-volt">
          {String(n).padStart(2, '0')}
        </span>
        {title}
      </h2>
      <div className="mt-4 space-y-4 leading-relaxed text-t2">{children}</div>
    </section>
  );
}

/** Bulleted list with volt markers, matching the brand accent. */
export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2 pl-5 [list-style:disc] marker:text-volt">
      {items.map((item, i) => (
        <li key={i} className="pl-1">
          {item}
        </li>
      ))}
    </ul>
  );
}
