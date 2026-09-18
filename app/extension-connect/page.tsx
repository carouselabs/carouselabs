// app/extension-connect/page.tsx — the browser-extension-comment/ sign-in
// hand-off page. Its "Sign In" button opens this URL in a new tab
// (chrome.tabs.create); this route is NOT in proxy.ts's isPublicRoute list,
// so Clerk's own middleware already does exactly what we need here for
// free: an unauthenticated visit gets bounced to /sign-in?redirect_url=
// /extension-connect, and Clerk sends the browser back here automatically
// once signed in — so by the time this component ever renders, there's
// always an active session, no manual SignIn widget needed.
import { ExtensionConnectClient } from "@/components/extension/ExtensionConnectClient"

export default function ExtensionConnectPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-[#080810] px-4 text-white">
      <ExtensionConnectClient />
    </div>
  )
}
