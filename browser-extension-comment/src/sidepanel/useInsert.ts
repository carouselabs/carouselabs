// src/sidepanel/useInsert.ts — the panel's half of Insert, shared by Home
// (comments, replies, connection notes), Messages, and X's Home.
//
// One click is one Insert. It carries its own id, so the page types the text
// at most once even if the message reaches it twice (src/lib/insertOnce.ts:
// src/lib/tabs.ts sends again after a lost answer). A click while one is
// still running does nothing, and after the text lands the button says
// "Inserted" for a moment and can't be clicked, so a double click can't type
// it twice either. Whatever happens, the text stays in the panel for Copy.
import { useEffect, useRef, useState } from "react";
import { isSiteTab, noContentScriptMessage, sendToTab, TabTimeout } from "@/lib/tabs";
import { insertFailureCode, reportClientError, tabFailureCode, type ReportFeature } from "@/lib/errorReport";

// How long the button says "Inserted" (and ignores clicks) after a success.
export const INSERTED_MS = 1_500;

export interface InsertRequest {
  // The page's Insert message, without its id (added here).
  message: Record<string, unknown>;
  // For the admin's error figures (src/lib/errorReport.ts).
  feature: ReportFeature;
  // When the page refused without saying why.
  failed: string;
  // When the active tab can't be reached and isn't on the site.
  notOnSite: string;
}

// hasText: the connection-note box holds the person's own text, and nothing
// was changed; the panel offers to replace it (src/content/connectNote.ts).
export type InsertOutcome = { ok: true } | { ok: false; error: string; hasText?: boolean };

type PageAnswer = { ok?: boolean; error?: string; hasText?: boolean } | undefined;

function newInsertId(): string {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useInsert() {
  const [inserting, setInserting] = useState(false);
  const [inserted, setInserted] = useState(false);
  // Synchronous guards: state only changes on the next render, and a second
  // click can arrive before it.
  const running = useRef(false);
  const lockedUntil = useRef(0);
  const insertedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (insertedTimer.current !== null) clearTimeout(insertedTimer.current);
    },
    [],
  );

  // null: ignored (one is running, or one just landed).
  async function insert(request: InsertRequest): Promise<InsertOutcome | null> {
    if (running.current || Date.now() < lockedUntil.current) return null;
    running.current = true;
    setInserting(true);
    setInserted(false);

    let tab: chrome.tabs.Tab | undefined;
    try {
      // tabs.query returns the tab id without the "tabs" permission; only
      // fields like url are withheld. The tab beside the panel is the one the
      // person is looking at, so that is where the text goes; the page itself
      // refuses unless the post or conversation it was written for is there.
      [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id === undefined) throw new Error("no active tab");

      const answer = await sendToTab<PageAnswer>(tab, { ...request.message, insertId: newInsertId() });
      if (answer?.hasText) {
        // A question for the person, not a failure: not reported.
        return { ok: false, error: answer.error ?? request.failed, hasText: true };
      }
      if (!answer?.ok) {
        reportClientError(request.feature, insertFailureCode(answer?.error));
        return { ok: false, error: answer?.error ?? request.failed };
      }

      lockedUntil.current = Date.now() + INSERTED_MS;
      setInserted(true);
      if (insertedTimer.current !== null) clearTimeout(insertedTimer.current);
      insertedTimer.current = setTimeout(() => setInserted(false), INSERTED_MS);
      return { ok: true };
    } catch (err) {
      if (isSiteTab(tab)) reportClientError(request.feature, tabFailureCode(err));
      // No answer in time: the page may still have typed it, so it isn't
      // sent again (src/lib/tabs.ts), and the person is asked to look first.
      if (err instanceof TabTimeout) {
        return { ok: false, error: "The page didn't answer in time. Check its box before trying again: the text may already be there." };
      }
      // No content script in the active tab (not the site, or a tab opened
      // before an update that couldn't be repaired).
      return { ok: false, error: noContentScriptMessage(tab, request.notOnSite) };
    } finally {
      running.current = false;
      setInserting(false);
    }
  }

  return { inserting, inserted, insert };
}
