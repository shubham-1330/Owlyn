import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Sliding-window rate limiting. Uses Upstash Redis when its env vars are set
 * (shared across instances) and an in-memory window otherwise (fine for dev
 * and single-instance deployments; state resets on restart).
 */

export type RateLimitResult = { success: boolean; remaining: number; resetAt: number };

export type RateLimiter = { limit: (key: string) => Promise<RateLimitResult> };

type Options = { name: string; limit: number; windowSeconds: number };

const memory = globalThis as unknown as { __owlynRateLimit?: Map<string, number[]> };
const buckets = (memory.__owlynRateLimit ??= new Map<string, number[]>());

function memoryLimiter({ name, limit, windowSeconds }: Options): RateLimiter {
  const windowMs = windowSeconds * 1000;
  return {
    async limit(key) {
      const now = Date.now();
      const id = `${name}:${key}`;
      const hits = (buckets.get(id) ?? []).filter((t) => now - t < windowMs);
      if (hits.length >= limit) {
        buckets.set(id, hits);
        return { success: false, remaining: 0, resetAt: hits[0]! + windowMs };
      }
      hits.push(now);
      buckets.set(id, hits);
      if (buckets.size > 10_000) {
        for (const [k, v] of buckets) if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
      }
      return { success: true, remaining: limit - hits.length, resetAt: now + windowMs };
    },
  };
}

function upstashLimiter({ name, limit, windowSeconds }: Options): RateLimiter {
  const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    prefix: `owlyn:rl:${name}`,
  });
  return {
    async limit(key) {
      const result = await ratelimit.limit(key);
      return { success: result.success, remaining: result.remaining, resetAt: result.reset };
    },
  };
}

export function createRateLimiter(options: Options): RateLimiter {
  const hasUpstash = Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
  return hasUpstash ? upstashLimiter(options) : memoryLimiter(options);
}

/** Seconds until a blocked caller may retry, never below 1. */
export function retryAfterSeconds(result: RateLimitResult): number {
  return Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
}
