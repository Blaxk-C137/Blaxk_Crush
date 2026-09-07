import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
        Professional partner acquisition
      </p>
      <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
        Hire your next great relationship.
      </h1>
      <p className="mt-4 max-w-xl text-base text-zinc-600">
        Post a position, share your application portal, and review candidates
        on your own terms.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/auth/login"
          className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Post a position
        </Link>
      </div>
    </main>
  )
}
