import type { Metadata } from "next"
import { LegalShell, LegalSection } from "@/components/marketing/LegalShell"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How CarouseLabs collects, uses, and protects your data.",
}

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy Policy"
      updated="September 19, 2026"
      intro="This Privacy Policy explains what information CarouseLabs (“we,” “us,” “our”) collects, how we use and share it, and the choices and rights you have. We aim to collect only what we need to operate the Service and to keep your data secure. By using CarouseLabs, you agree to the practices described here."
    >
      <LegalSection heading="1. Information we collect">
        <p>We collect the following categories of information:</p>
        <ul className="flex flex-col gap-2 pl-5 list-disc marker:text-[#1A1A1A]">
          <li>
            <span className="text-[#0A0A0A] font-medium">Account information</span> — your name, email
            address, and authentication identifiers, provided when you sign up and managed through our
            authentication provider.
          </li>
          <li>
            <span className="text-[#0A0A0A] font-medium">Profile and content data</span> — your niche,
            target audience, content pillars, tone and writing preferences, and the ideas, captions,
            breakdowns, and carousels you generate or upload.
          </li>
          <li>
            <span className="text-[#0A0A0A] font-medium">Payment information</span> — subscription status,
            plan, billing history, and payment metadata. Full card details are collected and processed
            by our payment processor and are never stored on our servers.
          </li>
          <li>
            <span className="text-[#0A0A0A] font-medium">Usage and device data</span> — log data, IP
            address, browser and device type, pages viewed, and feature interactions, collected
            automatically for security, analytics, and improvement.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="2. How we use information">
        <p>We use the information we collect to:</p>
        <ul className="flex flex-col gap-2 pl-5 list-disc marker:text-[#1A1A1A]">
          <li>Provide, operate, personalize, and maintain the Service.</li>
          <li>Generate AI content tailored to your brand profile and inputs.</li>
          <li>Process payments, manage subscriptions and credits, and send service-related emails.</li>
          <li>Detect, investigate, and prevent fraud, abuse, and security incidents.</li>
          <li>Analyze usage to improve features, reliability, and performance.</li>
          <li>Comply with legal obligations and enforce our Terms & Conditions.</li>
        </ul>
        <p>
          We do not sell your personal information, and we do not use the private content you generate
          to train our own models.
        </p>
      </LegalSection>

      <LegalSection heading="3. Third-party services">
        <p>
          We rely on the following trusted providers to deliver the Service. Each processes data only
          as needed for its function and is bound by its own privacy and security commitments:
        </p>
        <ul className="flex flex-col gap-2 pl-5 list-disc marker:text-[#1A1A1A]">
          <li>
            <span className="text-[#0A0A0A] font-medium">Clerk</span> — authentication, sign-up/sign-in,
            and account-session management.
          </li>
          <li>
            <span className="text-[#0A0A0A] font-medium">Razorpay</span> — payment processing for
            subscriptions and one-time purchases.
          </li>
          <li>
            <span className="text-[#0A0A0A] font-medium">Anthropic and OpenAI</span> — AI models that
            generate text (ideas, captions, breakdowns) and images (carousels) from your inputs.
          </li>
          <li>
            <span className="text-[#0A0A0A] font-medium">Cloudflare R2</span> — secure cloud storage for
            generated images and assets.
          </li>
          <li>
            <span className="text-[#0A0A0A] font-medium">Resend</span> — delivery of transactional and
            support emails.
          </li>
        </ul>
        <p>
          When you generate content, the relevant inputs are sent to the applicable AI provider to
          produce your output. We encourage you to review those providers&apos; privacy policies for
          details on their handling of data.
        </p>
      </LegalSection>

      <LegalSection heading="4. Cookies">
        <p>
          We use cookies and similar technologies to keep you signed in, remember your preferences,
          secure your session, and understand how the Service is used. Essential cookies are required
          for core functionality. You can control non-essential cookies through your browser settings,
          though disabling some cookies may affect how the Service works.
        </p>
      </LegalSection>

      <LegalSection heading="5. Data retention">
        <p>
          We retain your personal information for as long as your account is active or as needed to
          provide the Service. When you delete your account, we delete or anonymize your personal data
          within a reasonable period, except where we are required to retain certain information for
          legal, tax, accounting, or security purposes. Backup copies may persist for a limited time
          before being overwritten.
        </p>
      </LegalSection>

      <LegalSection heading="6. Your rights">
        <p>
          You have meaningful control over your data. Depending on your location, you may have the
          right to:
        </p>
        <ul className="flex flex-col gap-2 pl-5 list-disc marker:text-[#1A1A1A]">
          <li>
            <span className="text-[#0A0A0A] font-medium">Delete your account</span> and associated personal
            data, at any time from your settings or by contacting us.
          </li>
          <li>
            <span className="text-[#0A0A0A] font-medium">Export your data</span> — request a copy of the
            personal information and generated content associated with your account.
          </li>
          <li>Access, correct, or update inaccurate information.</li>
          <li>Object to or restrict certain processing, and withdraw consent where applicable.</li>
        </ul>
        <p>
          To exercise any of these rights, email us at support@carouselabs.com from your account
          address and we will respond within a reasonable timeframe.
        </p>
      </LegalSection>

      <LegalSection heading="7. Children's privacy">
        <p>
          CarouseLabs is not directed to children under 13, and we do not knowingly collect personal
          information from anyone under 13. Users must also meet the minimum age required to enter into
          our Terms & Conditions. If you believe a child under 13 has provided us personal information,
          contact us and we will promptly delete it.
        </p>
      </LegalSection>

      <LegalSection heading="8. Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. We will revise the “Last updated” date
          above and, for material changes, provide additional notice where appropriate. Your continued
          use of the Service after changes take effect constitutes acceptance of the updated policy.
        </p>
      </LegalSection>

      <LegalSection heading="9. Browser Extension (CarouseLabs Ideas Board)">
        <p>If you install our Chrome browser extension, additional data practices apply:</p>
        <ul className="flex flex-col gap-2 pl-5 list-disc marker:text-[#1A1A1A]">
          <li>
            <span className="text-[#0A0A0A] font-medium">Extension API Key</span> — the extension
            stores a unique authentication key (generated from your CarouseLabs account settings)
            locally in your browser, used solely to identify your account when saving content.
          </li>
          <li>
            <span className="text-[#0A0A0A] font-medium">Captured content</span> — when you right-click
            and choose to save an image, link, or selected text from a webpage, that specific content
            and its source URL are sent to CarouseLabs and stored in your Ideas Board, associated with
            your account.
          </li>
          <li>
            <span className="text-[#0A0A0A] font-medium">No automatic browsing tracking</span> — the
            extension does not monitor your general browsing activity, history, or any page content
            beyond what you explicitly choose to save via the right-click menu.
          </li>
          <li>
            <span className="text-[#0A0A0A] font-medium">No third-party sharing</span> — captured
            content is used solely to populate your personal Ideas Board within CarouseLabs and is
            never sold or shared with third parties.
          </li>
          <li>
            <span className="text-[#0A0A0A] font-medium">Your control</span> — you can delete any saved
            item from your Ideas Board at any time, and revoke or regenerate your Extension API Key from
            your account settings, which immediately disconnects the extension from your account.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="10. Browser Extension (CarouseLabs Comment)">
        <p>
          If you install our LinkedIn commenting extension, the following additional practices
          apply:
        </p>
        <ul className="flex flex-col gap-2 pl-5 list-disc marker:text-[#1A1A1A]">
          <li>
            <span className="text-[#0A0A0A] font-medium">Extension token</span> — signing in from
            the extension stores a unique authentication token locally in your browser, used solely
            to identify your account when generating comments. Each browser you install on holds its
            own token.
          </li>
          <li>
            <span className="text-[#0A0A0A] font-medium">Post content you select</span> — when you
            click the Comment button on a LinkedIn post, that post&rsquo;s visible text, author name
            and headline, and its link are sent to CarouseLabs so a comment can be written about it.
            This happens only for posts you explicitly select.
          </li>
          <li>
            <span className="text-[#0A0A0A] font-medium">Generated comments</span> — the comment
            produced for you, and whether you copied or inserted it, are stored against your account
            so they appear in your History.
          </li>
          <li>
            <span className="text-[#0A0A0A] font-medium">90-day retention</span> — comment history is
            deleted automatically 90 days after it is created, by a scheduled job. Nothing is kept
            beyond that window.
          </li>
          <li>
            <span className="text-[#0A0A0A] font-medium">No automatic browsing tracking</span> — the
            extension reads a post only when you click its Comment button. It does not monitor your
            general browsing, your feed, your messages, or any page content you have not selected.
          </li>
          <li>
            <span className="text-[#0A0A0A] font-medium">It never posts for you</span> — the
            extension never submits anything to LinkedIn. Copy places the comment on your clipboard.
            Insert, which is optional and off by default behind a warning, only places text into
            LinkedIn&rsquo;s comment box; you still review it and press Post yourself.
          </li>
          <li>
            <span className="text-[#0A0A0A] font-medium">No third-party sharing</span> — post content
            and generated comments are used solely to provide the feature to you and are never sold
            or shared with third parties. Generating a comment involves sending the post text to our
            AI model providers purely to produce that comment.
          </li>
          <li>
            <span className="text-[#0A0A0A] font-medium">Your control</span> — you can sign out from
            the extension&rsquo;s Account screen, which immediately revokes that browser&rsquo;s
            token and disconnects it from your account. Signing out on one browser does not affect
            your other devices.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="11. Contact">
        <p>
          For privacy questions, requests, or concerns, email{" "}
          <a href="mailto:support@carouselabs.com" className="text-[#1A1A1A] hover:underline">
            support@carouselabs.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalShell>
  )
}
