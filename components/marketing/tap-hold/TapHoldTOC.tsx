import { List } from "lucide-react"

const SECTIONS = [
  { id: "what-it-means", label: "What This Means" },
  { id: "why-popular", label: "Why People Use It" },
  { id: "tutorial", label: "How to Create This with CarouseLabs" },
  { id: "tips", label: "Tips for Better Results" },
  { id: "examples", label: "Examples" },
  { id: "mistakes", label: "Common Mistakes" },
  { id: "faq", label: "FAQs" },
]

/** Fixed section anchors — identical structure on every article page, per the required content outline. */
export function TapHoldTOC() {
  return (
    <nav aria-label="Table of contents" className="max-w-3xl mx-auto w-full">
      <div className="p-5 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8]">
        <div className="flex items-center gap-2 mb-3">
          <List size={15} strokeWidth={2.2} className="text-[#7C3AED]" />
          <p className="text-[13px] font-semibold text-[#0A0A0A]">On this page</p>
        </div>
        <ol className="flex flex-wrap gap-x-5 gap-y-2">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="text-[13px] text-[#6B7280] hover:text-[#7C3AED] transition-colors"
              >
                {section.label}
              </a>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  )
}
