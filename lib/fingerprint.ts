import FingerprintJS from "@fingerprintjs/fingerprintjs";

let cachedFingerprint: string | null = null;

/**
 * FingerprintJS visitor id, cached per tab. If the library fails (blocked
 * script, unusual browser), fall back to a locally-stored random client id so
 * the application flow degrades gracefully instead of breaking.
 */
export async function getFingerprint(): Promise<string> {
  if (cachedFingerprint) return cachedFingerprint;
  try {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    cachedFingerprint = result.visitorId;
  } catch {
    cachedFingerprint = getFallbackClientId();
  }
  return cachedFingerprint;
}

const FALLBACK_KEY = "cb_client_id";

function getFallbackClientId(): string {
  try {
    let id = localStorage.getItem(FALLBACK_KEY);
    if (!id) {
      id = `fp_${crypto.randomUUID()}`;
      localStorage.setItem(FALLBACK_KEY, id);
    }
    return id;
  } catch {
    return `fp_${crypto.randomUUID()}`;
  }
}
