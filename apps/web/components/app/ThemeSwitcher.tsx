'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Theme switcher — sets `data-theme` on <html> and persists the choice.
 * Maps to the three CSS-variable themes in globals.css (studio = :root default).
 */
const THEMES = [
  { id: 'studio', label: 'Studio Dark', swatch: 'bg-[#09090B]' },
  { id: 'daylight', label: 'Daylight', swatch: 'bg-[#F4F4F6]' },
  { id: 'hypergloss', label: 'Hypergloss', swatch: 'bg-gradient-to-br from-violet to-cyan' },
] as const;

type ThemeId = (typeof THEMES)[number]['id'];
const STORAGE_KEY = 'rotpitch-theme';

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeId>('studio');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    if (stored) setTheme(stored);
  }, []);

  function apply(id: ThemeId) {
    setTheme(id);
    document.documentElement.dataset.theme = id;
    window.localStorage.setItem(STORAGE_KEY, id);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {THEMES.map((t) => {
        const active = theme === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => apply(t.id)}
            className={cn(
              'flex items-center gap-3 rounded-md border p-3 text-left transition-colors',
              active ? 'border-volt bg-elevated' : 'border-border hover:border-border-strong',
            )}
          >
            <span className={cn('h-8 w-8 shrink-0 rounded-md border border-border', t.swatch)} />
            <span className="flex-1 text-[14px] text-t1">{t.label}</span>
            {active && <Check className="h-4 w-4 text-volt" strokeWidth={2} />}
          </button>
        );
      })}
    </div>
  );
}
