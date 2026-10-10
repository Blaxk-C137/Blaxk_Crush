'use client'

import { useMemo, useState } from 'react'

import { applicantNumber } from '@/lib/application'
import type { ApplicationMasked } from '@/lib/supabase/types'
import ApplicantCard from '@/components/application/ApplicantCard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Filter = 'all' | 'pending' | 'shortlisted' | 'rejected'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'New' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'rejected', label: 'Rejected' },
]

export default function ApplicantsSection({
  applications,
  listingId,
}: {
  applications: ApplicationMasked[]
  listingId: string
}) {
  const [filter, setFilter] = useState<Filter>('all')

  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      all: applications.length,
      pending: 0,
      shortlisted: 0,
      rejected: 0,
    }
    for (const a of applications) c[a.status] += 1
    return c
  }, [applications])

  const visible =
    filter === 'all'
      ? applications
      : applications.filter((a) => a.status === filter)

  return (
    <Tabs
      value={filter}
      onValueChange={(v) => setFilter(v as Filter)}
      className="space-y-5"
    >
      <TabsList>
        {FILTERS.map((f) => (
          <TabsTrigger key={f.value} value={f.value} className="gap-1.5">
            {f.label}
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold leading-none text-muted-foreground data-[state=active]:bg-background">
              {counts[f.value]}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value={filter} className="mt-0">
        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-12 text-center text-sm text-muted-foreground">
            No candidates in this bucket yet.
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {visible.map((a) => (
              <ApplicantCard
                key={a.id}
                application={a}
                listingId={listingId}
                number={applicantNumber(applications, a.id)}
              />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
