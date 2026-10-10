import { cn } from "@/lib/utils"

/**
 * RetroGrid — Magic UI (21st.dev). An animated scrolling retro grid effect.
 * Source: magicui.design/r/retro-grid (classic CSS perspective edition).
 */
export function RetroGrid({
  className,
  angle = 65,
  lineColor,
}: {
  className?: string
  angle?: number
  lineColor?: string
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute h-full w-full overflow-hidden opacity-60 [perspective:200px]",
        className
      )}
      style={{ "--grid-angle": `${angle}deg` } as React.CSSProperties}
    >
      <div className="absolute inset-0 [transform:rotateX(var(--grid-angle))]">
        <div
          className={cn(
            "animate-grid",
            "[background-repeat:repeat] [background-size:60px_60px] [height:300vh] [inset:0%_0px] [margin-left:-50%] [transform-origin:100%_0_0] [width:600vw]",
            lineColor
              ? `[background-image:linear-gradient(to_right,${lineColor}_1px,transparent_0),linear-gradient(to_bottom,${lineColor}_1px,transparent_0)]`
              : "[background-image:linear-gradient(to_right,rgba(63,63,70,0.35)_1px,transparent_0),linear-gradient(to_bottom,rgba(63,63,70,0.35)_1px,transparent_0)]"
          )}
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent to-90%" />
    </div>
  )
}
