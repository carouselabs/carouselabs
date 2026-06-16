import * as React from "react"
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"

const BRAND = "#7C3AED"

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://carouselabs.com"

// Shared text styles reused across every template.
export const emailStyles = {
  heading: {
    margin: "0 0 14px",
    fontSize: "22px",
    fontWeight: 700,
    lineHeight: "1.3",
    color: "#16161d",
  } as React.CSSProperties,
  text: {
    margin: "0 0 16px",
    fontSize: "15px",
    lineHeight: "1.6",
    color: "#454552",
  } as React.CSSProperties,
  list: {
    margin: "0 0 20px",
    paddingLeft: "20px",
    fontSize: "15px",
    lineHeight: "1.8",
    color: "#454552",
  } as React.CSSProperties,
  muted: {
    margin: "16px 0 0",
    fontSize: "13px",
    lineHeight: "1.5",
    color: "#8a8a99",
  } as React.CSSProperties,
}

const main: React.CSSProperties = {
  backgroundColor: "#f4f4f7",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  margin: 0,
  padding: "24px 12px",
}
const card: React.CSSProperties = {
  maxWidth: "480px",
  margin: "0 auto",
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  border: "1px solid #ececf1",
  overflow: "hidden",
}

export function EmailLayout({
  preview,
  children,
}: {
  preview: string
  children: React.ReactNode
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={card}>
          <Section style={{ padding: "24px 32px 0" }}>
            <Text style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: BRAND, letterSpacing: "-0.01em" }}>
              CarouseLabs
            </Text>
          </Section>

          <Section style={{ padding: "20px 32px 32px" }}>{children}</Section>

          <Hr style={{ borderColor: "#f0f0f4", margin: 0 }} />

          <Section style={{ padding: "18px 32px" }}>
            <Text style={{ margin: 0, fontSize: "12px", lineHeight: "18px", color: "#9ca3af" }}>
              CarouseLabs — your AI LinkedIn content studio.{" "}
              <Link href={APP_URL} style={{ color: "#9ca3af", textDecoration: "underline" }}>
                {APP_URL.replace(/^https?:\/\//, "")}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export function EmailButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Button
      href={href}
      style={{
        backgroundColor: BRAND,
        color: "#ffffff",
        padding: "12px 28px",
        borderRadius: "8px",
        fontSize: "14px",
        fontWeight: 600,
        textDecoration: "none",
        display: "inline-block",
      }}
    >
      {children}
    </Button>
  )
}
