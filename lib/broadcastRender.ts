// lib/broadcastRender.ts
// Pure string rendering — no server-only imports, so this is safe to use
// from both the broadcasts API route and the client-side preview modal.
// Minimal, dependency-free markdown subset (bold/italic/links/paragraphs) —
// not a full CommonMark parser, just enough for a quick announcement email.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

// Renders a small markdown subset to HTML. Input is escaped first, so every
// tag below is one we inject — user content can never introduce raw HTML.
export function renderBroadcastBodyHtml(markdown: string): string {
  const escaped = escapeHtml(markdown.trim())

  const withInline = escaped
    // [text](https://url) — only http(s) links are linkified; anything else
    // (javascript:, data:, etc.) is left as plain escaped text.
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" style="color:#7C3AED">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")

  return withInline
    .split(/\n{2,}/)
    .map((para) => `<p style="margin:0 0 16px">${para.replace(/\n/g, "<br>")}</p>`)
    .join("")
}

export function renderBroadcastEmailHtml(subject: string, markdown: string): string {
  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
      <div style="font-size:15px;font-weight:700;color:#7C3AED;margin-bottom:24px">CarouseLabs</div>
      <h1 style="font-size:20px;margin:0 0 16px;color:#0A0A0A">${escapeHtml(subject)}</h1>
      <div style="font-size:14px;line-height:1.6;color:#333">${renderBroadcastBodyHtml(markdown)}</div>
    </div>
  `
}
