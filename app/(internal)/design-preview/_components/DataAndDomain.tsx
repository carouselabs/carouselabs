"use client"

import * as React from "react"
import { Image as ImageIcon, Images, PenLine } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { StepProgress } from "@/components/patterns/StepProgress"
import { MetricCard } from "@/components/patterns/MetricCard"
import { DataTable } from "@/components/patterns/DataTable"
import { EmptyState } from "@/components/patterns/EmptyState"
import { OptionCard, OptionCardCheckbox, OptionCardGroup } from "@/components/patterns/OptionCard"
import { IdeaCard } from "@/components/patterns/IdeaCard"
import { CREDIT_COSTS } from "@/lib/creditActions"
import { exampleIdeas } from "../_demo/data"
import { Section, Specimen } from "./Section"

const ONBOARDING_STEPS = ["Your role", "Industry", "Topics", "Audience", "Goals", "Voice"]
const GOALS = ["Build personal brand", "Generate leads & clients", "Grow my audience", "Establish thought leadership"]

const ROWS = [
  { id: "r1", post: "Day two decides everything", format: "Carousel", status: "Scheduled", when: "Tue, Oct 14 · 9:00 AM" },
  { id: "r2", post: "Pricing pages that convert answer one question first", format: "Image + Caption", status: "Published", when: "Mon, Oct 6 · 8:30 AM" },
  { id: "r3", post: "The most useful feedback I ever got was one sentence long", format: "Caption Only", status: "Failed", when: "Sat, Oct 4 · 10:00 AM" },
]

