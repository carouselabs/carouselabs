import * as React from "react"
import { Heading, Link, Section, Text } from "@react-email/components"
import { EmailButton, EmailFacts, EmailFeatures, EmailLayout, EmailSteps, emailStyles } from "./EmailLayout"
import { isAllowedLink, type EmailDesign } from "@/lib/emailDesign"

// Subject: design.subject (each person's {{variables}} filled in at send time)
// An email written with the AI email writer (lib/emailDesign.ts), in the same
// layout as every other CarouseLabs email: its own painted picture with the
// headline in it, then its blocks. Sent through campaigns.
//
// `placeholders` stand in for pictures not painted yet, so the admin's
// preview still shows the layout; an email is never sent without its art.
export function DesignedEmail({
  design,
  placeholders,
}: {
  design: EmailDesign
  placeholders?: { hero: string; sticker: string }
}) {
  const heroSrc = design.hero.imageUrl ?? placeholders?.hero ?? ""
  return (
    <EmailLayout preview={design.preview} hero={{ src: heroSrc, alt: `${design.hero.lead} ${design.hero.accent}` }}>
      {design.blocks.map((block, i) => {
        switch (block.type) {
          case "text":
            return block.text.split(/\n{2,}/).map((para, p) => (
              <Text key={`${i}-${p}`} style={emailStyles.text}>
                <Inline text={para} />
              </Text>
            ))
          case "heading":
            return (
              <Heading key={i} as="h2" style={{ ...emailStyles.heading, margin: "26px 0 12px" }}>
                {block.text}
              </Heading>
            )
          case "features":
            return (
              <Section key={i} style={{ margin: "6px 0 10px" }}>
                <EmailFeatures
                  items={block.items.map((item) => ({
                    sticker: { src: item.sticker.imageUrl ?? placeholders?.sticker ?? "" },
                    title: item.title,
                    text: <Inline text={item.text} />,
                  }))}
                />
              </Section>
            )
          case "steps":
            return (
              <Section key={i} style={{ margin: "6px 0 14px" }}>
                <EmailSteps steps={block.items.map((step, s) => <Inline key={s} text={step} />)} />
              </Section>
            )
          case "facts":
            return <EmailFacts key={i} items={block.items.map(([label, value]) => [label, value])} />
          case "button":
            return (
              <Section key={i} style={{ margin: "4px 0 6px" }}>
                <EmailButton href={block.href}>{block.label}</EmailButton>
              </Section>
            )
          case "note":
            return (
              <Text key={i} style={emailStyles.muted}>
                <Inline text={block.text} />
              </Text>
            )
        }
      })}
    </EmailLayout>
  )
}

// **bold**, *italic* and [a link](https://…) inside a line of text; anything
// else, including a link to somewhere not allowed, stays plain text.
function Inline({ text }: { text: string }) {
  const parts: React.ReactNode[] = []
  const pattern = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\)/g
  let last = 0
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0
    if (index > last) parts.push(text.slice(last, index))
    const [whole, bold, italic, label, href] = match
    if (bold) parts.push(<strong key={index} style={emailStyles.strong}>{bold}</strong>)
    else if (italic) parts.push(<em key={index}>{italic}</em>)
    else if (label && href && isAllowedLink(href)) {
      parts.push(
        <Link key={index} href={href} style={emailStyles.link}>
          {label}
        </Link>,
      )
    } else parts.push(whole)
    last = index + whole.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return <>{parts}</>
}
