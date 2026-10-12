// Shared admin table classes. Plain strings in a plain module, so server
// pages can use them too (an export of a "use client" module can't be read as
// a value on the server). components/admin/ui.tsx re-exports them.
export const tableCls = {
  wrap: "relative overflow-x-auto rounded-card border border-border bg-surface",
  table: "w-full text-left text-caption sm:text-label",
  th: "whitespace-nowrap border-b border-border bg-surface-muted/60 px-4 py-2.5 text-caption font-medium text-muted-foreground",
  td: "whitespace-nowrap border-b border-border/60 px-4 py-3 text-foreground/90",
  row: "transition-colors duration-(--motion-fast) hover:bg-surface-muted/50 [&:last-child>td]:border-b-0",
}
