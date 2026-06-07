import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
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
  description: "AI-native LinkedIn content studio. Create carousels, captions, and posts in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${inter.variable} dark`}
        suppressHydrationWarning
      >
        <body className="min-h-svh">{children}</body>
      </html>
    </ClerkProvider>
  );
}
