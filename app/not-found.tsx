import Link from 'next/link'
import { FileQuestion } from 'lucide-react'

import { Wordmark } from '@/components/brand/wordmark'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <Wordmark />
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <FileQuestion className="h-6 w-6 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">
          This position doesn&apos;t exist
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          The page you&apos;re looking for was moved, closed, or never posted.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Back to the front office</Link>
      </Button>
    </main>
  )
}
