import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRateLimiter, retryAfterSeconds } from "./rate-limit";

describe("createRateLimiter (in-memory)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-10T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows up to the limit inside the window and blocks the next call", async () => {
    const limiter = createRateLimiter({
      name: `t-${Math.random()}`,
      limit: 3,
      windowSeconds: 3600,
    });
    expect((await limiter.limit("a@example.com")).success).toBe(true);
    expect((await limiter.limit("a@example.com")).success).toBe(true);
    const third = await limiter.limit("a@example.com");
    expect(third.success).toBe(true);
    expect(third.remaining).toBe(0);
    const fourth = await limiter.limit("a@example.com");
    expect(fourth.success).toBe(false);
    expect(retryAfterSeconds(fourth)).toBeGreaterThan(0);
    expect(retryAfterSeconds(fourth)).toBeLessThanOrEqual(3600);
  });

  it("keys are independent", async () => {
    const limiter = createRateLimiter({ name: `t-${Math.random()}`, limit: 1, windowSeconds: 60 });
    expect((await limiter.limit("one")).success).toBe(true);
    expect((await limiter.limit("two")).success).toBe(true);
    expect((await limiter.limit("one")).success).toBe(false);
  });

  it("slides: a hit expires after the window", async () => {
    const limiter = createRateLimiter({ name: `t-${Math.random()}`, limit: 1, windowSeconds: 60 });
    expect((await limiter.limit("k")).success).toBe(true);
    expect((await limiter.limit("k")).success).toBe(false);
    vi.advanceTimersByTime(61_000);
    expect((await limiter.limit("k")).success).toBe(true);
  });
});
