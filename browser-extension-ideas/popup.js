// popup.js — shown when the toolbar icon is clicked. Doubles as the
// "Saved!" confirmation for a recent context-menu capture (see
// background.js's comment on why this can't auto-open) by checking a
// timestamp the background script stamps on every successful save.
const DEFAULT_API_BASE = "https://carouselabs.com"
const RECENT_SAVE_WINDOW_MS = 5000

async function init() {
  const { apiKey, apiBase, lastSavedAt } = await chrome.storage.local.get(["apiKey", "apiBase", "lastSavedAt"])
  const base = apiBase || DEFAULT_API_BASE

  const dot = document.getElementById("dot")
  const statusText = document.getElementById("statusText")
  const optionsLink = document.getElementById("optionsLink")
  const boardLink = document.getElementById("boardLink")

  boardLink.href = `${base}/content-hub/ideas`

  const justSaved = lastSavedAt && Date.now() - lastSavedAt < RECENT_SAVE_WINDOW_MS

  if (justSaved) {
    dot.classList.add("ok")
    statusText.textContent = "✓ Saved!"
  } else if (apiKey) {
    dot.classList.add("ok")
    statusText.textContent = "Connected — ready to save"
  } else {
    statusText.textContent = "Not connected yet"
  }

  optionsLink.textContent = apiKey ? "Manage connection" : "Connect your account"
  optionsLink.addEventListener("click", (e) => {
    e.preventDefault()
    chrome.runtime.openOptionsPage()
  })
}

init()
