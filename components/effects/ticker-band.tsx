"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { Briefcase } from "lucide-react"

import { Marquee } from "@/components/magic/marquee"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

const PHRASES = [
  "Now accepting applications",
  "Anonymous by default",
  "One-way reveal",
  "Link-only distribution",
  "No feeds, no swiping",
]

/**
 * TickerBand — an editorial ticker strip (Magic UI Marquee content) whose
 * track subtly warps (skew + stretch) with scroll velocity via GSAP, then
 * elastically relaxes. Surreal in motion, sober at rest.
 */
export function TickerBand() {
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const skewTo = gsap.quickTo(el, "skewX", {
      duration: 0.55,
      ease: "power3.out",
    })
    const stretchTo = gsap.quickTo(el, "scaleY", {
      duration: 0.55,
      ease: "power3.out",
    })

    let lastY = window.scrollY
    let relaxTimer: ReturnType<typeof setTimeout> | null = null

    const onScroll = () => {
      const y = window.scrollY
      const v = gsap.utils.clamp(-14, 14, (y - lastY) * 0.55)
      lastY = y
      skewTo(v)
      stretchTo(1 + Math.min(Math.abs(v) / 160, 0.06))
      if (relaxTimer) clearTimeout(relaxTimer)
      relaxTimer = setTimeout(() => {
        skewTo(0)
        stretchTo(1)
      }, 140)
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      if (relaxTimer) clearTimeout(relaxTimer)
    }
  }, [])

  return (
    <section
      aria-label="Product principles"
      className="relative overflow-hidden border-y border-zinc-800 bg-zinc-950 py-5"
    >
      {/* Soft indigo haze drifting behind the type */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50 [background:radial-gradient(600px_120px_at_30%_50%,rgba(79,70,229,0.35),transparent_70%),radial-gradient(500px_110px_at_75%_50%,rgba(56,189,248,0.18),transparent_70%)]"
      />
      <div ref={trackRef} className="will-change-transform">
        <Marquee
          repeat={2}
          className="[--duration:36s] [--gap:2.5rem] py-1"
        >
          {PHRASES.map((phrase, i) => (
            <span
              key={phrase}
              className="flex items-center gap-10 text-sm font-medium uppercase tracking-[0.22em]"
            >
              <span
                className={
                  i % 2 === 0
                    ? "bg-gradient-to-r from-zinc-100 via-indigo-200 to-zinc-100 bg-clip-text text-transparent"
                    : "text-zinc-500"
                }
              >
                {phrase}
              </span>
              <Briefcase className="h-3.5 w-3.5 text-indigo-400/70" aria-hidden />
            </span>
          ))}
        </Marquee>
      </div>
      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-zinc-950 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-zinc-950 to-transparent" />
    </section>
  )
}
