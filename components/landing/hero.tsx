"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import gsap from "gsap"
import { ArrowRight, EyeOff, ScanFace, ShieldCheck } from "lucide-react"

import { AnimatedShinyText } from "@/components/magic/animated-shiny-text"
import { AuroraText } from "@/components/magic/aurora-text"
import { Meteors } from "@/components/magic/meteors"
import { ShimmerButton } from "@/components/magic/shimmer-button"
import { Sculpture } from "@/components/three/sculpture"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Hero — the surreal first impression: aurora gradient headlines in a serif
 * italic cut, a liquid-chrome Three.js sculpture drifting beside them,
 * meteors overhead, and glass policy chips floating in space.
 * GSAP runs one masked-lines entrance timeline; everything else breathes
 * on its own slow clock.
 */
export function Hero() {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } })
      tl.fromTo(
        "[data-hero='badge']",
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7 },
        0.1
      )
        .fromTo(
          "[data-hero='line']",
          { yPercent: 110, rotate: 1.5 },
          { yPercent: 0, rotate: 0, duration: 1.05, stagger: 0.12 },
          0.2
        )
        .fromTo(
          "[data-hero='copy']",
          { y: 22, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8 },
          "-=0.55"
        )
        .fromTo(
          "[data-hero='cta']",
          { y: 18, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7 },
          "-=0.5"
        )
        .fromTo(
          "[data-hero='art']",
          { opacity: 0, scale: 0.92 },
          { opacity: 1, scale: 1, duration: 1.4, ease: "power2.out" },
          0.35
        )
        .fromTo(
          "[data-hero='chip']",
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.7, stagger: 0.16 },
          "-=0.8"
        )
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={rootRef}
      className="relative overflow-hidden"
      aria-label="CrushBoard — professional partner acquisition"
    >
      {/* Atmosphere: aurora haze + meteors + faint grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background:radial-gradient(900px_520px_at_78%_20%,rgba(99,102,241,0.16),transparent_65%),radial-gradient(700px_420px_at_12%_85%,rgba(56,189,248,0.10),transparent_60%)]"
      />
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <Meteors number={9} className="bg-zinc-400/70" />
      </div>

      <div className="container relative grid min-h-[88vh] items-center gap-10 py-20 lg:grid-cols-[1.02fr_0.98fr]">
        {/* ——— Copy ——— */}
        <div className="max-w-2xl">
          <div data-hero="badge">
            <div className="inline-flex rounded-full border bg-background/60 px-4 py-1.5 text-xs font-medium uppercase tracking-widest shadow-sm backdrop-blur">
              <AnimatedShinyText className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5" />
                Professional partner acquisition
              </AnimatedShinyText>
            </div>
          </div>

          <h1 className="mt-7 text-balance text-[2.9rem] font-semibold leading-[1.04] tracking-tight text-foreground sm:text-6xl lg:text-[4.3rem]">
            <span className="block overflow-hidden pb-1">
              <span data-hero="line" className="inline-block">
                Hire your next
              </span>
            </span>
            <span className="block overflow-hidden pb-2">
              <span data-hero="line" className="inline-block">
                <span className="font-display italic font-normal tracking-normal">
                  <AuroraText speed={0.7}>great relationship.</AuroraText>
                </span>
              </span>
            </span>
          </h1>

          <p
            data-hero="copy"
            className="mt-6 max-w-xl text-balance text-lg leading-relaxed text-muted-foreground"
          >
            Post a position, share your application portal, and review
            candidates on your own terms. Character first, identity on your
            schedule — a hiring pipeline for your personal life.
          </p>

          <div data-hero="cta" className="mt-10 flex flex-wrap items-center gap-3">
            <Link href="/auth/login">
              <ShimmerButton className="h-11 px-8 text-sm font-medium">
                Post a position
                <ArrowRight className="ml-2 h-4 w-4" />
              </ShimmerButton>
            </Link>
            <Button variant="outline" size="lg" asChild>
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>
        </div>

        {/* ——— Sculpture ——— */}
        <div data-hero="art" className="relative hidden h-[560px] lg:block">
          {/* halo */}
          <div
            aria-hidden
            className="absolute inset-[12%] rounded-full bg-[radial-gradient(closest-side,rgba(129,140,248,0.28),transparent)] blur-2xl"
          />
          <Sculpture className="absolute inset-0" />

          {/* Floating glass policy chips */}
          <div
            data-hero="chip"
            className={cn(
              "animate-float-slow absolute right-[6%] top-[16%]",
              "rounded-xl border bg-white/60 px-4 py-3 shadow-lg shadow-indigo-500/10 backdrop-blur-md"
            )}
          >
            <div className="flex items-center gap-2.5 text-sm font-medium text-zinc-800">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-white">
                <EyeOff className="h-3.5 w-3.5" />
              </span>
              Anonymous until review
            </div>
          </div>
          <div
            data-hero="chip"
            className={cn(
              "animate-float-slow absolute bottom-[18%] left-[4%] [animation-delay:2.2s]",
              "rounded-xl border bg-white/60 px-4 py-3 shadow-lg shadow-indigo-500/10 backdrop-blur-md"
            )}
          >
            <div className="flex items-center gap-2.5 text-sm font-medium text-zinc-800">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <ScanFace className="h-3.5 w-3.5" />
              </span>
              Reveal is one-way, always
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sculpture (compact) */}
      <div className="container -mt-14 pb-6 lg:hidden" data-hero="art">
        <div className="relative mx-auto h-[300px] max-w-md">
          <Sculpture className="absolute inset-0" />
        </div>
      </div>
    </section>
  )
}
