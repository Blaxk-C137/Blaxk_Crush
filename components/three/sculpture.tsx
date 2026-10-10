"use client"

import { Component, type ReactNode, useEffect, useState } from "react"
import dynamic from "next/dynamic"

/**
 * Sculpture — lazy-loaded Three.js hero object with graceful degradation:
 * no WebGL / reduced motion / slow path all fall back to a CSS chrome orb.
 */
const ChromeSculptureCanvas = dynamic(
  () => import("@/components/three/sculpture-canvas"),
  { ssr: false, loading: () => <ChromeOrbFallback /> }
)

function ChromeOrbFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div
        aria-hidden
        className="animate-float-slow h-56 w-56 rounded-full opacity-90 md:h-72 md:w-72"
        style={{
          background:
            "radial-gradient(circle at 32% 28%, #ffffff 0%, #c7d2fe 28%, #6366f1 58%, #312e81 100%)",
          boxShadow:
            "0 30px 80px -20px rgba(79, 70, 229, 0.45), inset 0 -18px 40px rgba(49, 46, 129, 0.55), inset 0 14px 30px rgba(255,255,255,0.7)",
        }}
      />
    </div>
  )
}

class WebGLBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    // WebGL unavailable / context lost — the CSS orb takes over.
  }
  render() {
    return this.state.failed ? <ChromeOrbFallback /> : this.props.children
  }
}

export function Sculpture({ className }: { className?: string }) {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReducedMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  return (
    <div className={className} aria-hidden>
      <div className="relative h-full w-full">
        <WebGLBoundary>
          <ChromeSculptureCanvas reducedMotion={reducedMotion} />
        </WebGLBoundary>
        {/* Soft grounding shadow */}
        <div className="absolute inset-x-[18%] bottom-[6%] h-10 rounded-[100%] bg-indigo-500/25 blur-2xl" />
      </div>
    </div>
  )
}
