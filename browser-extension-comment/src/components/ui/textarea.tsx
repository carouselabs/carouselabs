import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Grow with the text (field-sizing, Chrome 123+) between the min and max
   *  heights set in className, instead of scrolling inside a fixed box. */
  autoGrow?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoGrow = false, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "block w-full rounded-md border border-input bg-card px-3 py-2 text-sm leading-relaxed text-foreground shadow-sm transition-[border-color,box-shadow] duration-fast ease-out",
        "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
        "disabled:cursor-not-allowed disabled:opacity-50 read-only:cursor-default",
        autoGrow ? "resize-none [field-sizing:content]" : "resize-y",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export { Textarea };
