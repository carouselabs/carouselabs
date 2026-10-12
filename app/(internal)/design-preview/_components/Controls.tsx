"use client"

import * as React from "react"
import { ArrowRight, Download, Plus, Settings, Trash2 } from "lucide-react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { CheckboxField } from "@/components/ui/checkbox"
import { SwitchField } from "@/components/ui/switch"
import { RadioField, RadioGroup } from "@/components/ui/radio-group"
import { Banner } from "@/components/patterns/Banner"
import { useToast } from "@/components/ui/toast"
import { Section, Specimen } from "./Section"

const VARIANTS = ["primary", "brand", "secondary", "outline", "ghost", "destructive", "link"] as const

function PendingDemo() {
  const [pending, setPending] = React.useState(false)
  return (
    <Button
      pending={pending}
      pendingLabel="Saving"
      onClick={() => {
        setPending(true)
        window.setTimeout(() => setPending(false), 1800)
      }}
    >
      Save changes
    </Button>
  )
}

type FormStatus = "idle" | "pending" | "error" | "success"

/** Demonstrates validation, pending, failure (input kept) and success. Sends nothing. */
function DemoForm() {
  const toast = useToast()
  const [status, setStatus] = React.useState<FormStatus>("idle")
  const [name, setName] = React.useState("")
  const [goal, setGoal] = React.useState("")
  const [submitted, setSubmitted] = React.useState(false)
  const [attempts, setAttempts] = React.useState(0)
  const nameError = submitted && !name.trim() ? "Add a profile name so you can find it later." : undefined
  const nameRef = React.useRef<HTMLInputElement>(null)

  return (
    <form
      noValidate
      className="flex flex-col gap-5 rounded-card border border-border bg-surface p-6"
      onSubmit={(event) => {
        event.preventDefault()
        setSubmitted(true)
        if (!name.trim()) {
          nameRef.current?.focus()
          return
        }
        setStatus("pending")
        window.setTimeout(() => {
          // First attempt fails on purpose to show the error state; the second succeeds.
          if (attempts === 0) {
            setStatus("error")
          } else {
            setStatus("success")
            toast.show({ title: "Profile saved", description: "Example only — nothing was sent.", tone: "success" })
          }
          setAttempts((n) => n + 1)
        }, 1200)
      }}
    >
      <div className="flex flex-col gap-1">
        <p className="text-body font-semibold">Voice profile (example form)</p>
        <p className="text-label text-muted-foreground">Submit empty to see validation. The first save fails on purpose.</p>
      </div>
      {status === "error" && (
        <Banner tone="danger" title="Couldn't save your profile" live="alert">
          Your answers are still here. Check your connection and try again.
        </Banner>
      )}
      {status === "success" && (
        <Banner tone="success" title="Saved" live="status">
          Example only — nothing was sent.
        </Banner>
      )}
      <FormField label="Profile name" required error={nameError} hint="Only you see this.">
        <Input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Founder voice" />
      </FormField>
      <FormField label="Comment goal" hint="What should a good comment achieve?">
        <Textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Add one useful point, then ask a real question" />
      </FormField>
      <FormField label="Length">
        <Select defaultValue="short">
          <option value="short">Short (1–2 sentences)</option>
          <option value="medium">Medium (3–4 sentences)</option>
          <option value="long">Long (a short paragraph)</option>
        </Select>
      </FormField>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" pending={status === "pending"} pendingLabel="Saving profile">
          Save profile
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setStatus("idle")
            setSubmitted(false)
            setName("")
            setGoal("")
            setAttempts(0)
          }}
        >
          Reset demo
        </Button>
      </div>
    </form>
  )
}

