import { PorterTrip } from '../models/porterTrip.model.js';
import { PorterVehicle } from '../models/porterVehicle.model.js';
import { PorterPricing } from '../models/porterPricing.model.js';
import { Driver } from '../../../core/models/driver.model.js';
import { NotFoundError, ValidationError } from '../../../core/auth/errors.js';
import { getIO, rooms } from '../../../config/socket.js';
import { haversineKm } from '../../../core/location/location.service.js';
import {
    setDriverBusy,
    clearDriverBusy,
    getRedisBusyDriverIds,
} from '../../../core/dispatch/driverBusyLock.service.js';
import { logger } from '../../../utils/logger.js';
import { mapTrip, mapVehicle } from '../utils/mappers.util.js';
import { validateTripId, validateStartTripDto } from '../validators/trip.validator.js';
import { assertTransition } from '../state/tripStateMachine.js';
import { computeFare, generateDeliveryOtp } from '../utils/fare.util.js';

const baseFilter = { isDeleted: { $ne: true } };
const DEFAULT_SEARCH_RADIUS_KM = 8;
const STALE_GPS_MS = 10 * 60 * 1000;
const PORTER_MODULE_KEYS = ['porter', 'parcel'];

const allowedDriverStatuses =
    process.env.NODE_ENV === 'production' ? ['approved'] : ['approved', 'pending'];

/**
 * Find nearby porter/parcel-eligible drivers near pickup.
 */
export async function findNearbyPorterDrivers(pickup, { maxKm = DEFAULT_SEARCH_RADIUS_KM } = {}) {
    if (pickup?.lat == null || pickup?.lng == null) return [];

    const drivers = await Driver.find({
        availabilityStatus: 'online',
        authorizedServices: { $in: PORTER_MODULE_KEYS },
        activeWorkModule: { $in: PORTER_MODULE_KEYS },
        status: { $in: allowedDriverStatuses },
        lastLat: { $ne: null },
        lastLng: { $ne: null },
    })
        .select('_id name lastLat lastLng lastLocationAt availabilityStatus status phone vehicleNumber')
        .lean();

    if (!drivers.length) return [];

    const busyIds = await getRedisBusyDriverIds(drivers.map((d) => d._id));
    const now = Date.now();

    return drivers
        .map((d) => {
            const distanceKm = haversineKm(pickup.lat, pickup.lng, d.lastLat, d.lastLng);
            return {
                partnerId: d._id,
                name: d.name || '',
                phone: d.phone || '',
                vehicleNumber: d.vehicleNumber || '',
                lastLat: d.lastLat,
                lastLng: d.lastLng,
                distanceKm: Number.isFinite(distanceKm) ? Number(distanceKm.toFixed(2)) : null,
                lastLocationAt: d.lastLocationAt,
            };
        })
        .filter((p) => {
            if (busyIds.has(String(p.partnerId))) return false;
            if (p.distanceKm == null || p.distanceKm > maxKm) return false;
            if (!p.lastLocationAt || now - new Date(p.lastLocationAt).getTime() > STALE_GPS_MS) {
                return false;
            }
            return true;
        })
        .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
}

async function buildTripOfferPayload(trip, extras = {}) {
    const vehicle = await PorterVehicle.findById(trip.vehicleId)
        .select('name vehicleCode category icon iconUrl minWeight maxWeight')
        .lean();

    return {
        module: 'porter',
        jobType: 'parcel',
        tripId: String(trip._id),
        tripNumber: trip.tripNumber,
        status: trip.status,
        pickup: trip.pickup,
        drop: trip.drop,
        parcel: trip.parcel,
        distanceKm: trip.distanceKm,
        durationMin: trip.durationMin,
        fareEstimateTotal: trip.fareEstimateTotal,
        fare: trip.fare,
        vehicle: vehicle ? mapVehicle(vehicle) : null,
        paymentMethod: trip.payment?.method || 'cash',
        ...extras,
    };
}

/**
 * Offer trip to nearby drivers via socket `new_parcel_available`.
 */
