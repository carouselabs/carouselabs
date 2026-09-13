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
// popup.js). No icon assets are required for badge text, unlike
// chrome.notifications (which mandates an iconUrl) — see this repo's
// browser-extension-ideas/README.md for the icon follow-up.

const MENU_ID = "carouselabs-save-idea"
const DEFAULT_API_BASE = "https://carouselabs.com"
const BADGE_CLEAR_MS = 3000

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
    if (!res.ok) {
      flashBadge("!", "#EF4444")
      return
    }
    await chrome.storage.local.set({ lastSavedAt: Date.now() })
    flashBadge("✓", "#10B981")
  } catch {
    flashBadge("!", "#EF4444")
  }
})
