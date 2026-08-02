/**
 * Tiny in-memory per-IP rate limiter.
 *
 * The drill routes cost real money per call (Deepgram minutes, AutoSage
 * tokens) and are publicly reachable, so a loop pointed at them would quietly
 * burn credit. This is deliberately not distributed or persistent — one
 * process, one map, reset on restart. That is enough to stop casual abuse.
 */

type Window = { hits: number[] };

export type RateLimiter = ReturnType<typeof createRateLimiter>;

export function createRateLimiter({
  limit,
  windowMs,
  label,
}: {
  limit: number;
  windowMs: number;
  label: string;
}) {
  const buckets = new Map<string, Window>();

  // Sweep idle buckets so a long-running process does not accumulate one entry
  // per IP that ever hit the route. `unref` keeps this from holding the loop open.
  const sweep = setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [key, window] of buckets) {
      if (window.hits.every((t) => t <= cutoff)) buckets.delete(key);
    }
  }, windowMs);
  sweep.unref?.();

  return {
    /**
     * Records a hit and reports whether it is allowed. Denied requests are not
     * recorded, so hammering a limited endpoint cannot extend the lockout.
     */
    check(key: string): { ok: boolean; retryAfterSec: number } {
      const now = Date.now();
      const cutoff = now - windowMs;

      const window = buckets.get(key) ?? { hits: [] };
      window.hits = window.hits.filter((t) => t > cutoff);

      if (window.hits.length >= limit) {
        const oldest = window.hits[0]!;
        buckets.set(key, window);
        console.warn(`[${label}] rate limited ${key} (${window.hits.length}/${limit})`);
        return { ok: false, retryAfterSec: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)) };
      }

      window.hits.push(now);
      buckets.set(key, window);
      return { ok: true, retryAfterSec: 0 };
    },
  };
}

/**
 * Best-effort client IP. Prefers the left-most x-forwarded-for entry because
 * both apps sit behind a proxy in production; falls back to the socket address.
 */
export function clientIp(request: Request, server: { requestIP?: (r: Request) => { address: string } | null } | null): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return server?.requestIP?.(request)?.address ?? "unknown";
}
