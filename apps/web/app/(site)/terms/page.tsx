import type { Metadata } from 'next';
import { LegalDoc, LegalSection, LegalList } from '@/components/marketing/LegalDoc';
import { LEGAL_UPDATED, SUPPORT_EMAIL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Terms of Service — RotPitch',
  description: 'The terms that govern your use of RotPitch.',
};

function Mail() {
  return (
    <a href={`mailto:${SUPPORT_EMAIL}`} className="text-volt underline-offset-4 hover:underline">
      {SUPPORT_EMAIL}
    </a>
  );
}

export default function TermsPage() {
  return (
    <LegalDoc
      kicker="legal / terms_of_service"
      title="Terms of service."
      updated={LEGAL_UPDATED}
      intro={
        <>
          These terms govern your use of RotPitch. By creating an account or rendering a video, you
          agree to them. We&rsquo;ve kept them readable — but they are a binding agreement, so please
          read them.
        </>
      }
    >
      <LegalSection n={1} title="Acceptance">
        <p>
          By accessing or using RotPitch, you agree to these Terms and to our Privacy Policy. If you
          don&rsquo;t agree, don&rsquo;t use the service.
        </p>
      </LegalSection>

      <LegalSection n={2} title="The service">
        <p>
          RotPitch takes a product demo you upload, composites it with a background, optionally burns
          in captions, and exports a short-form video. It&rsquo;s a rendering tool — not a video
          editor — and features may be added, changed, or removed over time.
        </p>
      </LegalSection>

      <LegalSection n={3} title="Your account">
        <p>
          You&rsquo;re responsible for your account, for keeping your credentials secure, and for the
          activity that happens under it. Provide accurate information and keep it current.
        </p>
      </LegalSection>

      <LegalSection n={4} title="Credits & plans">
        <LegalList
          items={[
            'One credit renders one video — whether a single generate or a batch slot, the cost is the same.',
            'Auto Generate (2–5 variants) deducts all credits upfront before rendering; a batch is blocked entirely if your balance can’t cover it.',
            'If a render fails, that credit is automatically refunded to your balance and the failure is logged.',
            'Paid credits reset each billing cycle and do not roll over. The free plan’s single credit never expires.',
          ]}
        />
      </LegalSection>

      <LegalSection n={5} title="Billing">
        <p>Paid plans are subscriptions billed through Dodo Payments, our Merchant of Record:</p>
        <LegalList
          items={[
            'New subscriptions add credits immediately and start your billing cycle.',
            'Upgrades take effect immediately and top your balance to the new plan amount.',
            'Downgrades take effect at the end of the current billing cycle.',
            'Cancellation keeps access until the end of the current cycle, after which you drop to the Free plan.',
            'Renewals replace your old credits with fresh plan credits (no rollover). A failed payment has a short grace period before the subscription is suspended.',
          ]}
        />
      </LegalSection>

      <LegalSection n={6} title="Your content & ownership">
        <p>
          You keep ownership of the videos you upload and the outputs we render for you. You grant us
          a limited license to store, process, and transmit your content solely to operate the
          service and deliver your videos. You confirm you have the rights to everything you upload
          and that it doesn&rsquo;t infringe anyone else&rsquo;s rights.
        </p>
      </LegalSection>

      <LegalSection n={7} title="Acceptable use">
        <p>You agree not to use RotPitch to:</p>
        <LegalList
          items={[
            'Upload or create content that is unlawful, infringing, deceptive, hateful, or sexually exploitative.',
            'Violate anyone’s intellectual property, privacy, or publicity rights.',
            'Abuse, overload, reverse-engineer, or attempt to circumvent the service, its limits, or its security.',
            'Resell or redistribute the service without our written permission.',
          ]}
        />
      </LegalSection>

      <LegalSection n={8} title="Free plan watermark">
        <p>
          Videos rendered on the Free plan include a RotPitch watermark. Every paid plan removes it.
        </p>
      </LegalSection>

      <LegalSection n={9} title="Availability & beta features">
        <p>
          We work to keep RotPitch available but don&rsquo;t guarantee uninterrupted service. Some
          features are clearly labelled &ldquo;coming soon&rdquo; or beta and may change or not ship;
          don&rsquo;t rely on them for anything critical.
        </p>
      </LegalSection>

      <LegalSection n={10} title="Disclaimers">
        <p>
          The service is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without
          warranties of any kind to the fullest extent permitted by law. We don&rsquo;t warrant that
          renders will be error-free or that the service will meet every requirement.
        </p>
      </LegalSection>

      <LegalSection n={11} title="Limitation of liability">
        <p>
          To the maximum extent permitted by law, RotPitch is not liable for indirect, incidental, or
          consequential damages. Our total liability for any claim is limited to the amount you paid
          us in the three months before the claim arose.
        </p>
      </LegalSection>

      <LegalSection n={12} title="Termination">
        <p>
          You can stop using RotPitch and delete your account at any time. We may suspend or terminate
          access if you breach these Terms or misuse the service.
        </p>
      </LegalSection>

      <LegalSection n={13} title="Changes & contact">
        <p>
          We may update these Terms as the product evolves; we&rsquo;ll update the
          &ldquo;last_updated&rdquo; date and flag material changes. Questions? Email <Mail />.
        </p>
      </LegalSection>
    </LegalDoc>
  );
}
