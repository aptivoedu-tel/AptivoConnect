
// Basic in-memory rate limiter for development and simple deployments.
// NOTE: In serverless environments (like Vercel), this Map will be local to the instance.
// For robust production rate limiting, use Redis (e.g., @upstash/ratelimit).

const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

export interface RateLimitConfig {
    windowMs: number;
    max: number;
}

export function isRateLimited(identifier: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    const record = rateLimitMap.get(identifier);

    if (!record || record.lastReset < windowStart) {
        // New window or first request
        rateLimitMap.set(identifier, { count: 1, lastReset: now });
        return false;
    }

    if (record.count >= config.max) {
        return true;
    }

    record.count += 1;
    return false;
}

// Clean up old entries every hour to prevent memory leaks
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [key, value] of rateLimitMap.entries()) {
            if (value.lastReset < now - 3600000) {
                rateLimitMap.delete(key);
            }
        }
    }, 3600000);
}
