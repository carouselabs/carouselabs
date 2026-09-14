// popup.js — shown when the toolbar icon is clicked. Doubles as the
// "Saved!" confirmation for a recent context-menu capture (see
// background.js's comment on why this can't auto-open) by checking a
// timestamp the background script stamps on every successful save.
const DEFAULT_API_BASE = "https://carouselabs.com"
const RECENT_SAVE_WINDOW_MS = 5000

async function init() {
  const { apiKey, apiBase, lastSavedAt, keyInvalid } = await chrome.storage.local.get([
    "apiKey",
    "apiBase",
    "lastSavedAt",
    "keyInvalid",
  ])
  const base = apiBase || DEFAULT_API_BASE

  const banner = document.getElementById("keyInvalidBanner")
  const dot = document.getElementById("dot")
  const statusText = document.getElementById("statusText")
  const optionsLink = document.getElementById("optionsLink")
  const boardLink = document.getElementById("boardLink")

  boardLink.href = `${base}/content-hub/ideas`

  const justSaved = lastSavedAt && Date.now() - lastSavedAt < RECENT_SAVE_WINDOW_MS

  // Exactly one state renders, ever — set explicitly in every branch rather
  // than leaning on markup defaults for the "off" cases, so this can't drift
  // into showing two contradictory states at once again.
  banner.hidden = !keyInvalid
  dot.classList.remove("ok")

  // A stale/revoked key overrides every other status — it fails identically
  // on every capture, so "Connected" (or a leftover "✓ Saved!" from before
  // it went bad) would be actively misleading here. Stays shown until either
  // a capture actually succeeds again, or the user saves a new key (see
  // background.js's clearKeyInvalid and options.js's save handler).
  if (keyInvalid) {
    statusText.textContent = "Key invalid — reconnect needed"
  } else if (justSaved) {
    dot.classList.add("ok")
    statusText.textContent = "✓ Saved!"
  } else if (apiKey) {
    dot.classList.add("ok")
    statusText.textContent = "Connected — ready to save"
  } else {
    statusText.textContent = "Not connected yet"
  }

  optionsLink.textContent = apiKey && !keyInvalid ? "Manage connection" : "Connect your account"
  optionsLink.addEventListener("click", (e) => {
    e.preventDefault()
    chrome.runtime.openOptionsPage()
  })
}

init()
