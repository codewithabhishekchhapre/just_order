import { TaxiRide } from '../models/taxiRide.model.js';
import { TaxiVehicleType } from '../models/taxiVehicleType.model.js';
import { TaxiPricing } from '../models/taxiPricing.model.js';
import { Counter } from '../../../core/models/counter.model.js';
import { NotFoundError, ValidationError } from '../../../core/auth/errors.js';
import { assertModuleEnabled } from '../../../core/modules/moduleEnabled.service.js';
import { getRoadDistance, haversineKm } from '../../../core/location/location.service.js';
import { parseListQuery, buildDateRangeFilter, toTaxiPagination, escapeRegex } from '../utils/pagination.util.js';
import { mapRide, mapVehicleType } from '../utils/mappers.util.js';
import { computeFare, round2, selectPricingSlab } from '../utils/fare.util.js';
import {
    validateQuoteDto,
    validateCreateRideDto,
    validateRideId,
    validateCancelRideDto,
} from '../validators/ride.validator.js';
import { validateListQuery } from '../validators/listQuery.validator.js';
import { assertTransition } from '../state/rideStateMachine.js';

const baseFilter = { isDeleted: { $ne: true } };

export { computeFare, generateRideOtp } from '../utils/fare.util.js';

async function resolveDistance(pickup, drop) {
    try {
        const road = await getRoadDistance(
            { lat: pickup.lat, lng: pickup.lng },
            { lat: drop.lat, lng: drop.lng },
        );
        if (road?.distanceKm != null) {
            return {
                distanceKm: Number(road.distanceKm),
                durationMin: Number(road.durationMinutes || Math.max(1, Math.round(road.distanceKm * 3))),
                source: road.source || 'google_routes',
            };
        }
    } catch {
        /* fall through to haversine */
    }

    const air = haversineKm(pickup.lat, pickup.lng, drop.lat, drop.lng);
    return {
        distanceKm: round2(air),
        durationMin: Math.max(1, Math.round(air * 3)),
        source: 'haversine',
    };
}

async function loadActivePricing(vehicleTypeId, zoneId = null) {
    const base = {
        vehicleTypeId,
        status: 'active',
        isDeleted: { $ne: true },
    };

    let pricing = null;

    // 1) Exact zone match when zone is known
    if (zoneId) {
        pricing = await TaxiPricing.findOne({ ...base, zoneId }).lean();
    }

    // 2) Global pricing (all zones)
    if (!pricing) {
        pricing = await TaxiPricing.findOne({ ...base, zoneId: null }).lean();
    }

    // 3) Any active pricing for this vehicle type (admin often creates zone-scoped rules)
    if (!pricing) {
        pricing = await TaxiPricing.findOne(base).sort({ updatedAt: -1 }).lean();
    }

    if (!pricing) {
        throw new ValidationError('No active pricing configured for this vehicle type');
    }
    return pricing;
}

async function nextRideNumber() {
    const counter = await Counter.findOneAndUpdate(
        { model: 'taxi_ride' },
        { $inc: { seq: 1 } },
        { upsert: true, new: true },
    );
    const seq = counter?.seq || 1;
    return `TX${String(seq).padStart(6, '0')}`;
}

export async function quoteRide(body) {
    await assertModuleEnabled('taxi');
    const payload = validateQuoteDto(body);

    const vehicleType = await TaxiVehicleType.findOne({
        _id: payload.vehicleTypeId,
        status: 'active',
        isDeleted: { $ne: true },
    }).lean();
    if (!vehicleType) throw new NotFoundError('Vehicle type not found');

    const pricing = await loadActivePricing(payload.vehicleTypeId, payload.zoneId);
    const route = await resolveDistance(payload.pickup, payload.drop);
    const fare = computeFare({
        distanceKm: route.distanceKm,
        durationMin: route.durationMin,
        waitingMin: 0,
        pricing,
    });

    return {
        vehicleType: mapVehicleType(vehicleType),
        zoneId: pricing.zoneId ? String(pricing.zoneId) : payload.zoneId,
        pickup: payload.pickup,
        drop: payload.drop,
        distanceKm: route.distanceKm,
        durationMin: route.durationMin,
        distanceSource: route.source,
        fare,
        fareEstimateTotal: fare.total,
        currency: fare.currency,
    };
}

