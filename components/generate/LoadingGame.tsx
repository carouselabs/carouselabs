"use client"
import { useEffect, useRef, useState } from "react"

export function LoadingGame() {
  const [current, setCurrent] = useState(0)
  const directionRef = useRef(1)
  const [target, setTarget] = useState<number | null>(null)
  const [phase, setPhase] = useState<'set' | 'match'>('set')
  const [attempt, setAttempt] = useState(0)
  const [dots, setDots] = useState<('idle' | 'win' | 'fail')[]>(['idle', 'idle', 'idle'])
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing')
  const [lastStopped, setLastStopped] = useState<number | null>(null)
  const [diff, setDiff] = useState<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    startLoop()
    return () => stopLoop()
  }, [])

  // Notify the team (email the winner's details) when the user wins.
  useEffect(() => {
    if (gameState === 'won') {
      fetch('/api/game/winner', { method: 'POST' }).catch(console.error)
    }
  }, [gameState])

  function startLoop() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setCurrent(prev => {
        let next = parseFloat((prev + directionRef.current * 0.01).toFixed(2))
        if (next >= 5) { next = 5; directionRef.current = -1 }
        if (next <= 0) { next = 0; directionRef.current = 1 }
        return next
      })
    }, 10)
  }

  function stopLoop() {
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  function handleStop() {
    const val = parseFloat(current.toFixed(2))
    if (phase === 'set') {
      stopLoop()
      setTarget(val)
      setLastStopped(val)
      setPhase('match')
      setCurrent(0)
      directionRef.current = 1
      setTimeout(() => startLoop(), 800)
    } else if (phase === 'match') {
      stopLoop()
      setLastStopped(val)
      const d = Math.abs(val - (target ?? 0))
      setDiff(d)
      const won = d === 0
      const newDots = [...dots]
      newDots[attempt] = won ? 'win' : 'fail'
      setDots(newDots)
      if (won) {
        setGameState('won')
      } else if (attempt >= 2) {
        setGameState('lost')
      } else {
        setAttempt(attempt + 1)
        setTimeout(() => {
          setDiff(null)
          startLoop()
        }, 1200)
      }
    }
  }

  function resetGame() {
    setCurrent(0)
    directionRef.current = 1
    setTarget(null)
    setPhase('set')
    setAttempt(0)
    setDots(['idle', 'idle', 'idle'])
    setGameState('playing')
    setLastStopped(null)
    setDiff(null)
    startLoop()
  }

  const pct = (current / 5) * 100
  const targetPct = target !== null ? (target / 5) * 100 : null

  return (
    <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card">
      <p className="text-center text-caption text-muted-foreground">Your image is generating. Play while you wait!</p>
      <p className="text-center text-caption font-medium text-warning">🎁 Win the most unique prize in the world — stop on the EXACT same number!</p>

      <div className="text-center">
        <p className="mb-1 text-caption text-muted-foreground">
          {phase === 'set' ? 'Round 1 — Set your target (0.00 - 5.00)' : `Attempt ${attempt + 1} of 3 — Match ${target?.toFixed(2)}`}
        </p>
        <div className="text-[56px] font-semibold leading-none tracking-[-0.03em] text-foreground tabular-nums">
          {current.toFixed(2)}
        </div>
      </div>

      <div className="relative h-2 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-foreground transition-none" style={{ width: pct + '%' }} />
        {targetPct !== null && (
          <div className="absolute top-0 h-full w-0.5 bg-danger" style={{ left: targetPct + '%' }} />
        )}
      </div>

      {diff !== null && (
        <p role="status" className={`text-center text-label ${diff === 0 ? 'text-success' : 'text-danger'}`}>
          {diff === 0 ? '🎉 Perfect!' : `You stopped at ${lastStopped?.toFixed(2)} — ${diff.toFixed(2)} off`}
        </p>
      )}

      <div className="flex justify-center gap-2" aria-hidden>
        {dots.map((d, i) => (
          <div
            key={i}
            className={`size-2.5 rounded-full border ${d === 'win' ? 'border-success bg-success' : d === 'fail' ? 'border-danger bg-danger' : 'border-control-border bg-surface-muted'}`}
          />
        ))}
      </div>

      {gameState === 'playing' && (
        <button type="button" onClick={handleStop}
          className="w-full rounded-control bg-primary py-4 text-body-lg font-bold text-primary-foreground transition-colors duration-(--motion-fast) hover:bg-primary-hover">
          STOP
        </button>
      )}

      {gameState === 'won' && (
        <div className="flex flex-col gap-2 text-center">
          <p className="text-body font-bold text-success">🎉 You won the most unique prize in the world!</p>
          <p className="text-caption text-muted-foreground">Our team will contact you on your registered email. Stay tuned!</p>
        </div>
      )}

      {gameState === 'lost' && (
        <div className="flex flex-col gap-2 text-center">
          <p className="text-label text-foreground">No attempts left!</p>
          <button type="button" onClick={resetGame}
            className="w-full rounded-control border border-control-border bg-surface py-3 text-label font-medium text-foreground transition-colors duration-(--motion-fast) hover:bg-surface-muted">
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}
