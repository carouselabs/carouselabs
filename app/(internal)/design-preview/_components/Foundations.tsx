"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { BrandLockup, BrandMark } from "@/components/patterns/BrandMark"
import { Button } from "@/components/ui/button"
import { PendingTag, Section, Specimen } from "./Section"

const COLORS: { token: string; light: string; dark: string; use: string }[] = [
  { token: "background", light: "#F9F7F2", dark: "#171614", use: "Page canvas" },
  { token: "surface", light: "#FFFDF9", dark: "#201E1B", use: "Standard panels" },
  { token: "surface-raised", light: "#FFFFFF", dark: "#282521", use: "Menus, dialogs" },
  { token: "surface-muted", light: "#F0ECE5", dark: "#24211D", use: "Quiet regions, hover" },
  { token: "foreground", light: "#211F1C", dark: "#F5F0E7", use: "Primary text" },
  { token: "muted-foreground", light: "#67625B", dark: "#B5AFA4", use: "Secondary text" },
  { token: "border", light: "#DED8CD", dark: "#3A352F", use: "Decorative separators" },
  { token: "control-border", light: "#8C857B", dark: "#847B70", use: "Input and control edges (3:1)" },
  { token: "primary", light: "#211F1C", dark: "#F5F0E7", use: "Main action" },
  { token: "brand", light: "#6D28D9", dark: "#C4A7FF", use: "Links, selection, focus" },
  { token: "brand-soft", light: "#EEE8FA", dark: "#332343", use: "Selected backgrounds" },
  { token: "success", light: "#166534", dark: "#86EFAC", use: "Real success only" },
  { token: "warning", light: "#854D0E", dark: "#FACC15", use: "Real warnings only" },
  { token: "danger", light: "#B91C1C", dark: "#FCA5A5", use: "Errors, destructive" },
]

const TYPE: { cls: string; name: string; spec: string; sample: string }[] = [
  { cls: "text-display font-semibold", name: "display", spec: "42–76px / 1.04", sample: "Your ideas. Your voice." },
  { cls: "text-section font-semibold", name: "section", spec: "32–52px / 1.12", sample: "From a first idea to your next post" },
  { cls: "text-title font-semibold", name: "title", spec: "32 / 40", sample: "Content Hub" },
  { cls: "text-title-sm font-semibold", name: "title-sm", spec: "24 / 32", sample: "Choose a format" },
  { cls: "text-lead", name: "lead", spec: "20 / 30", sample: "Create posts, images and carousels in your own voice." },
  { cls: "text-body-lg", name: "body-lg", spec: "18 / 28", sample: "Marketing body copy sits here, comfortably readable." },
  { cls: "text-body", name: "body", spec: "16 / 24", sample: "Default reading text and every input on mobile." },
  { cls: "text-label font-medium", name: "label", spec: "14 / 20", sample: "Labels, buttons and table text" },
  { cls: "text-caption", name: "caption", spec: "12 / 18", sample: "Supporting metadata only" },
]

const RADII = [
  ["rounded-detail", "4px · details"],
  ["rounded-control-sm", "8px · small controls"],
  ["rounded-control", "12px · controls"],
  ["rounded-card", "16px · cards"],
  ["rounded-showcase", "24px · showcases"],
] as const

const SHADOWS = [
  ["shadow-card", "card"],
  ["shadow-popover", "popover"],
  ["shadow-dialog", "dialog"],
] as const

const MOTION = [
  ["fast", "120ms", "Hover, press"],
  ["normal", "180ms", "Tabs, small state changes"],
  ["panel", "240ms", "Dialogs, drawers"],
  ["reveal", "420ms", "One-time section reveals"],
  ["maximum", "600ms", "Ceiling for anything"],
] as const

function MotionDemo() {
  const [on, setOn] = React.useState(false)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {MOTION.map(([name, ms]) => (
          <div key={name} className="flex items-center gap-3">
            <span className="w-16 text-caption text-muted-foreground tabular-nums">{ms}</span>
            <div className="relative h-8 flex-1 rounded-control-sm bg-surface-muted">
              <div
                className="absolute top-1 left-1 size-6 rounded-detail bg-brand transition-transform ease-entry"
                style={{ transitionDuration: ms, transform: on ? "translateX(calc(min(100cqw, 18rem)))" : "none" }}
              />
            </div>
          </div>
        ))}
      </div>
      <div>
        <Button variant="outline" size="sm" onClick={() => setOn((value) => !value)}>
          Play entry easing
        </Button>
      </div>
    </div>
  )
}

