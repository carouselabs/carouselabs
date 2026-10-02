"use client"

// A small UI preference remembered in this browser (a collapsed sidebar
// group, a chosen date range, visible table columns). Read through
// useSyncExternalStore, so the server render and the browser's first render
// agree (both use the default) before the stored value applies.
import { useCallback, useSyncExternalStore } from "react"

const STORAGE_EVENT = "admin:stored-state"

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange)
  window.addEventListener(STORAGE_EVENT, onChange)
  return () => {
    window.removeEventListener("storage", onChange)
    window.removeEventListener(STORAGE_EVENT, onChange)
  }
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null // private window or blocked storage: the default applies
  }
}

export function useStoredState<T>(key: string, initial: T): [T, (value: T) => void] {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  )
  let value = initial
  if (raw !== null) {
    try {
      value = JSON.parse(raw) as T
    } catch {
      // a corrupted entry: fall back to the default
    }
  }
  const set = useCallback(
    (next: T) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(next))
      } catch {
        // the choice just isn't remembered
      }
      window.dispatchEvent(new Event(STORAGE_EVENT))
    },
    [key],
  )
  return [value, set]
}
