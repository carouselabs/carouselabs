"use client"

import * as React from "react"
import { CalendarDays, Copy, FileText, Info, MoreHorizontal, Pencil, Search, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge, StatusBadge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress"
import { Tooltip } from "@/components/ui/tooltip"
import { useToast } from "@/components/ui/toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"
import { Banner } from "@/components/patterns/Banner"
import { EmptyState } from "@/components/patterns/EmptyState"
import { ErrorState } from "@/components/patterns/ErrorState"
import { CREDIT_COSTS } from "@/lib/creditActions"
import { Section, Specimen } from "./Section"

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5">
      <Skeleton className="h-3.5 w-28" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <Skeleton className="mt-2 h-4 w-24" />
    </div>
  )
}

function RetryDemo() {
  const [pending, setPending] = React.useState(false)
  return (
    <ErrorState
      title="We couldn't generate ideas"
      description="Your topic is saved. No credits were used."
      onRetry={() => {
        setPending(true)
        window.setTimeout(() => setPending(false), 1500)
      }}
      retryPending={pending}
      details="POST /api/ideas/generate → 503 (example)"
    />
  )
}

function ConfirmDemo() {
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Trash2 aria-hidden /> Delete from history
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        tone="danger"
        title="Delete this post from history?"
        description="The caption, images and versions are removed for good. Credits already used aren't refunded."
        confirmLabel="Delete post"
        pending={pending}
        onConfirm={() => {
          setPending(true)
          window.setTimeout(() => {
            setPending(false)
            setOpen(false)
          }, 1200)
        }}
      />
    </>
  )
}

