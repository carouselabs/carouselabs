import * as React from "react"
import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components"
import { heroAlt, type EmailHero, type EmailSticker } from "./art"
import {
  ADMIN_URL,
  APP_URL,
  EMAIL_COLORS as C,
  EMAIL_IMAGES,
  EMPLOYEE_URL,
  SANS,
  SERIF,
  SERIF_FONT_URL,
} from "./theme"

export { ADMIN_URL, APP_URL, EMAIL_IMAGES, EMPLOYEE_URL } from "./theme"

// Shared text styles reused across every template.
export const emailStyles = {
  // In-body headings; the email's main headline is in its hero image.
  heading: {
    margin: "0 0 12px",
    fontFamily: SERIF,
    fontSize: "26px",
    fontWeight: 400,
    lineHeight: "1.2",
    letterSpacing: "-0.01em",
    color: C.ink,
  } as React.CSSProperties,
  text: {
    margin: "0 0 18px",
    fontSize: "16px",
    lineHeight: "1.65",
    color: C.body,
  } as React.CSSProperties,
  list: {
    margin: "0 0 20px",
    paddingLeft: "20px",
    fontSize: "16px",
    lineHeight: "1.8",
    color: C.body,
  } as React.CSSProperties,
  muted: {
    margin: "18px 0 0",
    fontSize: "13px",
    lineHeight: "1.6",
    color: C.muted,
  } as React.CSSProperties,
  // Small capitals that head a section ("This week", "What's unlocked").
  label: {
    margin: "28px 0 10px",
    fontSize: "12px",
    fontWeight: 600,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: C.muted,
  } as React.CSSProperties,
  link: { color: C.violet, textDecoration: "underline" } as React.CSSProperties,
  strong: { color: C.ink } as React.CSSProperties,
}

// Who the email is for decides the pill at the top right and the sign-off:
// customers get "Sign in", interns their portal, admin notices the console
// (and no "The CarouseLabs Team" sign-off, since they're from us to us).
export type EmailAudience = "user" | "intern" | "admin"
const HEADER_LINK: Record<EmailAudience, { href: string; label: string }> = {
  user: { href: `${APP_URL}/sign-in`, label: "Sign in" },
  intern: { href: EMPLOYEE_URL, label: "Open portal" },
  admin: { href: ADMIN_URL, label: "Open admin" },
}

