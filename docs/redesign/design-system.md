# Design system — decisions

The tokens live in `app/globals.css`; the kit in `components/ui/` (primitives) and `components/patterns/` (composed patterns). See everything rendered at `/design-preview` (development only).

## Where this deliberately differs from the brief

| Brief said | Built | Why |
| --- | --- | --- |
| Violet token named `accent` | Named `brand` (`brand`, `brand-hover`, `brand-soft`, `brand-foreground`); `accent` stays the quiet hover surface | shadcn, Magic UI and React Bits components use `bg-accent` for hover/focus surfaces. Making it violet would turn every installed component's hover purple |
| Radius tokens sm 8 / md 12 / lg 16 … | `rounded-detail` 4 · `rounded-control-sm` 8 · `rounded-control` 12 · `rounded-card` 16 · `rounded-showcase` 24 | Today's hand-styled pages use `rounded-xl` etc. on the legacy scale; new names leave them untouched until they migrate |
| Shadows sm / md / lg | `shadow-card` · `shadow-popover` · `shadow-dialog`, values switch per theme | Same reason, and semantic names read better in components |
| Dark theme via the existing `.dark` class | `[data-theme="dark"]` on a subtree; `[data-theme="light"]` re-applies light inside it | `<html>` always carries `.dark` and three legacy files depend on `dark:` classes being on. Flipping `.dark` would restyle live pages |
| Load Geist + Instrument Serif | Loaded by `lib/fonts.ts`, applied per layout through `fontVariables`; utilities `font-ui`, `font-display` | Pages that haven't migrated don't download the new fonts. Onest/Inter are removed only when their last consumer migrates |
| Select | Styled native `<select>` | Free keyboard, screen-reader and mobile-picker support |
| Drawer | Built on the Dialog primitive | Inherits focus trap, Escape, scroll lock and focus return |

## Tokens

Colors (light / dark), all text pairs ≥ 4.5:1 and control edges ≥ 3:1 in both themes (checked with a WCAG contrast script):

| Token | Light | Dark |
| --- | --- | --- |
| background | #F9F7F2 | #171614 |
| surface | #FFFDF9 | #201E1B |
| surface-raised | #FFFFFF | #282521 |
| surface-muted | #F0ECE5 | #24211D |
| foreground | #211F1C | #F5F0E7 |
| muted-foreground | #67625B | #B5AFA4 |
| border (decorative) | #DED8CD | #3A352F |
| control-border | #8C857B | #847B70 |
| primary / primary-foreground / primary-hover | #211F1C / #FFFDF9 / #39352F | #F5F0E7 / #211F1C / #E3DBCE |
| brand / brand-hover / brand-soft / brand-foreground | #6D28D9 / #5B21B6 / #EEE8FA / #FFFFFF | #C4A7FF / #D6C2FF / #332343 / #211431 |
| success / success-soft | #166534 / #E9F5ED | #86EFAC / #123421 |
| warning / warning-soft | #854D0E / #FFF4D6 | #FACC15 / #3A2B13 |
| danger / danger-soft / danger-foreground | #B91C1C / #FEF0EF / #FFFFFF | #FCA5A5 / #3E2020 / #211F1C |
| focus-ring, overlay, skeleton, selection, chart-1…5 | defined centrally | defined centrally |

Type (`text-*`): caption 12/18 · label 14/20 · body 16/24 · body-lg 18/28 · lead 20/30 · title-sm 24/32 · title 32/40 · section 32–52 fluid · display 42–76 fluid. Headings track −0.02 to −0.035em.

Layout: `max-w-form` 560 · `max-w-reading` 720 · `max-w-marketing` 1200 · `max-w-showcase` 1320; `gutter-x` (20/32/48px); `section-y` (56–128px). Spacing uses Tailwind's 4px scale.

Motion: `--motion-fast` 120ms · `normal` 180 · `panel` 240 · `reveal` 420 · `max` 600; `ease-entry`, `ease-standard`, `ease-exit`. JS values in `lib/motion.ts`. Reduced motion is honored globally.

Layers: `--z-sticky` 20 · `header` 40 · `dialog` 50 · `popover` 60 · `tooltip` 70 · `toast` 80.

`cn()` (`lib/utils.ts`) knows these names; without that, `cn("text-body text-foreground")` silently dropped the size.

## Kit

Primitives (`components/ui`): Button (variants primary/brand/secondary/outline/ghost/destructive/link, pending state), FormField, Input, Textarea, Select, Checkbox(+Field), Switch(+Field), RadioGroup/Radio(+Field), Label, Card, Badge, StatusBadge, Separator, Skeleton, Progress, Accordion, Avatar, Tabs (pill + underline), Tooltip, Popover, Dialog, ConfirmDialog (alertdialog, focus on Cancel), Drawer (right/left/bottom), DropdownMenu, Toast (`ToastProvider` + `useToast`).

Patterns (`components/patterns`): SectionHeader, PageHeader, EmptyState (first-use / no-results), ErrorState (safe retry), Banner, MetricCard (failed = "Unavailable"), DataTable (comfortable / compact), ProductFrame, FeatureTile, StepProgress, OptionCard (single + multi), IdeaCard, TopicComposer, StudioPreview, BrandMark (proposal).

Still to build in the phase that first needs them: PlanCard/ExtensionPlanCard rebuild (1), ToneCard/RatioCard variants of OptionCard, UploadField, PreviewPanel, CreditCost, UsageMeter (3–4), app theme control with no-flash script (3).

## Admin adapter plan (Phase 5)

| `components/admin/ui.tsx` | Becomes |
| --- | --- |
| AdminButton | Button `size="sm"` |
| AdminInput / AdminSelect | Input / Select `density="compact"` |
| AdminCard | Card `size="sm"` |
| StatCard | MetricCard `density="compact"` |
| Modal / ConfirmModal | Dialog / ConfirmDialog |
| Spinner | Button `pending` or Skeleton |
| tableCls | DataTable `density="compact"` |
| PlanBadge | Badge |

Adapters keep the old exports so callers migrate one page at a time; the file is deleted only when no caller remains.
