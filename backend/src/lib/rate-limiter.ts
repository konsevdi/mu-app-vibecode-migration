/**
 * Rate limiter middleware for Hono
 * Implements a simple in-memory rate limiting solution
 */

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  message?: string;
  keyGenerator?: (c: any) => string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Cleanup every minute

/**
 * Create a rate limiter middleware
 */
export function rateLimiter(config: RateLimitConfig) {
  const {
    windowMs = 60000, // 1 minute default
    max = 100, // 100 requests default
    message = "Too many requests, please try again later.",
    keyGenerator = (c: any) => {
      // Use IP address as default key
      const forwarded = c.req.header("x-forwarded-for");
      const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
      return ip;
    },
  } = config;

  return async (c: any, next: () => Promise<void>) => {
    const key = keyGenerator(c);
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
      // Create new entry or reset expired one
      entry = {
        count: 1,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, entry);
    } else {
      entry.count++;
    }

    // Set rate limit headers
    const remaining = Math.max(0, max - entry.count);
    c.header("X-RateLimit-Limit", String(max));
    c.header("X-RateLimit-Remaining", String(remaining));
    c.header("X-RateLimit-Reset", String(Math.ceil(entry.resetTime / 1000)));

    if (entry.count > max) {
      c.header("Retry-After", String(Math.ceil((entry.resetTime - now) / 1000)));
      return c.json(
        {
          error: "rate_limit_exceeded",
          message,
          retryAfter: Math.ceil((entry.resetTime - now) / 1000),
        },
        429
      );
    }

    await next();
  };
}

/**
 * Stricter rate limiter for sensitive endpoints (auth, reports, etc.)
 */
export const strictRateLimiter = rateLimiter({
  windowMs: 60000, // 1 minute
  max: 10, // 10 requests per minute
  message: "Too many attempts. Please wait before trying again.",
});

/**
 * Standard rate limiter for general API endpoints
 */
export const standardRateLimiter = rateLimiter({
  windowMs: 60000, // 1 minute
  max: 100, // 100 requests per minute
});

/**
 * Lenient rate limiter for read-heavy endpoints
 */
export const lenientRateLimiter = rateLimiter({
  windowMs: 60000, // 1 minute
  max: 300, // 300 requests per minute
});

/**
 * User-specific rate limiter (uses user ID if authenticated, IP otherwise)
 */
export function userRateLimiter(config: RateLimitConfig) {
  return rateLimiter({
    ...config,
    keyGenerator: (c: any) => {
      const user = c.get("user");
      if (user?.id) {
        return `user:${user.id}`;
      }
      const forwarded = c.req.header("x-forwarded-for");
      const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
      return `ip:${ip}`;
    },
  });
}
