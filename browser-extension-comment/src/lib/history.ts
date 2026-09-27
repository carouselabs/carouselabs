// src/lib/history.ts — records what the user did with a generation (Copy or
// Insert) on its History row, so History can tell text that was used from
// text that was generated and abandoned. Every generation route returns the
// row's historyId (app/api/ext/{generate,connection-note,message}).
import { apiFetch } from "@/lib/api";

// Best effort: the copy or insert already happened, so a failed write must
// never surface. `text` is what actually left the panel, which may have been
// edited after generation.
export function markHistoryAction(historyId: string | null | undefined, action: "COPIED" | "INSERTED", text: string) {
  if (!historyId) return;
  apiFetch(`/api/ext/history/${historyId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, comment: text }),
  }).catch(() => {});
}