export async function tryAssignTrip(tripId) {
    const id = validateTripId(tripId);
    const trip = await PorterTrip.findOne({
        _id: id,
        ...baseFilter,
        status: { $in: ['quoted', 'searching'] },
        'dispatch.status': 'unassigned',
    });

    if (!trip) {
        logger.info(`[PorterDispatch] tryAssignTrip skip — trip ${id} not searchable`);
        return { offered: 0, partners: [] };
    }

    const partners = await findNearbyPorterDrivers(trip.pickup);
    if (!partners.length) {
        logger.info(`[PorterDispatch] No nearby porter drivers for trip ${id}`);
        return { offered: 0, partners: [] };
    }

    const alreadyOffered = new Set(
        (trip.dispatch?.offeredTo || []).map((o) => String(o.partnerId)),
    );
    const fresh = partners.filter((p) => !alreadyOffered.has(String(p.partnerId)));
    const targets = fresh.length ? fresh : partners;

    const payload = await buildTripOfferPayload(trip);
    const io = getIO();
    const now = new Date();
    const offerEntries = [];

    for (const p of targets) {
        const roomName = rooms.delivery(p.partnerId);
        if (io) {
            io.to(roomName).emit('new_parcel_available', {
                ...payload,
                pickupDistanceKm: p.distanceKm,
            });
        }
        if (!alreadyOffered.has(String(p.partnerId))) {
            offerEntries.push({
                partnerId: p.partnerId,
                at: now,
                action: 'offered',
            });
        }
    }

    if (offerEntries.length) {
        trip.dispatch = trip.dispatch || {};
        trip.dispatch.offeredTo = [...(trip.dispatch.offeredTo || []), ...offerEntries];
        if (trip.status === 'quoted') {
            assertTransition(trip.status, 'searching');
            trip.status = 'searching';
        }
        await trip.save();
    }

    logger.info(
        `[PorterDispatch] tryAssignTrip trip=${id} offered=${targets.length} fresh=${offerEntries.length}`,
    );

    return {
        offered: targets.length,
        partners: targets.map((p) => String(p.partnerId)),
    };
}

/**
 * Atomic first-accept wins.
 */
export async function acceptTrip(driverId, tripId) {
    if (!driverId) throw new ValidationError('Driver is required');
    const id = validateTripId(tripId);
    const now = new Date();
    const otp = generateDeliveryOtp();

    const trip = await PorterTrip.findOneAndUpdate(
        {
            _id: id,
            isDeleted: { $ne: true },
            status: { $in: ['quoted', 'searching', 'assigned'] },
            'dispatch.status': { $in: ['unassigned', 'assigned'] },
            $or: [
                { 'dispatch.deliveryPartnerId': null },
                { 'dispatch.deliveryPartnerId': { $exists: false } },
                { 'dispatch.deliveryPartnerId': driverId },
            ],
        },
        {
            $set: {
                status: 'en_route_pickup',
                deliveryOtp: otp,
                assignedAt: now,
                'dispatch.status': 'accepted',
                'dispatch.deliveryPartnerId': driverId,
                'dispatch.assignedAt': now,
                'dispatch.acceptedAt': now,
            },
            $push: {
                'dispatch.offeredTo': {
                    partnerId: driverId,
                    at: now,
                    action: 'accepted',
                },
            },
        },
        { new: true },
    );

    if (!trip) {
        const existing = await PorterTrip.findOne({ _id: id, ...baseFilter })
            .select('status dispatch')
            .lean();
        if (!existing) throw new NotFoundError('Trip not found');
        if (existing.dispatch?.deliveryPartnerId
            && String(existing.dispatch.deliveryPartnerId) !== String(driverId)) {
            throw new ValidationError('Trip already accepted by another driver');
        }
        throw new ValidationError(`Trip cannot be accepted in status ${existing.status}`);
    }

    await setDriverBusy(driverId);

    const io = getIO();
    if (io) {
        const payload = {
            module: 'porter',
            jobType: 'parcel',
            tripId: String(trip._id),
            tripNumber: trip.tripNumber,
            status: trip.status,
            driverId: String(driverId),
        };
        if (trip.userId) {
            io.to(rooms.user(trip.userId)).emit('parcel_accepted', payload);
            io.to(rooms.user(trip.userId)).emit('parcel_status_update', payload);
        }
        const offeredIds = (trip.dispatch?.offeredTo || [])
            .map((o) => String(o.partnerId))
            .filter((pid) => pid && pid !== String(driverId));
        for (const pid of [...new Set(offeredIds)]) {
            io.to(rooms.delivery(pid)).emit('parcel_claimed', payload);
        }
    }

    return mapTrip(trip.toObject(), { includeOtp: true });
}

