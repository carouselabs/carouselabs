// app/extension-connect/page.tsx — the browser-extension-comment/ sign-in
// hand-off page. Its "Sign In" button opens this URL in a new tab
// (chrome.tabs.create); this route is NOT in proxy.ts's isPublicRoute list,
// so Clerk's own middleware already does exactly what we need here for
// free: an unauthenticated visit gets bounced to /sign-in?redirect_url=
// /extension-connect, and Clerk sends the browser back here automatically
// once signed in — so by the time this component ever renders, there's
// always an active session, no manual SignIn widget needed.
import { fontVariables } from "@/lib/fonts"
import { ExtensionConnectClient } from "@/components/extension/ExtensionConnectClient"

export default function ExtensionConnectPage() {
  return (
    <div data-theme="light" className={`${fontVariables} flex min-h-svh items-center justify-center bg-background px-4 font-ui text-foreground`}>
      <style>{`body{background-color:#F9F7F2;color:#211F1C}`}</style>
      <ExtensionConnectClient />
    </div>
  )
}