export async function createRide(userId, body) {
    await assertModuleEnabled('taxi');
    if (!userId) throw new ValidationError('User is required');

    const payload = validateCreateRideDto(body);
    const vehicleType = await TaxiVehicleType.findOne({
        _id: payload.vehicleTypeId,
        status: 'active',
        isDeleted: { $ne: true },
    }).lean();
    if (!vehicleType) throw new NotFoundError('Vehicle type not found');

    const pricing = await loadActivePricing(payload.vehicleTypeId, payload.zoneId);
    const route = await resolveDistance(payload.pickup, payload.drop);
    const fare = computeFare({
        distanceKm: route.distanceKm,
        durationMin: route.durationMin,
        waitingMin: 0,
        pricing,
    });

    const rideNumber = await nextRideNumber();
    const doc = await TaxiRide.create({
        rideNumber,
        userId,
        vehicleTypeId: payload.vehicleTypeId,
        zoneId: pricing.zoneId || payload.zoneId || null,
        pickup: payload.pickup,
        drop: payload.drop,
        distanceKm: route.distanceKm,
        durationMin: route.durationMin,
        fare,
        fareEstimateTotal: fare.total,
        payment: {
            method: payload.paymentMethod || 'cash',
            status: 'pending',
            paymentId: null,
        },
        status: 'searching',
        dispatch: {
            status: 'unassigned',
            deliveryPartnerId: null,
            offeredTo: [],
            assignedAt: null,
            acceptedAt: null,
        },
        module: 'taxi',
    });

    // Fire-and-forget dispatch start (Batch 2)
    try {
        const { tryAssignRide } = await import('./rideDispatch.service.js');
        setImmediate(() => {
            tryAssignRide(String(doc._id)).catch(() => {});
        });
    } catch {
        /* dispatch module may not be ready in isolation */
    }

    return mapRide(doc.toObject(), { vehicleType: mapVehicleType(vehicleType) });
}

export async function getActiveRideForUser(userId) {
    if (!userId) throw new ValidationError('User is required');

    const ACTIVE = ['requested', 'searching', 'assigned', 'arriving', 'arrived', 'in_progress', 'awaiting_payment'];
    const doc = await TaxiRide.findOne({
        ...baseFilter,
        userId,
        status: { $in: ACTIVE },
    })
        .sort({ updatedAt: -1 })
        .lean();

    if (!doc) return null;

    return getRideById(String(doc._id), {
        userId,
        includeOtp: true,
        includeDriver: true,
    });
}

export async function getRideById(id, { userId = null, includeOtp = false, includeDriver = false } = {}) {
    const rideId = validateRideId(id);
    const filter = { _id: rideId, ...baseFilter };
    if (userId) filter.userId = userId;

    const doc = await TaxiRide.findOne(filter).lean();
    if (!doc) throw new NotFoundError('Ride not found');

    const vehicleType = await TaxiVehicleType.findById(doc.vehicleTypeId)
        .select('name code category icon seats status')
        .lean();

    // Rider needs OTP after driver accepts (until trip starts)
    const riderNeedsOtp =
        Boolean(userId) &&
        ['assigned', 'arriving', 'arrived'].includes(doc.status) &&
        Boolean(doc.rideOtp);
    const showOtp = includeOtp || riderNeedsOtp;

    let driver = null;
    if (includeDriver && doc.dispatch?.deliveryPartnerId) {
        try {
            const { Driver } = await import('../../../core/models/driver.model.js');
            const d = await Driver.findById(doc.dispatch.deliveryPartnerId)
                .select('name phone vehicleNumber vehicleType vehicleModel rating profileImage photo lastLat lastLng lastLocationAt')
                .lean();
            if (d) {
                driver = {
                    id: String(d._id),
                    name: d.name || 'Driver',
                    phone: d.phone || '',
                    vehicleNumber: d.vehicleNumber || '',
                    vehicleType: d.vehicleType || d.vehicleModel || '',
                    vehicleModel: d.vehicleModel || '',
                    rating: Number(d.rating || 0),
                    photo: d.profileImage || d.photo || '',
                    lastLat: d.lastLat ?? null,
                    lastLng: d.lastLng ?? null,
                    lastLocationAt: d.lastLocationAt || null,
                };
            }
        } catch {
            /* ignore driver lookup failures */
        }
    }

    // Prefer ride-persisted point; fall back to driver's latest ping for live tracking
    let lastDriverLocation = doc.lastDriverLocation || null;
    if (
        (!lastDriverLocation?.lat || !lastDriverLocation?.lng) &&
        driver?.lastLat != null &&
        driver?.lastLng != null
    ) {
        lastDriverLocation = {
            lat: Number(driver.lastLat),
            lng: Number(driver.lastLng),
            at: driver.lastLocationAt || null,
        };
    }

    const mapped = mapRide(doc, {
        includeOtp: showOtp,
        vehicleType: vehicleType ? mapVehicleType(vehicleType) : null,
        driver,
    });

    // Waiting policy for arrived → OTP (free wait from matching distance slab)
    let waitPolicy = null;
    if (['assigned', 'arriving', 'arrived'].includes(String(doc.status || ''))) {
        try {
            const pricing = await loadActivePricing(doc.vehicleTypeId, doc.zoneId);
            if (pricing) {
                const slab = selectPricingSlab(pricing, doc.distanceKm);
                waitPolicy = {
                    freeWaitMinutes: Number(slab.freeWaitMinutes || 0),
                    perMinWaitRate: Number(slab.perMinWaitRate || 0),
                    slabFromKm: slab.fromKm ?? 0,
                    slabToKm: slab.toKm ?? null,
                };
            }
        } catch {
            /* pricing optional for tracking */
        }
    }

    return {
        ...mapped,
        lastDriverLocation: lastDriverLocation || mapped.lastDriverLocation || null,
        waitPolicy,
    };
}

