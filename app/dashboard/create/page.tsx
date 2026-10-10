import ListingForm from '@/components/listing/ListingForm'
import { Card, CardContent } from '@/components/ui/card'

export const metadata = { title: 'Open a new position' }

export default function CreateListingPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Open a new position
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Describe the role and the kind of candidate you&apos;re looking for.
        </p>
      </div>
      <Card>
        <CardContent className="px-6 py-6 sm:px-8 sm:py-8">
          <ListingForm mode="create" />
        </CardContent>
      </Card>
    </div>
  )
}
