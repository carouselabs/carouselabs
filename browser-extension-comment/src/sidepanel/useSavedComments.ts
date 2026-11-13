// src/sidepanel/useSavedComments.ts — the Write screen's saved comments
// (src/lib/savedComments.ts): shown at once from this browser's copy, then
// refreshed from the server; every change saved on the server first and the
// copy kept in step.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createSaved,
  deleteSaved,
  fetchSaved,
  loadCachedSaved,
  markSavedUsed,
  saveCache,
  sortSaved,
  updateSaved,
  type SavedComment,
  type SavedCommentFields,
} from "@/lib/savedComments";

export type SavedStatus = "loading" | "ready" | "error";

export function useSavedComments() {
  const [list, setList] = useState<SavedComment[]>([]);
  const [status, setStatus] = useState<SavedStatus>("loading");
  // True once the server's list has arrived (until then it may be this
  // browser's older copy).
  const [fresh, setFresh] = useState(false);
  const fetched = useRef(false);

  const commit = useCallback((change: (current: SavedComment[]) => SavedComment[]) => {
    setList((current) => {
      const next = sortSaved(change(current));
      void saveCache(next);
      return next;
    });
  }, []);

  const load = useCallback(() => {
    let cancelled = false;
    void loadCachedSaved().then((cached) => {
      // Never over a fresher list from the server.
      if (cancelled || fetched.current || !cached) return;
      setList(cached);
      setStatus("ready");
    });
    fetchSaved()
      .then((fresh) => {
        if (cancelled) return;
        fetched.current = true;
        setList(fresh);
        setStatus("ready");
        setFresh(true);
      })
      .catch(() => {
        if (!cancelled) setStatus((s) => (s === "ready" ? s : "error"));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => load(), [load]);

  const create = useCallback(
    async (fields: SavedCommentFields & { body: string }) => {
      const row = await createSaved(fields);
      commit((current) => [row, ...current.filter((c) => c.id !== row.id)]);
      return row;
    },
    [commit],
  );

  const update = useCallback(
    async (id: string, fields: SavedCommentFields) => {
      const row = await updateSaved(id, fields);
      commit((current) => current.map((c) => (c.id === id ? row : c)));
      return row;
    },
    [commit],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteSaved(id);
      commit((current) => current.filter((c) => c.id !== id));
    },
    [commit],
  );

  const markUsed = useCallback(
    (id: string) => {
      markSavedUsed(id);
      const now = new Date().toISOString();
      commit((current) => current.map((c) => (c.id === id ? { ...c, useCount: c.useCount + 1, lastUsedAt: now } : c)));
    },
    [commit],
  );

  return { list, status, fresh, create, update, remove, markUsed, retry: load };
}
