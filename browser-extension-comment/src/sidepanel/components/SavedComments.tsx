// src/sidepanel/components/SavedComments.tsx — Saved comments on the Write
// screen (src/lib/savedComments.ts):
//
//   SavedCommentsSection   the list: Insert or Copy in one tap, star, edit,
//                          delete, write a new one, search when it's long.
//   SavedCommentReminder   the first time a post is opened: "add your usual
//                          comment?", ready to insert.
//
// The website shows and edits the same list (Engage → Saved comments).
import { useId, useState, type FormEvent } from "react";
import { BellRing, Bookmark, Check, ChevronDown, Copy, ExternalLink, Pencil, Plus, Search, Star, Trash2, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { SAVED_COMMENT_MAX, type RemindOn, type SavedComment, type SavedCommentFields } from "@/lib/savedComments";
import type { SavedStatus } from "../useSavedComments";

const REMIND_OPTIONS: { value: RemindOn; label: string }[] = [
  { value: "own", label: "My own posts" },
  { value: "any", label: "Every post" },
  { value: "off", label: "Never" },
];

// ── One saved comment's actions ─────────────────────────────────────────────

function useCopied() {
  const [copied, setCopied] = useState<string | null>(null);
  return {
    copied,
    flash(id: string) {
      setCopied(id);
      setTimeout(() => setCopied((current) => (current === id ? null : current)), 1500);
    },
  };
}

// ── The editor ──────────────────────────────────────────────────────────────

function SavedCommentEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: SavedComment | null;
  onSave: (fields: SavedCommentFields & { body: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const id = useId();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [remindOn, setRemindOn] = useState<RemindOn>(initial?.remindOn ?? "own");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const length = body.trim().length;
  const tooLong = length > SAVED_COMMENT_MAX;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!length || tooLong) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({ title, body, remindOn });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save it. Try again.");
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      aria-label={initial ? "Edit saved comment" : "New saved comment"}
      className="animate-fade-in space-y-2.5 rounded-2xl border border-primary/25 bg-card p-3 shadow-sm"
    >
      <div className="space-y-1">
        <label htmlFor={`${id}-title`} className="text-xs font-medium text-muted-foreground">
          Name <span className="font-normal">(optional)</span>
        </label>
        <Input
          id={`${id}-title`}
          value={title}
          maxLength={80}
          placeholder="Taken from the first line"
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <div className="flex items-baseline justify-between text-xs font-medium text-muted-foreground">
          <label htmlFor={`${id}-body`}>Comment</label>
          <span id={`${id}-count`} className={cn("tabular-nums", tooLong && "font-semibold text-destructive")}>
            {length.toLocaleString("en-US")} / 1,250
          </span>
        </div>
        <Textarea
          id={`${id}-body`}
          aria-describedby={`${id}-count`}
          autoGrow
          rows={3}
          value={body}
          placeholder="Exactly what you post. Line breaks, emoji and links stay."
          onChange={(e) => setBody(e.target.value)}
          className="max-h-60 min-h-[4.5rem]"
        />
      </div>
      <fieldset className="space-y-1.5">
        <legend className="text-xs font-medium text-muted-foreground">Remind me the first time I open</legend>
        <div className="flex flex-wrap gap-1.5">
          {REMIND_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs font-medium has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
            >
              <input
                type="radio"
                name={`${id}-remind`}
                value={option.value}
                checked={remindOn === option.value}
                onChange={() => setRemindOn(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      {error && <Alert>{error}</Alert>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={saving} disabled={!length || tooLong}>
          {initial ? "Save changes" : "Save comment"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ── The list ────────────────────────────────────────────────────────────────

export function SavedCommentsSection({
  list,
  status,
  canInsert,
  inserting,
  error,
  onInsert,
  onCopy,
  onCreate,
  onUpdate,
  onDelete,
  onRetry,
  onOpenWebsite,
}: {
  list: SavedComment[];
  status: SavedStatus;
  // Insert needs a post picked on LinkedIn; without one, Copy only.
  canInsert: boolean;
  inserting: boolean;
  error: string | null;
  onInsert: (comment: SavedComment) => void;
  onCopy: (comment: SavedComment) => Promise<boolean>;
  onCreate: (fields: SavedCommentFields & { body: string }) => Promise<unknown>;
  onUpdate: (id: string, fields: SavedCommentFields) => Promise<unknown>;
  onDelete: (id: string) => Promise<void>;
  onRetry: () => void;
  onOpenWebsite: () => void;
}) {
  const headingId = useId();
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState<SavedComment | "new" | null>(null);
  const [query, setQuery] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { copied, flash } = useCopied();

  const q = query.trim().toLowerCase();
  const shown = q ? list.filter((c) => c.title.toLowerCase().includes(q) || c.body.toLowerCase().includes(q)) : list;

  async function act(run: () => Promise<unknown>) {
    setActionError(null);
    try {
      await run();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "That didn't work. Try again.");
    }
  }

  return (
    <section aria-labelledby={headingId} className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="-mx-1 flex min-h-8 items-center gap-1.5 rounded-md px-1 text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Bookmark aria-hidden className="h-3.5 w-3.5" />
          <span id={headingId}>Saved comments</span>
          {list.length > 0 && <span className="font-normal">({list.length})</span>}
          <ChevronDown aria-hidden className={cn("h-3.5 w-3.5 transition-transform duration-fast", !open && "-rotate-90")} />
        </button>
        {open && editing === null && status === "ready" && (
          <Button size="sm" variant="ghost" className="px-2" onClick={() => setEditing("new")}>
            <Plus aria-hidden />
            New
          </Button>
        )}
      </div>

      {open && (
        <div className="space-y-2">
          {status === "loading" && <p className="text-xs text-muted-foreground">Loading your saved comments…</p>}
          {/* Quiet, not an alert: the list sits beside writing, and writing
              still works without it. */}
          {status === "error" && (
            <p className="text-xs text-muted-foreground">
              Couldn&apos;t load your saved comments.{" "}
              <button type="button" onClick={onRetry} className="font-semibold text-foreground underline underline-offset-2">
                Try again
              </button>
            </p>
          )}

          {editing !== null && (
            <SavedCommentEditor
              key={editing === "new" ? "new" : editing.id}
              initial={editing === "new" ? null : editing}
              onCancel={() => setEditing(null)}
              onSave={async (fields) => {
                if (editing === "new") await onCreate(fields);
                else await onUpdate(editing.id, fields);
                setEditing(null);
              }}
            />
          )}

          {(error || actionError) && <Alert>{error ?? actionError}</Alert>}

          {status === "ready" && list.length === 0 && editing === null && (
            <div className="space-y-2 rounded-2xl border border-dashed p-3">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Keep the comment you post every time, like the one you pin under your videos, and add it in one tap. You
                can also tap <strong className="font-semibold text-foreground">Save</strong> on any comment Engage writes.
              </p>
              <Button size="sm" variant="outline" onClick={() => setEditing("new")}>
                <Plus aria-hidden />
                New saved comment
              </Button>
            </div>
          )}

          {list.length > 4 && (
            <div className="relative">
              <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                aria-label="Search saved comments"
                placeholder="Search saved comments"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          )}

          {list.length > 0 && (
            <ul className="space-y-2">
              {shown.map((c) => (
                <li key={c.id} className="space-y-2 rounded-2xl border bg-card p-3 shadow-sm">
                  <div className="flex items-start gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold" title={c.title}>
                      {c.title}
                    </span>
                    <button
                      type="button"
                      aria-pressed={c.favorite}
                      aria-label={c.favorite ? `Remove from favorites: ${c.title}` : `Add to favorites: ${c.title}`}
                      onClick={() => void act(() => onUpdate(c.id, { favorite: !c.favorite }))}
                      className="-m-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground aria-pressed:text-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Star aria-hidden className={cn("h-4 w-4", c.favorite && "fill-current")} />
                    </button>
                  </div>
                  <p className="line-clamp-3 whitespace-pre-line text-xs leading-relaxed text-foreground/80">{c.body}</p>
                  {confirming === c.id ? (
                    <div role="alert" className="flex flex-wrap items-center gap-2 rounded-xl bg-destructive-soft p-2 text-xs">
                      <span className="flex-1">Delete it here and on the website?</span>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          void act(async () => {
                            await onDelete(c.id);
                            setConfirming(null);
                          })
                        }
                      >
                        Delete
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                        Keep
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      {canInsert && (
                        <Button size="sm" disabled={inserting} onClick={() => onInsert(c)} aria-label={`Insert: ${c.title}`}>
                          Insert
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label={`Copy: ${c.title}`}
                        onClick={() =>
                          void onCopy(c).then((ok) => {
                            if (ok) flash(c.id);
                          })
                        }
                      >
                        {copied === c.id ? <Check aria-hidden /> : <Copy aria-hidden />}
                        {copied === c.id ? "Copied" : "Copy"}
                      </Button>
                      <span className="ml-auto flex">
                        <Button size="icon-sm" variant="ghost" aria-label={`Edit: ${c.title}`} onClick={() => setEditing(c)}>
                          <Pencil aria-hidden />
                        </Button>
                        <Button size="icon-sm" variant="ghost" aria-label={`Delete: ${c.title}`} onClick={() => setConfirming(c.id)}>
                          <Trash2 aria-hidden />
                        </Button>
                      </span>
                    </div>
                  )}
                </li>
              ))}
              {shown.length === 0 && <li className="text-xs text-muted-foreground">No saved comment matches that.</li>}
            </ul>
          )}

          {list.length > 0 && !canInsert && (
            <p className="text-xs text-muted-foreground">Click Comment under a post on LinkedIn to insert one there.</p>
          )}
          {status === "ready" && (
            <button
              type="button"
              onClick={onOpenWebsite}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary-text hover:underline"
            >
              Manage, import and export on the website
              <ExternalLink aria-hidden className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </section>
  );
}

// ── The first-visit reminder ────────────────────────────────────────────────

export function SavedCommentReminder({
  candidates,
  isOwnPost,
  canInsert,
  inserting,
  error,
  onInsert,
  onCopy,
  onDismiss,
}: {
  // In the list's order; the first is offered, the rest can be picked.
  candidates: SavedComment[];
  isOwnPost: boolean;
  canInsert: boolean;
  inserting: boolean;
  error: string | null;
  onInsert: (comment: SavedComment) => void;
  onCopy: (comment: SavedComment) => Promise<boolean>;
  onDismiss: () => void;
}) {
  const [pickedId, setPickedId] = useState(candidates[0]?.id);
  const [copied, setCopied] = useState(false);
  const picked = candidates.find((c) => c.id === pickedId) ?? candidates[0];
  if (!picked) return null;

  return (
    <section
      aria-label="Your usual comment"
      className="animate-fade-in space-y-2.5 rounded-2xl border border-primary/30 bg-card p-3 shadow-sm"
    >
      <div className="flex items-start gap-2">
        <BellRing aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary-text" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">First time on this post</p>
          <p className="text-xs text-muted-foreground">Add your usual comment?</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Not now"
          className="-m-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      </div>

      {candidates.length > 1 && (
        <div role="radiogroup" aria-label="Which saved comment" className="flex flex-wrap gap-1.5">
          {candidates.slice(0, 4).map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={c.id === picked.id}
              onClick={() => setPickedId(c.id)}
              className="h-7 max-w-[11rem] truncate rounded-full border px-2.5 text-xs font-medium aria-checked:border-primary aria-checked:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {c.title}
            </button>
          ))}
        </div>
      )}

      <p className="line-clamp-4 whitespace-pre-line rounded-xl bg-muted/60 p-2.5 text-xs leading-relaxed text-foreground/85">
        {picked.body}
      </p>
      {error && <Alert>{error}</Alert>}
      <div className="flex items-center gap-1.5">
        {canInsert && (
          <Button size="sm" disabled={inserting} onClick={() => onInsert(picked)}>
            Insert
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            void onCopy(picked).then((ok) => {
              if (!ok) return;
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            })
          }
        >
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      {isOwnPost && (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          To pin it: once it&apos;s posted, open the ⋯ on your comment and choose Pin.
        </p>
      )}
    </section>
  );
}
