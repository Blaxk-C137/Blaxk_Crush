import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return url.replace(/\/$/, "");
}

/** Deterministic avatar tile (initials on a muted tone) used when an
 *  applicant has no photo — keeps the corporate-straight-face tone. */
export function initialsAvatarDataUrl(name: string): string {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const hues = [222, 210, 200, 232, 244, 260];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 997;
  const hue = hues[h % hues.length];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><rect width='160' height='160' fill='hsl(${hue},24%,42%)'/><text x='50%' y='54%' font-family='Inter,Arial,sans-serif' font-size='64' font-weight='600' fill='white' text-anchor='middle' dominant-baseline='middle'>${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
