# CarouseLabs Ideas Board — browser extension

A separate, simpler extension from any future LinkedIn AI extension. Right-click
any image, link, or selected text on the web and save it to your CarouseLabs
Ideas Board (`/content-hub/ideas`) — no AI, no page injection, no credit charge.

## Load it (development)

1. Go to `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. **Load unpacked** → select this `browser-extension-ideas/` folder.
4. Click the extension's icon → **Connect your account** → paste the key from
   CarouseLabs **Settings > Extension** (generate one there first).
5. If testing against a local dev server, change the URL field on the options
   page to `http://localhost:3000`.

## How it works

- `manifest.json` — Manifest V3, `contextMenus` + `storage` permissions only.
- `background.js` — the context-menu click handler; posts the captured
  content straight to `POST /api/ideas-board/capture` with
  `Authorization: Bearer <key>`.
- `popup.html`/`popup.js` — toolbar-icon popup: connection status, and shows
  "✓ Saved!" if opened within a few seconds of a capture.
- `options.html`/`options.js` — where the extension key (and, for local dev,
  the API base URL) is stored via `chrome.storage.local`.

## Known follow-ups, not done here

- **No icon assets.** `manifest.json` has no `icons` field, so Chrome shows a
  generic placeholder icon in the toolbar and extensions list. Add real
  16/48/128px PNGs and wire them into `manifest.json`'s `icons` and
  `action.default_icon` when brand assets are ready.
- **No auto-opening "Saved!" popup.** There's no public extension API to
  force-open the toolbar popup from a background script in response to a
  context-menu click (the newer `chrome.action.openPopup()` needs a direct
  user gesture and isn't reliably available across browsers/versions). This
  extension uses the standard alternative instead: a brief toolbar badge
  (✓ / !) for immediate feedback, plus the popup shows "✓ Saved!" if reopened
  shortly after. Worth knowing if "a popup that appears automatically" was
  the expectation.
- **Firefox/Safari.** Only tested against Chrome's MV3 implementation. Firefox
  supports MV3 with some API differences (`browser.*` vs `chrome.*` namespacing
  in particular); porting would need a small compatibility shim.
