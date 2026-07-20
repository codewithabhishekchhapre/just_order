/**
 * Redis driver-busy lock (Phase 4).
 *
 * A driver who has accepted an active order is marked busy so the dispatcher never offers
 * them an overlapping order. This complements the existing DB-based busy check with a fast,
 * race-free guard. A TTL is set as a safety net so a missed release can't block a driver
 * forever; the lock is cleared explicitly on delivery completion / cancellation.
 *
 * No-ops gracefully when Redis is disabled (single-instance falls back to the DB check).
 */
import { getRedisClient } from '../../../../config/redis.js';
import { logger } from '../../../../utils/logger.js';

const keyFor = (driverId) => `driver:${String(driverId)}:busy`;
const DEFAULT_TTL_SEC = 2 * 60 * 60; // 2h safety net

export async function setDriverBusy(driverId, ttlSec = DEFAULT_TTL_SEC) {
  if (!driverId) return;
  try {
    const redis = getRedisClient();
    if (!redis) return;
    await redis.set(keyFor(driverId), '1', { EX: ttlSec });
  } catch (e) {
    logger.warn(`setDriverBusy failed: ${e?.message || e}`);
  }
}

export async function clearDriverBusy(driverId) {
  if (!driverId) return;
  try {
    const redis = getRedisClient();
    if (!redis) return;
    await redis.del(keyFor(driverId));
  } catch (e) {
    logger.warn(`clearDriverBusy failed: ${e?.message || e}`);
  }
}

/** Return a Set of the given driver ids that currently hold a busy lock. */
export async function getRedisBusyDriverIds(driverIds = []) {
  const ids = [...new Set((driverIds || []).map((id) => String(id)).filter(Boolean))];
  if (!ids.length) return new Set();
  try {
    const redis = getRedisClient();
    if (!redis) return new Set();
    const flags = await Promise.all(ids.map((id) => redis.exists(keyFor(id))));
    return new Set(ids.filter((_, i) => flags[i]));
  } catch (e) {
    logger.warn(`getRedisBusyDriverIds failed: ${e?.message || e}`);
    return new Set();
  }
}
