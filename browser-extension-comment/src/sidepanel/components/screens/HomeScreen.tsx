import { useEffect, useState } from "react";
import { apiFetch, ApiError, type CommentProfile, type MeResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Selecting this value is a no-op stub for now — real "create custom
// profile" flow is wired up in Part 8.
const CREATE_CUSTOM_VALUE = "__create_custom__";

// Must match MESSAGE_TYPE in src/content-script.ts exactly — no shared
// package between the content script and sidepanel bundles' message
// contract beyond this literal (same reasoning as MESSAGE_TYPE in
// src/background.ts / src/content/authRelay.ts).
const POST_SELECTED_MESSAGE_TYPE = "carouselabs:post-selected";

// Must likewise match LAST_POST_STORAGE_KEY in src/content-script.ts.
const LAST_POST_STORAGE_KEY = "lastSelectedPost";

// Shape sent by src/content-script.ts — keep in sync with its SelectedPost.
interface SelectedPost {
  authorName: string;
  authorHeadline: string;
  text: string;
  type: "text" | "image" | "article" | "poll" | "repost";
  capturedAt: number;
}

type LoadState = "loading" | "ready" | "error";

export function HomeScreen() {
  const [profiles, setProfiles] = useState<CommentProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Populated by src/content-script.ts via chrome.runtime.sendMessage when
  // the user clicks Comment on a LinkedIn post. generatedComment has no
  // producer yet (comment generation is a later step) but is reset here too
  // so that a NEW post arriving mid-session clears any stale output rather
  // than leaving it attached to the wrong post.
  const [selectedPost, setSelectedPost] = useState<SelectedPost | null>(null);
  const [generatedComment, setGeneratedComment] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Deduped on capturedAt because the same post arrives twice by design:
    // once as a live message, once as a storage change. Without this the
    // second arrival would clear generatedComment a second time.
    let lastAppliedAt: number | null = null;

    function applyPost(post: SelectedPost, source: string) {
      if (cancelled) return;
      if (lastAppliedAt === post.capturedAt) {
        console.log(`[sidepanel] duplicate post from ${source}, already applied — ignoring.`);
        return;
      }
      lastAppliedAt = post.capturedAt;
      console.log(`[sidepanel] applying post from ${source}:`, post);

      // Replace the preview entirely and clear any previously generated
      // comment — but the Comment Profile selection above is untouched.
      setSelectedPost(post);
      setGeneratedComment(null);
    }

    // Instant path — only lands if the panel is open AND this screen is
    // mounted at the moment of the click.
    function handleMessage(message: unknown) {
      console.log("[sidepanel] chrome.runtime.onMessage received:", message);

      if (!message || typeof message !== "object") return;
      const { type, post } = message as { type?: string; post?: SelectedPost };

      if (type !== POST_SELECTED_MESSAGE_TYPE || !post) {
        console.log(
          `[sidepanel] message ignored — expected type "${POST_SELECTED_MESSAGE_TYPE}" with a post, got type "${type}".`,
        );
        return; // not our message — don't interfere with other listeners
      }

      applyPost(post, "runtime.onMessage");
    }

    // Reliable path — fires in every extension context, and the value is
    // still there if the panel was closed when the click happened.
    function handleStorageChange(
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string,
    ) {
      if (areaName !== "local" || !(LAST_POST_STORAGE_KEY in changes)) return;
      console.log("[sidepanel] storage change:", changes[LAST_POST_STORAGE_KEY]);

      const post = changes[LAST_POST_STORAGE_KEY].newValue as SelectedPost | undefined;
      if (post) applyPost(post, "storage.onChanged");
    }

    chrome.runtime.onMessage.addListener(handleMessage);
    chrome.storage.onChanged.addListener(handleStorageChange);

    // Covers the panel being opened (or this screen navigated back to)
    // after the Comment click already happened.
    chrome.storage.local.get(LAST_POST_STORAGE_KEY).then((stored) => {
      const post = stored[LAST_POST_STORAGE_KEY] as SelectedPost | undefined;
      console.log("[sidepanel] initial storage read:", post ?? "(nothing stored yet)");
      if (post) applyPost(post, "storage initial read");
    });

    return () => {
      cancelled = true;
      chrome.runtime.onMessage.removeListener(handleMessage);
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [{ profiles: fetchedProfiles }, me] = await Promise.all([
          apiFetch<{ profiles: CommentProfile[] }>("/api/ext/profiles"),
          apiFetch<MeResponse>("/api/ext/me"),
        ]);
        if (cancelled) return;

        setProfiles(fetchedProfiles);

        const systemDefault = fetchedProfiles.find((p) => p.isSystem && p.isDefault);
        const preselected =
          fetchedProfiles.find((p) => p.id === me.defaultCommentProfileId) ??
          systemDefault ??
          fetchedProfiles[0];

        setSelectedId(preselected?.id ?? "");
        setState("ready");
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(err instanceof ApiError ? err.message : "Failed to load profiles");
        setState("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const systemProfiles = profiles.filter((p) => p.isSystem);
  const customProfiles = profiles.filter((p) => !p.isSystem);

  function handleValueChange(value: string) {
    if (value === CREATE_CUSTOM_VALUE) return;
    setSelectedId(value);
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Comment Profile</label>

        {state === "loading" && (
          <div className="text-sm text-muted-foreground">Loading profiles…</div>
        )}

        {state === "error" && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
            {errorMessage}
          </div>
        )}

        {state === "ready" && (
          <Select value={selectedId} onValueChange={handleValueChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a profile" />
            </SelectTrigger>
            <SelectContent>
              {systemProfiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.name}
                  {profile.isDefault ? " (default)" : ""}
                </SelectItem>
              ))}

              {customProfiles.length > 0 && (
                <>
                  <SelectSeparator />
                  {customProfiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </>
              )}

              <SelectSeparator />
              <SelectItem value={CREATE_CUSTOM_VALUE} className="font-medium text-primary">
                + Create custom profile
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Selected post</label>

        {selectedPost ? (
          <div className="space-y-1 rounded-md border border-input bg-background p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{selectedPost.authorName || "Unknown author"}</span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                {selectedPost.type}
              </span>
            </div>
            {selectedPost.authorHeadline && (
              <div className="text-xs text-muted-foreground">{selectedPost.authorHeadline}</div>
            )}
            <p className="line-clamp-2 text-sm text-foreground/90">{selectedPost.text}</p>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-input p-3 text-xs text-muted-foreground">
            Click Comment on any LinkedIn post to start
          </div>
        )}
      </div>

      {/* Real comment-generation flow is wired up in a later step — for now
          this just reflects whether a post has been captured. */}
      <Button disabled={!selectedPost}>Generate</Button>

      {generatedComment && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Generated comment</label>
          <p className="rounded-md border border-input bg-background p-3 text-sm">{generatedComment}</p>
        </div>
      )}
    </div>
  );
}
