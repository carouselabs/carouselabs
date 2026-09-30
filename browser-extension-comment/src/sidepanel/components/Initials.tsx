import { cn } from "@/lib/utils";

// "Priya Raman-Venkataraghavan, PhD" -> "PR". Code points, not UTF-16 units,
// so a name starting with an emoji or a non-Latin letter isn't split in half.
export function initials(name: string): string {
  const words = name.replace(/[,(|].*$/, "").trim().split(/\s+/).filter(Boolean);
  const first = Array.from(words[0] ?? "")[0] ?? "";
  const last = words.length > 1 ? (Array.from(words[words.length - 1])[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

// A person's initials in a circle, beside their name on a post, profile or
// conversation. Decorative: the name itself is always written next to it.
export function Initials({ name, className }: { name: string; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground",
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}
