import { Mail } from "lucide-react"

import { ContactForm } from "@/components/marketing/ContactForm"

/** Two columns: the promise and address on one side, the working form on the other. Copy unchanged. */
export function ContactSection() {
  return (
    <section id="contact" aria-labelledby="contact-title" className="scroll-mt-20 border-t border-border font-ui">
      <div className="mx-auto grid max-w-showcase gap-10 gutter-x section-y lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-20">
        <div className="flex flex-col gap-4">
          <p className="text-label font-medium text-brand">Contact</p>
          <h2 id="contact-title" className="text-section font-semibold">Get in touch</h2>
          <p className="text-body-lg text-muted-foreground">
            Questions, feedback, or need a hand? Send us a message and we&apos;ll get back to you within 2–3 business days.
          </p>
          <a
            href="mailto:support@carouselabs.com"
            className="inline-flex items-center gap-2 self-start pt-2 text-label font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
          >
            <Mail className="size-4" strokeWidth={2} aria-hidden />
            support@carouselabs.com
          </a>
        </div>
        <ContactForm />
      </div>
    </section>
  )
}
