import { PorterTrip } from '../models/porterTrip.model.js';
import { PorterVehicle } from '../models/porterVehicle.model.js';
import { PorterPricing } from '../models/porterPricing.model.js';
import { Counter } from '../../../core/models/counter.model.js';
import { NotFoundError, ValidationError } from '../../../core/auth/errors.js';
import { assertModuleEnabled } from '../../../core/modules/moduleEnabled.service.js';
import { getRoadDistance, haversineKm } from '../../../core/location/location.service.js';
import { parseListQuery, buildDateRangeFilter, toPorterPagination, escapeRegex } from '../utils/pagination.util.js';
import { mapTrip, mapVehicle } from '../utils/mappers.util.js';
import { computeFare, round2 } from '../utils/fare.util.js';
import {
    validateQuoteDto,
    validateCreateTripDto,
    validateTripId,
    validateCancelTripDto,
} from '../validators/trip.validator.js';
import { validateListQuery } from '../validators/listQuery.validator.js';
import { assertTransition } from '../state/tripStateMachine.js';

const baseFilter = { isDeleted: { $ne: true } };

export { computeFare, generateDeliveryOtp } from '../utils/fare.util.js';

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

async function loadActivePricing(vehicleId, zoneId = null) {
    let pricing = null;
    if (zoneId) {
        pricing = await PorterPricing.findOne({
            vehicleId,
            zoneId,
            status: 'active',
            isDeleted: { $ne: true },
        }).lean();
    }
    if (!pricing) {
        pricing = await PorterPricing.findOne({
            vehicleId,
            zoneId: null,
            status: 'active',
            isDeleted: { $ne: true },
        }).lean();
    }
    if (!pricing) {
        throw new ValidationError('No active pricing configured for this vehicle');
    }
    return pricing;
}

async function nextTripNumber() {
    const counter = await Counter.findOneAndUpdate(
        { model: 'porter_trip' },
        { $inc: { seq: 1 } },
        { upsert: true, new: true },
    );
    const seq = counter?.seq || 1;
    return `PT${String(seq).padStart(6, '0')}`;
}

export async function quoteTrip(body) {
    await assertModuleEnabled('porter');
    const payload = validateQuoteDto(body);

    const vehicle = await PorterVehicle.findOne({
        _id: payload.vehicleId,
        status: 'active',
        isDeleted: { $ne: true },
    }).lean();
    if (!vehicle) throw new NotFoundError('Vehicle not found');

    const pricing = await loadActivePricing(payload.vehicleId, payload.zoneId);
    const route = await resolveDistance(payload.pickup, payload.drop);
    const fare = computeFare({
        distanceKm: route.distanceKm,
        pricing,
    });

    return {
        vehicle: mapVehicle(vehicle, pricing),
        zoneId: pricing.zoneId ? String(pricing.zoneId) : payload.zoneId,
        pickup: payload.pickup,
        drop: payload.drop,
        parcel: payload.parcel,
        distanceKm: route.distanceKm,
        durationMin: route.durationMin,
        distanceSource: route.source,
        fare,
        fareEstimateTotal: fare.total,
        currency: fare.currency,
    };
}

export async function createTrip(userId, body) {
    await assertModuleEnabled('porter');
    if (!userId) throw new ValidationError('User is required');

    const payload = validateCreateTripDto(body);
    const vehicle = await PorterVehicle.findOne({
        _id: payload.vehicleId,
        status: 'active',
        isDeleted: { $ne: true },
    }).lean();
    if (!vehicle) throw new NotFoundError('Vehicle not found');

    if (payload.parcel?.weightKg > 0) {
        const maxW = Number(vehicle.maxWeight || 0);
        const minW = Number(vehicle.minWeight || 0);
        if (maxW > 0 && payload.parcel.weightKg > maxW) {
            throw new ValidationError(`Parcel weight exceeds vehicle max (${maxW} kg)`);
        }
        if (minW > 0 && payload.parcel.weightKg < minW) {
            throw new ValidationError(`Parcel weight below vehicle min (${minW} kg)`);
        }
    }

    const pricing = await loadActivePricing(payload.vehicleId, payload.zoneId);
    const route = await resolveDistance(payload.pickup, payload.drop);
    const fare = computeFare({
        distanceKm: route.distanceKm,
        pricing,
    });

    const tripNumber = await nextTripNumber();
    const doc = await PorterTrip.create({
        tripNumber,
        userId,
        vehicleId: payload.vehicleId,
        zoneId: pricing.zoneId || payload.zoneId || null,
        pickup: payload.pickup,
        drop: payload.drop,
        parcel: payload.parcel,
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
        module: 'porter',
    });

    try {
        const { tryAssignTrip } = await import('./tripDispatch.service.js');
        setImmediate(() => {
            tryAssignTrip(String(doc._id)).catch(() => {});
        });
    } catch {
        /* dispatch module may not be ready in isolation */
    }

    return mapTrip(doc.toObject(), { vehicle: mapVehicle(vehicle, pricing) });
}

