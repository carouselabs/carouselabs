import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Small sentence-case labels ("Reply", "Image post"). 11px is the smallest
// text in the panel; anything that needs reading at a glance is bigger.
const badgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium leading-4",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground",
        accent: "bg-accent text-accent-foreground",
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
