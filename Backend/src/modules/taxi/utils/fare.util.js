import crypto from 'crypto';

const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;

export function computeFare({
    distanceKm = 0,
    durationMin = 0,
    waitingMin = 0,
    pricing,
}) {
    const base = Number(pricing.baseFare || 0);
    const baseDistanceKm = Number(pricing.baseDistanceKm || 0);
    const billableKm = Math.max(0, Number(distanceKm || 0) - baseDistanceKm);
    const distance = billableKm * Number(pricing.perKmRate || 0);
    const time = Number(durationMin || 0) * Number(pricing.perMinRate || 0);
    const freeWait = Number(pricing.freeWaitMinutes || 0);
    const waiting = Math.max(0, Number(waitingMin || 0) - freeWait) * Number(pricing.perMinWaitRate || 0);
    const platformFee = Number(pricing.platformFee || 0);
    const surgeMultiplier = Number(pricing.surgeMultiplier ?? 1) || 1;
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
    };
}

export function generateRideOtp() {
    return String(crypto.randomInt(100000, 1000000));
}

export { round2 };
