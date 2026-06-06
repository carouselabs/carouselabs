'use client'

import { Toaster } from 'sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#0F0F1A',
            border: '1px solid #1E1E2E',
            color: '#ffffff',
          },
        }}
      />
    </>
  )
}
