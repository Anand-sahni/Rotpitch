import { Brand } from '@/components/Brand';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { CreditPill } from '@/components/ui/CreditPill';

export const metadata = { title: 'Theme check · RotPitch' };

const SWATCHES: Array<{ name: string; var: string }> = [
  { name: 'base', var: '--bg-base' },
  { name: 'surface', var: '--bg-surface' },
  { name: 'card', var: '--bg-card' },
  { name: 'elevated', var: '--bg-elevated' },
  { name: 'border', var: '--border' },
  { name: 'volt', var: '--volt' },
  { name: 'violet', var: '--violet' },
  { name: 'magenta', var: '--magenta' },
  { name: 'cyan', var: '--cyan' },
  { name: 'success', var: '--success' },
  { name: 'warning', var: '--warning' },
  { name: 'error', var: '--error' },
  { name: 'info', var: '--info' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border py-10">
      <h2 className="mb-5 font-mono text-[11px] uppercase tracking-[0.14em] text-t3">{title}</h2>
      {children}
    </section>
  );
}

/** Primitive diffing surface — compare against Stitch screens once available. */
export default function ThemeCheckPage() {
  return (
    <main className="mx-auto max-w-[920px] px-6 py-14">
      <div className="flex items-center justify-between">
        <Brand />
        <span className="font-mono text-[11px] text-t3">design-system v1 · baseline tokens</span>
      </div>
      <h1 className="mt-8 font-display text-[40px] font-semibold tracking-tight">
        Core primitives
      </h1>
      <p className="mt-2 text-t2">
        Signal-gradient button + glow, volt focus-ring input, card, mono credit pill.
      </p>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Generate ⚡</Button>
          <Button variant="nebula">Upgrade to Pro</Button>
          <Button variant="ghost">Cancel</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large CTA →</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>

      <Section title="Input (focus to see volt ring)">
        <div className="max-w-[340px]">
          <Input placeholder="Name your video…" />
        </div>
      </Section>

      <Section title="Card">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <h3 className="font-display text-[16px] font-semibold">Zero editing</h3>
            <p className="mt-1 text-[14px] text-t2">
              No timeline, no cutting. The full video is composed automatically.
            </p>
          </Card>
          <Card>
            <h3 className="font-display text-[16px] font-semibold">Built-in retention</h3>
            <p className="mt-1 text-[14px] text-t2">
              Split-screen background content lifts watch time and completion.
            </p>
          </Card>
        </div>
      </Section>

      <Section title="Credit pill (mono)">
        <div className="flex flex-wrap items-center gap-3">
          <CreditPill credits={1} />
          <CreditPill credits={40} />
          <CreditPill credits={100} />
        </div>
      </Section>

      <Section title="Gradients">
        <div className="grid gap-4 sm:grid-cols-3">
          {(
            [
              { name: 'signal', cls: 'bg-signal' },
              { name: 'nebula', cls: 'bg-nebula' },
              { name: 'aurora', cls: 'bg-aurora' },
            ] as const
          ).map((g) => (
            <div key={g.name} className="overflow-hidden rounded-lg border border-border">
              <div className={`h-24 ${g.cls}`} />
              <div className="bg-card px-4 py-3 font-mono text-[11px] capitalize text-t2">
                {g.name}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Color tokens">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SWATCHES.map((s) => (
            <div key={s.name} className="overflow-hidden rounded-md border border-border bg-card">
              <div className="h-16" style={{ background: `var(${s.var})` }} />
              <div className="px-3 py-2">
                <div className="text-[13px] font-bold text-t1">{s.name}</div>
                <div className="font-mono text-[11px] text-t3">{s.var}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="space-y-3">
          <p className="font-display text-[40px] font-semibold tracking-tight">Go viral in seconds.</p>
          <p className="font-ui text-[20px] font-black">Upload. Generate. Post.</p>
          <p className="font-mono text-[18px] text-volt">42 credits · 9:16 · 00:48</p>
        </div>
      </Section>
    </main>
  );
}
