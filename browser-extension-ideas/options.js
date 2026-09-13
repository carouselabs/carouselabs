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
  await chrome.storage.local.set({ apiKey, apiBase })
  const status = document.getElementById("status")
  status.textContent = "Saved."
  setTimeout(() => {
    status.textContent = ""
  }, 2000)
})

load()
