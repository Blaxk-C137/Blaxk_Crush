import type { InputHTMLAttributes } from 'react'

export default function Input({
  label,
  error,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const inputId = props.id ?? props.name
  return (
    <div>
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-zinc-700"
      >
        {label}
        {props.required && <span className="text-zinc-400"> *</span>}
      </label>
      <input
        id={inputId}
        className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-1 ${
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
            : 'border-zinc-300 focus:border-zinc-900 focus:ring-zinc-900'
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
