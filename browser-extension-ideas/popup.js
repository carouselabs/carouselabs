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

  // A stale/revoked key overrides every other status — it fails identically
  // on every capture, so "Connected" (or a leftover "✓ Saved!" from before
  // it went bad) would be actively misleading here. Stays shown until a
  // capture actually succeeds again (background.js clears the flag then).
  if (keyInvalid) {
    banner.hidden = false
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