export function Feedback() {
  const toast = useToast()
  const [dismissed, setDismissed] = React.useState(false)

  return (
    <>
      <Section
        id="feedback"
        title="Feedback, loading and empty states"
        description="Notices keep their current rules; only the presentation changes. Loading reserves the final layout. A failed metric or request is never shown as zero."
      >
        <div className="flex flex-col gap-10">
          <Specimen label="Banners">
            <div className="flex flex-col gap-3">
              <Banner tone="warning" title="Scheduled maintenance tonight, 11pm–12am IST">
                Generation may be slow. Your drafts are safe.
              </Banner>
              <Banner
                tone="danger"
                title="You've used all your free credits"
                action={<Button size="sm">See plans</Button>}
              >
                Upgrade to keep creating. Everything you made stays in History.
              </Banner>
              <Banner tone="brand" title="We pre-filled your profile" action={<Button size="sm" variant="outline">Review profile</Button>}>
                Check the answers so your ideas match your business.
              </Banner>
              {!dismissed && (
                <Banner
                  tone="info"
                  title="Invite people who'd use CarouseLabs"
                  action={<Button size="sm" variant="ghost">Get your link</Button>}
                  onDismiss={() => setDismissed(true)}
                >
                  Share your referral link from Settings → Referrals.
                </Banner>
              )}
              <Banner tone="success" title="Posted to LinkedIn">Your carousel is live.</Banner>
            </div>
          </Specimen>

          <Specimen label="Toasts (only when an inline confirmation would be missed)">
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => toast.show({ title: "Link copied" })}>Neutral toast</Button>
              <Button variant="outline" onClick={() => toast.show({ title: "Post scheduled", description: "Tue, Oct 14 at 9:00 AM", tone: "success" })}>
                Success toast
              </Button>
              <Button variant="outline" onClick={() => toast.show({ title: "Couldn't reach LinkedIn", description: "Nothing was posted. Try again in a minute.", tone: "danger" })}>
                Error toast
              </Button>
            </div>
          </Specimen>

          <div className="grid gap-6 lg:grid-cols-2">
            <Specimen label="Empty: first use">
              <EmptyState
                icon={<CalendarDays />}
                title="Nothing scheduled yet"
                description="Schedule a post from any finished caption, image or carousel and it shows up here."
                action={<Button>Create a post</Button>}
              />
            </Specimen>
            <Specimen label="Empty: no results">
              <div className="rounded-card border border-border bg-surface">
                <EmptyState
                  variant="no-results"
                  title="No posts match “pricing”"
                  description="Try a different word or clear the search."
                  action={<Button variant="outline" size="sm"><Search aria-hidden /> Clear search</Button>}
                />
              </div>
            </Specimen>
            <Specimen label="Error next to the task, safe retry">
              <RetryDemo />
            </Specimen>
            <Specimen label="Loading: reserve the final layout">
              <div className="grid gap-3 sm:grid-cols-2">
                <CardSkeleton />
                <CardSkeleton />
              </div>
            </Specimen>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Specimen label="Progress (real values only)">
              <Progress value={64} className="rounded-card border border-border bg-surface p-5">
                <ProgressLabel>Credits used this month</ProgressLabel>
                <ProgressValue />
              </Progress>
            </Specimen>
            <Specimen label="Badges and status">
              <div className="flex flex-wrap gap-2 rounded-card border border-border bg-surface p-5">
                <Badge>Draft</Badge>
                <Badge variant="brand">Most Popular</Badge>
                <Badge variant="outline">Studio</Badge>
                <StatusBadge status="success">Published</StatusBadge>
                <StatusBadge status="warning">Past due</StatusBadge>
                <StatusBadge status="danger">Failed</StatusBadge>
                <StatusBadge status="neutral">Scheduled</StatusBadge>
              </div>
            </Specimen>
            <Specimen label="Tooltip (supplementary only)">
              <div className="flex items-center gap-2 rounded-card border border-border bg-surface p-5">
                <Tooltip content="Credits reset on the 1st of each month">
                  <Button variant="ghost" size="icon-sm" aria-label="About credits"><Info /></Button>
                </Tooltip>
                <span className="text-label text-muted-foreground">Hover or focus the icon</span>
              </div>
            </Specimen>
          </div>
        </div>
      </Section>

      <Section
        id="overlays"
        title="Overlays"
        description="Focus moves in, Escape closes, the page behind doesn't scroll, and focus returns to the trigger. Confirmations for destructive actions put focus on Cancel."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Dialog>
            <DialogTrigger render={<Button variant="outline" />}>Open dialog</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Lock in this format?</DialogTitle>
                <DialogDescription>
                  You can switch formats later by starting a new session from History. Nothing is charged until you generate.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>Not yet</DialogClose>
                <DialogClose render={<Button />}>Lock it in</DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <ConfirmDemo />

          <Drawer>
            <DrawerTrigger render={<Button variant="outline" />}>Open side drawer</DrawerTrigger>
            <DrawerContent title="Queue settings" description="When scheduled posts go out.">
              <p className="text-label text-muted-foreground">Drawer content uses the same form components as pages.</p>
            </DrawerContent>
          </Drawer>

          <Drawer>
            <DrawerTrigger render={<Button variant="outline" />}>Open bottom sheet</DrawerTrigger>
            <DrawerContent side="bottom" title="Post actions">
              <div className="flex flex-col gap-2">
                <Button variant="secondary" className="justify-start"><Copy aria-hidden /> Copy caption</Button>
                <Button variant="secondary" className="justify-start"><FileText aria-hidden /> Download PDF</Button>
              </div>
            </DrawerContent>
          </Drawer>

          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label="More actions" />}>
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem><Pencil /> Edit</DropdownMenuItem>
              <DropdownMenuItem><Copy /> Duplicate</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive"><Trash2 /> Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover>
            <PopoverTrigger render={<Button variant="outline" />}>How credits work</PopoverTrigger>
            <PopoverContent>
              <PopoverTitle>How credits work</PopoverTitle>
              <PopoverDescription>
                Caption Only {CREDIT_COSTS.caption_only} · Image + Caption {CREDIT_COSTS.image_caption} · Carousel{" "}
                {CREDIT_COSTS.carousel}. Regenerate caption {CREDIT_COSTS.text_regen}, image or slide {CREDIT_COSTS.image_regen}.
              </PopoverDescription>
            </PopoverContent>
          </Popover>
        </div>
      </Section>
    </>
  )
}
