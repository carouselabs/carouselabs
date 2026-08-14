import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CarouseLabs",
    template: "%s | CarouseLabs",
  },
  description: "AI-native social media content studio. Create carousels, captions, and posts for LinkedIn, Instagram, and Twitter/X in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/onboarding"
    >
      <html
        lang="en"
        className={`${inter.variable} dark`}
        suppressHydrationWarning
      >
        <body className="min-h-svh">{children}</body>
        {/* X (Twitter) Ads base pixel — loads on every route so the Purchase
            event fired from LemonSqueezyButton has `twq` ready to call. */}
        <Script id="x-pixel-base" strategy="afterInteractive">
          {`!function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
          },s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
          a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
          twq('config','recx3');`}
        </Script>
      </html>
    </ClerkProvider>
  );
}
