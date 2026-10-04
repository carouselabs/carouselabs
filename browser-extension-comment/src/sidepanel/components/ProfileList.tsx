import { useState, type ReactNode } from "react";
import { Copy, ExternalLink, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip } from "@/components/ui/tooltip";
import { RecommendedBadge } from "./RecommendedBadge";

interface ListProfile {
  id: string;
  name: string;
  isSystem: boolean;
  isRecommended: boolean;
}

interface Props<P extends ListProfile> {
  /** Screen title and the kind switch, above the list. */
  header: ReactNode;
  title: string;
  loading: boolean;
  error: string | null;
  profiles: P[];
  /** One line on what the profile does. */
  summary: (profile: P) => string;
  /** Optional second line (e.g. goal · length). */
  meta?: (profile: P) => string | null;
  defaultId: string | null | undefined;
  pendingId: string | null;
  onNew: () => void;
  onEdit: (profile: P) => void;
  onDuplicate: (profile: P) => void;
  onSetDefault: (profile: P) => void;
  onDelete: (profile: P) => void;
  /** Link to edit on the website, where one exists. */
  websiteLink?: { label: string; onClick: () => void };
}

// The list of one kind of profile (comments, connection notes, messages).
// Presets are shared by every user, so they can only be duplicated; the
// user's own can be edited, made the default, or deleted — after a check,
// since a deleted profile can't be brought back.
export function ProfileList<P extends ListProfile>({
  header,
  title,
  loading,
  error,
  profiles,
  summary,
  meta,
  defaultId,
  pendingId,
  onNew,
  onEdit,
  onDuplicate,
  onSetDefault,
  onDelete,
  websiteLink,
}: Props<P>) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const custom = profiles.filter((p) => !p.isSystem);
  const recommended = profiles.filter((p) => p.isRecommended);
  const builtIn = profiles.filter((p) => p.isSystem && !p.isRecommended);

  function row(profile: P) {
    const isDefault = defaultId === profile.id;
    const pending = pendingId === profile.id;
    const confirming = confirmingId === profile.id;
    const line = meta?.(profile);

    return (
      <li key={profile.id} className="space-y-1.5 px-3 py-3">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className="min-w-0 break-words text-sm font-medium">{profile.name}</span>
          {profile.isRecommended && <RecommendedBadge />}
          {isDefault && <Badge variant="success">Default</Badge>}
        </div>
        {summary(profile) && <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{summary(profile)}</p>}
        {line && <p className="text-xs text-muted-foreground">{line}</p>}

        {confirming ? (
          <div role="group" aria-label={`Delete ${profile.name}?`} className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="text-xs font-medium text-destructive">Delete this profile?</span>
            <Button
              size="sm"
              variant="destructive"
              className="h-7 px-2.5"
              loading={pending}
              onClick={() => {
                onDelete(profile);
                setConfirmingId(null);
              }}
            >
              Delete
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2.5" onClick={() => setConfirmingId(null)}>
              Keep it
            </Button>
          </div>
        ) : (
          <div className="-ml-2 flex flex-wrap items-center gap-0.5">
            {!profile.isSystem && (
              <Button size="sm" variant="ghost" className="h-7 px-2" disabled={pending} onClick={() => onEdit(profile)}>
                <Pencil aria-hidden className="!size-3.5" />
                Edit
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 px-2" disabled={pending} onClick={() => onDuplicate(profile)}>
              <Copy aria-hidden className="!size-3.5" />
              Duplicate
            </Button>
            {!profile.isSystem && !isDefault && (
              <Button size="sm" variant="ghost" className="h-7 px-2" loading={pending} onClick={() => onSetDefault(profile)}>
                {!pending && <Star aria-hidden className="!size-3.5" />}
                Make default
              </Button>
            )}
            {/* An icon at the far end, away from the everyday actions. */}
            {!profile.isSystem && (
              <Tooltip label="Delete" side="top-end" className="ml-auto">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Delete"
                  className="h-7 w-7 hover:bg-destructive-soft hover:text-destructive"
                  disabled={pending}
                  onClick={() => setConfirmingId(profile.id)}
                >
                  <Trash2 aria-hidden className="!size-3.5" />
                </Button>
              </Tooltip>
            )}
          </div>
        )}
      </li>
    );
  }

  function section(label: string, hint: string | null, items: P[]) {
    if (items.length === 0) return null;
    return (
      <section className="space-y-1.5" aria-label={label}>
        <div>
          <h4 className="text-xs font-medium text-muted-foreground">{label}</h4>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <ul className="divide-y overflow-hidden rounded-lg border bg-card">{items.map(row)}</ul>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {header}

      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{title}</h3>
          {!loading && !error && (
            <p className="text-xs text-muted-foreground">
              {custom.length === 0 ? "None of your own yet" : `${custom.length} of your own`}
            </p>
          )}
        </div>
        <Button size="sm" onClick={onNew}>
          <Plus aria-hidden />
          New profile
        </Button>
      </div>

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <div aria-label="Loading profiles" role="status" className="space-y-2 rounded-lg border bg-card p-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2 py-1.5">
              <Skeleton className="h-3.5 w-2/5" />
              <Skeleton className="w-4/5" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {section("Your profiles", null, custom)}
          {section("Recommended by CarouseLabs", "Duplicate one to make it your own.", recommended)}
          {section("Built-in", recommended.length > 0 ? null : "Duplicate one to make it your own.", builtIn)}
        </>
      )}

      {websiteLink && (
        <button
          type="button"
          onClick={websiteLink.onClick}
          className="inline-flex w-fit items-center gap-1 rounded text-xs text-muted-foreground transition-colors duration-fast hover:text-foreground"
        >
          {websiteLink.label}
          <ExternalLink aria-hidden className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
