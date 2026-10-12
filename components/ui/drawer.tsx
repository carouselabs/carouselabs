"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// A side or bottom sheet built on the Dialog primitive, so it inherits focus
// trapping, Escape, scroll locking and focus restoration.
const Drawer = DialogPrimitive.Root
const DrawerTrigger = DialogPrimitive.Trigger
const DrawerClose = DialogPrimitive.Close

const sideClasses = {
  right:
    "inset-y-0 right-0 h-dvh w-full max-w-md border-l data-open:slide-in-from-right data-closed:slide-out-to-right",
  left: "inset-y-0 left-0 h-dvh w-full max-w-sm border-r data-open:slide-in-from-left data-closed:slide-out-to-left",
  bottom:
    "inset-x-0 bottom-0 max-h-[85dvh] w-full rounded-t-showcase border-t pb-[max(1.5rem,env(safe-area-inset-bottom))] data-open:slide-in-from-bottom data-closed:slide-out-to-bottom",
} as const

function DrawerContent({
  side = "right",
  title,
  description,
  className,
  children,
  ...props
}: DialogPrimitive.Popup.Props & {
  side?: keyof typeof sideClasses
  title: React.ReactNode
  description?: React.ReactNode
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-(--z-dialog) bg-overlay duration-(--motion-panel) data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
      <DialogPrimitive.Popup
        className={cn(
          "fixed z-(--z-dialog) flex flex-col gap-4 overflow-y-auto border-border bg-surface-raised p-6 text-label text-foreground shadow-dialog duration-(--motion-panel) ease-entry outline-none data-open:animate-in data-closed:animate-out",
          sideClasses[side],
          className
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <DialogPrimitive.Title className="text-lead font-semibold tracking-[-0.01em]">
              {title}
            </DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description className="text-label text-muted-foreground">
                {description}
              </DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close render={<Button variant="ghost" size="icon-sm" className="-mt-1 -mr-2" />}>
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

export { Drawer, DrawerTrigger, DrawerClose, DrawerContent }
