import type { Metadata } from "next"
import { LegalShell, LegalSection } from "@/components/marketing/LegalShell"

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "CarouseLabs refund and cancellation policy.",
}

export default function RefundPage() {
  return (
    <LegalShell
      title="Refund Policy"
      updated="June 15, 2026"
      intro="This Refund Policy explains our position on payments, cancellations, and refunds for CarouseLabs. Please read it carefully before purchasing. All amounts are in U.S. dollars (USD). By upgrading to a paid plan or purchasing credits, you acknowledge and agree to this policy."
    >
      <LegalSection heading="1. No refunds">
        <p>
          <span className="text-[#0A0A0A] font-medium">
            All payments made to CarouseLabs are final and non-refundable.
          </span>{" "}
          Once a payment is processed — whether for a Pro subscription or any other purchase — we do
          not provide refunds, credits, or exchanges under any circumstances, including for unused
          time, unused credits, partial billing periods, change of mind, dissatisfaction, or
          accidental purchase.
        </p>
      </LegalSection>

      <LegalSection heading="2. Try the free plan first">
        <p>
          We offer a free plan specifically so you can evaluate CarouseLabs before paying. We strongly
          encourage you to use the free plan and confirm the Service meets your needs before upgrading
          to Pro. Because a full free trial of the core experience is available, all paid purchases are
          made on an informed basis and are non-refundable.
        </p>
      </LegalSection>

      <LegalSection heading="3. Cancellation">
        <p>
          You may cancel your subscription at any time from your billing settings. When you cancel:
        </p>
        <ul className="flex flex-col gap-2 pl-5 list-disc marker:text-[#1A1A1A]">
          <li>
            Your Pro access and remaining credits continue until the end of the current paid billing
            period.
          </li>
          <li>You will not be charged again after the current period ends.</li>
          <li>
            <span className="text-[#0A0A0A] font-medium">
              No refund is issued for the current billing period
            </span>{" "}
            — including any unused portion of that period or any unused credits.
          </li>
          <li>At the end of the period, your account automatically moves to the free plan.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="4. Extra credits">
        <p>
          One-time purchases of extra credits are{" "}
          <span className="text-[#0A0A0A] font-medium">non-refundable</span> once the credits have been
          added to your account. Extra credits cannot be exchanged for cash and are subject to any
          expiry period shown at the time of purchase.
        </p>
      </LegalSection>

      <LegalSection heading="5. No exceptions">
        <p>
          This policy applies without exception. We do not make refunds based on forgotten
          cancellations, lack of usage, or individual circumstances. Submitting a payment constitutes
          your acceptance of this no-refund policy.
        </p>
        <p>
          This policy does not affect any rights that cannot be waived under mandatory consumer
          law in your jurisdiction. Where such laws grant you a non-waivable right to a refund, we
          will honor that right to the extent legally required.
        </p>
      </LegalSection>

      <LegalSection heading="6. Billing issues">
        <p>
          If you believe you were charged in error or experienced a duplicate or fraudulent charge,
          contact us at{" "}
          <a href="mailto:support@carouselabs.com" className="text-[#1A1A1A] hover:underline">
            support@carouselabs.com
          </a>{" "}
          from the email address associated with your account, including the approximate date and
          amount of the charge. We will review verified billing errors and correct them where
          appropriate.
        </p>
      </LegalSection>
    </LegalShell>
  )
}
