import { TaxiRide } from '../models/taxiRide.model.js';
import { TaxiVehicleType } from '../models/taxiVehicleType.model.js';
import { TaxiPricing } from '../models/taxiPricing.model.js';
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
import { mapRide, mapVehicleType } from '../utils/mappers.util.js';
import { validateRideId, validateStartRideDto } from '../validators/ride.validator.js';
import { assertTransition } from '../state/rideStateMachine.js';
import { computeFare, generateRideOtp } from '../utils/fare.util.js';
import { getSearchRadiusKm } from './settings.service.js';

const baseFilter = { isDeleted: { $ne: true } };
const STALE_GPS_MS = 10 * 60 * 1000;

const allowedDriverStatuses =
    process.env.NODE_ENV === 'production' ? ['approved'] : ['approved', 'pending'];

/**
 * Find nearby taxi-eligible drivers near pickup.
 * Radius comes from admin Taxi Settings (fallback 8 km).
 */
export async function findNearbyTaxiDrivers(pickup, { maxKm } = {}) {
    if (pickup?.lat == null || pickup?.lng == null) return [];

    const radiusKm = Number.isFinite(Number(maxKm))
        ? Number(maxKm)
        : await getSearchRadiusKm();

    const drivers = await Driver.find({
        availabilityStatus: 'online',
        authorizedServices: 'taxi',
        activeWorkModule: 'taxi',
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
            if (p.distanceKm == null || p.distanceKm > radiusKm) return false;
            if (!p.lastLocationAt || now - new Date(p.lastLocationAt).getTime() > STALE_GPS_MS) {
                return false;
            }
            return true;
        })
        .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
}

async function buildRideOfferPayload(ride, extras = {}) {
    const vehicleType = await TaxiVehicleType.findById(ride.vehicleTypeId)
        .select('name code category icon seats')
        .lean();

    return {
        module: 'taxi',
        jobType: 'ride',
        rideId: String(ride._id),
        rideNumber: ride.rideNumber,
        status: ride.status,
        pickup: ride.pickup,
        drop: ride.drop,
        distanceKm: ride.distanceKm,
        durationMin: ride.durationMin,
        fareEstimateTotal: ride.fareEstimateTotal,
        fare: ride.fare,
        vehicleType: vehicleType ? mapVehicleType(vehicleType) : null,
        paymentMethod: ride.payment?.method || 'cash',
        ...extras,
    };
}

/**
 * Offer ride to nearby drivers via socket `new_ride_available`.
 */
