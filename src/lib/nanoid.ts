let counter = 0;

// Generates a short unique ID. Counter-based so it's stable during SSR prerender
// (no Math.random / Date.now at call time, which Next.js 16 flags as unstable values).
export function nanoid(): string {
  counter += 1;
  return `id-${counter}-${(counter * 2654435761) >>> 0}`;
}
