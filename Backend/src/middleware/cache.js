import { getRedisClient } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

/**
 * Higher-order function to create a caching middleware.
 * @param {number} ttlInSeconds - Time to live for the cache in seconds.
 * @param {string} prefix - Optional key prefix for Redis (e.g. 'restaurants').
 * @returns {import('express').RequestHandler}
 */
export const cacheResponse = (ttlInSeconds = 300, prefix = 'api_cache') => {
    return async (req, res, next) => {
        // Skip caching if Redis is disabled or not a GET request
        if (!config.redisEnabled || req.method !== 'GET') return next();

        // Allow clients to bypass cache explicitly (e.g. restaurant details menu refresh).
        if (req.query?._ts) return next();

        const redis = getRedisClient();
        if (!redis || !redis.isReady) return next();

        // Unique key for the current request (Method + URL + Query Params)
        // We include query params to distinguish between different filters/pagination
        const key = `${prefix}:${req.method}:${req.originalUrl || req.url}`;

        try {
            const cachedData = await redis.get(key);
            if (cachedData) {
                // logger.debug(`[Cache Hit] key=${key}`);
                return res.json(JSON.parse(cachedData));
            }

            // Capture the JSON response to store in Redis
            const originalJson = res.json.bind(res);
            res.json = (body) => {
                // If it's a success response (status < 400), cache it
                if (res.statusCode < 400) {
                    redis.set(key, JSON.stringify(body), { EX: ttlInSeconds })
                        .catch(err => logger.error(`Redis caching failed for ${key}: ${err.message}`));
                }
                return originalJson(body);
            };

            // logger.debug(`[Cache Miss] key=${key}`);
            next();
        } catch (err) {
            logger.warn(`Cache middleware error: ${err.message}`);
            next(); // fallback to normal flow if something fails
        }
    };
};

/**
 * Clear cache by pattern (e.g. 'api_cache:GET:/api/food/restaurants*')
 * Uses non-blocking SCAN (cursor iteration) instead of KEYS, which blocks the
 * single-threaded Redis event loop for the entire keyspace scan on large datasets.
 * @param {string} pattern - Redis glob pattern for keys to delete.
 */
export const invalidateCache = async (pattern) => {
    if (!config.redisEnabled) return;
    const redis = getRedisClient();
    if (!redis || !redis.isReady) return;

    try {
        let cursor = 0;
        let totalDeleted = 0;
        do {
            const result = await redis.scan(cursor, { MATCH: pattern, COUNT: 200 });
            cursor = result.cursor; // node-redis v4 returns this as a number
            const keys = result.keys;
            if (keys.length > 0) {
                await redis.del(keys);
                totalDeleted += keys.length;
            }
        } while (cursor !== 0);

        if (totalDeleted > 0) {
            logger.info(`Invalidated ${totalDeleted} cache keys matching: ${pattern}`);
        }
    } catch (err) {
        logger.error(`Cache invalidation error: ${err.message}`);
    }
};
