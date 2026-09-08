import type { ReactNode } from 'react'

type Tone = 'active' | 'closed' | 'neutral'

const tones: Record<Tone, string> = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  closed: 'border-zinc-200 bg-zinc-100 text-zinc-500',
  neutral: 'border-zinc-200 bg-zinc-50 text-zinc-700',
}

export default function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: Tone
  children: ReactNode
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  )
}
