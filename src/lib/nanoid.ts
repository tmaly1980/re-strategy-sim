// Minimal ID generator — crypto.randomUUID when available, fallback otherwise.
// Used only for client-side UI entity IDs; not security-critical.
export function nanoid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
