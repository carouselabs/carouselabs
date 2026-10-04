/** Keep browser edits separate when another session has changed the saved draft. */
export function reconcileDraft<T>(
  storageKey: string,
  local: T | null,
  server: T,
  serverRevision: string,
  storage?: Pick<Storage, "getItem" | "setItem">,
): { draft: T; recovery: T | null } {
  let baseRevision: string | null = null
  let recovery: T | null = null
  let browserStorage = storage
  try {
    browserStorage ??= localStorage
    baseRevision = browserStorage.getItem(`${storageKey}:revision`)
    const previous = browserStorage.getItem(`${storageKey}:recovery`)
    if (previous) recovery = JSON.parse(previous) as T
  } catch { /* The in-memory recovery remains available when storage is blocked. */ }

  if (local !== null && baseRevision === serverRevision) return { draft: local, recovery }
  if (local !== null && JSON.stringify(local) !== JSON.stringify(server)) {
    recovery = local
    try { browserStorage?.setItem(`${storageKey}:recovery`, JSON.stringify(local)) } catch { /* Retain it in memory. */ }
  }
  return { draft: server, recovery }
}

/** Commit recovered fields before their base revision, so a partial storage
 * failure cannot make an older browser copy look current on the next visit. */
export function persistDraftValues(
  storageKey: string,
  values: Record<string, string | null>,
  revision?: string,
  clearRecovery = false,
  storage: Pick<Storage, "setItem" | "removeItem"> = localStorage,
) {
  // Invalidate the old base first: a quota error midway through the fields
  // must not make a partly written snapshot look current.
  storage.removeItem(`${storageKey}:revision`)
  for (const [key, value] of Object.entries(values)) {
    if (value === null) storage.removeItem(key)
    else storage.setItem(key, value)
  }
  if (revision) storage.setItem(`${storageKey}:revision`, revision)
  if (clearRecovery) storage.removeItem(`${storageKey}:recovery`)
}
