export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return url.replace(/\/$/, '')
}
