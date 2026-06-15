import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, LifeBuoy, CreditCard, Handshake, Mail } from 'lucide-react';
import { SUPPORT_EMAIL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contact — RotPitch',
  description: `Get in touch with the RotPitch team at ${SUPPORT_EMAIL}.`,
};

const TOPICS = [
  {
    icon: LifeBuoy,
    title: 'Support',
    body: 'A render misbehaved, a credit looks off, or something just broke. Tell us what you saw.',
    subject: 'Support request',
  },
  {
    icon: CreditCard,
    title: 'Billing',
    body: 'Plans, invoices, refunds, or anything about credits and your subscription.',
    subject: 'Billing question',
  },
  {
    icon: Handshake,
    title: 'Partnerships & press',
    body: 'Collabs, affiliates, press, or you just want to say the demo worked. We read all of it.',
    subject: 'Partnership / press',
  },
] as const;

function mailto(subject?: string) {
  return subject
    ? `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`[RotPitch] ${subject}`)}`
    : `mailto:${SUPPORT_EMAIL}`;
}

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-[920px] px-6 py-20">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-t3">
        <span className="text-volt">contact / say_hello</span>
      </p>
      <h1 className="mt-4 font-syne text-[clamp(2.4rem,5.5vw,4rem)] font-extrabold leading-[1.02] tracking-[-0.02em] text-t1">
        Talk to a human.
      </h1>
      <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-t2">
        No ticket maze, no bot. One inbox, read by the people who built RotPitch. Whatever it is —
        a bug, a bill, or a big idea — it lands in the same place.
      </p>

      {/* the focal email card */}
      <div className="mt-10 overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex flex-col gap-6 p-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-t3">
              <Mail className="h-4 w-4 text-volt" strokeWidth={1.5} />
              email us
            </div>
            <a
              href={mailto()}
              className="mt-2 block font-mono text-2xl text-t1 transition-colors hover:text-volt sm:text-3xl"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>
          <a
            href={mailto()}
            className="signal-gradient inline-flex shrink-0 items-center gap-2 self-start rounded-md px-6 py-3.5 font-syne font-bold tracking-tight text-black transition-shadow hover:shadow-[0_0_30px_rgba(203,255,61,0.3)] sm:self-auto"
          >
            Compose an email <ArrowRight className="h-5 w-5" strokeWidth={2} />
          </a>
        </div>
        <p className="border-t border-border px-8 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-t4">
          typical reply: within 1 business day
        </p>
      </div>

      {/* what to reach out about */}
      <div className="mt-12 grid gap-5 sm:grid-cols-3">
        {TOPICS.map((topic) => (
          <a
            key={topic.title}
            href={mailto(topic.subject)}
            className="group flex flex-col rounded-lg border border-border bg-surface p-6 transition-colors hover:border-volt/50"
          >
            <topic.icon className="h-6 w-6 text-t2 transition-colors group-hover:text-volt" strokeWidth={1.5} />
            <h2 className="mt-4 font-syne text-lg font-bold tracking-tight text-t1">{topic.title}</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-t2">{topic.body}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-t3 transition-colors group-hover:text-volt">
              email about this <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
            </span>
          </a>
        ))}
      </div>

      {/* closing nudge */}
      <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-8 sm:flex-row sm:items-center">
        <p className="max-w-[44ch] text-t2">
          Not a question — just want to try it? Your first render is free, no card required.
        </p>
        <Link
          href="/signup"
          className="rounded-md border border-border-strong px-6 py-3 font-syne font-bold tracking-tight text-t1 transition-colors hover:border-volt hover:text-volt"
        >
          Start free
        </Link>
      </div>
    </div>
  );
}
