import type { Metadata } from "next"
import { Mail, Clock, MessageCircle } from "lucide-react"
import { ContactForm } from "@/components/marketing/ContactForm"

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with the CarouseLabs team.",
}

const DETAILS = [
  {
    icon: Mail,
    label: "Email",
    value: "support@carouselabs.com",
    href: "mailto:support@carouselabs.com",
  },
  {
    icon: Clock,
    label: "Response time",
    value: "Within 2–3 business days",
  },
  {
    icon: MessageCircle,
    label: "What we help with",
    value: "Billing, account, and product questions",
  },
]

export default function ContactPage() {
  return (
    <div className="mx-auto grid max-w-showcase gap-12 gutter-x pt-12 pb-20 sm:pt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-20">
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-4">
          <p className="text-label font-medium text-brand">Contact</p>
          <h1 className="text-section font-semibold">Get in touch</h1>
          <p className="text-body-lg text-muted-foreground">
            Have a question, need help with your account, or want to share feedback? Send us a message
            and our team will get back to you.
          </p>
        </header>

        {/* Contact details */}
        <dl className="flex flex-col divide-y divide-border border-y border-border">
          {DETAILS.map((d) => (
            <div key={d.label} className="flex items-start gap-4 py-4">
              <d.icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" strokeWidth={1.8} aria-hidden />
              <div className="flex flex-col gap-0.5">
                <dt className="text-label text-muted-foreground">{d.label}</dt>
                <dd className="text-body">
                  {d.href ? (
                    <a href={d.href} className="underline decoration-border underline-offset-4 hover:decoration-foreground">
                      {d.value}
                    </a>
                  ) : (
                    d.value
                  )}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </div>

      {/* Form */}
      <section aria-labelledby="contact-form-title" className="rounded-showcase border border-border bg-surface p-6 sm:p-8">
        <h2 id="contact-form-title" className="mb-5 text-body-lg font-semibold">
          Send us a message
        </h2>
        <ContactForm />
      </section>
    </div>
  )
}
