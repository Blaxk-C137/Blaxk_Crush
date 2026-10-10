"use client"

import { useEffect, useRef, type ReactNode } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

import { cn } from "@/lib/utils"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

/**
 * ScrollFade — GSAP ScrollTrigger reveal. Children with the `data-reveal`
 * attribute (or the wrapper itself) rise and un-blur as they enter view.
 * Honours prefers-reduced-motion and cleans up its triggers on unmount.
 */
export function ScrollFade({
  children,
  className,
  delay = 0,
  y = 28,
  once = true,
}: {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
  once?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      const targets = el.querySelectorAll("[data-reveal]")
      const items = targets.length > 0 ? Array.from(targets) : [el]
      gsap.fromTo(
        items,
        { y, opacity: 0, filter: "blur(8px)" },
        {
          y: 0,
          opacity: 1,
          filter: "blur(0px)",
          duration: 0.9,
          delay,
          ease: "power3.out",
          stagger: 0.09,
          scrollTrigger: {
            trigger: el,
            start: "top 86%",
            once,
          },
        }
      )
    }, el)

    return () => ctx.revert()
  }, [delay, y, once])

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  )
}
