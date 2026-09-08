import ListingForm from '@/components/listing/ListingForm'

export default function CreateListingPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Open a new position
      </h1>
      <p className="mt-1 text-sm text-zinc-600">
        Describe the role and the kind of candidate you&apos;re looking for.
      </p>
      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <ListingForm mode="create" />
      </div>
    </div>
  )
}