export function EmailLayout({
  preview,
  hero,
  children,
  audience = "user",
  footerNote,
}: {
  preview: string
  // The painted image the email opens with; its headline is in the image.
  // One of the fixed ones (emails/art.ts has the words), or a picture the AI
  // email writer painted for this email (its headline as the alt text).
  hero: EmailHero | { src: string; alt: string }
  children: React.ReactNode
  audience?: EmailAudience
  // An extra line above the standard footer, e.g. why they got this email.
  footerNote?: React.ReactNode
}) {
  const pill = HEADER_LINK[audience]
  const heroImage = typeof hero === "string" ? { src: `${EMAIL_IMAGES}/hero-${hero}.jpg`, alt: heroAlt(hero) } : hero
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light" />
        <link href={SERIF_FONT_URL} rel="stylesheet" />
        <style>{`@media (max-width: 480px) {
  .px { padding-left: 16px !important; padding-right: 16px !important; }
  .card { padding-left: 18px !important; padding-right: 18px !important; }
}`}</style>
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, padding: "32px 12px", backgroundColor: C.page, fontFamily: SANS }}>
        <Container style={{ maxWidth: "640px", margin: "0 auto", backgroundColor: C.card, borderRadius: "18px", border: `1px solid ${C.line}` }}>
          <Section className="px" style={{ padding: "24px 32px 20px" }}>
            <Row>
              <Column style={{ verticalAlign: "middle" }}>
                <Link href={APP_URL} style={{ textDecoration: "none" }}>
                  <Img src={`${EMAIL_IMAGES}/logo.png`} width="168" height="30" alt="CarouseLabs" style={{ display: "block" }} />
                </Link>
              </Column>
              <Column align="right" style={{ verticalAlign: "middle" }}>
                <Link
                  href={pill.href}
                  style={{
                    border: `1px solid ${C.ink}`,
                    borderRadius: "999px",
                    padding: "7px 15px",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: C.ink,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {pill.label}
                </Link>
              </Column>
            </Row>
          </Section>

          <Section className="px" style={{ padding: "0 32px" }}>
            <Img
              src={heroImage.src}
              width="576"
              alt={heroImage.alt}
              style={{ display: "block", width: "100%", maxWidth: "576px", height: "auto", borderRadius: "14px" }}
            />
          </Section>

          <Section className="px" style={{ padding: "32px 40px 4px" }}>
            {children}
          </Section>

          {audience !== "admin" && (
            <Section className="px" style={{ padding: "24px 40px 34px" }}>
              <Img
                src={`${EMAIL_IMAGES}/mark.png`}
                width="24"
                height="24"
                alt=""
                style={{ display: "inline-block", verticalAlign: "middle" }}
              />
              <span style={{ fontFamily: SERIF, fontSize: "19px", color: C.ink, verticalAlign: "middle", marginLeft: "10px" }}>
                The CarouseLabs Team
              </span>
            </Section>
          )}
          {audience === "admin" && <Section style={{ height: "28px" }} />}
        </Container>

        <Container style={{ maxWidth: "640px", margin: "0 auto" }}>
          <Section className="px" style={{ padding: "24px 32px 8px", textAlign: "center" }}>
            {footerNote && <Text style={footerText}>{footerNote}</Text>}
            <Text style={footerText}>CarouseLabs — your AI social media content studio.</Text>
            <Text style={footerText}>
              <Link href={APP_URL} style={footerLink}>
                {APP_URL.replace(/^https?:\/\//, "")}
              </Link>
              {"  ·  "}
              <Link href={`${APP_URL}/privacy`} style={footerLink}>
                Privacy
              </Link>
              {"  ·  "}
              <Link href={`${APP_URL}/terms`} style={footerLink}>
                Terms
              </Link>
            </Text>
            <Text style={{ ...footerText, margin: 0 }}>© {new Date().getFullYear()} CarouseLabs</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const footerText: React.CSSProperties = { margin: "0 0 8px", fontSize: "12px", lineHeight: "1.6", color: C.muted }
const footerLink: React.CSSProperties = { color: C.muted, textDecoration: "underline" }

// align "left" sits flush with the text; "center" spaces evenly either side
// (for a button inside a centred block).
export function EmailButton({
  href,
  align = "left",
  children,
}: {
  href: string
  align?: "left" | "center"
  children: React.ReactNode
}) {
  return (
    <Button
      href={href}
      style={{
        display: "inline-block",
        margin: align === "left" ? "6px 8px 8px 0" : "6px 4px 8px",
        padding: "14px 26px",
        backgroundColor: C.ink,
        color: "#FFFFFF",
        borderRadius: "10px",
        fontSize: "15px",
        fontWeight: 600,
        textDecoration: "none",
      }}
    >
      {children}
    </Button>
  )
}

// A bordered block that sets off the main thing in an email.
export function EmailCard({ children }: { children: React.ReactNode }) {
  return (
    <Section className="card" style={{ border: `1.5px solid ${C.ink}`, borderRadius: "16px", padding: "30px 28px 22px", margin: "10px 0 20px" }}>
      {children}
    </Section>
  )
}

// A quiet tinted block for side information (setup steps, help, a quote).
export function EmailPanel({ children }: { children: React.ReactNode }) {
  return (
    <Section className="card" style={{ backgroundColor: C.panel, borderRadius: "16px", padding: "24px 26px 20px", margin: "10px 0 20px" }}>
      {children}
    </Section>
  )
}

// Label / value rows in a tinted panel: dates, amounts, counts.
export function EmailFacts({ items }: { items: [label: string, value: React.ReactNode][] }) {
  return (
    <EmailPanel>
      {items.map(([label, value], i) => (
        <Row key={label} style={{ borderTop: i === 0 ? "none" : `1px solid ${C.line}` }}>
          <Column style={{ padding: "10px 12px 10px 0", fontSize: "14px", lineHeight: "1.45", color: C.muted }}>{label}</Column>
          <Column align="right" style={{ padding: "10px 0", fontSize: "14px", lineHeight: "1.45", fontWeight: 600, color: C.ink }}>
            {value}
          </Column>
        </Row>
      ))}
    </EmailPanel>
  )
}

// Feature rows, each marked by a painted sticker: one of the fixed ones, or
// one the AI email writer painted ({ src }).
export function EmailFeatures({
  items,
}: {
  items: { sticker: EmailSticker | { src: string }; title: string; text: React.ReactNode }[]
}) {
  return (
    <>
      {items.map((f) => (
        <Row key={f.title} style={{ marginBottom: "18px" }}>
          <Column style={{ width: "68px", verticalAlign: "top" }}>
            <Img
              src={typeof f.sticker === "string" ? `${EMAIL_IMAGES}/sticker-${f.sticker}.png` : f.sticker.src}
              width="54"
              height="54"
              alt=""
              style={{ display: "block" }}
            />
          </Column>
          <Column style={{ verticalAlign: "top" }}>
            <Text style={{ margin: "2px 0 3px", fontSize: "16px", fontWeight: 600, lineHeight: "1.4", color: C.ink }}>{f.title}</Text>
            <Text style={{ margin: 0, fontSize: "15px", lineHeight: "1.55", color: C.body }}>{f.text}</Text>
          </Column>
        </Row>
      ))}
    </>
  )
}

// A numbered sequence: setup steps, next steps, options in order.
export function EmailSteps({ steps }: { steps: React.ReactNode[] }) {
  return (
    <>
      {steps.map((step, i) => (
        <Row key={i} style={{ marginBottom: "12px" }}>
          <Column style={{ width: "38px", verticalAlign: "top" }}>
            <Text
              style={{
                margin: 0,
                width: "24px",
                height: "24px",
                borderRadius: "999px",
                backgroundColor: C.violetSoft,
                color: C.violet,
                fontSize: "12px",
                fontWeight: 700,
                lineHeight: "24px",
                textAlign: "center",
              }}
            >
              {i + 1}
            </Text>
          </Column>
          <Column style={{ verticalAlign: "top" }}>
            <Text style={{ margin: "1px 0 0", fontSize: "15px", lineHeight: "1.55", color: C.body }}>{step}</Text>
          </Column>
        </Row>
      ))}
    </>
  )
}
