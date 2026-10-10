import { isSupabaseConfigured } from "@/lib/env";

/**
 * Submissions pipeline transport.
 *
 * Supabase mode: the browser calls the deployed Supabase edge function
 * directly (anon key as both apikey and bearer; verify_jwt accepts the
 * anon JWT for public functions).
 *
 * Demo mode: the browser calls the same-named local Next.js route handler,
 * which implements the identical contract against the demo backend.
 */
export function edgeFunctionUrl(name: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${name}`;
}

export function functionEndpoint(name: string): string {
  return isSupabaseConfigured() ? edgeFunctionUrl(name) : `/api/${name}`;
}

export async function callEdgeFunction<T>(
  name: string,
  body: unknown
): Promise<{ status: number; data: T }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (isSupabaseConfigured()) {
    headers.apikey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    headers.Authorization = `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`;
  }
  const res = await fetch(functionEndpoint(name), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as T;
  return { status: res.status, data };
}