export async function getTripById(id, { userId = null, includeOtp = false } = {}) {
    const tripId = validateTripId(id);
    const filter = { _id: tripId, ...baseFilter };
    if (userId) filter.userId = userId;

    const doc = await PorterTrip.findOne(filter).lean();
    if (!doc) throw new NotFoundError('Trip not found');

    const vehicle = await PorterVehicle.findById(doc.vehicleId)
        .select('name vehicleCode category icon iconUrl minWeight maxWeight status')
        .lean();

    return mapTrip(doc, {
        includeOtp,
        vehicle: vehicle ? mapVehicle(vehicle) : null,
    });
}

export async function listTripsForUser(userId, query = {}) {
    if (!userId) throw new ValidationError('User is required');
    validateListQuery(query);
    const parsed = parseListQuery(query);
    const filter = { ...baseFilter, userId };

    if (parsed.status) filter.status = parsed.status;

    const [docs, total] = await Promise.all([
        PorterTrip.find(filter)
            .sort({ createdAt: -1 })
            .skip(parsed.skip)
            .limit(parsed.limit)
            .lean(),
        PorterTrip.countDocuments(filter),
    ]);

    const records = docs.map((doc) => mapTrip(doc));
    return toPorterPagination({ docs: records, total, page: parsed.page, limit: parsed.limit });
}

export async function cancelTripByUser(userId, id, body = {}) {
    const tripId = validateTripId(id);
    const { reason } = validateCancelTripDto(body);

    const doc = await PorterTrip.findOne({ _id: tripId, userId, ...baseFilter });
    if (!doc) throw new NotFoundError('Trip not found');

    if (['in_transit', 'at_drop'].includes(doc.status)) {
        throw new ValidationError('Cannot cancel trip after it has started transit');
    }
    if (['completed', 'cancelled_by_user', 'cancelled_by_driver', 'cancelled_by_system'].includes(doc.status)) {
        throw new ValidationError(`Trip is already ${doc.status}`);
    }

    assertTransition(doc.status, 'cancelled_by_user');
    doc.status = 'cancelled_by_user';
    doc.cancelReason = reason;
    doc.cancelledAt = new Date();
    doc.dispatch = doc.dispatch || {};
    doc.dispatch.status = 'cancelled';
    await doc.save();

    if (doc.dispatch?.deliveryPartnerId) {
        try {
            const { clearDriverBusy } = await import('../../../core/dispatch/driverBusyLock.service.js');
            await clearDriverBusy(doc.dispatch.deliveryPartnerId);
        } catch {
            /* ignore */
        }
    }

    return mapTrip(doc.toObject());
}

export async function listTripsAdmin(query = {}) {
    validateListQuery(query);
    const parsed = parseListQuery(query);
    const filter = { ...baseFilter };

    if (parsed.status) filter.status = parsed.status;
    if (parsed.userId) filter.userId = parsed.userId;
    if (parsed.vehicleId) filter.vehicleId = parsed.vehicleId;
    if (parsed.zoneId) filter.zoneId = parsed.zoneId;

    if (parsed.search) {
        const term = escapeRegex(parsed.search);
        filter.$or = [
            { tripNumber: { $regex: term, $options: 'i' } },
            { 'pickup.address': { $regex: term, $options: 'i' } },
            { 'drop.address': { $regex: term, $options: 'i' } },
            { 'parcel.description': { $regex: term, $options: 'i' } },
        ];
    }

    const dateRange = buildDateRangeFilter(parsed.createdFrom, parsed.createdTo);
    if (dateRange) filter.createdAt = dateRange;

    const allowedSort = ['createdAt', 'status', 'fareEstimateTotal', 'completedAt'];
    const sortKey = allowedSort.includes(parsed.sortBy) ? parsed.sortBy : 'createdAt';

    const [docs, total] = await Promise.all([
        PorterTrip.find(filter)
            .sort({ [sortKey]: parsed.sortOrder })
            .skip(parsed.skip)
            .limit(parsed.limit)
            .lean(),
        PorterTrip.countDocuments(filter),
    ]);

    const records = docs.map((doc) => mapTrip(doc));
    return toPorterPagination({ docs: records, total, page: parsed.page, limit: parsed.limit });
}
