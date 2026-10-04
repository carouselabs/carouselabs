import * as React from "react";
import { cn } from "@/lib/utils";

// A one-line text field, styled like Textarea so forms read as one set.
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "block h-9 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-sm transition-[border-color,box-shadow] duration-fast ease-out",
        "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