export function Foundations() {
  return (
    <>
      <Section
        id="brand"
        title="Brand mark"
        description="The current mark is close to Vercel's. The proposal: two offset editorial sheets, the front one an open C. Live pages keep the current logo until you approve a change."
      >
        <div className="mb-6"><PendingTag /></div>
        <div className="grid gap-4 md:grid-cols-2">
          <Specimen label="Current (live)">
            <div className="flex h-40 items-center justify-center gap-3 rounded-card border border-border bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon.png" alt="" className="size-8" />
              <span className="text-lead font-semibold tracking-[-0.02em]">CarouseLabs</span>
            </div>
          </Specimen>
          <Specimen label="Proposed">
            <div className="grid h-40 grid-cols-2 overflow-hidden rounded-card border border-border">
              <div data-theme="light" className="flex items-center justify-center bg-background text-foreground">
                <BrandLockup className="text-body-lg" markClassName="size-6" />
              </div>
              <div data-theme="dark" className="flex items-center justify-center bg-background text-foreground">
                <BrandLockup className="text-body-lg" markClassName="size-6" />
              </div>
            </div>
          </Specimen>
        </div>
        <Specimen label="Proposed mark at 16, 20, 24, 32, 48 and 96px" className="mt-6">
          <div className="flex flex-wrap items-end gap-6 rounded-card border border-border bg-surface p-6 text-foreground">
            {[16, 20, 24, 32, 48, 96].map((size) => (
              <span key={size} style={{ width: size, height: size }} className="[&_svg]:size-full">
                <BrandMark title={`Proposed mark, ${size} pixels`} />
              </span>
            ))}
            <span className="text-brand [&_svg]:size-12">
              <BrandMark title="Proposed mark in the brand violet" />
            </span>
          </div>
        </Specimen>
      </Section>

      <Section
        id="color"
        title="Color"
        description="Warm neutrals from paper to ink, one violet brand accent, and status colors reserved for real status. Every text pair checked at 4.5:1 or better and control edges at 3:1, in both themes."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {COLORS.map((color) => (
            <div key={color.token} className="flex items-center gap-3 rounded-control border border-border bg-surface p-3">
              <span
                className="size-12 shrink-0 rounded-control-sm border border-border"
                style={{ background: `var(--${color.token})` }}
              />
              <div className="min-w-0">
                <p className="text-label font-medium">{color.token}</p>
                <p className="text-caption text-muted-foreground tabular-nums">
                  {color.light} · {color.dark}
                </p>
                <p className="truncate text-caption text-muted-foreground">{color.use}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="type"
        title="Typography"
        description="Geist for everything functional; Instrument Serif only for a few large marketing phrases. Sentence case, tabular numbers for credits, prices and metrics."
      >
        <div className="flex flex-col divide-y divide-border rounded-card border border-border bg-surface">
          {TYPE.map((t) => (
            <div key={t.name} className="grid gap-2 p-5 md:grid-cols-[10rem_1fr] md:items-baseline">
              <div>
                <p className="text-label font-medium">{t.name}</p>
                <p className="text-caption text-muted-foreground">{t.spec}</p>
              </div>
              <p className={cn(t.cls, "min-w-0 break-words")}>{t.sample}</p>
            </div>
          ))}
          <div className="grid gap-2 p-5 md:grid-cols-[10rem_1fr] md:items-baseline">
            <div>
              <p className="text-label font-medium">display + serif</p>
              <p className="text-caption text-muted-foreground">Marketing only, sparingly</p>
            </div>
            <p className="text-display font-semibold">
              Your ideas. Your voice. <span className="font-display font-normal italic">Ready to publish.</span>
            </p>
          </div>
        </div>
      </Section>

      <Section
        id="layout"
        title="Layout, shape, depth and motion"
        description="4px base unit on an 8px rhythm. Containers: 1200px marketing, 1320px showcase, 720px reading, 560px forms. Gutters 20/32/48px. Motion stays under 600ms and turns off with reduced motion."
      >
        <div className="grid gap-8 lg:grid-cols-3">
          <Specimen label="Radius">
            <div className="flex flex-col gap-3">
              {RADII.map(([cls, label]) => (
                <div key={cls} className="flex items-center gap-3">
                  <span className={cn("size-12 border border-control-border bg-surface-muted", cls)} />
                  <span className="text-label">{label}</span>
                </div>
              ))}
            </div>
          </Specimen>
          <Specimen label="Elevation">
            <div className="flex flex-col gap-4">
              {SHADOWS.map(([cls, label]) => (
                <div key={cls} className={cn("rounded-card border border-border bg-surface-raised px-4 py-5 text-label", cls)}>
                  {label}
                </div>
              ))}
            </div>
          </Specimen>
          <Specimen label="Motion durations (entry easing)">
            <div className="@container">
              <MotionDemo />
            </div>
          </Specimen>
        </div>
      </Section>
    </>
  )
}
