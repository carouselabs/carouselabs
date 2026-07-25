import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { TapHoldFAQ } from "@/app/(marketing)/tap-hold/types"

type TapHoldFAQSectionProps = {
  faqs: TapHoldFAQ[]
}

export function TapHoldFAQSection({ faqs }: TapHoldFAQSectionProps) {
  return (
    <div className="max-w-3xl mx-auto rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8] px-6 sm:px-8">
      <Accordion multiple>
        {faqs.map((faq, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger className="text-[15px] font-semibold text-[#0A0A0A] py-5">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-[14px] leading-[1.7] text-[#4B5563]">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
