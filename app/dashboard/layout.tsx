import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LogOut, Plus } from 'lucide-react'

import { getSessionUser } from '@/lib/server/backend'
import { Wordmark } from '@/components/brand/wordmark'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // /dashboard protection is enforced server-side here (spec §1).
  const user = await getSessionUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Wordmark href="/dashboard" />
            <span className="hidden text-xs font-medium uppercase tracking-widest text-muted-foreground md:inline">
              Hiring console
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/dashboard/create">
                <Plus className="h-4 w-4" />
                Open a new position
              </Link>
            </Button>
            <Button asChild size="icon" variant="default" className="sm:hidden">
              <Link href="/dashboard/create" aria-label="Open a new position">
                <Plus className="h-4 w-4" />
              </Link>
            </Button>

            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="hidden max-w-[160px] truncate text-sm text-muted-foreground sm:inline">
                    {user.email ?? 'Signed in'}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{user.email ?? 'Signed in'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <form action="/auth/logout" method="post">
              <Button variant="outline" size="sm" type="submit">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="container py-8 sm:py-10">{children}</main>
    </div>
  )
}
