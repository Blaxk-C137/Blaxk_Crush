import type { Listing } from '@/lib/supabase/types'
import { WORK_MODE_OPTIONS } from '@/lib/listing'

function Section({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </h2>
      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-zinc-700">
        {value}
      </p>
    </div>
  )
}

export default function ListingView({ listing }: { listing: Listing }) {
  const workMode =
    WORK_MODE_OPTIONS.find((o) => o.value === listing.work_mode)?.label ??
    listing.work_mode

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
        Open position
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
        {listing.title}
      </h1>
      <p className="mt-1 text-xs text-zinc-500">
        {workMode}
        {listing.location ? ` · ${listing.location}` : ''}
      </p>

      <div className="mt-6 space-y-6">
        <Section label="About the Role" value={listing.about} />
        <Section label="Key Requirements" value={listing.requirements} />
        {listing.nice_to_have && (
          <Section label="Preferred Qualifications" value={listing.nice_to_have} />
        )}
        {listing.perks && (
          <Section label="Compensation Package" value={listing.perks} />
        )}
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Candidate Profile
            </h2>
            <p className="mt-1 text-sm text-zinc-700">
              {listing.age_min}–{listing.age_max}
            </p>
          </div>
          {listing.deadline && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Application Deadline
              </h2>
              <p className="mt-1 text-sm text-zinc-700">
                {new Date(listing.deadline).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
