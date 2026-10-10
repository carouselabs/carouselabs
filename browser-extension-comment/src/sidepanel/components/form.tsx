import { useId, type ReactNode } from "react";
import { ChevronLeft, Plus, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// The pieces the three profile builders (comment, connection note, message)
// share, so they look and behave as one family.

export function FormField({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  /** Receives the id to put on the control, so the label names it. */
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
        {required && (
          <span aria-hidden className="ml-0.5 text-destructive">
            *
          </span>
        )}
      </label>
      {children(id)}
      {hint && <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  );
}

// A dropdown over a fixed list of words. A duplicated preset can carry a value
// the list doesn't offer (tone "Casual", goal "Quick genuine reaction"); it is
// added to the top, so the builder shows the setting it will actually save.
export function OptionSelect({
  id,
  value,
  onChange,
  options,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}) {
  const all = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id}>
        <SelectValue placeholder="Choose one" />
      </SelectTrigger>
      <SelectContent>
        {all.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Example texts in the user's own voice: one box each, removable, up to `max`.
export function SamplesField({
  label,
  hint,
  noun,
  samples,
  max,
  onChange,
}: {
  label: string;
  hint?: string;
  /** "sample", "example": names each box and the add button. */
  noun: string;
  samples: string[];
  max: number;
  onChange: (samples: string[]) => void;
}) {
  const Noun = noun[0].toUpperCase() + noun.slice(1);
  return (
    <fieldset className="space-y-1.5">
      <legend className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</legend>
      {samples.map((sample, index) => (
        <div key={index} className="flex items-start gap-1">
          <Textarea
            autoGrow
            aria-label={`${Noun} ${index + 1}`}
            value={sample}
            onChange={(e) => onChange(samples.map((s, i) => (i === index ? e.target.value : s)))}
            placeholder={`${Noun} ${index + 1}`}
            className="max-h-48 min-h-[3.75rem]"
          />
          {samples.length > 1 && (
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`Remove ${noun} ${index + 1}`}
              onClick={() => onChange(samples.filter((_, i) => i !== index))}
            >
              <X aria-hidden />
            </Button>
          )}
        </div>
      ))}
      {samples.length < max && (
        <Button size="sm" variant="outline" onClick={() => onChange([...samples, ""])}>
          <Plus aria-hidden />
          Add {noun}
        </Button>
      )}
      {hint && <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
    </fieldset>
  );
}

// A builder screen: a way back at the top, the fields, and Save pinned to the
// bottom of the panel so it is always in reach on a long form. A failed save
// says why right there, next to the button that was pressed.
export function FormLayout({
  title,
  onCancel,
  busy,
  error,
  saveLabel,
  saving,
  canSave,
  onSave,
  children,
}: {
  title: string;
  onCancel: () => void;
  busy: boolean;
  error: string | null;
  saveLabel: string;
  saving: boolean;
  canSave: boolean;
  onSave: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-col gap-4 p-4">
        <div className="space-y-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="-ml-1 inline-flex items-center gap-0.5 rounded px-1 text-xs font-medium text-muted-foreground transition-colors duration-fast hover:text-foreground disabled:opacity-50"
          >
            <ChevronLeft aria-hidden className="h-3.5 w-3.5" />
            Profiles
          </button>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        </div>
        {children}
      </div>

      <div className="sticky bottom-0 mt-auto space-y-2 border-t bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        {error && <Alert>{error}</Alert>}
        <div className="flex gap-2">
          <Button className="flex-1" disabled={!canSave || busy} loading={saving} onClick={onSave}>
            {saving ? "Saving…" : saveLabel}
          </Button>
          <Button variant="outline" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DefaultCheckbox({
  checked,
  onChange,
  label = "Use this profile by default",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="h-4 w-4 shrink-0 accent-primary"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
