'use client'

import { useState } from 'react'
import { Check, Link2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

export default function CopyLinkButton({
  url,
  size = 'sm',
}: {
  url: string
  size?: 'sm' | 'default'
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Application portal link copied.')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable (insecure context) — prompt manual copy.
      window.prompt('Copy your application portal link:', url)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={handleCopy}
      className="shrink-0"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-600" />
      ) : (
        <Link2 className="h-3.5 w-3.5" />
      )}
      {copied ? 'Copied' : 'Copy link'}
    </Button>
  )
}
