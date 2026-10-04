"use client"

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react"

type AnimatedProps = { children: ReactNode; delay?: number; className?: string }

/** Above-the-fold content is visible in server HTML, even before hydration. */
function Reveal({ children, delay = 0, className = "", direction = "up" }: AnimatedProps & { direction?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = ref.current
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return
    if (element.getBoundingClientRect().top < window.innerHeight) return
    element.dataset.reveal = "pending"
    const observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) {
        element.dataset.reveal = "visible"
        observer.disconnect()
      }
    }, { rootMargin: "0px 0px -50px 0px" })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return <div ref={ref} className={className} data-reveal-direction={direction} style={{ "--reveal-delay": delay + "s" } as CSSProperties}>{children}</div>
}

export function AnimatedSection(props: AnimatedProps) { return <Reveal {...props} /> }
export function AnimatedFadeIn(props: AnimatedProps) { return <Reveal {...props} direction="fade" /> }
export function AnimatedSlideLeft(props: AnimatedProps) { return <Reveal {...props} direction="left" /> }
export function AnimatedSlideRight(props: AnimatedProps) { return <Reveal {...props} direction="right" /> }
export function AnimatedScale(props: AnimatedProps) { return <Reveal {...props} direction="scale" /> }
