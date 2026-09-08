export function edgeFunctionUrl(name: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${name}`
}

// POSTs JSON to an edge function with the anon key as both apikey and
// bearer (Supabase's verify_jwt accepts the anon JWT for public functions).
export async function callEdgeFunction<T>(
  name: string,
  body: unknown
): Promise<{ status: number; data: T }> {
  const res = await fetch(edgeFunctionUrl(name), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  })
  const data = (await res.json()) as T
  return { status: res.status, data }
}
