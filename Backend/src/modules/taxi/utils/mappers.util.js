const toId = (doc) => (doc?._id ? String(doc._id) : doc?.id ? String(doc.id) : '');

export const mapZone = (doc = {}) => ({
    id: toId(doc),
    name: doc.name || '',
    country: doc.country || 'India',
    unit: doc.unit || 'kilometer',
    status: doc.status || 'inactive',
    polygon: doc.polygon || (Array.isArray(doc.coordinates) && doc.coordinates.length
        ? `${doc.coordinates.length}-point polygon`
        : 'No area selected'),
    coordinates: Array.isArray(doc.coordinates)
        ? doc.coordinates.map((c) => ({
            lat: Number(c.lat ?? c.latitude),
            lng: Number(c.lng ?? c.longitude),
        }))
        : [],
    displayOrder: Number(doc.displayOrder || 0),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
});

export const mapVehicleType = (doc = {}) => ({
    id: toId(doc),
    name: doc.name || '',
    code: doc.code || '',
    category: doc.category || '',
    icon: doc.icon || 'Car',
    seats: Number(doc.seats || 4),
    status: doc.status || 'inactive',
    displayOrder: Number(doc.displayOrder || 0),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
});

export const mapPricing = (doc = {}, vehicleType = null, zone = null) => {
    const slabs = Array.isArray(doc.slabs) && doc.slabs.length
        ? doc.slabs.map((s) => ({
            fromKm: Number(s.fromKm || 0),
            toKm: s.toKm == null ? null : Number(s.toKm),
            baseFare: Number(s.baseFare || 0),
            baseDistanceKm: Number(s.baseDistanceKm || 0),
            perKmRate: Number(s.perKmRate || 0),
            perMinRate: Number(s.perMinRate || 0),
            freeWaitMinutes: Number(s.freeWaitMinutes || 0),
            perMinWaitRate: Number(s.perMinWaitRate || 0),
            platformFee: Number(s.platformFee || 0),
            surgeMultiplier: Number(s.surgeMultiplier ?? 1),
        }))
        : [{
            fromKm: 0,
            toKm: null,
            baseFare: Number(doc.baseFare || 0),
            baseDistanceKm: Number(doc.baseDistanceKm || 0),
            perKmRate: Number(doc.perKmRate || 0),
            perMinRate: Number(doc.perMinRate || 0),
            freeWaitMinutes: Number(doc.freeWaitMinutes || 0),
            perMinWaitRate: Number(doc.perMinWaitRate || 0),
            platformFee: Number(doc.platformFee || 0),
            surgeMultiplier: Number(doc.surgeMultiplier ?? 1),
        }];

    const first = slabs[0] || {};

    return {
        id: toId(doc),
        vehicleTypeId: toId(doc.vehicleTypeId || vehicleType),
        zoneId: doc.zoneId ? String(doc.zoneId) : null,
        slabs,
        slabCount: slabs.length,
        baseFare: Number(first.baseFare || 0),
        baseDistanceKm: Number(first.baseDistanceKm || 0),
        perKmRate: Number(first.perKmRate || 0),
        perMinRate: Number(first.perMinRate || 0),
        freeWaitMinutes: Number(first.freeWaitMinutes || 0),
        perMinWaitRate: Number(first.perMinWaitRate || 0),
        platformFee: Number(first.platformFee || 0),
        surgeMultiplier: Number(first.surgeMultiplier ?? 1),
        status: doc.status || 'active',
        vehicleType: vehicleType
            ? { id: toId(vehicleType), name: vehicleType.name, category: vehicleType.category, code: vehicleType.code }
            : null,
        zone: zone ? { id: toId(zone), name: zone.name } : null,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    };
};

export const mapRide = (doc = {}, extras = {}) => ({
    id: toId(doc),
    rideNumber: doc.rideNumber || '',
    userId: toId(doc.userId),
    vehicleTypeId: toId(doc.vehicleTypeId),
    zoneId: doc.zoneId ? String(doc.zoneId) : null,
    pickup: doc.pickup || null,
    drop: doc.drop || null,
    distanceKm: Number(doc.distanceKm || 0),
    durationMin: Number(doc.durationMin || 0),
    waitingMin: Number(doc.waitingMin || 0),
    fare: doc.fare || null,
    fareBreakdown: doc.fareBreakdown || null,
    fareEstimateTotal: Number(doc.fareEstimateTotal || 0),
    payment: doc.payment
        ? {
            method: doc.payment.method || 'cash',
            status: doc.payment.status || 'pending',
            paymentId: doc.payment.paymentId || null,
            razorpayOrderId: doc.payment.razorpayOrderId || null,
            razorpayPaymentId: doc.payment.razorpayPaymentId || null,
            paymentLinkId: doc.payment.paymentLinkId || doc.payment.qr?.paymentLinkId || null,
            shortUrl: doc.payment.shortUrl || doc.payment.qr?.shortUrl || null,
            qr: doc.payment.qr || null,
            paidAt: doc.payment.paidAt || null,
            collectedBy: doc.payment.collectedBy || null,
        }
        : null,
    status: doc.status || 'requested',
    dispatch: doc.dispatch
        ? {
            status: doc.dispatch.status || 'unassigned',
            deliveryPartnerId: doc.dispatch.deliveryPartnerId
                ? String(doc.dispatch.deliveryPartnerId)
                : null,
            offeredTo: Array.isArray(doc.dispatch.offeredTo) ? doc.dispatch.offeredTo : [],
            assignedAt: doc.dispatch.assignedAt || null,
            acceptedAt: doc.dispatch.acceptedAt || null,
        }
        : null,
    rideOtp: extras.includeOtp ? doc.rideOtp : undefined,
    assignedAt: doc.assignedAt || null,
    arrivedAt: doc.arrivedAt || null,
    startedAt: doc.startedAt || null,
    reachedDropAt: doc.reachedDropAt || null,
    completedAt: doc.completedAt || null,
    cancelledAt: doc.cancelledAt || null,
    cancelReason: doc.cancelReason || '',
    earningsCreditedAt: doc.earningsCreditedAt || null,
    driverRating: doc.driverRating ?? null,
    userRating: doc.userRating ?? null,
    lastDriverLocation: doc.lastDriverLocation || null,
    module: doc.module || 'taxi',
    vehicleType: extras.vehicleType || null,
    driver: extras.driver || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
});
