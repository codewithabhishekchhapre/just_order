import crypto from 'crypto';

const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;

function mapRateFields(src = {}) {
    return {
        baseFare: Number(src.baseFare || 0),
        baseDistanceKm: Number(src.baseDistanceKm || 0),
        perKmRate: Number(src.perKmRate || 0),
        perMinRate: Number(src.perMinRate || 0),
        freeWaitMinutes: Number(src.freeWaitMinutes || 0),
        perMinWaitRate: Number(src.perMinWaitRate || 0),
        platformFee: Number(src.platformFee || 0),
        surgeMultiplier: Number(src.surgeMultiplier ?? 1) || 1,
    };
}

/**
 * Pick the slab for a trip distance (option A: whole trip uses one slab).
 * Inclusive bounds; if multiple match (shared boundary), highest fromKm wins.
 * If beyond all slabs, use the last (highest fromKm) slab.
 */
export function selectPricingSlab(pricing, distanceKm = 0) {
    const d = Math.max(0, Number(distanceKm) || 0);
    const raw = Array.isArray(pricing?.slabs) ? pricing.slabs : [];

    if (!raw.length) {
        return {
            fromKm: 0,
            toKm: null,
            ...mapRateFields(pricing),
            legacy: true,
        };
    }

    const slabs = [...raw]
        .map((s) => ({
            fromKm: Number(s.fromKm || 0),
            toKm: s.toKm == null || s.toKm === '' ? null : Number(s.toKm),
            ...mapRateFields(s),
        }))
        .sort((a, b) => a.fromKm - b.fromKm);

    const matches = slabs.filter((s) => {
        if (d < s.fromKm) return false;
        if (s.toKm == null || !Number.isFinite(s.toKm)) return true;
        return d <= s.toKm;
    });

    if (matches.length) {
        return matches[matches.length - 1];
    }

    return slabs[slabs.length - 1];
}

/**
 * Fare = rates from the matching distance slab applied to the whole trip.
 */
export function computeFare({
    distanceKm = 0,
    durationMin = 0,
    waitingMin = 0,
    pricing,
}) {
    const slab = selectPricingSlab(pricing, distanceKm);
    const base = slab.baseFare;
    const baseDistanceKm = slab.baseDistanceKm;
    const billableKm = Math.max(0, Number(distanceKm || 0) - baseDistanceKm);
    const distance = billableKm * slab.perKmRate;
    const time = Number(durationMin || 0) * slab.perMinRate;
    const freeWait = slab.freeWaitMinutes;
    const waiting = Math.max(0, Number(waitingMin || 0) - freeWait) * slab.perMinWaitRate;
    const platformFee = slab.platformFee;
    const surgeMultiplier = slab.surgeMultiplier;
    const subtotal = (base + distance + time + waiting) * surgeMultiplier;
    const total = subtotal + platformFee;

    return {
        base: round2(base),
        distance: round2(distance),
        time: round2(time),
        waiting: round2(waiting),
        platformFee: round2(platformFee),
        surgeMultiplier,
        subtotal: round2(subtotal),
        total: round2(total),
        currency: 'INR',
        slab: {
            fromKm: slab.fromKm,
            toKm: slab.toKm,
        },
    };
}

export function generateRideOtp() {
    return String(crypto.randomInt(100000, 1000000));
}

export { round2, mapRateFields };