export async function tryAssignRide(rideId) {
    const id = validateRideId(rideId);
    const ride = await TaxiRide.findOne({
        _id: id,
        ...baseFilter,
        status: { $in: ['requested', 'searching'] },
        'dispatch.status': 'unassigned',
    });

    if (!ride) {
        logger.info(`[TaxiDispatch] tryAssignRide skip — ride ${id} not searchable`);
        return { offered: 0, partners: [] };
    }

    const partners = await findNearbyTaxiDrivers(ride.pickup);
    if (!partners.length) {
        const radiusKm = await getSearchRadiusKm();
        logger.info(
            `[TaxiDispatch] No nearby taxi drivers for ride ${id} within ${radiusKm} km`,
        );
        return { offered: 0, partners: [] };
    }

    const alreadyOffered = new Set(
        (ride.dispatch?.offeredTo || []).map((o) => String(o.partnerId)),
    );
    const fresh = partners.filter((p) => !alreadyOffered.has(String(p.partnerId)));
    const targets = fresh.length ? fresh : partners;

    const payload = await buildRideOfferPayload(ride);
    const io = getIO();
    const now = new Date();
    const offerEntries = [];

    for (const p of targets) {
        const roomName = rooms.delivery(p.partnerId);
        if (io) {
            io.to(roomName).emit('new_ride_available', {
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
        ride.dispatch = ride.dispatch || {};
        ride.dispatch.offeredTo = [...(ride.dispatch.offeredTo || []), ...offerEntries];
        if (ride.status === 'requested') {
            assertTransition(ride.status, 'searching');
            ride.status = 'searching';
        }
        await ride.save();
    }

    logger.info(
        `[TaxiDispatch] tryAssignRide ride=${id} offered=${targets.length} fresh=${offerEntries.length}`,
    );

    return {
        offered: targets.length,
        partners: targets.map((p) => String(p.partnerId)),
    };
}

/**
 * Atomic first-accept wins.
 */
export async function acceptRide(driverId, rideId) {
    if (!driverId) throw new ValidationError('Driver is required');
    const id = validateRideId(rideId);
    const now = new Date();
    const otp = generateRideOtp();

    const ride = await TaxiRide.findOneAndUpdate(
        {
            _id: id,
            isDeleted: { $ne: true },
            status: { $in: ['requested', 'searching', 'assigned'] },
            'dispatch.status': { $in: ['unassigned', 'assigned'] },
            $or: [
                { 'dispatch.deliveryPartnerId': null },
                { 'dispatch.deliveryPartnerId': { $exists: false } },
                { 'dispatch.deliveryPartnerId': driverId },
            ],
        },
        {
            $set: {
                status: 'arriving',
                rideOtp: otp,
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

    if (!ride) {
        const existing = await TaxiRide.findOne({ _id: id, ...baseFilter })
            .select('status dispatch')
            .lean();
        if (!existing) throw new NotFoundError('Ride not found');
        if (existing.dispatch?.deliveryPartnerId
            && String(existing.dispatch.deliveryPartnerId) !== String(driverId)) {
            throw new ValidationError('Ride already accepted by another driver');
        }
        throw new ValidationError(`Ride cannot be accepted in status ${existing.status}`);
    }

    await setDriverBusy(driverId);

    const io = getIO();
    if (io) {
        const payload = {
            module: 'taxi',
            jobType: 'ride',
            rideId: String(ride._id),
            rideNumber: ride.rideNumber,
            status: ride.status,
            driverId: String(driverId),
        };
        if (ride.userId) {
            io.to(rooms.user(ride.userId)).emit('ride_accepted', payload);
            io.to(rooms.user(ride.userId)).emit('ride_status_update', payload);
        }
        // Notify other offered drivers that ride was claimed
        const offeredIds = (ride.dispatch?.offeredTo || [])
            .map((o) => String(o.partnerId))
            .filter((pid) => pid && pid !== String(driverId));
        for (const pid of [...new Set(offeredIds)]) {
            io.to(rooms.delivery(pid)).emit('ride_claimed', payload);
        }
    }

    return mapRide(ride.toObject(), { includeOtp: true });
}

export async function markArrived(driverId, rideId) {
    if (!driverId) throw new ValidationError('Driver is required');
    const id = validateRideId(rideId);

    const ride = await TaxiRide.findOne({
        _id: id,
        ...baseFilter,
        'dispatch.deliveryPartnerId': driverId,
    });
    if (!ride) throw new NotFoundError('Ride not found');

    assertTransition(ride.status, 'arrived');
    ride.status = 'arrived';
    ride.arrivedAt = new Date();
    await ride.save();

    const io = getIO();
    if (io && ride.userId) {
        const payload = {
            module: 'taxi',
            jobType: 'ride',
            rideId: String(ride._id),
            status: 'arrived',
        };
        io.to(rooms.user(ride.userId)).emit('ride_status_update', payload);
        io.to(rooms.user(ride.userId)).emit('driver_arrived', payload);
    }

    return mapRide(ride.toObject(), { includeOtp: true });
}

export async function startRide(driverId, rideId, body = {}) {
    if (!driverId) throw new ValidationError('Driver is required');
    const id = validateRideId(rideId);
    const { otp } = validateStartRideDto(body);

    const ride = await TaxiRide.findOne({
        _id: id,
        ...baseFilter,
        'dispatch.deliveryPartnerId': driverId,
    });
    if (!ride) throw new NotFoundError('Ride not found');

    if (String(ride.rideOtp || '') !== otp) {
        throw new ValidationError('Invalid ride OTP');
    }

    assertTransition(ride.status, 'in_progress');
    ride.status = 'in_progress';
    ride.startedAt = new Date();
    await ride.save();

    const io = getIO();
    if (io && ride.userId) {
        io.to(rooms.user(ride.userId)).emit('ride_status_update', {
            module: 'taxi',
            jobType: 'ride',
            rideId: String(ride._id),
            status: 'in_progress',
        });
    }

    return mapRide(ride.toObject());
}

const PARTNER_ACTIVE_STATUSES = ['assigned', 'arriving', 'arrived', 'in_progress', 'awaiting_payment'];

/**
 * Active ride for the signed-in delivery partner (for app hydrate / resume).
 */
export async function getActiveRideForPartner(driverId) {
    if (!driverId) throw new ValidationError('Driver is required');

    const ride = await TaxiRide.findOne({
        isDeleted: { $ne: true },
        'dispatch.deliveryPartnerId': driverId,
        status: { $in: PARTNER_ACTIVE_STATUSES },
    })
        .sort({ updatedAt: -1 })
        .lean();

    if (!ride) return null;
    return mapRide(ride, { includeOtp: ride.status === 'arrived' });
}

export async function completeRide(driverId, rideId, body = {}) {
    // Legacy callers: if still in_progress, reach drop first then require payment.
    // Preferred path: reachDrop → pay → completePaidRide / collectCash.
    const { reachDrop, completePaidRide, collectCash } = await import('./ridePayment.service.js');

    const id = validateRideId(rideId);
    const ride = await TaxiRide.findOne({
        _id: id,
        ...baseFilter,
        'dispatch.deliveryPartnerId': driverId,
    });
    if (!ride) throw new NotFoundError('Ride not found');

    if (ride.status === 'in_progress') {
        await reachDrop(driverId, rideId, body);
        throw new ValidationError(
            'Drop reached. Collect payment (QR / cash / wait for rider online pay), then complete.',
        );
    }

    if (ride.status === 'awaiting_payment') {
        if (String(body.paymentMode || body.method || '').toLowerCase() === 'cash') {
            return collectCash(driverId, rideId);
        }
        return completePaidRide(driverId, rideId);
    }

    if (ride.status === 'completed') {
        return mapRide(ride.toObject());
    }

    throw new ValidationError(`Cannot complete ride from status ${ride.status}`);
}