export function Controls() {
  const [checked, setChecked] = React.useState(true)
  const [notify, setNotify] = React.useState(true)

  return (
    <>
      <Section
        id="buttons"
        title="Buttons"
        description="44px default height, 48px for marketing primary actions. Compact sizes keep a 44px hit area. Pending keeps the width and blocks repeat clicks — important for anything that spends credits."
      >
        <div className="flex flex-col gap-8">
          <Specimen label="Variants">
            <div className="flex flex-wrap items-center gap-3">
              {VARIANTS.map((variant) => (
                <Button key={variant} variant={variant}>
                  {variant === "destructive" ? "Delete post" : variant[0].toUpperCase() + variant.slice(1)}
                </Button>
              ))}
            </div>
          </Specimen>
          <Specimen label="Sizes and icons">
            <div className="flex flex-wrap items-center gap-3">
              <Button size="xs" variant="outline">Extra small</Button>
              <Button size="sm" variant="outline">Small</Button>
              <Button>Default</Button>
              <Button size="lg">
                Start for free <ArrowRight aria-hidden />
              </Button>
              <Button size="icon-sm" variant="ghost" aria-label="Settings"><Settings /></Button>
              <Button size="icon" variant="outline" aria-label="Add"><Plus /></Button>
              <Button variant="secondary"><Download aria-hidden /> Download PDF</Button>
            </div>
          </Specimen>
          <Specimen label="States">
            <div className="flex flex-wrap items-center gap-3">
              <PendingDemo />
              <Button pending>Generating…</Button>
              <Button disabled>Disabled</Button>
              <Button variant="destructive" size="sm"><Trash2 aria-hidden /> Remove</Button>
              <Link href="#buttons" className={cn(buttonVariants({ variant: "outline" }))}>
                A link styled as a button
              </Link>
            </div>
          </Specimen>
          <Specimen label="Long label (wraps its container, never the text)">
            <div className="max-w-xs">
              <Button className="w-full">Connect your LinkedIn account to publish</Button>
            </div>
          </Specimen>
        </div>
      </Section>

      <Section
        id="forms"
        title="Forms"
        description="Every control has a visible label, hint and error wired for screen readers. Errors sit next to the field and keep what the user typed."
      >
        <div className="grid gap-8 lg:grid-cols-2">
          <DemoForm />
          <div className="flex flex-col gap-6">
            <Specimen label="Field states">
              <div className="flex flex-col gap-5 rounded-card border border-border bg-surface p-6">
                <FormField label="Default" hint="Helper text explains the field.">
                  <Input placeholder="Placeholder text" />
                </FormField>
                <FormField label="Invalid" error="This handle is already taken.">
                  <Input defaultValue="carouselabs" />
                </FormField>
                <FormField label="Disabled" disabled hint="Available on Pro.">
                  <Input defaultValue="Locked value" />
                </FormField>
                <FormField label="Compact (admin density)">
                  <Input density="compact" placeholder="Search users" />
                </FormField>
              </div>
            </Specimen>
            <Specimen label="Choices">
              <div className="flex flex-col gap-5 rounded-card border border-border bg-surface p-6">
                <CheckboxField
                  checked={checked}
                  onCheckedChange={setChecked}
                  label="Use my voice guidelines"
                  description="Applies your saved tone and rules to every caption."
                />
                <CheckboxField indeterminate label="Indeterminate (some selected)" />
                <RadioGroup defaultValue="square" aria-label="Image ratio">
                  <RadioField value="square" label="Square 1:1" description="Best for LinkedIn feed" />
                  <RadioField value="portrait" label="Portrait 4:5" description="More room on mobile" />
                  <RadioField value="landscape" label="Landscape 16:9" disabled description="Not available for carousels" />
                </RadioGroup>
                <div className="flex flex-col divide-y divide-border">
                  <SwitchField checked={notify} onCheckedChange={setNotify} label="Post published" description="Email me when a scheduled post goes live." />
                  <SwitchField defaultChecked={false} label="Weekly summary" />
                </div>
              </div>
            </Specimen>
          </div>
        </div>
      </Section>
    </>
  )
}
