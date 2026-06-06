import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { Providers } from '@/components/providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CarouseLabs — AI LinkedIn Carousel Generator',
  description: 'Create stunning LinkedIn carousels and content with AI. CarouseLabs helps you grow your personal brand effortlessly.',
  metadataBase: new URL('https://carouselabs.com'),
  openGraph: {
    title: 'CarouseLabs — AI LinkedIn Carousel Generator',
    description: 'Create stunning LinkedIn carousels and content with AI.',
    url: 'https://carouselabs.com',
    siteName: 'CarouseLabs',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CarouseLabs',
    description: 'Create stunning LinkedIn carousels and content with AI.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className={inter.className}>
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  )
}
