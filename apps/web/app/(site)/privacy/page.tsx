import type { Metadata } from 'next';
import { LegalDoc, LegalSection, LegalList } from '@/components/marketing/LegalDoc';
import { LEGAL_UPDATED, SUPPORT_EMAIL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacy Policy — RotPitch',
  description: 'How RotPitch collects, uses, stores, and protects your data.',
};

function Mail() {
  return (
    <a href={`mailto:${SUPPORT_EMAIL}`} className="text-volt underline-offset-4 hover:underline">
      {SUPPORT_EMAIL}
    </a>
  );
}

export default function PrivacyPage() {
  return (
    <LegalDoc
      kicker="legal / privacy_policy"
      title="Privacy policy."
      updated={LEGAL_UPDATED}
      intro={
        <>
          RotPitch turns your product demos into short-form video. To do that we handle a small
          amount of your data — your account details and the footage you upload. This policy explains
          exactly what we collect, why, and who touches it. Plain language, no dark patterns.
        </>
      }
    >
      <LegalSection n={1} title="Who we are">
        <p>
          RotPitch (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates the RotPitch web application and the
          rendering service behind it. If you have any question about this policy or your data, reach
          us at <Mail />.
        </p>
      </LegalSection>

      <LegalSection n={2} title="What we collect">
        <LegalList
          items={[
            <>
              <strong className="text-t1">Account data</strong> — your email address and
              authentication identifiers when you sign up (including via Google sign-in).
            </>,
            <>
              <strong className="text-t1">Content you upload</strong> — the demo videos you submit,
              the backgrounds you choose, and the finished videos we render for you.
            </>,
            <>
              <strong className="text-t1">Usage &amp; technical data</strong> — render history,
              credit transactions, and basic logs (timestamps, error reasons, approximate request
              metadata) needed to operate and debug the service.
            </>,
            <>
              <strong className="text-t1">Payment data</strong> — handled by our payment processors.
              We never see or store your full card or bank details; we only receive a subscription
              status and a processor reference.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection n={3} title="How we use your data">
        <LegalList
          items={[
            'To render your videos — compositing, captioning, and delivering the output you asked for.',
            'To run your account — authentication, your credit balance, and your render library.',
            'To process subscriptions, apply credits, and issue automatic refunds on failed renders.',
            'To keep the service secure, diagnose failures, and prevent abuse.',
          ]}
        />
        <p>We do not sell your data, and we do not use your uploaded videos to train any model.</p>
      </LegalSection>

      <LegalSection n={4} title="Processors we rely on">
        <p>
          We use a small set of trusted infrastructure providers. Your data is shared with them only
          to the extent needed to deliver the service:
        </p>
        <LegalList
          items={[
            <>
              <strong className="text-t1">Supabase</strong> — database, authentication, and storage
              for your account and uploaded files.
            </>,
            <>
              <strong className="text-t1">Amazon Web Services (S3)</strong> — storage and delivery of
              your finished videos via short-lived, signed links.
            </>,
            <>
              <strong className="text-t1">OpenAI</strong> — transcription of your demo&rsquo;s audio
              for auto-captions, when you enable them.
            </>,
            <>
              <strong className="text-t1">Dodo Payments</strong> — our Merchant of Record for
              payment processing on paid plans.
            </>,
            <>
              <strong className="text-t1">Vercel</strong> — hosting of the web application.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection n={5} title="Cookies & sessions">
        <p>
          We use cookies only to keep you signed in and to maintain your session. We don&rsquo;t use
          advertising or cross-site tracking cookies.
        </p>
      </LegalSection>

      <LegalSection n={6} title="Retention">
        <p>
          We keep your uploaded videos and rendered outputs while your account is active so they stay
          available in your library. When you delete a video it is removed from your library; when you
          delete your account we remove your personal data and content, except where we must retain
          limited records (for example, billing history) to meet legal obligations.
        </p>
      </LegalSection>

      <LegalSection n={7} title="Your rights">
        <p>
          You can access, export, correct, or delete your data at any time from your account settings
          or by emailing <Mail />. We&rsquo;ll respond within a reasonable period.
        </p>
      </LegalSection>

      <LegalSection n={8} title="Children">
        <p>
          RotPitch is not intended for anyone under 16. We don&rsquo;t knowingly collect data from
          children; if you believe a child has used the service, contact us and we&rsquo;ll remove the
          data.
        </p>
      </LegalSection>

      <LegalSection n={9} title="Changes to this policy">
        <p>
          We may update this policy as the product evolves. We&rsquo;ll change the
          &ldquo;last_updated&rdquo; date above and, for material changes, notify you in-app or by
          email.
        </p>
      </LegalSection>

      <LegalSection n={10} title="Contact">
        <p>
          Questions about your privacy or this policy? Email <Mail /> and a human will reply.
        </p>
      </LegalSection>
    </LegalDoc>
  );
}
