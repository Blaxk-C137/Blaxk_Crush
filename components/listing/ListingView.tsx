import { CalendarClock, MapPin, Users, type LucideIcon } from 'lucide-react'

import type { Listing } from '@/lib/supabase/types'
import { WORK_MODE_OPTIONS } from '@/lib/listing'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { BlurFade } from '@/components/magic/blur-fade'

function Chip({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  )
}

function Section({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1.5">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </h2>
      <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">
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
    <BlurFade>
      <Card className="overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-brand via-indigo-400 to-brand/40" />
        <CardHeader className="space-y-4 px-6 pb-2 pt-8 sm:px-10">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand">
              Open position
            </p>
            <h1 className="text-balance text-2xl font-bold tracking-tight sm:text-4xl">
              {listing.title}
            </h1>
            <div className="flex flex-wrap gap-2">
              <Chip icon={MapPin} label={workMode} />
              {listing.location && <Chip icon={MapPin} label={listing.location} />}
              <Chip
                icon={Users}
                label={`Candidate profile: ${listing.age_min}–${listing.age_max}`}
              />
              {listing.deadline && (
                <Chip
                  icon={CalendarClock}
                  label={`Apply by ${new Date(listing.deadline).toLocaleDateString(
                    'en-US',
                    { year: 'numeric', month: 'long', day: 'numeric' }
                  )}`}
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 px-6 pb-10 pt-6 sm:px-10">
          <Section label="About the Role" value={listing.about} />
          <Separator />
          <Section label="Key Requirements" value={listing.requirements} />
          {listing.nice_to_have && (
            <>
              <Separator />
              <Section
                label="Preferred Qualifications"
                value={listing.nice_to_have}
              />
            </>
          )}
          {listing.perks && (
            <>
              <Separator />
              <Section label="Compensation Package" value={listing.perks} />
            </>
          )}
        </CardContent>
      </Card>
    </BlurFade>
  )
}
