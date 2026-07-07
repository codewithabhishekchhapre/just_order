import rateLimit, { MemoryStore } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { config } from '../config/env.js';
import { getRedisClient } from '../config/redis.js';
import { logger } from '../utils/logger.js';

/**
 * A Store that starts on in-memory limiting and transparently upgrades itself
 * to Redis once Redis is actually connected.
 *
 * Why not just construct `RedisStore` directly at module load time: this file
 * is imported (via app.js -> route files) BEFORE `connectRedis()` runs in
 * server.js, and `RedisStore`'s constructor eagerly fires an unawaited
 * `SCRIPT LOAD` command. If Redis isn't connected yet, that promise rejects
 * with nothing attached to it yet, which Node treats as an unhandled
 * rejection and crashes the process on startup. Deferring construction until
 * the first real request (by which point Redis has long since connected)
 * avoids that entirely, and the immediate `await` inside `increment()` means
 * any genuine failure is caught by `passOnStoreError` instead of crashing.
 */
class LazyRedisStore {
    constructor(prefix) {
        this.prefix = prefix;
        this.memoryStore = new MemoryStore();
        this.redisStore = null;
        this.redisStoreFailed = false;
        this.options = null;
    }

    init(options) {
        this.options = options;
        this.memoryStore.init(options);
    }

    getActiveStore() {
        if (this.redisStore) return this.redisStore;
        if (this.redisStoreFailed || !config.redisEnabled) return this.memoryStore;

        const client = getRedisClient();
        if (!client || !client.isReady) return this.memoryStore;

        try {
            const store = new RedisStore({
                prefix: this.prefix,
                sendCommand: (...args) => client.sendCommand(args)
            });
            if (this.options) store.init(this.options);
            this.redisStore = store;
            return store;
        } catch (err) {
            this.redisStoreFailed = true;
            logger.warn(`Rate limiter: failed to switch to Redis store (${this.prefix}), staying on memory store: ${err.message}`);
            return this.memoryStore;
        }
    }

    async increment(key) {
        try {
            return await this.getActiveStore().increment(key);
        } catch (err) {
            if (this.redisStore) {
                // Redis store is live but this call failed (e.g. connection blip) -
                // permanently drop back to memory rather than fail every request.
                this.redisStoreFailed = true;
                this.redisStore = null;
                logger.warn(`Rate limiter: Redis store error (${this.prefix}), falling back to memory store: ${err.message}`);
                return this.memoryStore.increment(key);
            }
            throw err;
        }
    }

    async decrement(key) {
        return this.getActiveStore().decrement(key);
    }

    async resetKey(key) {
        return this.getActiveStore().resetKey(key);
    }
}

const windowMs = config.rateLimitWindowMinutes * 60 * 1000;

export const apiRateLimiter = rateLimit({
    windowMs,
    // Dev UX: local UI can generate lots of background API calls (location, polling, etc).
    // Keep production strict, but avoid blocking local development.
    max: config.nodeEnv === 'development' ? Math.max(config.rateLimitMaxRequests, 2000) : config.rateLimitMaxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    // If the store errors out, fail OPEN (allow the request) rather than 500-ing all API traffic.
    passOnStoreError: true,
    store: new LazyRedisStore('rl:api:'),
    message: {
        success: false,
        message: 'Too many requests, please try again later.'
    }
});

const authWindowMs = config.authRateLimitWindowMinutes * 60 * 1000;

/** Stricter rate limit for auth routes (OTP, login, refresh, logout). Applied in addition to global limiter. */
export const authRateLimiter = rateLimit({
    windowMs: authWindowMs,
    // Dev UX: login/otp testing can be frequent. Keep production strict (e.g. 30),
    // but relax local development to avoid 429 when testing flows.
    max: config.nodeEnv === 'development' ? Math.max(config.authRateLimitMax, 100) : config.authRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true,
    store: new LazyRedisStore('rl:auth:'),
    message: {
        success: false,
        message: 'Too many authentication attempts. Please try again later.'
    }
});

/**
 * Stricter limiter for money-moving / abuse-prone actions that the generic API
 * limiter is too loose for: order creation, payment verification, order price
 * calculation (can be used to brute-force coupon codes), wallet topup/deposit.
 */
export const sensitiveActionRateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: config.nodeEnv === 'development' ? 300 : 30,
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true,
    store: new LazyRedisStore('rl:sensitive:'),
    message: {
        success: false,
        message: 'Too many attempts. Please slow down and try again in a few minutes.'
    }
});

/**
 * Limiter for registration / KYC-upload endpoints (restaurant, delivery partner
 * signup with file uploads). These are rare for a real user but attractive for
 * spam/storage-abuse, so the window is long and the ceiling is low.
 */
export const registrationRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: config.nodeEnv === 'development' ? 100 : 10,
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true,
    store: new LazyRedisStore('rl:register:'),
    message: {
        success: false,
        message: 'Too many registration attempts. Please try again later.'
    }
});