export async function markArrived(driverId, tripId) {
    if (!driverId) throw new ValidationError('Driver is required');
    const id = validateTripId(tripId);

    const trip = await PorterTrip.findOne({
        _id: id,
        ...baseFilter,
        'dispatch.deliveryPartnerId': driverId,
    });
    if (!trip) throw new NotFoundError('Trip not found');

    assertTransition(trip.status, 'at_pickup');
    trip.status = 'at_pickup';
    trip.arrivedAt = new Date();
    await trip.save();

    const io = getIO();
    if (io && trip.userId) {
        const payload = {
            module: 'porter',
            jobType: 'parcel',
            tripId: String(trip._id),
            status: 'at_pickup',
        };
        io.to(rooms.user(trip.userId)).emit('parcel_status_update', payload);
        io.to(rooms.user(trip.userId)).emit('driver_arrived', payload);
    }

    return mapTrip(trip.toObject(), { includeOtp: true });
}

export async function startTrip(driverId, tripId, body = {}) {
    if (!driverId) throw new ValidationError('Driver is required');
    const id = validateTripId(tripId);
    const { otp } = validateStartTripDto(body);

    const trip = await PorterTrip.findOne({
        _id: id,
        ...baseFilter,
        'dispatch.deliveryPartnerId': driverId,
    });
    if (!trip) throw new NotFoundError('Trip not found');

    if (String(trip.deliveryOtp || '') !== otp) {
        throw new ValidationError('Invalid delivery OTP');
    }

    assertTransition(trip.status, 'in_transit');
    trip.status = 'in_transit';
    trip.startedAt = new Date();
    await trip.save();

    const io = getIO();
    if (io && trip.userId) {
        io.to(rooms.user(trip.userId)).emit('parcel_status_update', {
            module: 'porter',
            jobType: 'parcel',
            tripId: String(trip._id),
            status: 'in_transit',
        });
    }

    return mapTrip(trip.toObject());
}

export async function completeTrip(driverId, tripId, body = {}) {
    if (!driverId) throw new ValidationError('Driver is required');
    const id = validateTripId(tripId);

    const trip = await PorterTrip.findOne({
        _id: id,
        ...baseFilter,
        'dispatch.deliveryPartnerId': driverId,
    });
    if (!trip) throw new NotFoundError('Trip not found');

    assertTransition(trip.status, 'completed');

    const distanceKm = Number(body.distanceKm ?? trip.distanceKm ?? 0);
    const durationMin = Number(
        body.durationMin
        ?? (trip.startedAt
            ? Math.max(1, Math.round((Date.now() - new Date(trip.startedAt).getTime()) / 60000))
            : trip.durationMin || 0),
    );

    let pricing = null;
    if (trip.zoneId) {
        pricing = await PorterPricing.findOne({
            vehicleId: trip.vehicleId,
            zoneId: trip.zoneId,
            isDeleted: { $ne: true },
        }).lean();
    }
    if (!pricing) {
        pricing = await PorterPricing.findOne({
            vehicleId: trip.vehicleId,
            zoneId: null,
            isDeleted: { $ne: true },
        }).lean();
    }

    const fare = pricing
        ? computeFare({ distanceKm, pricing })
        : {
            ...(trip.fare?.toObject?.() || trip.fare || {}),
            total: trip.fareEstimateTotal || trip.fare?.total || 0,
        };

    trip.status = 'completed';
    trip.completedAt = new Date();
    trip.distanceKm = distanceKm;
    trip.durationMin = durationMin;
    trip.fare = fare;
    if (trip.payment) {
        trip.payment.status = trip.payment.method === 'cash' ? 'paid' : (trip.payment.status || 'pending');
    }
    await trip.save();

    await clearDriverBusy(driverId);

    try {
        const { creditWallet } = await import('../../../core/payments/wallet.service.js');
        const driverShare = Math.max(0, Number(fare.total || 0) - Number(fare.platformFee || 0));
        if (driverShare > 0) {
            await creditWallet({
                entityType: 'deliveryBoy',
                entityId: driverId,
                amount: driverShare,
                description: `Porter trip ${trip.tripNumber} earnings`,
                category: 'delivery_earning',
                orderId: String(trip._id),
                metadata: { module: 'porter', tripId: String(trip._id), tripNumber: trip.tripNumber },
            });
        }
    } catch (err) {
        logger.warn(`[PorterDispatch] wallet credit stub failed: ${err?.message || err}`);
    }

    const io = getIO();
    if (io) {
        const payload = {
            module: 'porter',
            jobType: 'parcel',
            tripId: String(trip._id),
            status: 'completed',
            fare,
        };
        if (trip.userId) {
            io.to(rooms.user(trip.userId)).emit('parcel_status_update', payload);
            io.to(rooms.user(trip.userId)).emit('parcel_completed', payload);
        }
        io.to(rooms.delivery(driverId)).emit('parcel_completed', payload);
    }

    return mapTrip(trip.toObject());
}