export function DataAndDomain() {
  const [step, setStep] = React.useState(2)
  const [format, setFormat] = React.useState("caption")
  const [goals, setGoals] = React.useState<string[]>(["Grow my audience"])
  const [tableState, setTableState] = React.useState<"rows" | "loading" | "empty">("rows")
  const [pinned, setPinned] = React.useState<Record<string, boolean>>({ i4: true })

  return (
    <>
      <Section
        id="navigation"
        title="Navigation"
        description="Tabs scroll sideways on narrow screens instead of wrapping. The active tab is marked by shape, not only color. Step progress says “Step n of 6” — onboarding has six questions."
      >
        <div className="grid gap-8 lg:grid-cols-2">
          <Specimen label="Pill tabs (in-page views)">
            <Tabs defaultValue="month">
              <TabsList>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="list">List</TabsTrigger>
              </TabsList>
              <TabsContent value="month" className="text-muted-foreground">Month view content</TabsContent>
              <TabsContent value="week" className="text-muted-foreground">Week view content</TabsContent>
              <TabsContent value="list" className="text-muted-foreground">List view content</TabsContent>
            </Tabs>
          </Specimen>
          <Specimen label="Underline tabs (page sections, e.g. Settings)">
            <Tabs defaultValue="profile">
              <TabsList variant="line">
                {["Profile", "Voice Presets", "Billing", "Referrals", "Start Page", "Account"].map((tab) => (
                  <TabsTrigger key={tab} value={tab.toLowerCase().replace(" ", "-")}>
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </Specimen>
          <Specimen label="Step progress" className="lg:col-span-2">
            <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6">
              <StepProgress steps={ONBOARDING_STEPS} current={step} label="Onboarding progress" showNames />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</Button>
                <Button size="sm" disabled={step === ONBOARDING_STEPS.length - 1} onClick={() => setStep((s) => s + 1)}>Next</Button>
              </div>
            </div>
          </Specimen>
        </div>
      </Section>

      <Section
        id="data"
        title="Data"
        description="Tables keep semantic markup, a labeled scroll region on small screens and tabular numbers. Metrics that fail say “Unavailable”, never zero."
      >
        <div className="flex flex-col gap-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Posts this month" value="18" context="Oct 1–11" />
            <MetricCard label="Scheduled" value="6" context="Next: Tue 9:00 AM" />
            <MetricCard label="Credits left" loading />
            <MetricCard label="Engagement" failed context="LinkedIn didn't respond" />
          </div>
          <Specimen label="Table">
            <div className="flex flex-col gap-3">
              <div role="group" aria-label="Table state" className="flex flex-wrap gap-2">
                {(["rows", "loading", "empty"] as const).map((state) => (
                  <Button key={state} size="xs" variant={tableState === state ? "default" : "outline"} aria-pressed={tableState === state} onClick={() => setTableState(state)}>
                    {state === "rows" ? "With rows" : state === "loading" ? "Loading" : "Empty"}
                  </Button>
                ))}
              </div>
              <DataTable
                caption="Scheduled posts (example)"
                rows={tableState === "empty" ? [] : ROWS}
                loading={tableState === "loading"}
                getRowId={(row) => row.id}
                empty={<EmptyState variant="no-results" title="No posts in this range" description="Pick a different week or schedule a post." />}
                columns={[
                  { key: "post", header: "Post", cell: (row) => <span className="font-medium">{row.post}</span>, className: "min-w-56" },
                  { key: "format", header: "Format", cell: (row) => row.format, className: "whitespace-nowrap" },
                  {
                    key: "status",
                    header: "Status",
                    cell: (row) => (
                      <span className={row.status === "Failed" ? "font-medium text-danger" : row.status === "Published" ? "text-success" : "text-foreground"}>
                        {row.status}
                      </span>
                    ),
                  },
                  { key: "when", header: "When", cell: (row) => row.when, className: "whitespace-nowrap tabular-nums" },
                ]}
              />
            </div>
          </Specimen>
          <Specimen label="Card">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle>LinkedIn connection</CardTitle>
                <CardDescription>Needed to publish and schedule posts.</CardDescription>
              </CardHeader>
              <CardContent className="text-muted-foreground">Connected as Aarav Mehta (example).</CardContent>
              <CardFooter>
                <Button variant="outline" size="sm">Disconnect</Button>
              </CardFooter>
            </Card>
          </Specimen>
        </div>
      </Section>

      <Section
        id="domain"
        title="Product patterns"
        description="Option cards for onboarding, format, tone and ratio choices (arrow keys move between them). Idea cards with always-visible Pin and Dismiss. Costs come from the app's credit table."
      >
        <div className="flex flex-col gap-10">
          <Specimen label="Single choice — format picker (Free plan view)">
            <OptionCardGroup value={format} onValueChange={(value) => setFormat(value as string)} aria-label="Format">
              <OptionCard value="caption" icon={<PenLine />} title="Caption Only" description="A scroll-stopping caption, ready to post." meta={`${CREDIT_COSTS.caption_only} credits`} />
              <OptionCard value="image" icon={<ImageIcon />} title="Image + Caption" description="Caption and a single AI-generated visual." meta={`${CREDIT_COSTS.image_caption} credits`} />
              <OptionCard value="carousel" icon={<Images />} title="Caption + Slides" description="Caption and a full 7–8 slide carousel." meta={`${CREDIT_COSTS.carousel} credits`} locked lockLabel="Pro" />
            </OptionCardGroup>
          </Specimen>
          <Specimen label="Multiple choice — onboarding goals">
            <div role="group" aria-label="Content goals" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {GOALS.map((goal) => (
                <OptionCardCheckbox
                  key={goal}
                  title={goal}
                  checked={goals.includes(goal)}
                  onCheckedChange={(on) => setGoals((g) => (on ? [...g, goal] : g.filter((x) => x !== goal)))}
                />
              ))}
            </div>
          </Specimen>
          <Specimen label="Idea cards">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {exampleIdeas.slice(3, 6).map((idea, i) => (
                <IdeaCard
                  key={idea.id}
                  category={idea.category}
                  hook={idea.hook}
                  postType={idea.postType}
                  href="#domain"
                  selected={i === 0}
                  pinned={Boolean(pinned[idea.id])}
                  onPinnedChange={(on) => setPinned((p) => ({ ...p, [idea.id]: on }))}
                  onDismiss={() => undefined}
                />
              ))}
            </div>
          </Specimen>
        </div>
      </Section>
    </>
  )
}
