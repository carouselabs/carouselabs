// Shared classes for the Content Hub side panel and its tools.
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { controlClasses } from "@/components/ui/input"

/** Small icon-only action (edit, pause, delete…) in a row. */
export const iconAction = buttonVariants({
  variant: "ghost",
  size: "icon-sm",
  className: "text-muted-foreground hover:text-foreground",
})

/** Inputs and selects inside the side panel. */
export const fieldClasses = cn(controlClasses, "h-10 px-3")
