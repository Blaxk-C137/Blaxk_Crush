import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary'

const styles: Record<Variant, string> = {
  primary: 'bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-50',
  secondary:
    'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 disabled:opacity-50',
}

export default function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`rounded-md px-4 py-2 text-sm font-medium ${styles[variant]} ${className}`}
      {...props}
    />
  )
}
