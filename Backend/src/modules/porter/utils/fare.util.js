import crypto from 'crypto';

const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;

/**
 * Compute porter fare snapshot (taxi-shaped) from PorterPricing fields.
 */
export function computeFare({ distanceKm = 0, pricing }) {
    const base = Number(pricing.basePrice || 0);
    const baseDistance = Number(pricing.baseDistance || 0);
    const enableDistance = pricing.enableDistanceCharges !== false;
    const billableKm = enableDistance
        ? Math.max(0, Number(distanceKm || 0) - baseDistance)
        : 0;
    const distance = billableKm * Number(pricing.distancePrice || 0);
    const serviceTax = Number(pricing.serviceTax || 0);
    const subtotal = base + distance;

    let platformFee = 0;
    if (pricing.commissionType === 'Fixed') {
        platformFee = Number(pricing.commissionValue || 0);
    } else {
        platformFee = (subtotal * Number(pricing.commissionValue || 0)) / 100;
    }

    const total = subtotal + serviceTax;

    return {
        base: round2(base),
        distance: round2(distance),
        time: 0,
        waiting: 0,
        platformFee: round2(platformFee),
        serviceTax: round2(serviceTax),
        surgeMultiplier: 1,
        subtotal: round2(subtotal),
        total: round2(total),
        currency: 'INR',
    };
}

export function generateDeliveryOtp() {
    return String(crypto.randomInt(100000, 1000000));
}

export { round2 };
