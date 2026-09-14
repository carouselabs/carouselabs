// background.js — CarouseLabs Ideas Board capture extension (Manifest V3
// service worker). Right-click an image, link, or selected text anywhere on
// the web to save it — chrome.contextMenus hands the captured content
// straight to us (info.srcUrl / info.linkUrl / info.selectionText), so no
// content-script injection or extra permissions are needed.
//
// Feedback design note: there is no public extension API to force-open the
// toolbar popup from a background script in response to a context-menu
// click (chrome.action.openPopup() exists on newer Chrome but requires a
// direct user gesture and isn't reliably available across browsers/versions,
// so it isn't used here). Instead this uses the standard, universally
// supported pattern: a brief toolbar badge for immediate feedback, plus the
// popup itself shows "Saved!" if it's opened shortly after a capture (see
// popup.js).

const MENU_ID = "carouselabs-save-idea"
const DEFAULT_API_BASE = "https://carouselabs.com"
const BADGE_CLEAR_MS = 3000
const KEY_INVALID_NOTIFICATION_ID = "carouselabs-key-invalid"

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Save to CarouseLabs Ideas Board",
    contexts: ["image", "link", "selection"],
  })
})

async function getSettings() {
  const { apiKey, apiBase } = await chrome.storage.local.get(["apiKey", "apiBase"])
  return { apiKey: apiKey || null, apiBase: apiBase || DEFAULT_API_BASE }
}

function flashBadge(text, color) {
  chrome.action.setBadgeText({ text })
  chrome.action.setBadgeBackgroundColor({ color })
  setTimeout(() => chrome.action.setBadgeText({ text: "" }), BADGE_CLEAR_MS)
}

// A revoked/stale key (e.g. the user regenerated it in Settings but never
// re-pasted it into the extension) fails EVERY capture identically from then
// on — a transient 3-second badge flash is easy to miss entirely, which is
// exactly how a user can go on believing captures are saving while zero rows
// ever reach the database. This stays visible, and the storage flag drives a
// persistent warning banner in the popup (see popup.js), until a capture
// actually succeeds again — see clearKeyInvalid below.
function markKeyInvalid() {
  chrome.action.setBadgeText({ text: "!" })
  chrome.action.setBadgeBackgroundColor({ color: "#EF4444" })
  chrome.storage.local.set({ keyInvalid: true })
  chrome.notifications.create(KEY_INVALID_NOTIFICATION_ID, {
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: "CarouseLabs",
    message: "Your extension key is invalid or expired. Please reconnect in Settings.",
  })
}

function clearKeyInvalid() {
  chrome.storage.local.set({ keyInvalid: false })
  chrome.action.setBadgeText({ text: "" })
}

chrome.notifications.onClicked.addListener((id) => {
  if (id !== KEY_INVALID_NOTIFICATION_ID) return
  chrome.runtime.openOptionsPage()
  chrome.notifications.clear(id)
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID) return

  const { apiKey, apiBase } = await getSettings()
  if (!apiKey) {
    flashBadge("!", "#F59E0B")
    chrome.runtime.openOptionsPage()
    return
  }

  // Priority: an image target wins even if it's also wrapped in a link;
  // otherwise a link; otherwise selected text. Chrome only ever populates
  // the fields relevant to what was actually right-clicked.
  let payload
  if (info.mediaType === "image" && info.srcUrl) {
    payload = { type: "image", content: info.srcUrl, sourceUrl: info.pageUrl, title: tab && tab.title }
  } else if (info.linkUrl) {
    payload = {
      type: "link",
      content: info.linkUrl,
      sourceUrl: info.pageUrl,
      title: info.selectionText || (tab && tab.title),
    }
  } else if (info.selectionText) {
    payload = { type: "note", content: info.selectionText, sourceUrl: info.pageUrl, title: tab && tab.title }
  } else {
    flashBadge("!", "#F59E0B")
    return
  }

  try {
    const res = await fetch(`${apiBase}/api/ideas-board/capture`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
    })
    if (res.status === 401) {
      markKeyInvalid()
      return
    }
    if (!res.ok) {
      flashBadge("!", "#EF4444")
      return
    }
    clearKeyInvalid()
    await chrome.storage.local.set({ lastSavedAt: Date.now() })
    flashBadge("✓", "#10B981")
  } catch {
    flashBadge("!", "#EF4444")
  }
})
