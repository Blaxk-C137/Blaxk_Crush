'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Inbox, Loader2, Mail, Sparkles } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { getAppUrl } from '@/lib/utils'
import { isSupabaseConfigured } from '@/lib/env'
import { Wordmark } from '@/components/brand/wordmark'
import { DotPattern } from '@/components/magic/dot-pattern'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const supabaseMode = isSupabaseConfigured()

function DemoEntry() {
  return (
    <form action="/auth/demo" method="post" className="space-y-4">
      <div className="rounded-md border border-brand/25 bg-brand/5 px-4 py-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Demo workspace.</span>{' '}
        You&apos;ll sign in as a sample lister with live positions and
        candidates already in the pipeline.
      </div>
      <Button type="submit" className="w-full" size="lg">
        <Sparkles className="h-4 w-4" />
        Enter the demo workspace
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Connect Supabase (see <code>.env.example</code>) for production auth,
        storage, and edge functions.
      </p>
    </form>
  )
}

function MagicLinkForm() {
  const searchParams = useSearchParams()
  const authError = searchParams.get('error')
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${getAppUrl()}/auth/callback` },
    })

    if (error) {
      console.error(error.message)
      // 429 = Supabase auth rate limit (60s resend cooldown / hourly email
      // cap). Telling users to "try again" immediately makes it worse.
      setError(
        error.status === 429
          ? 'Too many sign-in requests. Please wait a few minutes and try again.'
          : 'Something went wrong. Please try again.'
      )
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <Card className="text-center">
        <CardHeader className="items-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Inbox className="h-5 w-5" />
          </div>
          <CardTitle className="pt-2">Check your inbox</CardTitle>
          <CardDescription className="leading-relaxed">
            We&apos;ve sent a sign-in link to{' '}
            <span className="font-medium text-foreground">{email}</span>.
            Click it to access your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Open the link in this browser to finish signing in — sign-in links
            can only be used once, in the browser that requested them.
          </p>
          <Button
            variant="ghost"
            className="mt-4"
            onClick={() => setSent(false)}
          >
            Use a different email
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in to your account</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a secure sign-in link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {authError && (
          <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            That sign-in link didn&apos;t work. Please request a new one.
          </p>
        )}
        <form onSubmit={handleMagicLink} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            className="w-full"
            disabled={loading || !email}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            {loading ? 'Sending…' : 'Send sign-in link'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function LoginForm() {
  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <Wordmark className="justify-center text-lg" />
      </div>
      {supabaseMode ? <MagicLinkForm /> : <DemoEntry />}
    </div>
  )
}

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <DotPattern className="[mask-image:radial-gradient(480px_circle_at_center,white,transparent)]" />
      <Link
        href="/"
        className="absolute left-4 top-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:left-8 sm:top-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>
      <div className="relative z-10 w-full max-w-md">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
