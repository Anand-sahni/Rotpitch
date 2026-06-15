import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingNav } from '@/components/marketing/MarketingNav';

/**
 * Chrome for standalone marketing pages (legal, contact). Same fixed nav +
 * footer as the landing page; `pt-[92px]` clears the fixed ticker + nav.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-dm">
      <MarketingNav />
      <main className="min-h-[calc(100vh-92px)] pt-[92px]">{children}</main>
      <MarketingFooter />
    </div>
  );
}
