'use client'

import { useState, useCallback } from 'react'

export function useIdeas() {
  const [ideas, setIdeas] = useState<unknown[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateIdeas = useCallback(async (mode: 'AUTO' | 'SEEDED', seedText?: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ideas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, seedText }),
      })
      if (!res.ok) throw new Error('Failed to generate ideas')
      const data = await res.json()
      setIdeas(data.ideas ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { ideas, isLoading, error, generateIdeas }
}
