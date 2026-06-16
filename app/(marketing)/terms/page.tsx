import type { Metadata } from "next"
import { LegalShell, LegalSection } from "@/components/marketing/LegalShell"

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms governing your use of CarouseLabs.",
}

export default function TermsPage() {
  return (
    <LegalShell
      title="Terms & Conditions"
      updated="June 15, 2026"
      intro="These Terms & Conditions (“Terms”) form a legally binding agreement between you (“you,” “user”) and CarouseLabs (“CarouseLabs,” “we,” “us,” “our”) governing your access to and use of our website, applications, and services (collectively, the “Service”). Please read them carefully. By creating an account or using the Service, you agree to these Terms; if you do not agree, do not use CarouseLabs."
    >
      <LegalSection heading="1. Acceptance of terms">
        <p>
          By accessing or using CarouseLabs, you confirm that you are at least 18 years old (or the
          age of majority in your jurisdiction), that you can form a binding contract, and that you
          will comply with these Terms and all applicable laws. If you use the Service on behalf of a
          company or other entity, you represent that you have authority to bind that entity, and
          “you” refers to that entity.
        </p>
        <p>
          We may update these Terms from time to time. When we make material changes, we will update
          the “Last updated” date above and, where appropriate, provide additional notice. Your
          continued use of the Service after changes take effect constitutes your acceptance of the
          revised Terms.
        </p>
      </LegalSection>

      <LegalSection heading="2. Description of the service">
        <p>
          CarouseLabs is an AI-powered content creation studio for social media. The Service helps
          you generate post ideas, write captions, produce structured content breakdowns, and design
          multi-slide image carousels for platforms including LinkedIn, Instagram, and Twitter/X,
          shaped by the brand profile and inputs you provide.
        </p>
        <p>
          The Service relies on third-party artificial-intelligence models and is provided on an “as
          is” and “as available” basis. AI-generated output may be inaccurate, incomplete, or
          unsuitable for a given purpose, and you are responsible for reviewing and editing it before
          use. We may add, modify, suspend, or discontinue any feature of the Service at any time.
        </p>
      </LegalSection>

      <LegalSection heading="3. User accounts and responsibilities">
        <p>
          To use most features you must create an account. You agree to provide accurate, current
          information and to keep it up to date. You are responsible for:
        </p>
        <ul className="flex flex-col gap-2 pl-5 list-disc marker:text-[#1A1A1A]">
          <li>Maintaining the confidentiality of your login credentials.</li>
          <li>All activity that occurs under your account.</li>
          <li>
            Ensuring your content and use of generated output comply with applicable laws and the
            terms of any platform you publish to.
          </li>
          <li>
            Notifying us immediately at support@carouselabs.com if you suspect any unauthorized use
            of your account.
          </li>
        </ul>
        <p>
          You may not share, sell, or transfer your account, or allow others to use it, without our
          permission.
        </p>
      </LegalSection>

      <LegalSection heading="4. Subscriptions and payments">
        <p>
          CarouseLabs offers a free plan and a paid <span className="text-[#0A0A0A] font-medium">Pro</span>{" "}
          plan priced at <span className="text-[#0A0A0A] font-medium">$34 per month (USD)</span>. Pro is
          billed in advance on a recurring monthly basis and renews automatically until cancelled. By
          subscribing, you authorize us and our payment processor to charge your payment method for
          each billing cycle, including applicable taxes.
        </p>
        <ul className="flex flex-col gap-2 pl-5 list-disc marker:text-[#1A1A1A]">
          <li>Plans include monthly content credits and may offer one-time extra-credit purchases.</li>
          <li>
            You can cancel at any time from your billing settings; access continues until the end of
            the current paid period.
          </li>
          <li>
            Prices may change with reasonable advance notice. Continued use after a price change takes
            effect constitutes acceptance.
          </li>
          <li>
            All payments are governed by our Refund Policy, which forms part of these Terms.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="5. Intellectual property">
        <p>
          <span className="text-[#0A0A0A] font-medium">Our property.</span> The CarouseLabs name, logo,
          software, design, and all underlying technology are owned by CarouseLabs and protected by
          intellectual-property laws. These Terms grant you a limited, non-exclusive, non-transferable
          right to use the Service; they do not grant you any right to our trademarks or source code.
        </p>
        <p>
          <span className="text-[#0A0A0A] font-medium">Your content and generated output.</span> You
          retain ownership of the inputs you submit. As between you and CarouseLabs, and to the extent
          permitted by applicable law and the underlying AI providers&apos; terms, the content you
          generate using the Service belongs to you. You are free to use, publish, and commercialize
          your generated content. You are solely responsible for that content and for ensuring it does
          not infringe the rights of others. You grant us a limited license to host and process your
          content only as needed to operate, secure, and improve the Service.
        </p>
      </LegalSection>

      <LegalSection heading="6. Prohibited uses">
        <p>You agree not to use CarouseLabs to:</p>
        <ul className="flex flex-col gap-2 pl-5 list-disc marker:text-[#1A1A1A]">
          <li>Create content that is unlawful, defamatory, harassing, hateful, or discriminatory.</li>
          <li>Generate sexually explicit material involving minors or any illegal content.</li>
          <li>Infringe the intellectual-property, privacy, or publicity rights of others.</li>
          <li>Produce spam, scams, malware, or deliberately deceptive or misleading content.</li>
          <li>Violate the terms or policies of any third-party platform you publish to.</li>
          <li>
            Reverse engineer, decompile, scrape, or attempt to disrupt, overload, or gain
            unauthorized access to the Service or its systems.
          </li>
          <li>Resell, sublicense, or redistribute the Service without our written permission.</li>
        </ul>
        <p>We may remove content and suspend or terminate accounts that violate this section.</p>
      </LegalSection>

      <LegalSection heading="7. Disclaimer of warranties">
        <p>
          THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND, WHETHER
          EXPRESS, IMPLIED, OR STATUTORY, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
          PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. We do not warrant that the Service will be
          uninterrupted, secure, or error-free, or that AI-generated output will be accurate,
          reliable, or fit for your intended use. You use the Service and any generated content at
          your own risk.
        </p>
      </LegalSection>

      <LegalSection heading="8. Limitation of liability">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, CAROUSELABS AND ITS OFFICERS, EMPLOYEES, AND
          SUPPLIERS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
          PUNITIVE DAMAGES, OR FOR ANY LOSS OF PROFITS, REVENUE, DATA, OR GOODWILL, ARISING OUT OF OR
          RELATED TO YOUR USE OF THE SERVICE. OUR TOTAL AGGREGATE LIABILITY FOR ANY CLAIM WILL NOT
          EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US IN THE TWELVE MONTHS PRECEDING THE EVENT
          GIVING RISE TO THE CLAIM, OR (B) USD $50. SOME JURISDICTIONS DO NOT ALLOW CERTAIN
          LIMITATIONS, SO SOME OF THE ABOVE MAY NOT APPLY TO YOU.
        </p>
      </LegalSection>

      <LegalSection heading="9. Termination">
        <p>
          You may stop using CarouseLabs and delete your account at any time. We may suspend or
          terminate your access, with or without notice, if you breach these Terms, fail to pay
          applicable fees, or use the Service in a way that creates risk or legal exposure for us or
          others. Upon termination, your right to use the Service ends immediately. Provisions that by
          their nature should survive — including intellectual property, disclaimers, limitation of
          liability, and governing law — will continue to apply.
        </p>
      </LegalSection>

      <LegalSection heading="10. Governing law">
        <p>
          These Terms are governed by and construed in accordance with the laws of India, without
          regard to its conflict-of-law rules. You agree that the courts located in India will have
          exclusive jurisdiction to resolve any dispute arising out of or relating to these Terms or
          the Service, subject to any mandatory consumer-protection rights available to you in your
          place of residence.
        </p>
      </LegalSection>

      <LegalSection heading="11. Contact">
        <p>
          Questions about these Terms? Email us at{" "}
          <a href="mailto:support@carouselabs.com" className="text-[#1A1A1A] hover:underline">
            support@carouselabs.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalShell>
  )
}
