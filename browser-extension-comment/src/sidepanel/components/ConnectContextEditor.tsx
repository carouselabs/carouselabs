import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  loadConnectContext,
  loadSelfProfile,
  saveConnectContext,
  MAX_PURPOSE_CHARS,
  OWN_PROFILE_URL,
  READ_SELF_PROFILE_MESSAGE_TYPE,
  SELF_PROFILE_STORAGE_KEY,
  type ConnectContextChoice,
  type ConnectContextSetting,
  type LinkedInProfileInfo,
} from "@/lib/connectionNote";

const OPTIONS: { choice: ConnectContextChoice; title: string; hint: string }[] = [
  { choice: "profile", title: "Use my LinkedIn profile", hint: "Your name, headline and role, read from your own profile page." },
  { choice: "custom", title: "Write my own purpose", hint: "A line about why you connect, e.g. \"I help SaaS founders with pricing\"." },
  { choice: "none", title: "Skip — just use their profile", hint: "The note is based only on the person you're connecting with." },
];

// The "Your context" choice for connection notes. Used by the first-time
// chooser on the Home screen and by Settings, so both edit the same stored
// value in the same way.
export function ConnectContextEditor({ onSaved }: { onSaved?: (setting: ConnectContextSetting) => void }) {
  const [setting, setSetting] = useState<ConnectContextSetting | null>(null);
  const [purposeDraft, setPurposeDraft] = useState("");
  const [self, setSelf] = useState<LinkedInProfileInfo | null>(null);
  const [reading, setReading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadConnectContext(), loadSelfProfile()]).then(([stored, profile]) => {
      if (cancelled) return;
      setSetting(stored);
      setPurposeDraft(stored?.purpose ?? "");
      setSelf(profile);
    });

    // The content script writes the profile; pick it up without a reopen.
    function handleChange(changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) {
      if (areaName === "local" && SELF_PROFILE_STORAGE_KEY in changes) {
        setSelf((changes[SELF_PROFILE_STORAGE_KEY].newValue as LinkedInProfileInfo | undefined) ?? null);
      }
    }
    chrome.storage.onChanged.addListener(handleChange);
    return () => {
      cancelled = true;
      chrome.storage.onChanged.removeListener(handleChange);
    };
  }, []);

  async function save(next: ConnectContextSetting) {
    setSetting(next);
    await saveConnectContext(next);
    onSaved?.(next);
  }

  async function readMyProfile() {
    setReading(true);
    setMessage(null);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id === undefined) throw new Error("no active tab");
      const res = (await chrome.tabs.sendMessage(tab.id, { type: READ_SELF_PROFILE_MESSAGE_TYPE })) as
        | { ok: boolean; profile?: LinkedInProfileInfo; error?: string }
        | undefined;
      if (!res?.ok) setMessage(res?.error ?? "Couldn't read your profile.");
      else if (res.profile) setSelf(res.profile);
    } catch {
      setMessage("Open LinkedIn in the active tab first.");
    } finally {
      setReading(false);
    }
  }

  async function openMyProfile() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id !== undefined) await chrome.tabs.update(tab.id, { url: OWN_PROFILE_URL });
    else await chrome.tabs.create({ url: OWN_PROFILE_URL });
    setMessage("Once your profile has loaded, click \"Read my profile\".");
  }

  const choice = setting?.choice ?? null;
  const purposeChanged = purposeDraft.trim() !== (setting?.purpose ?? "").trim();

  return (
    <div className="space-y-2">
      {OPTIONS.map((option) => (
        <label
          key={option.choice}
          className={`flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm ${
            choice === option.choice ? "border-primary bg-primary/5" : "border-input"
          }`}
        >
          <input
            type="radio"
            name="connect-context"
            className="mt-0.5 accent-[#7C3AED]"
            checked={choice === option.choice}
            onChange={() => void save({ choice: option.choice, purpose: setting?.purpose ?? purposeDraft })}
          />
          <span className="space-y-0.5">
            <span className="block font-medium">{option.title}</span>
            <span className="block text-xs text-muted-foreground">{option.hint}</span>
          </span>
        </label>
      ))}

      {choice === "profile" && (
        <div className="space-y-2 rounded-md border border-dashed border-input p-2 text-xs">
          {self ? (
            <p>
              <span className="font-medium">{self.name}</span>
              {self.headline && <span className="text-muted-foreground"> · {self.headline}</span>}
            </p>
          ) : (
            <p className="text-muted-foreground">
              Not read yet. Open your own LinkedIn profile, then click Read my profile.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={openMyProfile}>
              Open my profile
            </Button>
            <Button size="sm" variant="outline" disabled={reading} onClick={readMyProfile}>
              {reading ? "Reading…" : self ? "Re-read my profile" : "Read my profile"}
            </Button>
          </div>
        </div>
      )}

      {choice === "custom" && (
        <div className="space-y-1.5">
          <textarea
            value={purposeDraft}
            onChange={(e) => setPurposeDraft(e.target.value.slice(0, MAX_PURPOSE_CHARS))}
            rows={3}
            placeholder="e.g. I help SaaS founders fix their pricing, and connect with people building in B2B"
            className="w-full resize-none rounded-md border border-input bg-background p-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">
              {purposeDraft.length}/{MAX_PURPOSE_CHARS}
            </span>
            <Button
              size="sm"
              disabled={!purposeDraft.trim() || !purposeChanged}
              onClick={() => void save({ choice: "custom", purpose: purposeDraft.trim() })}
            >
              {purposeChanged ? "Save purpose" : "Saved"}
            </Button>
          </div>
        </div>
      )}

      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}
