import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/env.mjs";

const isRedisConfigured = !!env.UPSTASH_REDIS_REST_URL && !!env.UPSTASH_REDIS_REST_TOKEN;

const redis = isRedisConfigured
    ? new Redis({
        url: env.UPSTASH_REDIS_REST_URL!,
        token: env.UPSTASH_REDIS_REST_TOKEN!,
    })
    : null;

// Rate limit for Auth endpoints (e.g. 5 requests per 10 minutes)
export const authRateLimit = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "10 m"),
        analytics: true,
        prefix: "@upstash/ratelimit/auth",
    })
    : null;

// Rate limit for AI/Chat endpoints (e.g. 15 requests per 1 minute)
export const aiRateLimit = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(15, "1 m"),
        analytics: true,
        prefix: "@upstash/ratelimit/chat",
    })
    : null;
