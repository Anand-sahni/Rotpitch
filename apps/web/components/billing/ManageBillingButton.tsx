'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { openBillingPortal } from '@/lib/api';

/**
 * Opens the Dodo hosted Customer Portal (change plan / payment method / cancel /
 * invoices). Shown only to users who already have a billing account.
 */
export function ManageBillingButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    setError(null);
    setLoading(true);
    try {
      const { url } = await openBillingPortal();
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <button
        type="button"
        onClick={handle}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 font-mono text-[12px] font-bold uppercase tracking-wide text-t1 transition hover:border-border-strong disabled:opacity-60"
      >
        <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
        {loading ? 'Opening…' : 'Manage billing'}
      </button>
      {error && <p className="font-mono text-[11px] text-error">{error}</p>}
    </div>
  );
}
