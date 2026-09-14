// options.js — saves the extension key + (optional) API base URL used by
// background.js to authenticate with app/api/ideas-board/capture.
const DEFAULT_API_BASE = "https://carouselabs.com"

async function load() {
  const { apiKey, apiBase } = await chrome.storage.local.get(["apiKey", "apiBase"])
  document.getElementById("apiKey").value = apiKey || ""
  document.getElementById("apiBase").value = apiBase || DEFAULT_API_BASE
}

document.getElementById("save").addEventListener("click", async () => {
  const apiKey = document.getElementById("apiKey").value.trim()
  const apiBase = document.getElementById("apiBase").value.trim() || DEFAULT_API_BASE
  // Saving a new key is the user actively trying to fix a broken connection —
  // clear any stale keyInvalid flag now rather than waiting for the next
  // capture to succeed (background.js's clearKeyInvalid). If this key is ALSO
  // bad, the very next failed capture sets keyInvalid: true again; this just
  // stops showing the OLD error before they've had a chance to test the new one.
  await chrome.storage.local.set({ apiKey, apiBase, keyInvalid: false })
  const status = document.getElementById("status")
  status.textContent = "Saved."
  setTimeout(() => {
    status.textContent = ""
  }, 2000)
})

load()