export async function listRidesForUser(userId, query = {}) {
    if (!userId) throw new ValidationError('User is required');
    validateListQuery(query);
    const parsed = parseListQuery(query);
    const filter = { ...baseFilter, userId };

    if (parsed.status) filter.status = parsed.status;

    const [docs, total] = await Promise.all([
        TaxiRide.find(filter)
            .sort({ createdAt: -1 })
            .skip(parsed.skip)
            .limit(parsed.limit)
            .lean(),
        TaxiRide.countDocuments(filter),
    ]);

    const records = docs.map((doc) => mapRide(doc));
    return toTaxiPagination({ docs: records, total, page: parsed.page, limit: parsed.limit });
}

export async function cancelRideByUser(userId, id, body = {}) {
    const rideId = validateRideId(id);
    const { reason } = validateCancelRideDto(body);

    const doc = await TaxiRide.findOne({ _id: rideId, userId, ...baseFilter });
    if (!doc) throw new NotFoundError('Ride not found');

    if (doc.status === 'in_progress') {
        throw new ValidationError('Cannot cancel ride after it has started');
    }
    if (['completed', 'cancelled_by_rider', 'cancelled_by_driver', 'cancelled_by_system', 'no_show'].includes(doc.status)) {
        throw new ValidationError(`Ride is already ${doc.status}`);
    }

    assertTransition(doc.status, 'cancelled_by_rider');
    doc.status = 'cancelled_by_rider';
    doc.cancelReason = reason;
    doc.cancelledAt = new Date();
    doc.dispatch = doc.dispatch || {};
    doc.dispatch.status = 'cancelled';
    await doc.save();

    // Clear busy lock if a driver was assigned
    if (doc.dispatch?.deliveryPartnerId) {
        try {
            const { clearDriverBusy } = await import('../../../core/dispatch/driverBusyLock.service.js');
            await clearDriverBusy(doc.dispatch.deliveryPartnerId);
        } catch {
            /* ignore */
        }
    }

    return mapRide(doc.toObject());
}

export async function listRidesAdmin(query = {}) {
    validateListQuery(query);
    const parsed = parseListQuery(query);
    const filter = { ...baseFilter };

    if (parsed.status) filter.status = parsed.status;
    if (parsed.userId) filter.userId = parsed.userId;
    if (parsed.vehicleTypeId) filter.vehicleTypeId = parsed.vehicleTypeId;
    if (parsed.zoneId) filter.zoneId = parsed.zoneId;

    if (parsed.search) {
        const term = escapeRegex(parsed.search);
        filter.$or = [
            { rideNumber: { $regex: term, $options: 'i' } },
            { 'pickup.address': { $regex: term, $options: 'i' } },
            { 'drop.address': { $regex: term, $options: 'i' } },
        ];
    }

    const dateRange = buildDateRangeFilter(parsed.createdFrom, parsed.createdTo);
    if (dateRange) filter.createdAt = dateRange;

    const allowedSort = ['createdAt', 'status', 'fareEstimateTotal', 'completedAt'];
    const sortKey = allowedSort.includes(parsed.sortBy) ? parsed.sortBy : 'createdAt';

    const [docs, total] = await Promise.all([
        TaxiRide.find(filter)
            .sort({ [sortKey]: parsed.sortOrder })
            .skip(parsed.skip)
            .limit(parsed.limit)
            .lean(),
        TaxiRide.countDocuments(filter),
    ]);

    const records = docs.map((doc) => mapRide(doc));
    return toTaxiPagination({ docs: records, total, page: parsed.page, limit: parsed.limit });
}
