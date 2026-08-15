import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting with a sliding window (§8.2).
 * Uses Upstash Ratelimit when configured, otherwise a process-local
 * sliding window (fine for local dev; not shared across instances).
 */

export type LimitResult = { success: boolean; remaining: number; reset: number };

export interface Limiter {
  limit(key: string): Promise<LimitResult>;
}

/* ---------- in-process fallback ---------- */

type MemEntry = { count: number; resetAt: number };

class MemoryLimiter implements Limiter {
  private map = new Map<string, MemEntry>();
  constructor(
    private max: number,
    private windowMs: number,
  ) {}

  async limit(key: string): Promise<LimitResult> {
    const now = Date.now();
    if (this.map.size > 10_000) {
      // opportunistic cleanup to bound memory
      for (const [k, v] of this.map) if (v.resetAt <= now) this.map.delete(k);
    }
    const entry = this.map.get(key);
    if (!entry || entry.resetAt <= now) {
      this.map.set(key, { count: 1, resetAt: now + this.windowMs });
      return { success: true, remaining: this.max - 1, reset: now + this.windowMs };
    }
    if (entry.count >= this.max) {
      return { success: false, remaining: 0, reset: entry.resetAt };
    }
    entry.count += 1;
    return { success: true, remaining: this.max - entry.count, reset: entry.resetAt };
  }
}

/* ---------- factory ---------- */

const upstashConfigured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

let upstashRedis: Redis | null = null;
if (upstashConfigured) {
  upstashRedis = Redis.fromEnv();
}

export function createLimiter(max: number, windowSeconds: number): Limiter {
  if (upstashRedis) {
    return new Ratelimit({
      redis: upstashRedis,
      limiter: Ratelimit.slidingWindow(max, `${windowSeconds} s`),
    });
  }
  return new MemoryLimiter(max, windowSeconds * 1000);
}

/* Standard rules from the PRD */

/** Authenticated API: 100 req/min per user */
export const apiLimiter = createLimiter(100, 60);
/** Public endpoints: 300 req/min per IP */
export const publicLimiter = createLimiter(300, 60);
/** File uploads: 10/min per user */
export const uploadLimiter = createLimiter(10, 60);
/** Login brute-force: 5 / 15 min per IP+email (auth layer adds its own) */
export const loginLimiter = createLimiter(5, 15 * 60);
/** Invites + password reset: 3 / hour per email */
export const inviteLimiter = createLimiter(3, 60 * 60);

export async function checkLimit(limiter: Limiter, key: string) {
  const res = await limiter.limit(key);
  return res;
}
