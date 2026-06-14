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
        let next = parseFloat((prev + directionRef.current * 0.05).toFixed(2))
        if (next >= 5) { next = 5; directionRef.current = -1 }
        if (next <= 0) { next = 0; directionRef.current = 1 }
        return next
      })
    }, 50)
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
    <div className="flex flex-col gap-4 p-6 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
      <p className="text-[12px] text-[rgba(255,255,255,0.4)] text-center">Your image is generating. Play while you wait!</p>
      <p className="text-[11px] text-[#F59E0B] text-center font-medium">🎁 Win the most unique prize in the world — stop on the EXACT same number!</p>

      <div className="text-center">
        <p className="text-[10px] text-[rgba(255,255,255,0.3)] uppercase tracking-widest mb-1">
          {phase === 'set' ? 'Round 1 — Set your target (0.00 - 5.00)' : `Attempt ${attempt + 1} of 3 — Match ${target?.toFixed(2)}`}
        </p>
        <div className="text-[64px] font-bold text-white tabular-nums leading-none">
          {current.toFixed(2)}
        </div>
      </div>

      <div className="relative h-2 rounded-full bg-[rgba(255,255,255,0.08)] overflow-hidden">
        <div className="h-full rounded-full bg-[#7C3AED] transition-none" style={{ width: pct + '%' }} />
        {targetPct !== null && (
          <div className="absolute top-0 h-full w-0.5 bg-red-400" style={{ left: targetPct + '%' }} />
        )}
      </div>

      {diff !== null && (
        <p className="text-center text-[13px]" style={{ color: diff === 0 ? '#10B981' : '#EF4444' }}>
          {diff === 0 ? '🎉 Perfect!' : `You stopped at ${lastStopped?.toFixed(2)} — ${diff.toFixed(2)} off`}
        </p>
      )}

      <div className="flex gap-2 justify-center">
        {dots.map((d, i) => (
          <div key={i} className="w-2.5 h-2.5 rounded-full border border-[rgba(255,255,255,0.2)]"
            style={{ background: d === 'win' ? '#10B981' : d === 'fail' ? '#EF4444' : 'rgba(255,255,255,0.1)' }} />
        ))}
      </div>

      {gameState === 'playing' && (
        <button onClick={handleStop}
          className="w-full py-4 rounded-xl text-[15px] font-bold text-white bg-[#7C3AED] hover:bg-[#6D28D9] transition-colors">
          STOP
        </button>
      )}

      {gameState === 'won' && (
        <div className="text-center flex flex-col gap-2">
          <p className="text-[#10B981] font-bold text-[15px]">🎉 You won the most unique prize in the world!</p>
          <p className="text-[12px] text-[rgba(255,255,255,0.4)]">Our team will contact you on your registered email. Stay tuned!</p>
        </div>
      )}

      {gameState === 'lost' && (
        <div className="text-center flex flex-col gap-2">
          <p className="text-[rgba(255,255,255,0.6)] text-[13px]">No attempts left!</p>
          <button onClick={resetGame}
            className="w-full py-3 rounded-xl text-[13px] font-medium text-white border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.05)]">
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}
